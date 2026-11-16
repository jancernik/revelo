"""Tests for the description server lifecycle."""
import base64
import io
import json
import os
import signal
import sys
import time
import urllib.request

import pytest
from fastapi.testclient import TestClient
from PIL import Image

import app as service
import config
import describe
import search
from conftest import square, upload

FAKE_SERVER = os.path.join(os.path.dirname(__file__), "fake_llama_server.py")
RAW_REPLY = "A red square on a plain background. It is bright."
REPLY = "A red square on a plain background."


@pytest.fixture
def fake_llama(tmp_path, monkeypatch):
    """Route requests to the fake server and yield a log-entry lookup."""
    binary = tmp_path / "llama-server"
    binary.write_text(f'#!/bin/sh\nexec "{sys.executable}" "{FAKE_SERVER}" "$@"\n')
    binary.chmod(0o755)
    log = tmp_path / "log.jsonl"
    monkeypatch.setenv("LLAMA_SERVER_PATH", str(binary))
    monkeypatch.setenv("FAKE_LLAMA_LOG", str(log))
    monkeypatch.setenv("FAKE_LLAMA_REPLY", RAW_REPLY)
    monkeypatch.setattr(describe, "model_paths", lambda: ("model.gguf", "projector.gguf"))
    monkeypatch.setattr(describe, "available_memory_mb", lambda: float("inf"))
    service.description_model.close()

    def entries(key: str) -> list:
        lines = log.read_text().splitlines() if log.exists() else []
        return [entry for entry in map(json.loads, lines) if key in entry]

    yield entries
    service.description_model.close()


def running(pid: int) -> bool:
    try:
        with open(f"/proc/{pid}/stat") as stat:
            return stat.read().rsplit(")", 1)[1].split()[0] != "Z"
    except FileNotFoundError:
        return False


def chat_once() -> str:
    server = describe.LlamaServer()
    try:
        return server.chat("Hello", 5)
    finally:
        server.close()


def test_describes_an_image_with_one_server(client, fake_llama):
    for _ in range(2):
        response = client.post("/describe/image", files=upload(square("red")))
        assert response.status_code == 200
        data = response.json()["data"]
        assert (data["text"], data["language"], data["model"]) == (REPLY, "en", config.describe_model)

    [start] = fake_llama("args")
    assert start["args"][start["args"].index("--cache-ram") + 1] == "0"
    body = fake_llama("request")[0]["request"]
    assert (body["temperature"], body["max_tokens"]) == (0, config.describe_max_tokens)
    image_part, text_part = body["messages"][0]["content"]
    assert image_part["image_url"]["url"].startswith("data:image/jpeg;base64,")
    assert text_part["text"] == config.describe_prompt
    assert client.get("/health").json()["describe"]["loaded"] is True


def test_a_large_image_is_downscaled_before_it_is_sent(client, fake_llama):
    assert client.post("/describe/image", files=upload(Image.new("RGB", (2000, 1000), "red"))).status_code == 200

    url = fake_llama("request")[0]["request"]["messages"][0]["content"][0]["image_url"]["url"]
    sent = Image.open(io.BytesIO(base64.b64decode(url.split(",", 1)[1])))
    assert sent.size == (config.describe_image_max_side, config.describe_image_max_side // 2)


@pytest.mark.parametrize("mode, format", [("RGBA", "PNG"), ("P", "PNG"), ("LA", "PNG"), ("I;16", "PNG"), ("CMYK", "JPEG")])
def test_describes_images_in_other_modes(client, fake_llama, mode, format):
    assert client.post("/describe/image", files=upload(Image.new(mode, (64, 64)), format)).status_code == 200


def test_translates_through_the_server(client, fake_llama):
    response = client.post("/translate", data={"text": " A red square. ", "target": "es"})

    assert response.status_code == 200
    data = response.json()["data"]
    assert (data["text"], data["language"], data["model"]) == (REPLY, "es", config.describe_model)
    body = fake_llama("request")[0]["request"]
    assert body["max_tokens"] == config.translate_max_tokens
    assert body["messages"][0]["content"] == config.translate_prompt.format(language="Spanish", text="A red square.")


def test_a_server_that_stops_answering_is_replaced(client, fake_llama, monkeypatch):
    monkeypatch.setattr(config, "describe_request_timeout_seconds", 0.5)
    monkeypatch.setenv("FAKE_LLAMA_MODE", "hang")
    assert client.post("/describe/image", files=upload(square("red"))).status_code == 500
    [hung] = fake_llama("args")
    assert not running(hung["pid"])

    monkeypatch.delenv("FAKE_LLAMA_MODE")
    assert client.post("/describe/image", files=upload(square("red"))).status_code == 200
    assert len(fake_llama("args")) == 2


@pytest.mark.parametrize("variable, value", [("FAKE_LLAMA_REPLY", "  "), ("FAKE_LLAMA_MODE", "reject")])
def test_an_answer_without_a_text_is_not_a_server_failure(client, fake_llama, monkeypatch, variable, value):
    monkeypatch.setenv(variable, value)
    described = client.post("/describe/image", files=upload(square("red")))
    translated = client.post("/translate", data={"text": "A red square.", "target": "es"})

    assert (described.status_code, translated.status_code) == (422, 422)
    assert len(fake_llama("args")) == 1


def test_a_crashed_server_is_started_again(client, fake_llama):
    assert client.post("/translate", data={"text": "A dog.", "target": "es"}).status_code == 200
    [first] = fake_llama("args")
    os.kill(first["pid"], signal.SIGKILL)
    deadline = time.monotonic() + 5
    while running(first["pid"]) and time.monotonic() < deadline:
        time.sleep(0.05)

    assert client.post("/translate", data={"text": "A dog.", "target": "es"}).status_code == 200
    assert len(fake_llama("args")) == 2


def test_an_idle_server_is_stopped(fake_llama, monkeypatch):
    monkeypatch.setattr(config, "describe_idle_seconds", 0)
    model = describe.lazy()

    with model.use() as server:
        assert server.chat("Hello", 5) == RAW_REPLY
    [start] = fake_llama("args")

    assert model.release_if_idle() is True
    assert not running(start["pid"])


def test_shutdown_stops_the_server(fake_llama, monkeypatch):
    monkeypatch.setattr(search, "load", lambda device: None)

    with TestClient(service.app) as client:
        assert client.post("/translate", data={"text": "A dog.", "target": "es"}).status_code == 200
    [start] = fake_llama("args")

    assert not running(start["pid"])
    assert not service.description_model.loaded


def test_requests_wait_until_the_model_is_loaded(fake_llama, monkeypatch):
    monkeypatch.setenv("FAKE_LLAMA_LOAD_SECONDS", "1")

    assert chat_once() == RAW_REPLY


def test_a_missing_server_binary_is_reported_and_search_keeps_working(client, fake_llama, monkeypatch):
    monkeypatch.setenv("LLAMA_SERVER_PATH", "/nonexistent/llama-server")

    response = client.post("/describe/image", files=upload(square("red")))

    assert response.status_code == 500
    assert response.json() == {"status": "error", "message": "Internal error"}
    assert client.post("/embed/text", data={"text": "dog"}).status_code == 200


def test_a_server_that_exits_while_starting_is_reported_at_once(fake_llama, monkeypatch):
    monkeypatch.setenv("FAKE_LLAMA_MODE", "exit")
    monkeypatch.setattr(config, "describe_start_timeout_seconds", 5)

    with pytest.raises(describe.DescriptionFailed, match="exited with code 3"):
        describe.LlamaServer()


def test_a_server_that_does_not_become_ready_is_stopped(fake_llama, monkeypatch):
    monkeypatch.setenv("FAKE_LLAMA_MODE", "never-ready")
    monkeypatch.setattr(config, "describe_start_timeout_seconds", 1)

    with pytest.raises(describe.DescriptionFailed, match="in time"):
        describe.LlamaServer()
    [start] = fake_llama("args")

    assert not running(start["pid"])


def test_proxy_settings_do_not_apply_to_the_server(fake_llama, monkeypatch):
    for name in ("no_proxy", "NO_PROXY"):
        monkeypatch.delenv(name, raising=False)
    for name in ("http_proxy", "HTTP_PROXY"):
        monkeypatch.setenv(name, "http://127.0.0.1:9")
    monkeypatch.setattr(urllib.request, "_opener", None)
    monkeypatch.setattr(config, "describe_start_timeout_seconds", 5)

    assert chat_once() == RAW_REPLY
