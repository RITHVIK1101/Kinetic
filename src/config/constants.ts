// Python YOLO26 API server — must be reachable from the iPhone (same WiFi or ngrok)
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

// Google AI
export const GOOGLE_AI_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_AI_API_KEY ?? '';
export const GEMMA_MODEL_ID = process.env.EXPO_PUBLIC_GEMMA_MODEL_ID ?? 'gemma-4-vision';

// ElevenLabs
export const ELEVENLABS_API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY ?? '';
export const ELEVENLABS_VOICE_ID = process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_ID ?? '21m00Tcm4TlvDq8ikWAM';

// Detection
export const DETECTION_INTERVAL_MS = 500;   // how often to send a frame for detection
export const DETECTION_IMAGE_QUALITY = 0.4; // lower = faster upload, less accurate
export const CONFIDENCE_THRESHOLD = 0.35;

// Proximity beep intervals mapped to max bounding-box area (0-1)
export const PROXIMITY_LEVELS = {
  critical: { areaThreshold: 0.30, intervalMs: 120 },
  close:    { areaThreshold: 0.12, intervalMs: 350 },
  medium:   { areaThreshold: 0.04, intervalMs: 800 },
  far:      { areaThreshold: 0.01, intervalMs: 1800 },
} as const;

// Beep tone
export const BEEP_FREQUENCY_HZ = 880;
export const BEEP_DURATION_MS = 80;
export const BEEP_SAMPLE_RATE = 22050;

// Gemma prompt
export const GEMMA_SYSTEM_PROMPT =
  'You are an AI assistant helping a user understand their surroundings. ' +
  'Concisely describe the objects you see and their approximate positions ' +
  '(left, right, center, near, far). Read any visible text verbatim. ' +
  'Keep your response under 100 words and speak naturally, as this will be read aloud.';
