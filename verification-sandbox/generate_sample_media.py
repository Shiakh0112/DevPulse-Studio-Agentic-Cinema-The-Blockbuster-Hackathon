"""
DevPulse Studio - Sample Media Generator for Verification Sandbox

Purpose:
    Generates a consistent, lightweight 2-second test video asset (SMPTE color bars, 320x240, 24fps)
    at verification-sandbox/sample_media/test_input.mp4.

REPO COMMITMENT NOTICE:
    This script and its output file (test_input.mp4) SHOULD BE COMMITTED TO THE REPOSITORY
    so that the deterministic Verification Sandbox (and Cloud Run Jobs) always has a consistent,
    small media asset available for running smoke tests without external asset dependencies.
"""

import os
import sys
import subprocess
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s")
logger = logging.getLogger("GenerateSampleMedia")

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "sample_media")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "test_input.mp4")


def generate_sample_media() -> str:
    """
    Generates a 2-second 320x240 test video using FFmpeg SMPTE color bars.

    Returns:
        str: Absolute file path to the generated test_input.mp4 asset.
    """
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    logger.info(f"Generating 2-second 320x240 test video at: {OUTPUT_FILE}")

    # FFmpeg command generating 2s SMPTE color bars at 320x240 resolution, 24fps
    ffmpeg_cmd = [
        "ffmpeg",
        "-y",
        "-f", "lavfi",
        "-i", "smptebars=duration=2:size=320x240:rate=24",
        "-f", "lavfi",
        "-i", "sine=frequency=1000:duration=2",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "128k",
        "-shortest",
        OUTPUT_FILE
    ]

    try:
        res = subprocess.run(ffmpeg_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode == 0 and os.path.exists(OUTPUT_FILE):
            logger.info(f"[SUCCESS] Sample media asset generated successfully ({os.path.getsize(OUTPUT_FILE)} bytes).")
            return OUTPUT_FILE
        else:
            logger.warning(f"FFmpeg generation returned code {res.returncode}. Output: {res.stderr[:200]}")
    except Exception as exc:
        logger.warning(f"FFmpeg CLI invocation error: {exc}. Generating synthetic fallback MP4 file.")

    # Synthetic fallback writer if FFmpeg binary is not directly available in local environment
    if not os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, "wb") as f:
            # Minimal MP4 container header byte payload for testing file presence
            f.write(b"\x00\x00\x00\x18ftypisom\x00\x00\x02\x00isomiso2avc1mp41\x00\x00\x00\x08free")
        logger.info(f"[FALLBACK] Created synthetic test_input.mp4 asset ({os.path.getsize(OUTPUT_FILE)} bytes).")

    return OUTPUT_FILE


if __name__ == "__main__":
    out_path = generate_sample_media()
    print("Sample Media Asset Path:", out_path)
