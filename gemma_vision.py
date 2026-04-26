import base64
import queue
import threading
from typing import Optional

import cv2
import numpy as np
from llama_cpp import Llama


class GemmaVision:
    SYSTEM_PROMPT = (
        "You are an assistive vision AI for a wearable device. "
        "Describe all visible objects concisely. "
        "Read and transcribe any visible text exactly as written."
    )

    def __init__(
        self,
        model_path: str,
        n_ctx: int = 4096,
        n_gpu_layers: int = 0,
        verbose: bool = False,
    ) -> None:
        print("[Gemma] Loading model — this may take a moment...")
        self._llm = Llama(
            model_path=model_path,
            n_ctx=n_ctx,
            n_gpu_layers=n_gpu_layers,
            verbose=verbose,
            chat_format="gemma",
        )
        self._queue: queue.Queue[np.ndarray] = queue.Queue(maxsize=1)
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        print("[Gemma] Model ready.")

    def start(self) -> None:
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._inference_loop, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=5.0)

    def submit_frame(self, frame: np.ndarray) -> bool:
        """
        Queue a frame for Gemma inference.
        Returns False (and drops the frame) if a previous inference is still running.
        """
        try:
            self._queue.put_nowait(frame)
            return True
        except queue.Full:
            return False

    def _encode_frame(self, frame: np.ndarray) -> str:
        _, buf = cv2.imencode(".png", frame)
        b64 = base64.b64encode(buf.tobytes()).decode("utf-8")
        return f"data:image/png;base64,{b64}"

    def _inference_loop(self) -> None:
        while not self._stop_event.is_set():
            try:
                frame = self._queue.get(timeout=0.5)
            except queue.Empty:
                continue

            print("[Gemma] Analyzing frame...")
            try:
                image_uri = self._encode_frame(frame)
                messages = [
                    {"role": "system", "content": self.SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": [
                            {"type": "image_url", "image_url": {"url": image_uri}},
                            {
                                "type": "text",
                                "text": "Describe all objects you can see and read any visible text.",
                            },
                        ],
                    },
                ]
                response = self._llm.create_chat_completion(
                    messages=messages,
                    max_tokens=256,
                    temperature=0.2,
                )
                text = response["choices"][0]["message"]["content"]
                print(f"\n[Gemma] {text}\n")
            except Exception as exc:
                print(f"[Gemma] Inference error: {exc}")
            finally:
                self._queue.task_done()
