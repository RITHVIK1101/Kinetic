"""
Kinetic — YOLO26 detection server
Run: uvicorn server:app --host 0.0.0.0 --port 8000 --reload
"""
import base64
import io
from contextlib import asynccontextmanager

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel
from ultralytics import YOLO

MODEL_PATH = "yolo26n.pt"  # auto-downloads on first run
model: YOLO | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global model
    print(f"Loading YOLO26 model from {MODEL_PATH}...")
    model = YOLO(MODEL_PATH)
    # Warm-up pass so first real request isn't slow
    dummy = np.zeros((640, 640, 3), dtype=np.uint8)
    model(dummy, verbose=False)
    print("Model ready.")
    yield


app = FastAPI(title="Kinetic YOLO26 API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schemas ────────────────────────────────────────────────────────────────

class DetectRequest(BaseModel):
    image: str          # base64-encoded JPEG
    confidence: float = 0.35


class BBox(BaseModel):
    x: float            # normalized 0-1 (top-left x)
    y: float
    width: float
    height: float


class Detection(BaseModel):
    bbox: BBox
    confidence: float
    classId: int
    label: str


class DetectResponse(BaseModel):
    detections: list[Detection]
    inferenceMs: float


# ── Routes ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_PATH}


@app.post("/detect", response_model=DetectResponse)
def detect(req: DetectRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    # Decode image
    try:
        img_bytes = base64.b64decode(req.image)
        image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {e}")

    img_w, img_h = image.size

    import time
    t0 = time.perf_counter()
    results = model(image, conf=req.confidence, verbose=False)[0]
    inference_ms = (time.perf_counter() - t0) * 1000

    detections: list[Detection] = []
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

    return DetectResponse(detections=detections, inferenceMs=round(inference_ms, 1))
