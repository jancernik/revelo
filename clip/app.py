from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import torch
import clip
from PIL import Image
import io
import time
import uvicorn
import logging
from contextlib import asynccontextmanager
import os

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

model = None
preprocess = None
device = None

api_base_url = os.getenv("API_BASE_URL")

@asynccontextmanager
async def lifespan(app: FastAPI):
    global model, preprocess, device

    logger.info("Starting to load CLIP model...")
    load_start_time = time.time()

    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"Using device: {device}")

    model, preprocess = clip.load("ViT-B/16", device=device)

    load_end_time = time.time()
    load_time = load_end_time - load_start_time
    logger.info(f"CLIP model loaded successfully in {load_time:.4f} seconds")

    yield

    logger.info("Shutting down and cleaning up resources...")


app = FastAPI(
    title="CLIP Embeddings API",
    description="API for generating CLIP embeddings",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[api_base_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/embedding/image")
async def generate_image_embedding(image: UploadFile = File(...)):
    """
    Generate CLIP embedding for image
    """
    try:
        start_time = time.time()

        contents = await image.read()
        pil_image = Image.open(io.BytesIO(contents))

        image_input = preprocess(pil_image).unsqueeze(0).to(device)

        with torch.no_grad():
            image_features = model.encode_image(image_input)
            image_features = image_features / \
                image_features.norm(dim=1, keepdim=True)

        embedding = image_features.cpu().numpy().tolist()[0]

        end_time = time.time()
        processing_time = (end_time - start_time) * 1000

        logger.info(
            f"Image embedding generated in {round(processing_time)} milliseconds"
        )

        return JSONResponse(
            {
                "status": "success",
                "data": {
                    "embedding": embedding,
                    "dimensions": len(embedding),
                    "time": processing_time,
                },
            }
        )
    except Exception as e:
        logger.error(f"Error generating image embedding: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": f"Failed to generate image embedding: {str(e)}",
            },
        )


@app.post("/embedding/text")
async def generate_text_embedding(text: str = Form(...)):
    """
    Generate CLIP embedding for text
    """
    try:
        start_time = time.time()

        text_input = clip.tokenize([text]).to(device)

        with torch.no_grad():
            text_features = model.encode_text(text_input)
            text_features = text_features / \
                text_features.norm(dim=1, keepdim=True)

        embedding = text_features.cpu().numpy().tolist()[0]

        end_time = time.time()
        processing_time = (end_time - start_time) * 1000

        logger.info(
            f"Text embedding for '{text}' generated in {round(processing_time)} milliseconds"
        )

        return JSONResponse(
            {
                "status": "success",
                "data": {
                    "embedding": embedding,
                    "dimensions": len(embedding),
                    "time": processing_time,
                },
            }
        )
    except Exception as e:
        logger.error(f"Error generating text embedding: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": f"Failed to generate text embedding: {str(e)}",
            },
        )

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
