"""Cache model files for offline startup."""
import logging

import describe
import search

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    search.load("cpu")
    describe.model_paths()
