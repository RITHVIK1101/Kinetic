# Kinetic

Real-time object detection with proximity audio alerts and on-demand AI scene description. Built for wearable devices.

- **Live camera feed** from iPhone (via EpocCam/Reincubate Camo)
- **YOLO26** object detection on every frame
- **Proximity beeping** — faster as objects get closer (like a reverse camera)
- **Press any key** → Gemma 4 E2B describes what's in view and reads visible text

---

## Requirements

- Python 3.10+
- iPhone with [EpocCam](https://www.elgato.com/us/en/s/downloads) or [Reincubate Camo](https://reincubate.com/camo/) installed
- ~1.5 GB free disk space for the Gemma model

---

## Setup

### 1. Clone and create a virtual environment

```bash
python -m venv .venv
```

**Windows:**
```bash
.venv\Scripts\activate
```

**macOS:**
```bash
source .venv/bin/activate
```

---

### 2. Install dependencies

**macOS** — builds llama-cpp-python from source using Xcode tools (installed automatically if missing):
```bash
pip install -r requirements.txt
```

**Windows** — llama-cpp-python requires a C++ compiler to build from source. Install the pre-built CPU wheel first, then the rest of the requirements:
```bash
pip install llama-cpp-python --only-binary llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cpu
pip install -r requirements.txt
```

---

### 3. Download the Gemma 4 E2B model

```bash
python -c "from huggingface_hub import hf_hub_download; hf_hub_download('unsloth/gemma-4-E2B-it-GGUF', 'gemma-4-E2B-it-Q4_K_M.gguf', local_dir='./models')"
```

YOLO26 downloads automatically on first run.

---

### 4. Connect your iPhone

1. Install Camo on both your iPhone and computer
2. Connect the iPhone via USB
3. Find the camera index assigned to it:

```bash
python camera_scan.py
```

4. Set `CAMERA_INDEX` at the top of `main.py` to the result (usually `1` or `2`)

---

### 5. Run

```bash
python main.py
```

| Input | Action |
|---|---|
| Any key | Capture frame → Gemma describes objects and reads text (output in terminal) |
| ESC | Quit |

---

## Configuration

All tuneable settings are at the top of `main.py`:

| Variable | Default | Description |
|---|---|---|
| `CAMERA_INDEX` | `1` | OpenCV camera index for the iPhone |
| `YOLO_MODEL_PATH` | `yolo26n.pt` | YOLO26 model size (n/s/m/l/x) |
| `YOLO_CONF` | `0.4` | Detection confidence threshold |
| `GEMMA_MODEL_PATH` | `models/gemma-4-E2B-it-Q4_K_M.gguf` | Path to Gemma GGUF file |
| `GEMMA_GPU_LAYERS` | `0` | Layers to offload to GPU (`-1` = all) |
