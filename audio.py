import threading
from typing import Optional

import numpy as np
import pygame


# (min_area_ratio, max_area_ratio) -> beep interval in seconds (None = silent)
_THRESHOLDS: list[tuple[tuple[float, float], Optional[float]]] = [
    ((0.00, 0.05), None),
    ((0.05, 0.15), 1.2),
    ((0.15, 0.35), 0.6),
    ((0.35, 0.60), 0.2),
    ((0.60, 1.01), 0.05),
]


class ProximityAudio:
    def __init__(
        self,
        sample_rate: int = 44100,
        beep_freq: float = 880.0,
        beep_duration_ms: int = 80,
    ) -> None:
        self._sample_rate = sample_rate
        self._beep_freq = beep_freq
        self._beep_duration_ms = beep_duration_ms
        self._area_ratio: float = 0.0
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None

    def set_area_ratio(self, ratio: float) -> None:
        self._area_ratio = max(0.0, min(ratio, 1.0))

    def start(self) -> None:
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._audio_loop, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=2.0)

    def _generate_beep(self) -> "pygame.mixer.Sound":
        duration_s = self._beep_duration_ms / 1000.0
        n_samples = int(self._sample_rate * duration_s)
        t = np.linspace(0, duration_s, n_samples, endpoint=False)
        wave = np.sin(2 * np.pi * self._beep_freq * t)
        # Linear fade-out to avoid clicks at the end
        envelope = np.linspace(1.0, 0.0, n_samples)
        samples = (wave * envelope * 32767).astype(np.int16)
        stereo = np.column_stack([samples, samples])
        return pygame.sndarray.make_sound(stereo)

    def _get_interval(self, ratio: float) -> Optional[float]:
        for (lo, hi), interval in _THRESHOLDS:
            if lo <= ratio < hi:
                return interval
        return None

    def _audio_loop(self) -> None:
        # Init mixer here — must happen on the audio thread on some Windows drivers
        pygame.mixer.init(
            frequency=self._sample_rate,
            size=-16,
            channels=2,
            buffer=512,
        )
        beep = self._generate_beep()

        try:
            while not self._stop_event.is_set():
                ratio = self._area_ratio
                interval = self._get_interval(ratio)

                if interval is None:
                    # Silent zone — poll slowly
                    self._stop_event.wait(0.05)
                    continue

                beep.play()
                self._stop_event.wait(interval)
        finally:
            pygame.mixer.quit()
