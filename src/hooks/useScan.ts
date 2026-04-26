import React, { useState, useCallback, useRef } from 'react';
import type { RefObject } from 'react';
import type { CameraView } from 'expo-camera';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import type { ScanState, ScanResult } from '../types';
import { analyzeImageWithGemma } from '../services/vertexAI';
import { synthesizeSpeech } from '../services/elevenLabs';

export function useScan(
  cameraRef: RefObject<CameraView>,
  cameraCapturing: React.MutableRefObject<boolean>,
) {
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isScanning = useRef(false);
  const speechResolveRef = useRef<(() => void) | null>(null);
  const activeSoundRef = useRef<Audio.Sound | null>(null);

  const cancelSpeech = useCallback(() => {
    activeSoundRef.current?.stopAsync();
    speechResolveRef.current?.();
  }, []);

  const scan = useCallback(async () => {
    if (isScanning.current || !cameraRef.current) return;
    isScanning.current = true;
    setErrorMessage(null);

    let speechUri: string | null = null;

    try {
      // 1. Wait for any in-progress detection capture to finish
      setScanState('capturing');
      await new Promise<void>((resolve) => {
        const check = () => (cameraCapturing.current ? setTimeout(check, 50) : resolve());
        check();
      });
      cameraCapturing.current = true;
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.85,
        exif: false,
      });

      if (!photo?.base64) throw new Error('Failed to capture photo');

      // 2. Send to Gemma 4 for analysis
      setScanState('analyzing');
      const description = await analyzeImageWithGemma(photo.base64);
      setLastResult({ description, timestamp: Date.now() });

      // 3. Convert to speech with ElevenLabs
      setScanState('speaking');
      speechUri = await synthesizeSpeech(description);

      const { sound } = await Audio.Sound.createAsync(
        { uri: speechUri },
        { shouldPlay: true },
      );
      activeSoundRef.current = sound;

      await new Promise<void>((resolve) => {
        speechResolveRef.current = resolve;
        sound.setOnPlaybackStatusUpdate((status) => {
          if ('didJustFinish' in status && status.didJustFinish) {
            speechResolveRef.current = null;
            resolve();
          }
        });
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[useScan]', e);
      setErrorMessage(msg);
      setScanState('error');
    } finally {
      speechResolveRef.current = null;
      activeSoundRef.current?.unloadAsync();
      activeSoundRef.current = null;
      cameraCapturing.current = false;
      if (speechUri) FileSystem.deleteAsync(speechUri, { idempotent: true });
      setScanState('idle');
      isScanning.current = false;
    }
  }, [cameraRef, cameraCapturing]);

  return { scan, cancelSpeech, scanState, lastResult, errorMessage };
}
