import io

import pytest
from fastapi.testclient import TestClient
from PIL import Image

import app as service


@pytest.fixture(scope="session")
def client():
    with TestClient(service.app) as test_client:
        yield test_client


def square(color: str) -> Image.Image:
    return Image.new("RGB", (256, 256), color)


def upload(image: Image.Image, format: str = "PNG") -> dict:
    """Return multipart form data for a single image upload."""
    buffer = io.BytesIO()
    image.save(buffer, format=format)
    return {"image": ("image", buffer.getvalue(), "application/octet-stream")}


def embed_image(client: TestClient, color: str) -> list[float]:
    response = client.post("/embed/image", files=upload(square(color)))
    assert response.status_code == 200
    return response.json()["data"]["embedding"]


def embed_text(client: TestClient, text: str) -> list[float]:
    response = client.post("/embed/text", data={"text": text})
    assert response.status_code == 200
    return response.json()["data"]["embedding"]


def dot(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))
