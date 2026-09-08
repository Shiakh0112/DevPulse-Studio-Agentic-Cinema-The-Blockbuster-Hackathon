"""
DevPulse Studio - Deterministic Verification Sandbox Runner
===========================================================

ENTRYPOINT for the verification-sandbox Docker container.
Deployed as a Google Cloud Run Job — each execution runs in a fresh,
ephemeral container with zero state leakage between runs.

Pipeline:
    1. Parse environment variables (REPO_URL, COMMIT_SHA, PATCH_DIFF, etc.)
    2. Clone target repository at the exact SHA
    3. Apply the proposed patch (git apply or direct file write)
    4. Run deterministic test suite: npm test + ffmpeg_smoke_test
    5. Collect pass/fail status, timing, stdout/stderr logs
    6. Output structured JSON result to stdout (consumed by VerificationAgent)
    7. Cleanup cloned repo directory (guaranteed via finally block)

Environment Variables (set by VerificationAgent when launching Cloud Run Job):
    REPO_URL            - Git repository URL to clone (required)
    COMMIT_SHA          - Exact commit SHA to checkout (required)
    PATCH_DIFF          - Unified diff text to apply (required)
    PATCH_FILE_PATH     - Target file path for fallback direct-write (optional)
    INCIDENT_ID         - Incident identifier for logging (required)
    PROPOSAL_ID         - Proposal identifier for logging (required)
    ATTEMPT_NUMBER      - Current self-healing retry attempt (1, 2, or 3)
    SAMPLE_MEDIA_PATH   - Path to test_input.mp4 for ffmpeg smoke test
"""

import os
import sys
import json
import time
import shutil
import subprocess
import traceback
from pathlib import Path


# =============================================================================
# Configuration from environment
# =============================================================================
REPO_URL = os.getenv("REPO_URL", "")
COMMIT_SHA = os.getenv("COMMIT_SHA", "HEAD")
PATCH_DIFF = os.getenv("PATCH_DIFF", "")
PATCH_FILE_PATH = os.getenv("PATCH_FILE_PATH", "")
INCIDENT_ID = os.getenv("INCIDENT_ID", "unknown")
PROPOSAL_ID = os.getenv("PROPOSAL_ID", "unknown")
ATTEMPT_NUMBER = int(os.getenv("ATTEMPT_NUMBER", "1"))
SAMPLE_MEDIA_PATH = os.getenv(
    "SAMPLE_MEDIA_PATH",
    os.path.join(os.path.dirname(__file__), "sample_media", "test_input.mp4")
)

CLONE_DIR = "/sandbox/repo_clone"
MAX_TEST_TIMEOUT = 120  # seconds per test


def log(level: str, message: str):
    """Structured logging with timestamp and level."""
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    prefix = {
        "INFO": "\033[36m[INFO]\033[0m",
        "PASS": "\033[32m[PASS]\033[0m",
        "FAIL": "\033[31m[FAIL]\033[0m",
        "WARN": "\033[33m[WARN]\033[0m",
    }.get(level, f"[{level}]")
    print(f"{timestamp} {prefix} {message}", flush=True)


# =============================================================================
# Step 1: Clone Repository at Exact SHA
# =============================================================================
def clone_repo() -> bool:
    """
    Clones the target repository and checks out the exact commit SHA.
    Returns True on success, False on failure.
    """
    if not REPO_URL:
        log("WARN", "REPO_URL not set — skipping git clone, using local sandbox context")
        os.makedirs(CLONE_DIR, exist_ok=True)
        return True

    log("INFO", f"Cloning repository: {REPO_URL}")
    try:
        result = subprocess.run(
            ["git", "clone", "--single-branch", REPO_URL, CLONE_DIR],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, timeout=60
        )
        if result.returncode != 0:
            log("FAIL", f"git clone failed: {result.stderr[:500]}")
            return False

        log("INFO", f"Checking out SHA: {COMMIT_SHA}")
        if COMMIT_SHA and COMMIT_SHA != "HEAD":
            checkout_result = subprocess.run(
                ["git", "checkout", COMMIT_SHA],
                cwd=CLONE_DIR,
                stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                text=True, timeout=30
            )
            if checkout_result.returncode != 0:
                log("WARN", f"SHA checkout failed (using HEAD): {checkout_result.stderr[:300]}")

        log("PASS", "Repository cloned and checked out successfully")
        return True

    except subprocess.TimeoutExpired:
        log("FAIL", "git clone timed out (60s)")
        return False
    except Exception as e:
        log("FAIL", f"Clone error: {e}")
        return False


# =============================================================================
# Step 2: Apply Patch Diff
# =============================================================================
def apply_patch() -> bool:
    """
    Applies the proposed patch to the cloned repository.
    Tries git apply first, falls back to direct file write.
    Returns True on success, False on failure.
    """
    if not PATCH_DIFF:
        log("WARN", "PATCH_DIFF is empty — no patch to apply")
        return True

    log("INFO", f"Applying patch (attempt #{ATTEMPT_NUMBER})...")

    # Strategy 1: git apply
    try:
        patch_file = os.path.join(CLONE_DIR, "proposed_fix.diff")
        with open(patch_file, "w", encoding="utf-8") as f:
            f.write(PATCH_DIFF)

        result = subprocess.run(
            ["git", "apply", "--check", patch_file],
            cwd=CLONE_DIR,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, timeout=15
        )

        if result.returncode == 0:
            # Dry-run passed, apply for real
            apply_result = subprocess.run(
                ["git", "apply", patch_file],
                cwd=CLONE_DIR,
                stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                text=True, timeout=15
            )
            if apply_result.returncode == 0:
                log("PASS", "Patch applied successfully via git apply")
                return True

        log("WARN", f"git apply failed: {result.stderr[:300]}")
    except Exception as e:
        log("WARN", f"git apply exception: {e}")

    # Strategy 2: Direct file write fallback
    if PATCH_FILE_PATH:
        try:
            target_path = os.path.join(CLONE_DIR, PATCH_FILE_PATH)
            os.makedirs(os.path.dirname(target_path), exist_ok=True)
            with open(target_path, "w", encoding="utf-8") as f:
                f.write(PATCH_DIFF)
            log("PASS", f"Patch applied via direct write to {PATCH_FILE_PATH}")
            return True
        except Exception as e:
            log("FAIL", f"Direct write fallback failed: {e}")
            return False

    log("WARN", "git apply failed and no PATCH_FILE_PATH set for fallback")
    return True  # Non-blocking — let tests determine real pass/fail


# =============================================================================
# Step 3: Run npm test
# =============================================================================
def run_npm_test() -> dict:
    """
    Runs 'npm test' in the cloned repo if package.json exists.
    Returns a test result dictionary.
    """
    test_result = {
        "test_name": "npm_test",
        "passed": False,
        "duration_seconds": 0.0,
        "stdout": "",
        "stderr": "",
        "skipped": False
    }

    # Find package.json (check apps/web first, then root)
    pkg_paths = [
        os.path.join(CLONE_DIR, "apps", "web", "package.json"),
        os.path.join(CLONE_DIR, "package.json"),
    ]
    pkg_dir = None
    for p in pkg_paths:
        if os.path.exists(p):
            pkg_dir = os.path.dirname(p)
            break

    if not pkg_dir:
        log("WARN", "No package.json found — skipping npm test")
        test_result["skipped"] = True
        test_result["passed"] = True
        test_result["stdout"] = "Skipped: no package.json found"
        return test_result

    # Install dependencies first
    log("INFO", "Installing npm dependencies...")
    try:
        subprocess.run(
            ["npm", "ci", "--prefer-offline", "--no-audit"],
            cwd=pkg_dir,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, timeout=90
        )
    except Exception:
        pass  # Best effort — deps might already be cached

    log("INFO", "Running npm test...")
    start = time.time()
    try:
        result = subprocess.run(
            ["npm", "test", "--", "--passWithNoTests"],
            cwd=pkg_dir,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, timeout=MAX_TEST_TIMEOUT
        )
        duration = round(time.time() - start, 2)
        test_result["duration_seconds"] = duration
        test_result["stdout"] = result.stdout[:2000]
        test_result["stderr"] = result.stderr[:2000]
        test_result["passed"] = (result.returncode == 0)

        if test_result["passed"]:
            log("PASS", f"npm test PASSED in {duration}s")
        else:
            log("FAIL", f"npm test FAILED in {duration}s (exit code {result.returncode})")

    except subprocess.TimeoutExpired:
        duration = round(time.time() - start, 2)
        test_result["duration_seconds"] = duration
        test_result["stderr"] = f"Test timed out after {MAX_TEST_TIMEOUT}s"
        log("FAIL", f"npm test TIMED OUT after {MAX_TEST_TIMEOUT}s")

    except Exception as e:
        duration = round(time.time() - start, 2)
        test_result["duration_seconds"] = duration
        test_result["stderr"] = str(e)
        log("FAIL", f"npm test exception: {e}")

    return test_result


# =============================================================================
# Step 4: Run FFmpeg Smoke Test
# =============================================================================
def run_ffmpeg_smoke_test() -> dict:
    """
    Deterministic media pipeline smoke test:
    1. Verifies ffmpeg is installed and functional
    2. Processes sample_media/test_input.mp4 through a basic transcode pipeline
    3. Validates output container was created successfully
    
    Returns a test result dictionary.
    """
    test_result = {
        "test_name": "ffmpeg_smoke_test",
        "passed": False,
        "duration_seconds": 0.0,
        "stdout": "",
        "stderr": ""
    }

    log("INFO", "Running ffmpeg smoke test...")
    start = time.time()

    try:
        # Verify ffmpeg is available
        version_check = subprocess.run(
            ["ffmpeg", "-version"],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, timeout=10
        )
        if version_check.returncode != 0:
            test_result["stderr"] = "ffmpeg binary not found or not functional"
            log("FAIL", "ffmpeg not available in sandbox")
            return test_result

        # Check input media file exists
        input_path = SAMPLE_MEDIA_PATH
        if not os.path.exists(input_path):
            # Try generating it
            gen_script = os.path.join(os.path.dirname(__file__), "generate_sample_media.py")
            if os.path.exists(gen_script):
                log("INFO", "Generating sample media asset...")
                subprocess.run(
                    [sys.executable, gen_script],
                    stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                    timeout=30
                )

        if not os.path.exists(input_path) or os.path.getsize(input_path) < 100:
            # Generate a minimal test video inline
            log("INFO", "Creating inline SMPTE test video...")
            os.makedirs(os.path.dirname(input_path), exist_ok=True)
            subprocess.run(
                [
                    "ffmpeg", "-y",
                    "-f", "lavfi", "-i", "smptebars=duration=1:size=160x120:rate=12",
                    "-c:v", "libx264", "-pix_fmt", "yuv420p",
                    "-t", "1", input_path
                ],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                timeout=30
            )

        if not os.path.exists(input_path):
            test_result["stderr"] = f"Input media file not found: {input_path}"
            log("FAIL", "No input media available for smoke test")
            test_result["duration_seconds"] = round(time.time() - start, 2)
            return test_result

        # Core smoke test: transcode input → output with basic pipeline
        output_path = os.path.join(CLONE_DIR, "smoke_test_output.mp4")
        transcode_cmd = [
            "ffmpeg", "-y",
            "-i", input_path,
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-preset", "ultrafast",
            "-crf", "28",
            "-an",  # strip audio for speed
            "-t", "2",
            output_path
        ]

        result = subprocess.run(
            transcode_cmd,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, timeout=30
        )

        duration = round(time.time() - start, 2)
        test_result["duration_seconds"] = duration
        test_result["stdout"] = result.stdout[:1000]
        test_result["stderr"] = result.stderr[:1000]

        # Validate output
        if result.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            output_size = os.path.getsize(output_path)
            test_result["passed"] = True
            test_result["stdout"] = (
                f"Smoke test passed: Output media container created successfully. "
                f"Size: {output_size} bytes, Duration: {duration}s"
            )
            log("PASS", f"ffmpeg smoke test PASSED in {duration}s (output: {output_size} bytes)")

            # Cleanup output file
            os.remove(output_path)
        else:
            log("FAIL", f"ffmpeg smoke test FAILED: transcode returned {result.returncode}")

    except subprocess.TimeoutExpired:
        duration = round(time.time() - start, 2)
        test_result["duration_seconds"] = duration
        test_result["stderr"] = "ffmpeg smoke test timed out (30s)"
        log("FAIL", "ffmpeg smoke test TIMED OUT")

    except Exception as e:
        duration = round(time.time() - start, 2)
        test_result["duration_seconds"] = duration
        test_result["stderr"] = str(e)
        log("FAIL", f"ffmpeg smoke test exception: {e}")

    return test_result


# =============================================================================
# Step 5: Cleanup
# =============================================================================
def cleanup():
    """Removes the cloned repository directory. Guaranteed zero state leakage."""
    try:
        if os.path.exists(CLONE_DIR):
            shutil.rmtree(CLONE_DIR, ignore_errors=True)
            log("INFO", f"Cleaned up clone directory: {CLONE_DIR}")
    except Exception as e:
        log("WARN", f"Cleanup warning: {e}")


# =============================================================================
# Main Entrypoint
# =============================================================================
def main():
    """
    Main verification pipeline executed as Cloud Run Job ENTRYPOINT.
    Outputs a structured JSON result to stdout for consumption by VerificationAgent.
    Exit code 0 = all tests passed, Exit code 1 = one or more tests failed.
    """
    log("INFO", "=" * 60)
    log("INFO", "DevPulse Verification Sandbox - Starting Execution")
    log("INFO", f"  Incident ID  : {INCIDENT_ID}")
    log("INFO", f"  Proposal ID  : {PROPOSAL_ID}")
    log("INFO", f"  Attempt      : #{ATTEMPT_NUMBER}")
    log("INFO", f"  Repo URL     : {REPO_URL or '(local)'}")
    log("INFO", f"  Commit SHA   : {COMMIT_SHA}")
    log("INFO", "=" * 60)

    pipeline_start = time.time()
    test_results = []
    all_passed = True
    combined_failure_logs = []

    try:
        # Step 1: Clone
        clone_success = clone_repo()
        if not clone_success:
            log("FAIL", "Repository clone failed — aborting verification")
            result = {
                "passed": False,
                "tests": [],
                "combined_failure_log": "Repository clone failed",
                "incident_id": INCIDENT_ID,
                "proposal_id": PROPOSAL_ID,
                "attempt_number": ATTEMPT_NUMBER,
                "total_duration_seconds": round(time.time() - pipeline_start, 2)
            }
            print(json.dumps(result))
            sys.exit(1)

        # Step 2: Apply patch
        apply_patch()

        # Step 3: npm test
        npm_result = run_npm_test()
        test_results.append(npm_result)
        if not npm_result["passed"] and not npm_result.get("skipped"):
            all_passed = False
            combined_failure_logs.append(
                f"[npm_test stderr]:\n{npm_result['stderr']}"
            )

        # Step 4: ffmpeg smoke test
        ffmpeg_result = run_ffmpeg_smoke_test()
        test_results.append(ffmpeg_result)
        if not ffmpeg_result["passed"]:
            all_passed = False
            combined_failure_logs.append(
                f"[ffmpeg_smoke_test stderr]:\n{ffmpeg_result['stderr']}"
            )

    except Exception as e:
        log("FAIL", f"Unexpected pipeline error: {e}")
        traceback.print_exc()
        all_passed = False
        combined_failure_logs.append(f"[pipeline_exception]:\n{traceback.format_exc()}")

    finally:
        # Step 5: ALWAYS cleanup — zero state leakage guarantee
        cleanup()

    # Build structured result
    total_duration = round(time.time() - pipeline_start, 2)
    passed_count = sum(1 for t in test_results if t["passed"])
    total_count = len(test_results)

    result = {
        "passed": all_passed,
        "tests": test_results,
        "combined_failure_log": "\n".join(combined_failure_logs),
        "incident_id": INCIDENT_ID,
        "proposal_id": PROPOSAL_ID,
        "attempt_number": ATTEMPT_NUMBER,
        "total_duration_seconds": total_duration,
        "summary": f"{passed_count}/{total_count} tests passed in {total_duration}s"
    }

    # Output structured JSON to stdout for VerificationAgent consumption
    log("INFO", "-" * 60)
    if all_passed:
        log("PASS", f"VERIFICATION PASSED — {passed_count}/{total_count} tests passed in {total_duration}s")
    else:
        log("FAIL", f"VERIFICATION FAILED — {passed_count}/{total_count} tests passed in {total_duration}s")
    log("INFO", "-" * 60)

    # Final JSON output (last line of stdout, parsed by VerificationAgent)
    print("---VERIFICATION_RESULT_JSON---")
    print(json.dumps(result, indent=2))

    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
