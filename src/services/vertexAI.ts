import { GOOGLE_AI_API_KEY, GEMMA_MODEL_ID, GEMMA_SYSTEM_PROMPT } from '../config/constants';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

interface GemmaResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text?: string; thought?: boolean }>;
    };
  }>;
}

/**
 * Sends a captured frame (base64 JPEG) to Gemma 4 via the Google AI generativelanguage
 * endpoint (the same backend as Vertex AI Studio). Returns the model's description.
 */
export async function analyzeImageWithGemma(base64Jpeg: string): Promise<string> {
  if (!GOOGLE_AI_API_KEY) {
    throw new Error('GOOGLE_AI_API_KEY is not set. Copy .env.example to .env and add your key.');
  }

  const url = `${BASE_URL}/${GEMMA_MODEL_ID}:generateContent?key=${GOOGLE_AI_API_KEY}`;

  const body = {
    system_instruction: {
      parts: [{ text: GEMMA_SYSTEM_PROMPT }],
    },
    contents: [
      {
        role: 'user',
        parts: [
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: base64Jpeg,
            },
          },
          {
            text: 'Describe what you see in this image.',
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 200,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemma API error ${response.status}: ${err}`);
  }

  const json: GemmaResponse = await response.json();
  const parts = json.candidates?.[0]?.content?.parts ?? [];
  const textPart = parts.find(p => !p.thought && p.text);
  return textPart?.text ?? 'No description available.';
}
