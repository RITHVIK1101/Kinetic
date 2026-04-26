import cv2
import numpy as np

from detection import Detection


def proximity_color(area_ratio: float) -> tuple[int, int, int]:
    """Interpolate BGR color from green (far) to red (close)."""
    ratio = max(0.0, min(area_ratio / 0.6, 1.0))
    green = int(200 * (1.0 - ratio))
    red = int(220 * ratio)
    return (0, green, red)  # BGR


def draw_box(frame: np.ndarray, det: Detection, color: tuple[int, int, int]) -> None:
    cv2.rectangle(frame, (det.x1, det.y1), (det.x2, det.y2), color, 2)
    label = f"{det.label} {det.confidence:.0%}"
    label_y = det.y1 - 8 if det.y1 > 20 else det.y1 + 18
    cv2.putText(frame, label, (det.x1, label_y),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 2, cv2.LINE_AA)


def annotate_frame(
    frame: np.ndarray,
    detections: list[Detection],
    area_ratio: float,
    fps: float,
    inference_active: bool,
) -> np.ndarray:
    out = frame.copy()
    color = proximity_color(area_ratio)

    for det in detections:
        draw_box(out, det, color)

    h, w = out.shape[:2]

    # Proximity bar — thin strip at the bottom
    bar_width = int(w * min(area_ratio / 0.6, 1.0))
    cv2.rectangle(out, (0, h - 8), (bar_width, h), color, thickness=-1)

    # FPS counter — top right
    fps_text = f"{fps:.0f} fps"
    (tw, _), _ = cv2.getTextSize(fps_text, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 2)
    cv2.putText(out, fps_text, (w - tw - 10, 24),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (200, 200, 200), 2, cv2.LINE_AA)

    # "Analyzing..." indicator
    if inference_active:
        cv2.putText(out, "Analyzing...", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 220, 220), 2, cv2.LINE_AA)

    return out
