import io
import os
import time
import re
import logging
from contextlib import asynccontextmanager
from typing import Dict, List

import torch
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
import uvicorn

from transformers import (
    AutoConfig,
    AutoProcessor,
    AutoModelForCausalLM,
    MarianMTModel,
    MarianTokenizer,
)
from sentence_transformers import SentenceTransformer

logging.basicConfig( level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

logging.getLogger("sentence_transformers").setLevel(logging.WARNING)
logging.getLogger("transformers").setLevel(logging.ERROR)

image_model_name = 'clip-ViT-B-32'
text_model_name = 'sentence-transformers/clip-ViT-B-32-multilingual-v1'
florence_model_name = 'microsoft/Florence-2-base'
mt_model_name = 'Helsinki-NLP/opus-mt-en-es'

device = None

image_model = None
text_model = None

florence_model = None
florence_processor = None

mt_model = None
mt_tokenizer = None

ai_port = int(os.getenv("AI_PORT", "8000"))

TEXT_PROMPT_TEMPLATES: List[str] = [
    "a photo of {q}",
    "a high-quality photo of {q}",
    "a detailed photograph of {q}",
    "a realistic photo of {q}, natural light",
]

@asynccontextmanager
async def lifespan(app: FastAPI):
    global device
    global image_model, text_model
    global florence_model, florence_processor
    global mt_model, mt_tokenizer

    load_start_time = time.time()

    torch.set_grad_enabled(False)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"Starting AI service on {device.upper()}")
    logger.info(f"Loading models...")

    model_start = time.time()
    image_model = SentenceTransformer(image_model_name, device=device)
    logger.info(f"Loading models [1/4] {image_model_name}... ({time.time() - model_start:.2f}s)")

    model_start = time.time()
    text_model = SentenceTransformer(text_model_name, device=device)
    logger.info(f"Loading models [2/4] {text_model_name}... ({time.time() - model_start:.2f}s)")

    model_start = time.time()
    florence_dtype = torch.float16 if device == "cuda" else torch.float32
    florence_config = AutoConfig.from_pretrained( florence_model_name, trust_remote_code=True, )

    setattr(florence_config, "attn_implementation", "eager")
    setattr(florence_config, "_attn_implementation_internal", "eager")

    florence_model = AutoModelForCausalLM.from_pretrained( florence_model_name, config=florence_config, dtype=florence_dtype, trust_remote_code=True).to(device)
    florence_processor = AutoProcessor.from_pretrained( florence_model_name, trust_remote_code=True)
    logger.info(f"Loading models [3/4] {florence_model_name}... ({time.time() - model_start:.2f}s)")

    model_start = time.time()
    mt_tokenizer = MarianTokenizer.from_pretrained(mt_model_name)
    mt_model = MarianMTModel.from_pretrained(mt_model_name).to(device)
    logger.info(f"Loading models [4/4] {mt_model_name}... ({time.time() - model_start:.2f}s)")

    logger.info(f"Ready - All models loaded in {time.time() - load_start_time:.2f}s")
    try:
        yield
    finally:
        logger.info("Shutting down...")


app = FastAPI(
    title="Image Search AI API",
    description="API for generating image/text embeddings and captions",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _average_unit_norm_rows(t: torch.Tensor) -> torch.Tensor:
    t = t / t.norm(dim=-1, keepdim=True).clamp_min(1e-12)
    m = t.mean(dim=0, keepdim=True)
    return m / m.norm(dim=-1, keepdim=True).clamp_min(1e-12)

def _to_device(batch: Dict[str, torch.Tensor]) -> Dict[str, torch.Tensor]:
    return {k: v.to(device) for k, v in batch.items()}

def _model_dtype(m: torch.nn.Module) -> torch.dtype:
    try:
        return next(m.parameters()).dtype
    except StopIteration:
        return torch.float16 if torch.cuda.is_available() else torch.float32

def _translate_en_to_es(text: str) -> str:
    tokenizer = mt_tokenizer(text, return_tensors="pt", padding=True).to(device)
    with torch.no_grad():
        out = mt_model.generate(**tokenizer, max_new_tokens=256)
    return mt_tokenizer.batch_decode(out, skip_special_tokens=True)[0].strip()

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "device": device,
        "models_loaded": bool(image_model and text_model and florence_model and mt_model),
    }

@app.post("/caption/image")
async def generate_image_captions(image: UploadFile = File(...)):
    try:
        start_time = time.time()
        contents = await image.read()
        pil_image = Image.open(io.BytesIO(contents)).convert("RGB")

        logger.info(f"[Captions] Processing image: size={pil_image.size}")

        task = "<MORE_DETAILED_CAPTION>"
        inputs = florence_processor(text=task, images=pil_image, return_tensors="pt")
        inputs = _to_device(inputs)

        if "pixel_values" in inputs:
            inputs["pixel_values"] = inputs["pixel_values"].to(dtype=_model_dtype(florence_model))

        tokenizer = florence_processor.tokenizer
        bos_id = getattr(tokenizer, "bos_token_id", None)
        eos_id = getattr(tokenizer, "eos_token_id", None)
        pad_id = getattr(tokenizer, "pad_token_id", None)

        params = {
            "input_ids": inputs["input_ids"],
            "pixel_values": inputs["pixel_values"],
            "num_beams": 1,
            "do_sample": False,
            "use_cache": False,
            "max_new_tokens": 220,
        }

        if bos_id is not None:
            params["bos_token_id"] = bos_id
        if eos_id is not None:
            params["eos_token_id"] = eos_id
        if pad_id is not None:
            params["pad_token_id"] = pad_id

        with torch.no_grad():
            generated_ids = florence_model.generate(**params)

        raw = florence_processor.batch_decode(generated_ids, skip_special_tokens=True)[0].strip()
        english = re.sub(r"<[^>]+>", "", raw).strip() or raw
        spanish = _translate_en_to_es(english)

        logger.info(f"[Captions] English: \"{english[:100]}...[{len(english)}]\"")
        logger.info(f"[Captions] Spanish: \"{spanish[:100]}...[{len(spanish)}]\"")

        processing_time = int((time.time() - start_time) * 1000)
        logger.info(f"[Captions] Generated image captions in {processing_time} ms")
        return JSONResponse({
            "status": "success",
            "data": {
                "captions": {"en": english, "es": spanish},
                "time": processing_time,
            },
        })
    except Exception as e:
        logger.error(f"Error generating captions: {str(e)}")
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})


@app.post("/embedding/image")
async def generate_image_embedding(image: UploadFile = File(...)):
    try:
        start_time = time.time()
        contents = await image.read()
        pil_image = Image.open(io.BytesIO(contents)).convert("RGB")

        logger.info(f"[Embedding] Processing image: size={pil_image.size}, mode={pil_image.mode}")

        embedding = image_model.encode(pil_image, convert_to_numpy=True).tolist()
        processing_time = int((time.time() - start_time) * 1000)

        logger.info(f"[Embedding] Generated image embedding in {processing_time}ms")

        return JSONResponse({
            "status": "success",
            "data": {
                "embedding": embedding,
                "dimensions": len(embedding),
                "time": processing_time,
            },
        })
    except Exception as e:
        logger.error(f"Error generating image embedding: {str(e)}")
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})

@app.post("/embedding/text")
async def generate_text_embedding(text: str = Form(...), ensembling: bool = Form(True)):
    try:
        start_time = time.time()

        logger.info(f"[Embedding] Text query: \"{text}\" (ensembling={'on' if ensembling else 'off'})")

        if ensembling:
            prompts = [tpl.format(q=text) for tpl in TEXT_PROMPT_TEMPLATES]
            logger.info(f"[Embedding] Created {len(prompts)} prompt variations")
            embeddings = text_model.encode(prompts, convert_to_numpy=True)
            embedding = _average_unit_norm_rows(torch.from_numpy(embeddings)).squeeze(0).numpy().tolist()
        else:
            embedding = text_model.encode(text, convert_to_numpy=True).tolist()

        processing_time = int((time.time() - start_time) * 1000)

        logger.info(f"[Embedding] Generated text embedding in {processing_time}ms")

        return JSONResponse({
            "status": "success",
            "data": {
                "embedding": embedding,
                "dimensions": len(embedding),
                "time": processing_time,
                "ensembled": ensembling,
            },
        })
    except Exception as e:
        logger.error(f"Error generating text embedding: {str(e)}")
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})


if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=ai_port, reload=True)
