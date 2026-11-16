import threading
import time

import pytest
import torch
from PIL import Image

import config
import search
from conftest import dot, embed_image, embed_text, square, upload


def test_health_reports_search_ready(client):
    body = client.get("/health").json()

    assert body["status"] == "healthy"
    assert body["search"] == {"model": config.search_model, "ready": True}
    assert body["describe"]["model"] == config.describe_model


def test_text_embedding_is_a_unit_vector(client):
    response = client.post("/embed/text", data={"text": "a red square"})
    body = response.json()

    assert response.status_code == 200
    assert body["status"] == "success"
    assert body["data"]["model"] == config.search_model
    assert len(body["data"]["embedding"]) == 768
    assert dot(body["data"]["embedding"], body["data"]["embedding"]) == pytest.approx(1, abs=1e-4)


def test_image_embedding_is_a_unit_vector(client):
    response = client.post("/embed/image", files=upload(square("red")))
    body = response.json()

    assert response.status_code == 200
    assert body["data"]["model"] == config.search_model
    assert len(body["data"]["embedding"]) == 768
    assert dot(body["data"]["embedding"], body["data"]["embedding"]) == pytest.approx(1, abs=1e-4)


def test_text_is_case_insensitive_and_trimmed(client):
    assert embed_text(client, "  A Red Square ") == pytest.approx(embed_text(client, "a red square"), abs=1e-6)


def test_embeddings_are_deterministic(client):
    assert embed_image(client, "red") == embed_image(client, "red")


@pytest.mark.parametrize("queries", [("red", "blue"), ("rojo", "azul")])
def test_matching_pairs_score_higher(client, queries):
    red_text, blue_text = (embed_text(client, q) for q in queries)
    red_image, blue_image = embed_image(client, "red"), embed_image(client, "blue")

    assert dot(red_text, red_image) > dot(red_text, blue_image)
    assert dot(blue_text, blue_image) > dot(blue_text, red_image)


def test_unreadable_image_is_rejected(client):
    response = client.post("/embed/image", files={"image": ("image.jpg", b"not an image", "image/jpeg")})

    assert response.status_code == 400
    assert response.json()["status"] == "error"


def test_an_image_over_the_pixel_limit_is_rejected(client, monkeypatch):
    monkeypatch.setattr(Image, "MAX_IMAGE_PIXELS", 1000)

    response = client.post("/embed/image", files=upload(square("red")))

    assert response.status_code == 400
    assert response.json()["status"] == "error"


def test_blank_text_is_rejected(client):
    response = client.post("/embed/text", data={"text": "   "})

    assert response.status_code == 400
    assert response.json()["status"] == "error"


def test_long_text_is_truncated(client):
    assert len(embed_text(client, "dog " * 500)) == 768


def test_inferences_run_one_at_a_time(monkeypatch):
    running, peak = [0], [0]

    class Inputs(dict):
        def to(self, device):
            return self

    class Model:
        def features(self, **inputs):
            running[0] += 1
            peak[0] = max(peak[0], running[0])
            time.sleep(0.05)
            running[0] -= 1
            return torch.ones(1, 4)

        get_text_features = get_image_features = features

    monkeypatch.setattr(search, "_model", Model())
    monkeypatch.setattr(search, "_processor", lambda **kwargs: Inputs())
    calls = [lambda: search.embed_text("dog"), lambda: search.embed_image(None)] * 3
    threads = [threading.Thread(target=call) for call in calls]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert peak[0] == 1
