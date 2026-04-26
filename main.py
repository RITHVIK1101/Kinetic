import sys
import time

import cv2

from audio import ProximityAudio
from detection import YOLODetector
from display import annotate_frame
from gemma_vision import GemmaVision

# ── Configuration ────────────────────────────────────────────────────────────
CAMERA_INDEX = 1          # EpocCam/Camo is usually index 1 or 2
                          # Run camera_scan.py if unsure

YOLO_MODEL_PATH = "yolo26n.pt"
YOLO_CONF = 0.4

GEMMA_MODEL_PATH = "models/gemma-4-E2B-it-Q4_K_M.gguf"
GEMMA_N_CTX = 4096
GEMMA_GPU_LAYERS = 0      # Set to -1 to offload all layers to GPU (requires CUDA build)
GEMMA_VERBOSE = False
# ─────────────────────────────────────────────────────────────────────────────


def main() -> None:
    print("[Kinetic] Starting up...")

    detector = YOLODetector(YOLO_MODEL_PATH, conf_threshold=YOLO_CONF)
    audio = ProximityAudio()
    gemma = GemmaVision(
        GEMMA_MODEL_PATH,
        n_ctx=GEMMA_N_CTX,
        n_gpu_layers=GEMMA_GPU_LAYERS,
        verbose=GEMMA_VERBOSE,
    )

    audio.start()
    gemma.start()

    cap = cv2.VideoCapture(CAMERA_INDEX)
    if not cap.isOpened():
        print(
            f"[Kinetic] ERROR: Could not open camera index {CAMERA_INDEX}.\n"
            "Run camera_scan.py to find the correct index, then update CAMERA_INDEX in main.py."
        )
        audio.stop()
        gemma.stop()
        sys.exit(1)

    print(
        "[Kinetic] Running. Focus the window, then:\n"
        "  Any key  →  capture frame and run Gemma scene description\n"
        "  ESC      →  quit"
    )

    prev_time = time.perf_counter()

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                continue

            detections = detector.detect(frame)
            area_ratio = detector.largest_area_ratio(detections, frame)
            audio.set_area_ratio(area_ratio)

            now = time.perf_counter()
            fps = 1.0 / max(now - prev_time, 1e-9)
            prev_time = now

            inference_active = not gemma._queue.empty()
            annotated = annotate_frame(frame, detections, area_ratio, fps, inference_active)
            cv2.imshow("Kinetic", annotated)

            key = cv2.waitKey(1) & 0xFF
            if key == 27:          # ESC → exit
                break
            elif key != 255:       # any other key → trigger Gemma
                submitted = gemma.submit_frame(frame.copy())
                if not submitted:
                    print("[Kinetic] Gemma is still processing — frame skipped.")

    finally:
        audio.stop()
        gemma.stop()
        cap.release()
        cv2.destroyAllWindows()
        print("[Kinetic] Shutdown complete.")


if __name__ == "__main__":
    main()
