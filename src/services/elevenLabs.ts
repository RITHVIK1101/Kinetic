import * as FileSystem from 'expo-file-system';
import { ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID } from '../config/constants';

const BASE_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

/**
 * Converts text to speech using ElevenLabs and returns a local URI to the MP3 file.
 * The caller is responsible for deleting the file after playback.
 */
export async function synthesizeSpeech(text: string): Promise<string> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY is not set. Copy .env.example to .env and add your key.');
  }

  const url = `${BASE_URL}/${ELEVENLABS_VOICE_ID}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`ElevenLabs API error ${response.status}: ${err}`);
  }

  // Write the audio bytes to a temp file so expo-av can play it
  const arrayBuffer = await response.arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);
  const localUri = `${FileSystem.cacheDirectory}kinetic_speech_${Date.now()}.mp3`;

  await FileSystem.writeAsStringAsync(localUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return localUri;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
