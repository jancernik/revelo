"""Configuration for the AI service."""

search_model = "google/siglip2-base-patch16-256"
search_model_revision = "3f9f96cb90da5dbc758b01813f2f6f1aee24c1ab"
search_text_max_tokens = 64

describe_model = "Qwen/Qwen3-VL-2B-Instruct-GGUF:Q8_0"
describe_repo = "Qwen/Qwen3-VL-2B-Instruct-GGUF"
describe_revision = "52d6c8ffea26cc873ac5ad116f8631268d7eb503"
describe_model_file = "Qwen3VL-2B-Instruct-Q8_0.gguf"
describe_projector_file = "mmproj-Qwen3VL-2B-Instruct-F16.gguf"
describe_idle_seconds = 600
describe_min_available_mb = 4000
describe_start_timeout_seconds = 180
describe_request_timeout_seconds = 300
describe_image_max_side = 768
describe_max_tokens = 60
translate_max_tokens = 80

describe_language = "en"
describe_prompt = (
    "Write alt text for this photo: one short sentence, at most 20 words, describing the main subject "
    "and setting. Do not start with 'The image' or 'A photo of'. Do not speculate. Quote visible text "
    "only if it is the main subject."
)
translate_prompt = (
    "Translate this image description into {language}. Keep quoted text and proper names unchanged. "
    "Reply with the translation only.\n\n{text}"
)
translate_languages = {"es": "Spanish"}
