import type { Detection } from '../types';

// COCO 80-class labels
export const COCO_LABELS: readonly string[] = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
  'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
  'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
  'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
  'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair',
  'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote',
  'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book',
  'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush',
];

/**
 * Parse YOLO26 TFLite output into Detection objects.
 *
 * YOLO26 one-to-one head output layout (NMS-free):
 *   Flat Float32Array of length 300 * 6
 *   Each detection: [x_center, y_center, width, height, confidence, class_id]
 *   Coordinates are normalized 0–1 relative to the 640×640 model input.
 *
 * This function is intentionally worklet-compatible (no closures over non-primitive
 * state, no Array methods unavailable in the worklet runtime).
 */
export function parseYOLO26Output(
  data: Float32Array,
  confidenceThreshold: number,
): Detection[] {
  'worklet';
  const detections: Detection[] = [];
  const stride = 6; // floats per detection
  const total = 300;

  for (let i = 0; i < total; i++) {
    const base = i * stride;
    const confidence = data[base + 4];
    if (confidence < confidenceThreshold) continue;

    const xCenter = data[base + 0];
    const yCenter = data[base + 1];
    const w = data[base + 2];
    const h = data[base + 3];
    const classId = Math.round(data[base + 5]);

    detections.push({
      bbox: {
        x: xCenter - w / 2,
        y: yCenter - h / 2,
        width: w,
        height: h,
      },
      confidence,
      classId,
      label: COCO_LABELS[classId] ?? 'object',
    });
  }

  return detections;
}

/** Returns the largest normalized bounding-box area among current detections (0–1). */
export function maxDetectionArea(detections: Detection[]): number {
  let max = 0;
  for (const d of detections) {
    const area = d.bbox.width * d.bbox.height;
    if (area > max) max = area;
  }
  return max;
}

/** Assign a stable color per class (for overlay rendering). */
export function colorForClass(classId: number): string {
  const palette = [
    '#FF4444', '#FF8800', '#FFDD00', '#44FF44', '#00DDFF',
    '#4488FF', '#CC44FF', '#FF44CC', '#FF8844', '#44FFCC',
  ];
  return palette[classId % palette.length];
}
