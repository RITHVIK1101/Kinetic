# Kinetic

A real-time spatial awareness app for iOS. Points the camera at the world, detects objects with YOLO26, and beeps faster as things get closer — like a car's reverse camera. Tap **SCAN** to get a spoken description of the scene via Gemma 4 + ElevenLabs.

## Architecture

```
iPhone (Expo Go)                    Your Computer
─────────────────                   ──────────────────────────
expo-camera → frame (base64 JPEG) → FastAPI /detect
                                  ← detections JSON (YOLO26)

Tap SCAN → full-quality photo ───→ Google Gemma 4 (direct)
                                  ← scene description
                         ElevenLabs TTS (direct) → audio playback
```

- **Object detection** — YOLO26n running on your computer via a Python FastAPI server
- **Proximity alert** — beep interval shortens as detected objects get larger in frame
- **Scene analysis** — Gemma 4 via Google AI API describes objects and reads visible text
- **Text-to-speech** — ElevenLabs reads the response aloud on the phone
- **Runs in Expo Go** — no native build required

---

## Prerequisites

| Tool | Notes |
|---|---|
| Node.js 20+ | |
| Python 3.10+ | For the YOLO26 server |
| Expo Go app | Install on your iPhone from the App Store |
| iPhone + Computer | Must be on the **same WiFi network** |

---

## 1. Clone and install

```bash
# Install JS dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt
```

---

## 2. Set up API keys

```bash
cp .env.example .env
```

Edit `.env`:

```env
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_IP:8000
EXPO_PUBLIC_GOOGLE_AI_API_KEY=your_google_ai_key
EXPO_PUBLIC_GEMMA_MODEL_ID=gemma-4-vision
EXPO_PUBLIC_ELEVENLABS_API_KEY=your_elevenlabs_key
EXPO_PUBLIC_ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
```

### Finding your computer's local IP

**Windows**
```powershell
ipconfig
# Look for "IPv4 Address" under your WiFi adapter — e.g. 192.168.1.42
```

**Mac**
```bash
ipconfig getifaddr en0
# or: System Settings → Wi-Fi → Details → IP Address
```

Set `EXPO_PUBLIC_API_URL=http://<that IP>:8000`.

### Getting the API keys

**Google AI (for Gemma 4)**
1. Go to https://aistudio.google.com/app/apikey → **Create API key**
2. Verify the Gemma 4 model ID under **Explore models** — use the exact string shown

**ElevenLabs**
1. https://elevenlabs.io → profile icon → **Profile + API Key**
2. Only enable **Text to Speech** permission
3. Voice ID: browse https://elevenlabs.io/app/voice-library → pick a voice → **... → Copy Voice ID**
   (default `21m00Tcm4TlvDq8ikWAM` is Rachel and works out of the box)

---

## 3. Start the Python detection server

**Windows**
```powershell
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

**Mac**
```bash
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

On first run, YOLO26n (~5 MB) will auto-download. You should see:
```
Loading YOLO26 model...
Model ready.
INFO: Uvicorn running on http://0.0.0.0:8000
```

Verify it's working by opening `http://localhost:8000/health` in your browser — you should see `{"status":"ok"}`.

---

## 4. Start the Expo app

**Windows**
```powershell
npx expo start
```

**Mac**
```bash
npx expo start
```

A QR code will appear in the terminal. Open the **Expo Go** app on your iPhone and scan it. Make sure your iPhone and computer are on the same WiFi network.

---

## How it works

### Proximity alert
Every 500ms the app captures a low-quality frame and sends it to the Python server. The server returns normalized bounding boxes. The app finds the largest box area and maps it to a beep interval:

| Proximity | Box area | Beep interval |
|---|---|---|
| Far | > 1% | 1800ms |
| Medium | > 4% | 800ms |
| Close | > 12% | 350ms |
| Critical | > 30% | 120ms |

The beep tone is generated in code — no audio files needed.

### Scan
Tap the **SCAN** button to:
1. Capture a full-quality photo from the camera
2. Send it to Gemma 4 for a natural-language description
3. Send the description to ElevenLabs for TTS
4. Play the audio on the phone

### Voice activation (future)
The tap-to-scan approach works in Expo Go. If you want "say scan to trigger" voice activation, that requires a dev build with `expo-speech-recognition`. See `src/hooks/useVoiceCommand.ts`.

---

## Project structure

```
├── server.py                      # Python FastAPI + YOLO26 server
├── requirements.txt               # Python dependencies
├── App.tsx                        # Root component
├── src/
│   ├── components/
│   │   ├── DetectionOverlay.tsx   # Bounding box rendering
│   │   └── HUD.tsx                # Status bar + scan result display
│   ├── config/
│   │   └── constants.ts           # API URLs, thresholds, prompts
│   ├── hooks/
│   │   ├── useObjectDetection.ts  # Polls Python API for detections
│   │   ├── useProximityAlert.ts   # Adaptive beep system
│   │   └── useScan.ts             # Capture → Gemma → ElevenLabs flow
│   ├── services/
│   │   ├── vertexAI.ts            # Gemma 4 API
│   │   └── elevenLabs.ts          # ElevenLabs TTS API
│   ├── types/index.ts
│   └── utils/
│       ├── yolo26Utils.ts         # Label list, color helpers
│       └── beepUtils.ts           # WAV tone generator
```

---

## Troubleshooting

**"Server offline" shown in app**
- Make sure the Python server is running
- Make sure your phone and computer are on the same WiFi
- Double-check the IP in `.env` — rerun `ipconfig` (Windows) or `ipconfig getifaddr en0` (Mac)
- Try opening `http://<your-ip>:8000/health` in Safari on your iPhone

**Expo Go shows a blank screen or error**
- Make sure `.env` has all four `EXPO_PUBLIC_` variables filled in
- Restart the Expo server: `npx expo start --clear`

**YOLO detections look wrong**
- Adjust `CONFIDENCE_THRESHOLD` in `src/config/constants.ts` (lower = more detections, higher = fewer but more accurate)

**No audio on scan**
- Check that your iPhone is not on silent mode
- Verify your ElevenLabs API key and voice ID are correct
