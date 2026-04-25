import { useState, useRef, useCallback, useEffect } from 'react';
import type { RefObject } from 'react';
import type { CameraView } from 'expo-camera';
import type { Detection } from '../types';
import { API_URL, DETECTION_INTERVAL_MS, DETECTION_IMAGE_QUALITY, CONFIDENCE_THRESHOLD } from '../config/constants';

export function useObjectDetection(cameraRef: RefObject<CameraView>, active: boolean) {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [inferenceMs, setInferenceMs] = useState(0);
  const isCapturing = useRef(false);

  const detect = useCallback(async () => {
    if (isCapturing.current || !cameraRef.current || !active) return;
    isCapturing.current = true;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: DETECTION_IMAGE_QUALITY,
        skipProcessing: true,
        exif: false,
      });

      if (!photo?.base64) return;

      const response = await fetch(`${API_URL}/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: photo.base64,
          confidence: CONFIDENCE_THRESHOLD,
        }),
      });

      if (!response.ok) return;

      const data = await response.json();
      setDetections(data.detections ?? []);
      setInferenceMs(data.inferenceMs ?? 0);
      setIsConnected(true);
    } catch {
      setIsConnected(false);
      setDetections([]);
    } finally {
      isCapturing.current = false;
    }
  }, [cameraRef, active]);

  useEffect(() => {
    if (!active) {
      setDetections([]);
      return;
    }
    const interval = setInterval(detect, DETECTION_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [detect, active]);

  return { detections, isConnected, inferenceMs };
}
