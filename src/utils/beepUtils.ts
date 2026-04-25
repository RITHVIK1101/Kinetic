import { BEEP_DURATION_MS, BEEP_FREQUENCY_HZ, BEEP_SAMPLE_RATE } from '../config/constants';

/**
 * Generates a sine-wave beep as a data URI (audio/wav).
 * Called once at startup so no audio assets are needed.
 */
export function generateBeepDataURI(
  frequencyHz = BEEP_FREQUENCY_HZ,
  durationMs = BEEP_DURATION_MS,
  sampleRate = BEEP_SAMPLE_RATE,
): string {
  const numSamples = Math.floor((sampleRate * durationMs) / 1000);
  const dataBytes = numSamples * 2; // 16-bit PCM
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);           // chunk size
  view.setUint16(20, 1, true);            // PCM
  view.setUint16(22, 1, true);            // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true);            // block align
  view.setUint16(34, 16, true);           // bits per sample
  writeString(view, 36, 'data');
  view.setUint32(40, dataBytes, true);

  // Apply a short fade-out to avoid clicks
  const fadeOutSamples = Math.floor(numSamples * 0.15);

  for (let i = 0; i < numSamples; i++) {
    let amplitude = 0.7;
    if (i > numSamples - fadeOutSamples) {
      amplitude *= (numSamples - i) / fadeOutSamples;
    }
    const sample = Math.sin((2 * Math.PI * frequencyHz * i) / sampleRate) * amplitude * 0x7fff;
    view.setInt16(44 + i * 2, sample, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
