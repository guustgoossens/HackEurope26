FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg libmagic1 poppler-utils tesseract-ocr curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv pip install --system .

COPY src/ src/
EXPOSE 8000

CMD ["uvicorn", "agents.server:app", "--host", "0.0.0.0", "--port", "8000"]
