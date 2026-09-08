"""
DevPulse Studio - Multi-Scenario Crash Simulation Script

Purpose:
    Dispatches 6 distinct, diverse media pipeline crash payloads to the ingestion API
    with realistic 5-10 second intervals between requests.

    Includes at least one CRITICAL severity crash with affected_users_estimate = 1500
    to trigger the Emergency Auto-Rollback Guardrail.

    This populates the Live Incident Feed with real-time streaming data and populates
    the Analytics charts with multi-point metrics for demo presentation.
"""

import sys
import os
import json
import time
import random
import argparse
import urllib.request
import urllib.error

# Standardized colored output helper using colorama if available
try:
    from colorama import init, Fore, Style
    init(autoreset=True)
    HAS_COLORAMA = True
except ImportError:
    HAS_COLORAMA = False

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


def log_simulator(action: str, result_summary: str, level: str = "info"):
    """Prints a standardized colored log line for the Crash Simulator."""
    level_lower = level.lower()
    arrow = "→"

    if HAS_COLORAMA:
        if level_lower in ("success", "passed", "green"):
            color = Fore.GREEN + Style.BRIGHT
        elif level_lower in ("warning", "retry", "in_progress", "yellow"):
            color = Fore.YELLOW + Style.BRIGHT
        elif level_lower in ("error", "emergency", "failed", "red", "critical"):
            color = Fore.RED + Style.BRIGHT
        elif level_lower in ("notification", "alert", "cyan", "info"):
            color = Fore.CYAN + Style.BRIGHT
        else:
            color = Fore.CYAN

        reset = Style.RESET_ALL
        try:
            print(f"{color}[Agent: CrashSimulator] {action} {arrow} {result_summary}{reset}")
        except UnicodeEncodeError:
            print(f"{color}[Agent: CrashSimulator] {action} -> {result_summary}{reset}")
    else:
        try:
            print(f"[Agent: CrashSimulator] {action} {arrow} {result_summary}")
        except UnicodeEncodeError:
            print(f"[Agent: CrashSimulator] {action} -> {result_summary}")


# 6 Diverse Crash Payloads representing different services, exit codes, and severities
CRASH_SCENARIOS = [
    {
        "name": "1/6 - GPU Frame Buffer OOM (HIGH)",
        "payload": {
            "project": "cinematch-vfx",
            "service": "frame-renderer",
            "job_id": "job_oom_88101",
            "worker_id": "gpu-node-04",
            "exit_code": 137,
            "stderr_tail": "CUDA Out of Memory error: Failed to allocate 8192MB frame buffer for 8K EXR compositing layer.",
            "command": "ffmpeg -i 8k_plate.exr -vf scale=7680:4320 output.mov",
            "artifact_uri": "gs://devpulse-dumps/crash_88101_oom.txt",
            "crash_screenshot_uri": "sample_media/oom_corrupted_frame.png",
            "affected_users_estimate": 320
        }
    },
    {
        "name": "2/6 - Container Codec Mismatch (MEDIUM)",
        "payload": {
            "project": "streamflex-transcode",
            "service": "transcoder-worker",
            "job_id": "job_codec_77202",
            "worker_id": "transcode-node-12",
            "exit_code": 1,
            "stderr_tail": "Unknown encoder 'h264_nvenc'. CUDA hardware acceleration requested but NVENC module not bound in container image.",
            "command": "ffmpeg -i raw_stream.ts -c:v h264_nvenc output.mp4",
            "artifact_uri": "gs://devpulse-dumps/crash_77202_codec.txt",
            "affected_users_estimate": 180
        }
    },
    {
        "name": "3/6 - CRITICAL Frame Render Timeout (EMERGENCY TRIGGER)",
        "payload": {
            "project": "hyper-render-prod",
            "service": "main-composite-pipeline",
            "job_id": "job_crit_99100",
            "worker_id": "cluster-master-01",
            "exit_code": 124,
            "stderr_tail": "FATAL TIMEOUT: Frame render pipeline timed out after 300s waiting for raytracing worker locks. Deadlock detected in worker queue.",
            "command": "hyper_render --scene main_title.blend --engine CYCLES --timeout 300 --output /renders/final/",
            "artifact_uri": "gs://devpulse-dumps/crash_99100_trace.txt",
            "affected_users_estimate": 1500
        }
    },
    {
        "name": "4/6 - Missing Texture Asset Exception (LOW)",
        "payload": {
            "project": "asset-ingest",
            "service": "texture-loader",
            "job_id": "job_asset_44304",
            "worker_id": "ingest-node-02",
            "exit_code": 2,
            "stderr_tail": "Asset file non-existent: /volumes/textures/env_hdr_04.exr. Container volume storage mount missing.",
            "command": "loader --asset /volumes/textures/env_hdr_04.exr",
            "artifact_uri": "gs://devpulse-dumps/crash_44304_asset.txt",
            "affected_users_estimate": 45
        }
    },
    {
        "name": "5/6 - Audio Resampler Threadpool Deadlock (HIGH)",
        "payload": {
            "project": "audio-post-prod",
            "service": "multitrack-stitcher",
            "job_id": "job_audio_55405",
            "worker_id": "audio-node-07",
            "exit_code": 139,
            "stderr_tail": "Segmentation fault (core dumped) in audio resampler threadpool while processing 96kHz Dolby Atmos master buffer.",
            "command": "stitcher --master atmos_stem.wav --bitrate 320k",
            "artifact_uri": "gs://devpulse-dumps/crash_55405_segfault.txt",
            "affected_users_estimate": 650
        }
    },
    {
        "name": "6/6 - Color Grading LUT Quantization Glitch (MEDIUM)",
        "payload": {
            "project": "color-grading-studio",
            "service": "lut-processor",
            "job_id": "job_lut_66506",
            "worker_id": "color-node-03",
            "exit_code": 1,
            "stderr_tail": "Color grading output failed quality check: Severe 10-bit quantization color banding detected across dark luminance channels.",
            "command": "lut_apply --cube film_print_v2.cube --input plate_01.dpx",
            "artifact_uri": "gs://devpulse-dumps/crash_66506_lut.txt",
            "crash_screenshot_uri": "sample_media/banding_artifact.png",
            "affected_users_estimate": 210
        }
    }
]


def send_crash_event(api_url: str, scenario: dict) -> bool:
    """Dispatches a single crash scenario payload to the ingestion API."""
    name = scenario["name"]
    payload = scenario["payload"]

    log_simulator("Ingesting Scenario", f"{name} ({payload['project']} / {payload['service']})", "in_progress")

    req_body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        api_url,
        data=req_body,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=10.0) as resp:
            status_code = resp.getcode()
            resp_body = resp.read().decode("utf-8")
            if status_code in (200, 201):
                level = "critical" if payload.get("affected_users_estimate", 0) > 500 else "success"
                log_simulator("Ingestion Success", f"HTTP {status_code} | {name} sent successfully", level)
                return True
            else:
                log_simulator("Ingestion Warning", f"HTTP {status_code} | Response: {resp_body[:100]}", "warning")
                return False
    except urllib.error.HTTPError as http_err:
        log_simulator("Ingestion Error", f"HTTP {http_err.code} | {http_err.reason}", "error")
        return False
    except Exception as exc:
        log_simulator("Ingestion Exception", f"Failed to connect to {api_url}: {exc}", "error")
        return False


def run_simulation(api_url: str, min_delay: float = 5.0, max_delay: float = 10.0):
    """Executes the simulation sequence over all 6 scenarios with randomized delays."""
    log_simulator("Start Simulation", f"Target Endpoint: {api_url}", "notification")
    log_simulator("Batch Info", f"Sending {len(CRASH_SCENARIOS)} scenarios with {min_delay}-{max_delay}s intervals", "notification")

    success_count = 0

    for idx, scenario in enumerate(CRASH_SCENARIOS):
        success = send_crash_event(api_url, scenario)
        if success:
            success_count += 1

        if idx < len(CRASH_SCENARIOS) - 1:
            delay = round(random.uniform(min_delay, max_delay), 1)
            log_simulator("Waiting Gap", f"Pausing {delay}s before dispatching next incident...", "in_progress")
            time.sleep(delay)

    log_simulator(
        "Simulation Complete",
        f"Dispatched {success_count}/{len(CRASH_SCENARIOS)} crash events successfully. Check Live Feed & Analytics Dashboard!",
        "success" if success_count > 0 else "error"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="DevPulse Studio - Multi-Scenario Crash Simulator")
    parser.add_argument("--url", default=os.getenv("INGEST_API_URL", "http://localhost:3000/api/ingest/crash"), help="Ingestion API URL")
    parser.add_argument("--min-delay", type=float, default=5.0, help="Minimum delay between events (seconds)")
    parser.add_argument("--max-delay", type=float, default=10.0, help="Maximum delay between events (seconds)")
    args = parser.parse_args()

    run_simulation(args.url, args.min_delay, args.max_delay)
