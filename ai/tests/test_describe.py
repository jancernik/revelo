import io

import pytest
from PIL import Image

import config
import describe
from conftest import square, upload


@pytest.fixture
def model_must_not_start(monkeypatch):
    """Prevent model downloads and fail if the model starts."""

    def model_paths():
        raise AssertionError("the description model was started")

    monkeypatch.setattr(describe, "model_paths", model_paths)


@pytest.mark.parametrize(
    "raw, expected",
    [
        ("  A dog\n sleeps.  ", "A dog sleeps."),
        ('Busy street with signs. "TOKYU PLAZA" is visible.', "Busy street with signs."),
        ("An old truck parked on a street. License plate: XNY 887.", "An old truck parked on a street."),
        ('Label with "Brava Golden Ale Premium" and hop logo.', 'Label with "Brava Golden Ale Premium" and hop logo.'),
        ("A lens at f/1.8 on a table", "A lens at f/1.8 on a table"),
        ("Un perro duerme. ¿Dónde?", "Un perro duerme."),
        ("Mt. Fuji rises behind a calm lake.", "Mt. Fuji rises behind a calm lake."),
        ("A U.S. Navy ship in Dr. Lee's harbor. Gulls fly.", "A U.S. Navy ship in Dr. Lee's harbor."),
        ("Der Markt am 12. Mai in Berlin.", "Der Markt am 12. Mai in Berlin."),
        ('A sign reads "Open." Two cars wait.', 'A sign reads "Open."'),
    ],
)
def test_clean_keeps_one_sentence(raw, expected):
    assert describe.clean(raw) == expected


def test_clean_rejects_an_empty_text():
    with pytest.raises(describe.DescriptionFailed):
        describe.clean(" \n ")


def test_translate_rejects_an_unknown_language_without_loading_the_model(client, model_must_not_start):
    response = client.post("/translate", data={"text": "A dog.", "target": "xx"})

    assert response.status_code == 400
    assert client.get("/health").json()["describe"]["loaded"] is False


def test_translate_rejects_blank_text(client, model_must_not_start):
    assert client.post("/translate", data={"text": " ", "target": "es"}).status_code == 400


def test_describe_rejects_an_unreadable_image(client, model_must_not_start):
    response = client.post("/describe/image", files={"image": ("image.jpg", b"not an image", "image/jpeg")})

    assert response.status_code == 400
    assert client.get("/health").json()["describe"]["loaded"] is False


def test_describe_rejects_an_image_over_the_pixel_limit(client, monkeypatch, model_must_not_start):
    monkeypatch.setattr(Image, "MAX_IMAGE_PIXELS", 1000)

    response = client.post("/describe/image", files=upload(square("red")))

    assert response.status_code == 400
    assert client.get("/health").json()["describe"]["loaded"] is False


@pytest.mark.parametrize(
    "path, request_body",
    [
        ("/describe/image", {"files": upload(square("red"))}),
        ("/translate", {"data": {"text": "A dog.", "target": "es"}}),
    ],
    ids=["describe", "translate"],
)
def test_the_model_is_not_started_without_enough_memory(client, monkeypatch, model_must_not_start, path, request_body):
    monkeypatch.setattr(describe, "available_memory_mb", lambda: config.describe_min_available_mb - 1)

    response = client.post(path, **request_body)

    assert response.status_code == 503
    assert "free memory" in response.json()["message"]
    assert client.get("/health").json()["describe"]["loaded"] is False


def test_available_memory_is_read_in_megabytes(monkeypatch):
    meminfo = "MemTotal:        8192000 kB\nMemFree:          512000 kB\nMemAvailable:    4096000 kB\n"
    monkeypatch.setattr(describe, "open", lambda path: io.StringIO(meminfo), raising=False)

    assert describe.available_memory_mb() == 4000


def test_available_memory_is_unlimited_where_it_cannot_be_read(monkeypatch):
    def missing(path):
        raise FileNotFoundError(path)

    monkeypatch.setattr(describe, "open", missing, raising=False)

    assert describe.available_memory_mb() == float("inf")


@pytest.mark.slow
def test_the_real_model_describes_and_translates(client):
    described = client.post("/describe/image", files=upload(square("red")))
    body = described.json()["data"]

    assert described.status_code == 200
    assert body["language"] == "en"
    assert body["model"] == config.describe_model
    assert "red" in body["text"].lower()
    assert client.get("/health").json()["describe"]["loaded"] is True

    translated = client.post("/translate", data={"text": "A red square.", "target": "es"})

    assert translated.status_code == 200
    assert translated.json()["data"]["language"] == "es"
    assert "rojo" in translated.json()["data"]["text"].lower()
