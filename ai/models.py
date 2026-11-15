import logging
import time

import torch
from sentence_transformers import SentenceTransformer
from transformers import (
    AutoProcessor,
    Florence2ForConditionalGeneration,
    MarianMTModel,
    MarianTokenizer,
)

logger = logging.getLogger(__name__)

image_model_name = 'clip-ViT-B-32'
text_model_name = 'sentence-transformers/clip-ViT-B-32-multilingual-v1'
florence_model_name = 'florence-community/Florence-2-base'
mt_model_name = 'Helsinki-NLP/opus-mt-en-es'

# Hugging Face commit of each model. Stored embeddings are only comparable within one image and text revision.
image_model_revision = '327ab6726d33c0e22f920c83f2ff9e4bd38ca37f'
text_model_revision = '58edf8cada9e398793dca955574a48cbb7f18be2'
florence_model_revision = '00921df66db728a9ceb750f5eca43e5c203a2051'
mt_model_revision = '5bc4493d463cf000c1f0b50f8d56886a392ed4ab'


def load_models(device: str):
    """Load every model. The image build runs this to download them into the image."""
    model_start = time.time()
    image_model = SentenceTransformer(image_model_name, device=device, revision=image_model_revision)
    logger.info(f"Loading models [1/4] {image_model_name}... ({time.time() - model_start:.2f}s)")

    model_start = time.time()
    text_model = SentenceTransformer(text_model_name, device=device, revision=text_model_revision)
    logger.info(f"Loading models [2/4] {text_model_name}... ({time.time() - model_start:.2f}s)")

    model_start = time.time()
    florence_dtype = torch.float16 if device == "cuda" else torch.float32
    florence_model = Florence2ForConditionalGeneration.from_pretrained(florence_model_name, dtype=florence_dtype, revision=florence_model_revision).to(device)
    florence_processor = AutoProcessor.from_pretrained(florence_model_name, revision=florence_model_revision)
    logger.info(f"Loading models [3/4] {florence_model_name}... ({time.time() - model_start:.2f}s)")

    model_start = time.time()
    mt_tokenizer = MarianTokenizer.from_pretrained(mt_model_name, revision=mt_model_revision)
    mt_model = MarianMTModel.from_pretrained(mt_model_name, revision=mt_model_revision).to(device)
    logger.info(f"Loading models [4/4] {mt_model_name}... ({time.time() - model_start:.2f}s)")

    return image_model, text_model, florence_model, florence_processor, mt_tokenizer, mt_model


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    load_models("cpu")
