import threading
import time

import pytest

from lazy import LazyModel


def test_loads_on_first_use_only():
    loads = []
    model = LazyModel("test", lambda: loads.append(1) or object(), idle_seconds=60)

    assert not model.loaded
    with model.use() as first:
        pass
    with model.use() as second:
        pass

    assert model.loaded
    assert first is second
    assert len(loads) == 1


def test_releases_after_idle_and_reloads():
    loads = []
    model = LazyModel("test", lambda: loads.append(1) or object(), idle_seconds=0)

    with model.use():
        pass
    assert model.release_if_idle() is True
    assert not model.loaded

    with model.use():
        pass
    assert len(loads) == 2


def test_keeps_a_recently_used_model():
    model = LazyModel("test", object, idle_seconds=60)

    with model.use():
        pass

    assert model.release_if_idle() is False
    assert model.loaded


def test_does_not_release_a_model_in_use():
    model = LazyModel("test", object, idle_seconds=0)
    with model.use():
        pass
    released = []

    with model.use():
        thread = threading.Thread(target=lambda: released.append(model.release_if_idle()))
        thread.start()
        thread.join()

    assert released == [False]
    assert model.loaded


def test_failed_load_is_retried():
    attempts = []

    def loader():
        attempts.append(1)
        if len(attempts) == 1:
            raise RuntimeError("download failed")
        return object()

    model = LazyModel("test", loader, idle_seconds=60)

    with pytest.raises(RuntimeError):
        with model.use():
            pass
    assert not model.loaded

    with model.use():
        pass
    assert model.loaded


def test_closes_the_model_on_release():
    closed = []
    model = LazyModel("test", object, idle_seconds=0, closer=closed.append)

    with model.use() as loaded:
        pass
    model.release_if_idle()

    assert closed == [loaded]


def test_replaces_a_model_that_stopped_working():
    state = {"healthy": True}
    closed = []
    model = LazyModel("test", object, idle_seconds=60, closer=closed.append, healthy=lambda _: state["healthy"])

    with model.use() as first:
        pass
    state["healthy"] = False
    with model.use() as second:
        pass

    assert second is not first
    assert closed == [first]


def test_idle_time_ignores_wall_clock_changes(monkeypatch):
    model = LazyModel("test", object, idle_seconds=0)
    with model.use():
        pass

    wall_clock = time.time() - 3600
    monkeypatch.setattr(time, "time", lambda: wall_clock)

    assert model.release_if_idle() is True


def test_close_releases_the_model():
    closed = []
    model = LazyModel("test", object, idle_seconds=60, closer=closed.append)
    with model.use() as loaded:
        pass

    model.close()

    assert closed == [loaded]
    assert not model.loaded


def test_keeps_a_model_used_while_the_release_was_starting():
    model = LazyModel("test", object, idle_seconds=0.05)
    with model.use():
        pass
    time.sleep(0.06)
    idle = iter([True, False])
    model._idle = lambda: next(idle)

    assert model.release_if_idle() is False
    assert model.loaded
