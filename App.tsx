import React, { useRef, useState, MutableRefObject } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { DetectionOverlay } from './src/components/DetectionOverlay';
import { HUD } from './src/components/HUD';
import { useObjectDetection } from './src/hooks/useObjectDetection';
import { useProximityAlert } from './src/hooks/useProximityAlert';
import { useScan } from './src/hooks/useScan';

export default function App() {
  const cameraRef = useRef<CameraView>(null);
  const cameraCapturing = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [frameSize, setFrameSize] = useState({ width: 1, height: 1 });

  const { scan, cancelSpeech, scanState, lastResult, errorMessage } = useScan(cameraRef, cameraCapturing);
  const isScanIdle = scanState === 'idle';

  const { detections, isConnected, inferenceMs, depthProximity } = useObjectDetection(
    cameraRef,
    isScanIdle,
    cameraCapturing,
  );

  useProximityAlert(detections, isScanIdle, depthProximity);

  if (!permission) return <View style={styles.root} />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionScreen}>
        <Text style={styles.permissionText}>Camera access is required.</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar hidden />

      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        onLayout={(e) =>
          setFrameSize({
            width: e.nativeEvent.layout.width,
            height: e.nativeEvent.layout.height,
          })
        }
      />

      <DetectionOverlay
        detections={detections}
        frameWidth={frameSize.width}
        frameHeight={frameSize.height}
      />

      <HUD
        detectionCount={detections.length}
        proximityLevel={getProximityLevel(detections)}
        scanState={scanState}
        isListening={false}
        isModelLoaded={isConnected}
        lastDescription={lastResult?.description ?? null}
        errorMessage={errorMessage}
        inferenceMs={inferenceMs}
      />

      {/* SCAN button */}
      <TouchableOpacity
        style={[styles.scanButton, (scanState !== 'idle' && scanState !== 'speaking') && styles.scanButtonDisabled]}
        onPress={scanState === 'speaking' ? cancelSpeech : scan}
        disabled={scanState !== 'idle' && scanState !== 'speaking'}
        activeOpacity={0.75}
      >
        <Text style={styles.scanButtonText}>
          {scanState === 'idle' ? 'SCAN' : scanState === 'speaking' ? 'STOP' : scanState.toUpperCase()}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function getProximityLevel(detections: { bbox: { width: number; height: number } }[]) {
  let max = 0;
  for (const d of detections) {
    const area = d.bbox.width * d.bbox.height;
    if (area > max) max = area;
  }
  if (max >= 0.30) return 'critical' as const;
  if (max >= 0.12) return 'close' as const;
  if (max >= 0.04) return 'medium' as const;
  if (max >= 0.01) return 'far' as const;
  return 'none' as const;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionScreen: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  permissionText: {
    color: '#fff',
    fontSize: 16,
  },
  permissionButton: {
    backgroundColor: '#0070f3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  permissionButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  scanButton: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    backgroundColor: '#0070f3',
    paddingHorizontal: 48,
    paddingVertical: 18,
    borderRadius: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  scanButtonDisabled: {
    backgroundColor: '#334',
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
