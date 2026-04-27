"""
Kinetic — YOLO26 + MiDaS depth detection server
Run: uvicorn server:app --host 0.0.0.0 --port 8000 --reload

Two detection systems running in parallel:
  1. YOLO26  — detects named objects (person, chair, car…)
  2. MiDaS   — estimates depth of the entire scene, catches walls/floors/ceilings
               that YOLO cannot detect
"""
import base64
import io
import time
from contextlib import asynccontextmanager
from typing import List, Optional

import cv2
import numpy as np
import torch
import torch.nn.functional as F
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel
from ultralytics import YOLO

# ── Model paths ───────────────────────────────────────────────────────────────
YOLO_MODEL_PATH = "yolo26n.pt"

# MiDaS model — "MiDaS_small" is fastest and runs well on CPU
MIDAS_MODEL_TYPE = "MiDaS_small"

# ── Global model references ───────────────────────────────────────────────────
yolo_model: Optional[YOLO] = None
midas_model = None
midas_transform = None
device = torch.device("cpu")


@asynccontextmanager
async def lifespan(app: FastAPI):
    global yolo_model, midas_model, midas_transform, device

    # Load YOLO26
    print(f"[YOLO] Loading {YOLO_MODEL_PATH}...")
    yolo_model = YOLO(YOLO_MODEL_PATH)
    dummy = np.zeros((640, 640, 3), dtype=np.uint8)
    yolo_model(dummy, verbose=False)
    print("[YOLO] Model ready")

    # Load MiDaS
    print(f"[MiDaS] Loading {MIDAS_MODEL_TYPE}...")
    midas_model = torch.hub.load("intel-isl/MiDaS", MIDAS_MODEL_TYPE, trust_repo=True)
    midas_model.to(device)
    midas_model.eval()

    transforms = torch.hub.load("intel-isl/MiDaS", "transforms", trust_repo=True)
    midas_transform = transforms.small_transform
    print("[MiDaS] Model ready")

    yield


app = FastAPI(title="Kinetic Detection API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schemas ───────────────────────────────────────────────────────────────────

class DetectRequest(BaseModel):
    image: str           # base64-encoded JPEG
    confidence: float = 0.35


class BBox(BaseModel):
    x: float
    y: float
    width: float
    height: float


class Detection(BaseModel):
    bbox: BBox
    confidence: float
    classId: int
    label: str


class DetectResponse(BaseModel):
    detections: List[Detection]
    inferenceMs: float
    # Depth proximity score 0.0–1.0 from MiDaS
    # 0.0 = nothing close, 1.0 = surface very close (wall/floor/ceiling)
    depthProximity: float


# ── Helpers ───────────────────────────────────────────────────────────────────

def decode_image(b64: str) -> np.ndarray:
    """Decode base64 JPEG to BGR numpy array."""
    img_bytes = base64.b64decode(b64)
    arr = np.frombuffer(img_bytes, dtype=np.uint8)
    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError("Failed to decode image")
    return frame


def run_midas(frame_bgr: np.ndarray) -> float:
    """
    Run MiDaS depth estimation on a BGR frame.
    Returns a proximity score 0.0–1.0 based on the closest surface
    in the central region of the frame.

    MiDaS outputs inverse depth (higher = closer). We:
      1. Run inference on a small resize for speed
      2. Sample the central 40% of the depth map (avoids edges)
      3. Take the 90th percentile (robust to noise)
      4. Normalize to 0–1 using a rolling calibration window
    """
    global _depth_max_history

    # Convert BGR → RGB for MiDaS
    frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)

    input_batch = midas_transform(frame_rgb).to(device)

    with torch.no_grad():
        prediction = midas_model(input_batch)
        prediction = F.interpolate(
            prediction.unsqueeze(1),
            size=frame_rgb.shape[:2],
            mode="bicubic",
            align_corners=False,
        ).squeeze()

    depth_map = prediction.cpu().numpy()

    # Sample central 40% of frame
    h, w = depth_map.shape
    cy1, cy2 = int(h * 0.3), int(h * 0.7)
    cx1, cx2 = int(w * 0.3), int(w * 0.7)
    center_region = depth_map[cy1:cy2, cx1:cx2]

    # 90th percentile of center region = closest surface
    raw_score = float(np.percentile(center_region, 90))

    # Normalize using a rolling history of max values
    _depth_max_history.append(raw_score)
    if len(_depth_max_history) > 30:
        _depth_max_history.pop(0)

    hist_max = max(_depth_max_history) if _depth_max_history else raw_score
    hist_min = min(_depth_max_history) if len(_depth_max_history) > 1 else 0

    if hist_max <= hist_min:
        return 0.0

    normalized = (raw_score - hist_min) / (hist_max - hist_min)
    return float(np.clip(normalized, 0.0, 1.0))


# Rolling history for depth normalization
_depth_max_history: List[float] = []


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok",
        "yolo": YOLO_MODEL_PATH,
        "depth": MIDAS_MODEL_TYPE,
    }


@app.post("/detect", response_model=DetectResponse)
def detect(req: DetectRequest):
    if yolo_model is None or midas_model is None:
        raise HTTPException(status_code=503, detail="Models not loaded")

    try:
        frame_bgr = decode_image(req.image)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {e}")

    img_h, img_w = frame_bgr.shape[:2]
    pil_image = Image.fromarray(cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB))

    t0 = time.perf_counter()

    # Run YOLO26 detection
    results = yolo_model(pil_image, conf=req.confidence, verbose=False)[0]

    # Run MiDaS depth estimation in parallel (same frame)
    depth_proximity = run_midas(frame_bgr)

    inference_ms = (time.perf_counter() - t0) * 1000

    detections: List[Detection] = []
    for box in results.boxes:
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        detections.append(Detection(
            bbox=BBox(
                x=x1 / img_w,
                y=y1 / img_h,
                width=(x2 - x1) / img_w,
                height=(y2 - y1) / img_h,
            ),
            confidence=float(box.conf[0]),
            classId=int(box.cls[0]),
            label=results.names[int(box.cls[0])],
        ))

    return DetectResponse(
        detections=detections,
        inferenceMs=round(inference_ms, 1),
        depthProximity=round(depth_proximity, 3),
    )
