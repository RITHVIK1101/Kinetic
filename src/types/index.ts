export interface BoundingBox {
  /** Normalized 0–1 relative to frame dimensions */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Detection {
  bbox: BoundingBox;
  confidence: number;
  classId: number;
  label: string;
}

export type ScanState = 'idle' | 'capturing' | 'analyzing' | 'speaking' | 'error';

export type ProximityLevel = 'none' | 'far' | 'medium' | 'close' | 'critical';

export interface ScanResult {
  description: string;
  timestamp: number;
}
