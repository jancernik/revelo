from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import torch
from transformers import (
    CLIPModel, CLIPProcessor,
    BlipProcessor, BlipForConditionalGeneration,
)
from PIL import Image
import io
import time
import uvicorn
import logging
from contextlib import asynccontextmanager
import os

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

model = None
processor = None
caption_model = None
caption_processor = None
device = None

api_base_url = os.getenv("API_BASE_URL")

@asynccontextmanager
async def lifespan(app: FastAPI):
    global model, processor, device
    global caption_model, caption_processor
    global paraphrase_model, paraphrase_tokenizer

    logger.info("Starting to load CLIP and BLIP models...")
    load_start_time = time.time()

    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"Using device: {device}")

    model_name = "openai/clip-vit-large-patch14"
    model = CLIPModel.from_pretrained(model_name)
    processor = CLIPProcessor.from_pretrained(model_name, use_fast=True)
    model.to(device)

    caption_model_name = "Salesforce/blip-image-captioning-base"
    caption_processor = BlipProcessor.from_pretrained(caption_model_name,use_fast=True)
    caption_model = BlipForConditionalGeneration.from_pretrained(caption_model_name)
    caption_model.to(device)

    logger.info(f"Models loaded in {time.time() - load_start_time:.2f} seconds")
    yield
    logger.info("Shutting down and cleaning up resources...")


app = FastAPI(
    title="CLIP Embeddings API",
    description="API for generating CLIP embeddings",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[api_base_url or "*"],
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
        "models_loaded": model is not None and caption_model is not None
    }

@app.post("/caption/image")
async def generate_image_caption(image: UploadFile = File(...)):
    try:
        start_time = time.time()
        contents = await image.read()
        pil_image = Image.open(io.BytesIO(contents)).convert("RGB")

        inputs = caption_processor(images=pil_image, return_tensors="pt").to(device)
        with torch.no_grad():
            caption_ids = caption_model.generate(
                **inputs,
                max_new_tokens=60,
                num_beams=3,
                early_stopping=True,
                no_repeat_ngram_size=2,
            )
            caption = caption_processor.decode(caption_ids[0], skip_special_tokens=True)

        processing_time = (time.time() - start_time) * 1000
        logger.info(f"Caption generated in {round(processing_time)} ms")

        return JSONResponse({
            "status": "success",
            "data": {
                "caption": caption,
                "time": round(processing_time),
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
        pil_image = Image.open(io.BytesIO(contents))

        inputs = processor(images=pil_image, return_tensors="pt")
        inputs = {k: v.to(device) for k, v in inputs.items()}

        with torch.no_grad():
            image_features = model.get_image_features(**inputs)
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)

        embedding = image_features.cpu().numpy().tolist()[0]
        processing_time = (time.time() - start_time) * 1000

        logger.info(f"Image embedding generated in {round(processing_time)} ms")
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
async def generate_text_embedding(text: str = Form(...)):
    try:
        start_time = time.time()
        inputs = processor(text=[text], return_tensors="pt")
        inputs = {k: v.to(device) for k, v in inputs.items()}

        with torch.no_grad():
            text_features = model.get_text_features(**inputs)
            text_features = text_features / text_features.norm(dim=-1, keepdim=True)

        embedding = text_features.cpu().numpy().tolist()[0]
        processing_time = (time.time() - start_time) * 1000

        logger.info(f"Text embedding for '{text}' generated in {round(processing_time)} ms")
        return JSONResponse({
            "status": "success",
            "data": {
                "embedding": embedding,
                "dimensions": len(embedding),
                "time": round(processing_time),
            },
        })
    except Exception as e:
        logger.error(f"Error generating text embedding: {str(e)}")
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})


if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
