"""
Borch Gym Training — Video Overlay Backend
==========================================

Receives a raw video from the mobile app + caption metadata, burns the BorchGym
overlay into the MP4 using FFmpeg, returns the processed video.

The overlay design matches the in-app preview:
  - Bottom-left: weight x reps @rpe (white on black box)
  - Below:       exercise name (white on black box)
  - Below:       tipo/protocolo (white on BorchGym red #990000)
  - Top-right:   Week badge (black on white pill)

Endpoints:
  POST /api/process-video   -> burn overlay, return processed mp4 bytes
  GET  /health              -> liveness probe

Run locally:
  pip install -r requirements.txt
  uvicorn main:app --reload --port 8000

Test with curl:
  curl -X POST http://localhost:8000/api/process-video \\
    -F "video=@input.mp4" \\
    -F "weight=140" -F "reps=5" -F "rpe=8" \\
    -F "exercise=Sumo Deadlift" -F "tipo=Primary Deadlift" \\
    -F "week=3" -F "total_weeks=4" \\
    -o output.mp4
"""

import os
import shutil
import subprocess
import tempfile
import uuid
from pathlib import Path

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Borch Gym Training - Video Overlay", version="1.0.0")

# CORS open while developing; tighten to your app's bundle id later if you want.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Optional simple API key — uncomment + set env var BORCH_API_KEY to enable.
# from fastapi import Header
# def require_api_key(x_api_key: str = Header(default="")):
#     expected = os.getenv("BORCH_API_KEY", "")
#     if not expected or x_api_key != expected:
#         raise HTTPException(status_code=401, detail="invalid api key")


# FFmpeg drawtext requires escaping special characters in text strings.
def escape_drawtext(s: str) -> str:
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
DARK_BG = "0x000000C8"   # 78% opacity black
WHITE_BG = "0xFFFFFFEC"  # 92% opacity white


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


@app.get("/health")
def health():
    """Render/Railway/Fly use this to keep the dyno warm and check liveness."""
    ffmpeg_ok = shutil.which("ffmpeg") is not None
    return {
        "ok": True,
        "service": "borch-gym-video-overlay",
        "ffmpeg_available": ffmpeg_ok,
    }


@app.post("/api/process-video")
async def process_video(
    video: UploadFile = File(...),
    weight: float = Form(...),
    reps: int = Form(...),
    rpe: str = Form(...),               # may be a number or label like "Rampa 6-8"
    exercise: str = Form(...),
    tipo: str = Form("TOP SET"),
    week: int = Form(1),
    total_weeks: int = Form(6),
):
    """
    Accepts a multipart upload of `video` plus the metadata fields,
    runs FFmpeg with drawtext filters, returns the processed MP4 as a download.
    """
    if shutil.which("ffmpeg") is None:
        raise HTTPException(status_code=500, detail="ffmpeg not installed on server")

    tmp_dir = Path(tempfile.gettempdir()) / f"borch_{uuid.uuid4().hex}"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    in_path  = tmp_dir / f"in_{video.filename or 'video.mp4'}"
    out_path = tmp_dir / "out.mp4"

    try:
        # Stream upload to disk in chunks so big videos don't blow up RAM
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

        return FileResponse(
            path=str(out_path),
            media_type="video/mp4",
            filename=f"borch_{uuid.uuid4().hex[:8]}.mp4",
        )

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="ffmpeg timeout (>180s) — video too long or server too slow")
    finally:
        # Clean up the input now; the output file is deleted by FileResponse's background task
        # only AFTER the response finishes streaming, so we leave it for the runtime to GC.
        try:
            in_path.unlink(missing_ok=True)
        except Exception:
            pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")), reload=False)
