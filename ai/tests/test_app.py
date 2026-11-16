import asyncio
import time

import app as service


class SlowRelease:
    calls = 0

    def release_if_idle(self):
        self.calls += 1
        time.sleep(0.2)
        return True


def test_releasing_the_idle_model_does_not_block_the_event_loop(monkeypatch):
    sleep = asyncio.sleep
    monkeypatch.setattr(asyncio, "sleep", lambda seconds: sleep(0 if seconds == 60 else seconds))
    model = SlowRelease()
    monkeypatch.setattr(service, "description_model", model)

    async def longest_pause():
        release = asyncio.create_task(service._release_idle_models())
        longest, last = 0.0, time.monotonic()
        for _ in range(30):
            await sleep(0.01)
            now = time.monotonic()
            longest, last = max(longest, now - last), now
        release.cancel()
        return longest

    assert asyncio.run(longest_pause()) < 0.1
    assert model.calls > 0
