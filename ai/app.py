import asyncio
import io
import logging
import os
import time
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import torch
import uvicorn
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image, UnidentifiedImageError

import config
import describe
import search

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

logging.getLogger("transformers").setLevel(logging.ERROR)
logging.getLogger("httpx").setLevel(logging.WARNING)

ai_port = int(os.getenv("AI_PORT", "8000"))
device = "cuda" if torch.cuda.is_available() else "cpu"
description_model = describe.lazy()


async def _release_idle_models() -> None:
    while True:
        await asyncio.sleep(60)
        await asyncio.to_thread(description_model.release_if_idle)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    logger.info(f"Starting AI service on {device.upper()}")
    search.load(device)
    logger.info("Ready")
    release_task = asyncio.create_task(_release_idle_models())
    try:
        yield
    finally:
        release_task.cancel()
        description_model.close()
        logger.info("Shutting down...")


app = FastAPI(
    title="Image Search AI API",
    description="API for generating image/text embeddings and image descriptions",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _success(data: dict, start_time: float) -> JSONResponse:
    return JSONResponse({"status": "success", "data": {**data, "time": int((time.time() - start_time) * 1000)}})


def _error(status_code: int, message: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"status": "error", "message": message})


def _description_error(error: Exception, context: str) -> JSONResponse:
    if isinstance(error, describe.NotEnoughMemory):
        logger.warning(str(error))
        return _error(503, str(error))
    if isinstance(error, describe.UnusableOutput):
        logger.warning(f"{context}: {error}")
        return _error(422, str(error))
    logger.exception(context, exc_info=error)
    return _error(500, str(error))


def _open_image(upload: UploadFile) -> Image.Image | None:
    try:
        return Image.open(io.BytesIO(upload.file.read())).convert("RGB")
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        return None


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "device": device,
        "search": {"model": config.search_model, "ready": search.ready()},
        "describe": {"model": config.describe_model, "loaded": description_model.loaded},
    }


@app.post("/embed/image")
def embed_image(image: UploadFile = File(...)):
    start_time = time.time()
    pil_image = _open_image(image)
    if pil_image is None:
        return _error(400, "The file is not a readable image")
    try:
        embedding = search.embed_image(pil_image)
    except Exception as e:
        logger.exception("Error generating image embedding")
        return _error(500, str(e))
    return _success({"embedding": embedding, "model": config.search_model}, start_time)


@app.post("/embed/text")
def embed_text(text: str = Form(...)):
    start_time = time.time()
    text = text.strip()
    if not text:
        return _error(400, "The text is empty")
    try:
        embedding = search.embed_text(text)
    except Exception as e:
        logger.exception("Error generating text embedding")
        return _error(500, str(e))
    return _success({"embedding": embedding, "model": config.search_model}, start_time)


@app.post("/describe/image")
def describe_image(image: UploadFile = File(...)):
    start_time = time.time()
    pil_image = _open_image(image)
    if pil_image is None:
        return _error(400, "The file is not a readable image")
    try:
        with description_model.use() as server:
            text = describe.describe_image(server, pil_image)
    except Exception as e:
        return _description_error(e, "Error describing image")
    return _success({"text": text, "language": config.describe_language, "model": config.describe_model}, start_time)


@app.post("/translate")
def translate(text: str = Form(...), target: str = Form(...)):
    start_time = time.time()
    text = text.strip()
    if not text:
        return _error(400, "The text is empty")
    try:
        describe.language_name(target)
    except describe.UnknownLanguage as e:
        return _error(400, str(e))
    try:
        with description_model.use() as server:
            translated = describe.translate(server, text, target)
    except Exception as e:
        return _description_error(e, "Error translating text")
    return _success({"text": translated, "language": target, "model": config.describe_model}, start_time)


if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=ai_port, reload=True)
