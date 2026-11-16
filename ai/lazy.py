import ctypes
import gc
import logging
import threading
import time
from collections.abc import Callable, Generator
from contextlib import contextmanager
from typing import Generic, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")


def _return_freed_memory() -> None:
    gc.collect()
    # The allocator retains freed model memory until it is explicitly trimmed.
    try:
        ctypes.CDLL("libc.so.6").malloc_trim(0)
    except (OSError, AttributeError):
        pass


class LazyModel(Generic[T]):
    """A model that is loaded on first use and released after an idle period.

    Requests are serialised, so one instance never runs two inferences at once.
    """

    def __init__(
        self,
        name: str,
        loader: Callable[[], T],
        idle_seconds: float,
        closer: Callable[[T], None] | None = None,
        healthy: Callable[[T], bool] | None = None,
    ) -> None:
        self.name = name
        self._loader = loader
        self._idle_seconds = idle_seconds
        self._closer = closer
        self._healthy = healthy
        self._lock = threading.Lock()
        self._model: T | None = None
        self._last_used = 0.0

    @property
    def loaded(self) -> bool:
        return self._model is not None

    @contextmanager
    def use(self) -> Generator[T]:
        with self._lock:
            if self._model is not None and self._healthy and not self._healthy(self._model):
                logger.warning(f"{self.name} stopped working and is loaded again")
                self._close()
            if self._model is None:
                start = time.time()
                self._model = self._loader()
                logger.info(f"Loaded {self.name} in {time.time() - start:.2f}s")
            try:
                yield self._model
            finally:
                self._last_used = time.monotonic()

    def _close(self) -> None:
        model, self._model = self._model, None
        if model is not None and self._closer:
            self._closer(model)

    def close(self) -> None:
        with self._lock:
            self._close()

    def _idle(self) -> bool:
        return self._model is not None and time.monotonic() - self._last_used >= self._idle_seconds

    def release_if_idle(self) -> bool:
        if not self._idle() or not self._lock.acquire(blocking=False):
            return False
        try:
            if not self._idle():
                return False
            self._close()
        finally:
            self._lock.release()
        _return_freed_memory()
        logger.info(f"Released {self.name} after {self._idle_seconds:.0f}s idle")
        return True
