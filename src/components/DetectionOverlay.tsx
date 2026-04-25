import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Detection } from '../types';
import { colorForClass } from '../utils/yolo26Utils';

interface Props {
  detections: Detection[];
  frameWidth: number;
  frameHeight: number;
}

export function DetectionOverlay({ detections, frameWidth, frameHeight }: Props) {
  if (detections.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {detections.map((det, idx) => {
        const color = colorForClass(det.classId);
        const left = det.bbox.x * frameWidth;
        const top = det.bbox.y * frameHeight;
        const width = det.bbox.width * frameWidth;
        const height = det.bbox.height * frameHeight;

        return (
          <View
            key={idx}
            style={[
              styles.box,
              { left, top, width, height, borderColor: color },
            ]}
          >
            <View style={[styles.labelContainer, { backgroundColor: color }]}>
              <Text style={styles.labelText}>
                {det.label} {Math.round(det.confidence * 100)}%
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 4,
  },
  labelContainer: {
    position: 'absolute',
    top: -20,
    left: -1,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
  },
  labelText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '700',
  },
});
