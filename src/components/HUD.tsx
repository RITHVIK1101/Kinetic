import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ScanState, ProximityLevel } from '../types';

interface Props {
  detectionCount: number;
  proximityLevel: ProximityLevel;
  scanState: ScanState;
  isListening: boolean;
  isModelLoaded: boolean;
  lastDescription: string | null;
  errorMessage: string | null;
  inferenceMs?: number;
}

const PROXIMITY_COLORS: Record<ProximityLevel, string> = {
  none: '#444',
  far: '#44FF44',
  medium: '#FFDD00',
  close: '#FF8800',
  critical: '#FF2222',
};

const SCAN_LABELS: Record<ScanState, string> = {
  idle: '',
  capturing: 'Capturing...',
  analyzing: 'Analyzing...',
  speaking: 'Speaking...',
  error: 'Error',
};

export function HUD({
  detectionCount,
  proximityLevel,
  scanState,
  isListening,
  isModelLoaded,
  lastDescription,
  errorMessage,
  inferenceMs,
}: Props) {
  return (
    <>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={[styles.dot, { backgroundColor: isModelLoaded ? '#44FF44' : '#FF4444' }]} />
        <Text style={styles.topText}>
          {isModelLoaded
            ? `YOLO26  •  ${detectionCount} obj${inferenceMs ? `  •  ${inferenceMs}ms` : ''}`
            : 'Server offline'}
        </Text>

        <View style={[styles.dot, { backgroundColor: isListening ? '#44AAFF' : '#555' }]} />
        <Text style={styles.topText}>{isListening ? 'Listening' : 'Mic off'}</Text>
      </View>

      {/* Proximity indicator (bottom-left) */}
      {proximityLevel !== 'none' && (
        <View style={[styles.proximityBadge, { backgroundColor: PROXIMITY_COLORS[proximityLevel] }]}>
          <Text style={styles.proximityText}>{proximityLevel.toUpperCase()}</Text>
        </View>
      )}

      {/* Scan status banner */}
      {scanState !== 'idle' && (
        <View style={styles.scanBanner}>
          <Text style={styles.scanText}>{SCAN_LABELS[scanState]}</Text>
        </View>
      )}

      {/* Last scan description */}
      {scanState === 'idle' && lastDescription && (
        <View style={styles.descriptionBox}>
          <Text style={styles.descriptionText} numberOfLines={3}>
            {lastDescription}
          </Text>
        </View>
      )}

      {/* Error message */}
      {errorMessage && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText} numberOfLines={2}>
            {errorMessage}
          </Text>
        </View>
      )}

      {/* "Say scan" hint — only show when idle and model loaded */}
      {scanState === 'idle' && isModelLoaded && isListening && !lastDescription && (
        <View style={styles.hintBox}>
          <Text style={styles.hintText}>Say "scan" to analyze the scene</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  topBar: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  topText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginRight: 8,
  },
  proximityBadge: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  proximityText: {
    color: '#000',
    fontWeight: '800',
    fontSize: 14,
  },
  scanBanner: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,120,255,0.85)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  scanText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  descriptionBox: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#44AAFF',
  },
  descriptionText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  errorBox: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(200,0,0,0.75)',
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    color: '#fff',
    fontSize: 13,
  },
  hintBox: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  hintText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
});
