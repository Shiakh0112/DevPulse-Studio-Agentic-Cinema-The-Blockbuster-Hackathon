# ==============================================================================
# DevPulse Studio - Deterministic Verification Sandbox Container
# Base Image: Node 20 Slim (supporting Node/JS test runners & media testing)
# ==============================================================================
FROM node:20-slim

# Working directory inside sandbox container
WORKDIR /sandbox

# Environment variables for Python runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install system dependencies: ffmpeg, python3, python3-pip, git
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    python3-venv \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file and install Python packages
COPY requirements.txt /sandbox/requirements.txt
RUN pip3 install --no-cache-dir --break-system-packages -r /sandbox/requirements.txt || pip3 install --no-cache-dir -r /sandbox/requirements.txt

# Copy verification scripts and sandbox assets
COPY . /sandbox

# ==============================================================================
# INFRASTRUCTURE & ARCHITECTURAL NOTE:
# This image SHOULD BE DEPLOYED AS A GOOGLE CLOUD RUN JOB (NOT a Cloud Run Service).
#
# Cloud Run Jobs ensure each verification execution runs in a completely fresh,
# ephemeral container with no state leakage or cached filesystem artifacts between runs.
# This isolation is especially critical for the Self-Healing Loop, ensuring each retry
# attempt (Attempts 1, 2, and 3) executes deterministically in a clean environment.
# ==============================================================================

# Entrypoint script executing deterministic verification runner
ENTRYPOINT ["python3", "run_verification.py"]
