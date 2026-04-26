from dataclasses import dataclass

import numpy as np
from ultralytics import YOLO


@dataclass
class Detection:
    label: str
    confidence: float
    x1: int
    y1: int
    x2: int
    y2: int

    @property
    def area(self) -> int:
        return (self.x2 - self.x1) * (self.y2 - self.y1)


class YOLODetector:
    def __init__(self, model_path: str = "yolo26n.pt", conf_threshold: float = 0.4) -> None:
        self.model = YOLO(model_path)
        self.conf_threshold = conf_threshold

    def detect(self, frame: np.ndarray) -> list[Detection]:
        result = self.model(frame, conf=self.conf_threshold, verbose=False)[0]
        detections = []
        for box in result.boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            label = self.model.names[int(box.cls[0])]
            conf = float(box.conf[0])
            detections.append(Detection(
                label=label,
                confidence=conf,
                x1=int(x1), y1=int(y1),
                x2=int(x2), y2=int(y2),
            ))
        return detections

    def largest_area_ratio(self, detections: list[Detection], frame: np.ndarray) -> float:
        if not detections:
            return 0.0
        frame_area = frame.shape[0] * frame.shape[1]
        max_area = max(d.area for d in detections)
        return min(max_area / frame_area, 1.0)
