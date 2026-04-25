// Voice activation requires a dev build with expo-speech-recognition.
// In Expo Go, scanning is triggered by the on-screen SCAN button instead.
// This file is kept as a no-op so imports don't break.
export function useVoiceCommand(_onScanCommand: () => void) {
  return { isListening: false, error: null };
}
