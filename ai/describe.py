"""Image descriptions and translations from a local model server."""
import base64
import io
import json
import os
import re
import socket
import subprocess
import time
import urllib.error
import urllib.request

from huggingface_hub import hf_hub_download
from PIL import Image

import config
from lazy import LazyModel


class UnknownLanguage(ValueError):
    pass


class DescriptionFailed(RuntimeError):
    pass


class NotEnoughMemory(DescriptionFailed):
    pass


class UnusableOutput(DescriptionFailed):
    """The model returns no usable text."""


def available_memory_mb() -> float:
    """Return available memory in MB, or infinity when it cannot be read."""
    try:
        with open("/proc/meminfo") as meminfo:
            for line in meminfo:
                if line.startswith("MemAvailable:"):
                    return int(line.split()[1]) / 1024
    except OSError:
        pass
    return float("inf")


def model_paths() -> tuple[str, str]:
    """Return paths to the model and projector, downloading missing files."""
    return (
        hf_hub_download(config.describe_repo, config.describe_model_file, revision=config.describe_revision),
        hf_hub_download(config.describe_repo, config.describe_projector_file, revision=config.describe_revision),
    )


def _free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


_local_opener = urllib.request.build_opener(urllib.request.ProxyHandler({ }))


class LlamaServer:
    def __init__(self) -> None:
        available = available_memory_mb()
        if available < config.describe_min_available_mb:
            raise NotEnoughMemory(
                f"The description model needs {config.describe_min_available_mb} MB of free memory, "
                f"{available:.0f} MB are available"
            )

        binary = os.getenv("LLAMA_SERVER_PATH", "llama-server")
        model, projector = model_paths()
        port = _free_port()
        self.url = f"http://127.0.0.1:{port}"
        command = [
            binary,
            "--model", model,
            "--mmproj", projector,
            "--ctx-size", "4096",
            "--parallel", "1",
            "--cache-ram", "0",
            "--host", "127.0.0.1",
            "--port", str(port),
        ]
        threads = os.getenv("AI_DESCRIBE_THREADS")
        if threads:
            command += ["--threads", threads]

        env = dict(os.environ)
        library_dir = os.path.dirname(binary)
        if library_dir:
            env["LD_LIBRARY_PATH"] = os.pathsep.join(filter(None, [library_dir, env.get("LD_LIBRARY_PATH")]))
        self._process = subprocess.Popen(command, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        try:
            self._wait_until_ready()
        except Exception:
            self.close()
            raise

    def _wait_until_ready(self) -> None:
        deadline = time.time() + config.describe_start_timeout_seconds
        while time.time() < deadline:
            if not self.alive():
                raise DescriptionFailed(f"llama-server exited with code {self._process.returncode} while starting")
            try:
                with _local_opener.open(f"{self.url}/health", timeout=2) as response:
                    if response.status == 200:
                        return
            except (urllib.error.URLError, OSError):
                pass
            time.sleep(0.25)
        raise DescriptionFailed("llama-server did not become ready in time")

    def alive(self) -> bool:
        return self._process.poll() is None

    def close(self) -> None:
        if self.alive():
            self._process.terminate()
            try:
                self._process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self._process.kill()
                self._process.wait()

    def chat(self, content: str | list[dict], max_tokens: int) -> str:
        body = json.dumps(
            {"messages": [{"role": "user", "content": content}], "temperature": 0, "max_tokens": max_tokens}
        ).encode()
        request = urllib.request.Request(
            f"{self.url}/v1/chat/completions", body, {"Content-Type": "application/json"}
        )
        try:
            with _local_opener.open(request, timeout=config.describe_request_timeout_seconds) as response:
                return json.load(response)["choices"][0]["message"]["content"]
        except urllib.error.HTTPError as error:
            failure = UnusableOutput if 400 <= error.code < 500 else DescriptionFailed
            raise failure(f"llama-server answered {error.code}: {error.reason}") from error
        except (urllib.error.URLError, OSError) as error:
            # Closing the unresponsive server lets the next request restart it.
            self.close()
            raise DescriptionFailed(f"llama-server request failed: {error}") from error
        except (KeyError, ValueError) as error:
            raise DescriptionFailed(f"llama-server sent an unexpected answer: {error}") from error


def lazy() -> LazyModel[LlamaServer]:
    return LazyModel(
        "description model",
        LlamaServer,
        config.describe_idle_seconds,
        closer=LlamaServer.close,
        healthy=LlamaServer.alive,
    )


# A sentence break needs terminal punctuation and a likely sentence start.
_sentence_end = re.compile(r'(?:(?<=[.!?])|(?<=[.!?]["”]))\s+(?=[A-ZÀ-Þ¿¡"“])')
# A period after an initial, an ordinal or a common abbreviation does not end the sentence.
_abbreviation = re.compile(r"\b(?:\w|\d+|Mr|Mrs|Ms|Dr|Dra|Prof|St|Sta|Mt|Jr|Sr|Sra|Av|Nr|No)\.$")


def clean(text: str) -> str:
    """Return the first sentence, or raise UnusableOutput for empty text."""
    text = " ".join(text.split())
    for end in _sentence_end.finditer(text):
        if not _abbreviation.search(text, 0, end.start()):
            text = text[: end.start()]
            break
    if not text:
        raise UnusableOutput("The model returned an empty text")
    return text


def _data_uri(image: Image.Image) -> str:
    image = image.copy()
    image.thumbnail((config.describe_image_max_side, config.describe_image_max_side))
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=90)
    return "data:image/jpeg;base64," + base64.b64encode(buffer.getvalue()).decode()


def describe_image(server: LlamaServer, image: Image.Image) -> str:
    content = [
        {"type": "image_url", "image_url": {"url": _data_uri(image)}},
        {"type": "text", "text": config.describe_prompt},
    ]
    return clean(server.chat(content, config.describe_max_tokens))


def language_name(target: str) -> str:
    try:
        return config.translate_languages[target]
    except KeyError:
        raise UnknownLanguage(f"Unsupported target language: {target}") from None


def translate(server: LlamaServer, text: str, target: str) -> str:
    prompt = config.translate_prompt.format(language=language_name(target), text=text)
    return clean(server.chat(prompt, config.translate_max_tokens))
