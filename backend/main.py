"""
Borch Gym Training — Video Overlay Backend
==========================================

Receives a raw video + caption metadata, burns the BorchGym overlay into the MP4
using FFmpeg, returns a JSON pointer the client uses to download the processed file.

Two-step flow makes binary handling clean on React Native side:
  1. POST /api/process-video    -> uploads + processes, returns {"download_url": "..."}
  2. GET  /api/videos/{filename} -> streams the processed mp4 back to the device

Run locally:
  pip install -r requirements.txt
  uvicorn main:app --reload --port 8000
"""

import os
import shutil
import subprocess
import tempfile
import time
import uuid
from pathlib import Path

from fastapi import FastAPI, File, Form, UploadFile, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Borch Gym Training - Video Overlay", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Where processed videos live. Files older than 1 hour get cleaned up.
VIDEOS_DIR = Path(tempfile.gettempdir()) / "borch_videos"
VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
FILE_TTL_SECONDS = 60 * 60  # 1 hour


def escape_drawtext(s: str) -> str:
    """FFmpeg drawtext requires escaping these special characters in text strings."""
    if s is None:
        return ""
    return (
        str(s)
        .replace("\\", "\\\\")
        .replace(":", "\\:")
        .replace("'", "\\'")
        .replace(",", "\\,")
        .replace("%", "\\%")
    )


BORCH_RED = "0x990000"
DARK_BG   = "0x000000C8"   # 78% opacity black
WHITE_BG  = "0xFFFFFFEC"   # 92% opacity white


def build_filter(weight, reps, rpe, exercise, tipo, week, total_weeks) -> str:
    """Composes the FFmpeg -vf filter string that burns 4 text overlays into the frame."""
    line_weight = escape_drawtext(f"{weight} x {reps} @{rpe}")
    line_ex     = escape_drawtext(exercise)
    line_tipo   = escape_drawtext((tipo or "TOP SET").upper())
    line_week   = escape_drawtext(f"Week: {week}/{total_weeks}")

    return ",".join([
        f"drawtext=text='{line_weight}':fontcolor=white:fontsize=46:x=30:y=h-230:box=1:boxcolor={DARK_BG}:boxborderw=14",
        f"drawtext=text='{line_ex}':fontcolor=white:fontsize=28:x=30:y=h-155:box=1:boxcolor={DARK_BG}:boxborderw=10",
        f"drawtext=text='{line_tipo}':fontcolor=white:fontsize=24:x=30:y=h-95:box=1:boxcolor={BORCH_RED}FF:boxborderw=10",
        f"drawtext=text='{line_week}':fontcolor=black:fontsize=24:x=w-tw-40:y=70:box=1:boxcolor={WHITE_BG}:boxborderw=10",
    ])


def cleanup_old_files():
    """Sweep processed videos older than TTL so /tmp doesn't fill up on the free dyno."""
    now = time.time()
    for f in VIDEOS_DIR.glob("*.mp4"):
        try:
            if now - f.stat().st_mtime > FILE_TTL_SECONDS:
                f.unlink()
        except Exception:
            pass


@app.get("/health")
def health():
    ffmpeg_ok = shutil.which("ffmpeg") is not None
    return {
        "ok": True,
        "service": "borch-gym-video-overlay",
        "version": "1.1.0",
        "ffmpeg_available": ffmpeg_ok,
    }


@app.post("/api/process-video")
async def process_video(
    request: Request,
    video: UploadFile = File(...),
    weight: float = Form(...),
    reps: int = Form(...),
    rpe: str = Form(...),
    exercise: str = Form(...),
    tipo: str = Form("TOP SET"),
    week: int = Form(1),
    total_weeks: int = Form(6),
):
    """
    Accepts multipart upload of `video` + metadata fields.
    Processes with FFmpeg drawtext, saves output to /tmp/borch_videos.
    Returns JSON: {"download_url": "/api/videos/<filename>", "filename": "..."}
    """
    if shutil.which("ffmpeg") is None:
        raise HTTPException(status_code=500, detail="ffmpeg not installed on server")

    cleanup_old_files()

    file_id = uuid.uuid4().hex
    in_path  = VIDEOS_DIR / f"in_{file_id}.mp4"
    out_name = f"borch_{file_id}.mp4"
    out_path = VIDEOS_DIR / out_name

    try:
        # Stream upload to disk
        with in_path.open("wb") as f:
            while chunk := await video.read(1024 * 1024):
                f.write(chunk)

        vf = build_filter(weight, reps, rpe, exercise, tipo, week, total_weeks)
        cmd = [
            "ffmpeg", "-y",
            "-i", str(in_path),
            "-vf", vf,
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-c:a", "copy",
            "-movflags", "+faststart",
            str(out_path),
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
        if result.returncode != 0:
            tail = (result.stderr or "")[-800:]
            raise HTTPException(status_code=500, detail=f"ffmpeg failed: {tail}")

        # Build absolute URL from request so client doesn't need to reconstruct
        download_url = str(request.url_for('serve_video', filename=out_name))
        return JSONResponse({
            "ok": True,
            "filename": out_name,
            "download_url": download_url,
            "size_bytes": out_path.stat().st_size,
        })

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="ffmpeg timeout (>180s)")
    finally:
        try:
            in_path.unlink(missing_ok=True)
        except Exception:
            pass


@app.get("/api/videos/{filename}", name="serve_video")
async def serve_video(filename: str):
    """Streams a previously-processed video back to the client."""
    # Prevent path traversal
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="invalid filename")
    path = VIDEOS_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="video not found or expired")
    return FileResponse(
        path=str(path),
        media_type="video/mp4",
        filename=filename,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")), reload=False)
