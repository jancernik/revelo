import io
import os
import time
import logging
from contextlib import asynccontextmanager
from typing import List

import torch
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
import uvicorn

from transformers import (
    CLIPModel,
    CLIPTokenizerFast,
    CLIPImageProcessor,
    BlipProcessor,
    BlipForConditionalGeneration,
)

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

device = None
clip_model = None
clip_tokenizer = None
clip_image_processor = None

caption_model = None
caption_processor = None

ai_port = int(os.getenv("AI_PORT", "8000"))

TEXT_PROMPT_TEMPLATES: List[str] = [
    "a photo of {q}",
    "a high-quality photo of {q}",
    "a detailed photograph of {q}",
    "a realistic photo of {q}, natural light",
]


def _average_unit_norm_rows(t: torch.Tensor) -> torch.Tensor:
    t = t / t.norm(dim=-1, keepdim=True).clamp_min(1e-12)
    m = t.mean(dim=0, keepdim=True)
    return m / m.norm(dim=-1, keepdim=True).clamp_min(1e-12)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global device
    global clip_model, clip_tokenizer, clip_image_processor
    global caption_model, caption_processor

    logger.info("Starting to load CLIP and BLIP models...")
    load_start_time = time.time()

    torch.set_grad_enabled(False)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"Using device: {device}")

    clip_name = "openai/clip-vit-large-patch14"
    clip_model = CLIPModel.from_pretrained(clip_name)
    clip_tokenizer = CLIPTokenizerFast.from_pretrained(clip_name)
    clip_image_processor = CLIPImageProcessor.from_pretrained(
        clip_name, use_fast=True)
    clip_model.to(device)

    blip_name = "Salesforce/blip-image-captioning-base"
    caption_processor = BlipProcessor.from_pretrained(blip_name, use_fast=True)
    caption_model = BlipForConditionalGeneration.from_pretrained(blip_name)
    caption_model.to(device)

    logger.info(
        f"Models loaded in {time.time() - load_start_time:.2f} seconds")
    try:
        yield
    finally:
        logger.info("Shutting down and cleaning up resources...")


app = FastAPI(
    title="CLIP Embeddings API",
    description="API for generating CLIP embeddings and captions",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "device": device,
        "models_loaded": (clip_model is not None) and (caption_model is not None),
    }


@app.post("/caption/image")
async def generate_image_caption(image: UploadFile = File(...)):
    try:
        start_time = time.time()
        contents = await image.read()
        pil_image = Image.open(io.BytesIO(contents)).convert("RGB")

        inputs = caption_processor(
            images=pil_image, return_tensors="pt").to(device)
        with torch.no_grad():
            generated_ids = caption_model.generate(
                **inputs,
                max_new_tokens=60,
                num_beams=3,
                early_stopping=True,
                no_repeat_ngram_size=2,
            )
            captions = caption_processor.batch_decode(
                generated_ids, skip_special_tokens=True)
            caption = captions[0] if captions else ""

        processing_time = int((time.time() - start_time) * 1000)
        logger.info(f"Caption generated in {processing_time} ms")

        return JSONResponse({
            "status": "success",
            "data": {
                "caption": caption,
                "time": processing_time,
            },
        })
    except Exception as e:
        logger.error(f"Error generating caption: {str(e)}")
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})


@app.post("/embedding/image")
async def generate_image_embedding(image: UploadFile = File(...)):
    try:
        start_time = time.time()
        contents = await image.read()
        pil_image = Image.open(io.BytesIO(contents)).convert("RGB")

        inputs = clip_image_processor(images=pil_image, return_tensors="pt")
        inputs = {k: v.to(device) for k, v in inputs.items()}

        with torch.no_grad():
            image_features = clip_model.get_image_features(**inputs)
            image_features = image_features / \
                image_features.norm(dim=-1, keepdim=True)

        embedding = image_features.cpu().numpy().tolist()[0]
        processing_time = int((time.time() - start_time) * 1000)

        logger.info(
            f"Image embedding generated in {round(processing_time)} ms")
        return JSONResponse({
            "status": "success",
            "data": {
                "embedding": embedding,
                "dimensions": len(embedding),
                "time": round(processing_time),
            },
        })
    except Exception as e:
        logger.error(f"Error generating image embedding: {str(e)}")
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})


@app.post("/embedding/text")
async def generate_text_embedding(text: str = Form(...), use_prompt_ensembling: bool = Form(True)):
    try:
        start_time = time.time()

        prompts = (
            [tpl.format(q=text) for tpl in TEXT_PROMPT_TEMPLATES]
            if use_prompt_ensembling else
            [text]
        )

        tokenized = clip_tokenizer(
            prompts,
            return_tensors="pt",
            padding=True,
            truncation=True
        ).to(device)

        with torch.no_grad():
            text_feats = clip_model.get_text_features(**tokenized)
            text_feature = _average_unit_norm_rows(
                text_feats).squeeze(0)

        embedding = text_feature.cpu().numpy().tolist()
        processing_time = int((time.time() - start_time) * 1000)

        logger.info(
            f"Text embedding (ensembled={use_prompt_ensembling}) for '{text}' in {processing_time} ms")
        return JSONResponse({
            "status": "success",
            "data": {
                "embedding": embedding,
                "dimensions": len(embedding),
                "time": round(processing_time),
                "ensembled": use_prompt_ensembling,
            },
        })
    except Exception as e:
        logger.error(f"Error generating text embedding: {str(e)}")
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})


if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=ai_port, reload=True)
