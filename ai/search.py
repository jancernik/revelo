"""Search embeddings for images and text in a shared vector space."""
import logging
import threading
import time

import torch
from PIL import Image
from transformers import AutoModel, AutoProcessor
from transformers.modeling_outputs import BaseModelOutputWithPooling

import config

logger = logging.getLogger(__name__)

_model = None
_processor = None
_device = "cpu"
_lock = threading.Lock()


def load(device: str) -> None:
    global _model, _processor, _device
    start = time.time()
    _processor = AutoProcessor.from_pretrained(config.search_model, revision=config.search_model_revision)
    _model = (
        AutoModel.from_pretrained(config.search_model, revision=config.search_model_revision, dtype=torch.float32)
        .eval()
        .to(device)
    )
    _device = device
    logger.info(f"Loaded {config.search_model} in {time.time() - start:.2f}s")


def ready() -> bool:
    return _model is not None


def _normalised(features: BaseModelOutputWithPooling | torch.Tensor) -> list[float]:
    vector = getattr(features, "pooler_output", features)[0].float()
    return (vector / vector.norm().clamp_min(1e-12)).cpu().tolist()


def embed_image(image: Image.Image) -> list[float]:
    inputs = _processor(images=image, return_tensors="pt").to(_device)
    with _lock, torch.no_grad():
        return _normalised(_model.get_image_features(**inputs))


def embed_text(text: str) -> list[float]:
    inputs = _processor(
        text=[text.lower()],
        padding="max_length",
        max_length=config.search_text_max_tokens,
        truncation=True,
        return_tensors="pt",
    ).to(_device)
    with _lock, torch.no_grad():
        return _normalised(_model.get_text_features(**inputs))
