FROM python:3.13-slim AS base

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
  PYTHONDONTWRITEBYTECODE=1 \
  PIP_NO_CACHE_DIR=1 \
  PIP_DISABLE_PIP_VERSION_CHECK=1 \
  HF_HOME=/models

# Install system dependencies
RUN apt-get update && apt-get install -y curl libgomp1 && rm -rf /var/lib/apt/lists/*

# Install the llama.cpp server
ARG LLAMA_BUILD=b12407
ARG LLAMA_SHA256=f88eb522e3cf2eede34b2f4fdc3b08ed462ec234f2f13e3e15be659a003218d4
RUN curl -fsSL -o /tmp/llama.tar.gz https://github.com/ggml-org/llama.cpp/releases/download/${LLAMA_BUILD}/llama-${LLAMA_BUILD}-bin-ubuntu-x64.tar.gz \
  && echo "${LLAMA_SHA256}  /tmp/llama.tar.gz" | sha256sum -c \
  && mkdir /opt/llama && tar -xzf /tmp/llama.tar.gz -C /opt/llama --strip-components=1 \
  && rm /tmp/llama.tar.gz
ENV LLAMA_SERVER_PATH=/opt/llama/llama-server

# Create non-root user
RUN groupadd --gid 1001 appuser && useradd --uid 1001 --gid appuser --shell /bin/bash --create-home appuser
# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies (CPU-only PyTorch)
COPY requirements.txt .
RUN pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.txt

# Download the models into the image
RUN mkdir -p /models && chown appuser:appuser /models
COPY config.py lazy.py search.py describe.py download.py ./
USER appuser
RUN python download.py
ENV HF_HUB_OFFLINE=1
USER root

# Copy application code
COPY . .
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
  CMD sh -c 'curl -f http://localhost:${AI_PORT:-8000}/health || exit 1'

# Start the application
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${AI_PORT:-8000} --workers 1"]