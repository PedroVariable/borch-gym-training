# Multi-stage Dockerfile for Borch Gym Training video overlay backend
# Tested on Render, Railway, Fly.io, and Google Cloud Run free tiers.

FROM python:3.12-slim

# FFmpeg is the heart of this service — install via apt (Debian ffmpeg has libx264)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

# Render/Railway set $PORT — uvicorn binds to it.
ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
