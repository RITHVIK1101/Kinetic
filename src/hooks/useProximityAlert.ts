import { useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import type { Detection, ProximityLevel } from '../types';
import { PROXIMITY_LEVELS } from '../config/constants';
import { maxDetectionArea } from '../utils/yolo26Utils';
import { generateBeepDataURI } from '../utils/beepUtils';

export function useProximityAlert(detections: Detection[], enabled: boolean) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentLevelRef = useRef<ProximityLevel>('none');

  // Generate and cache the beep sound once
  useEffect(() => {
    let mounted = true;
    (async () => {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
      });
      const uri = generateBeepDataURI();
      const { sound } = await Audio.Sound.createAsync({ uri });
      if (mounted) soundRef.current = sound;
    })();
    return () => {
      mounted = false;
      soundRef.current?.unloadAsync();
    };
  }, []);

  const playBeep = useCallback(async () => {
    const sound = soundRef.current;
    if (!sound) return;
    try {
      await sound.replayAsync();
    } catch {
      // Sound may not be loaded yet — ignore
    }
  }, []);

  const getProximityLevel = useCallback((area: number): ProximityLevel => {
    if (area >= PROXIMITY_LEVELS.critical.areaThreshold) return 'critical';
    if (area >= PROXIMITY_LEVELS.close.areaThreshold) return 'close';
    if (area >= PROXIMITY_LEVELS.medium.areaThreshold) return 'medium';
    if (area >= PROXIMITY_LEVELS.far.areaThreshold) return 'far';
    return 'none';
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      currentLevelRef.current = 'none';
      return;
    }

    const area = maxDetectionArea(detections);
    const level = getProximityLevel(area);

    if (level === currentLevelRef.current) return; // no change, keep existing timer
    currentLevelRef.current = level;

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;

    if (level === 'none') return;

    const intervalMs = PROXIMITY_LEVELS[level].intervalMs;
    playBeep(); // fire immediately on level change
    timerRef.current = setInterval(playBeep, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [detections, enabled, getProximityLevel, playBeep]);

  return { proximityLevel: currentLevelRef.current };
}
