#!/usr/bin/env bash
# ==============================================================================
# DevPulse Studio - Trigger Self-Healing Loop Demo
# ==============================================================================
# NOTE: The `demo_force_first_attempt_fail` flag and `DEMO_MODE=true` env var
# are DEMO-ONLY debug features used to showcase the Self-Healing Retry Loop
# live during presentations.
# WARNING: MUST NEVER BE ENABLED OR DEPLOYED IN REAL PRODUCTION ENVIRONMENTS!
# ==============================================================================

GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

API_URL="${INGEST_API_URL:-http://localhost:3000/api/ingest/crash}"

echo -e "${CYAN}=================================================="
echo -e " DevPulse Studio - Self-Healing Retry Loop Demo "
echo -e " Target Ingestion Endpoint: ${API_URL}"
echo -e "==================================================${NC}\n"

echo -e "${YELLOW}Dispatching crash event with demo_force_first_attempt_fail=true...${NC}"

PAYLOAD=$(cat <<EOF
{
  "project": "cinematch-vfx",
  "service": "frame-renderer",
  "job_id": "job_selfheal_101",
  "worker_id": "gpu-node-09",
  "exit_code": 137,
  "stderr_tail": "CUDA Out of Memory error during 8K EXR compositing layer rendering.",
  "command": "ffmpeg -i 8k_plate.exr -vf scale=7680:4320 output.mov",
  "artifact_uri": "gs://devpulse-dumps/crash_101_oom.txt",
  "affected_users_estimate": 350,
  "demo_force_first_attempt_fail": true
}
EOF
)

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}" \
  -H "Content-Type: application/json" \
  -d "${PAYLOAD}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 201 ] || [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}[SUCCESS] Ingested Self-Healing Demo Incident (HTTP ${HTTP_CODE})${NC}"
  echo -e "   Response: ${BODY}\n"
  echo -e "${CYAN}Watch the terminal log and UI timeline show:${NC}"
  echo -e "   1. Attempt #1 patch generated -> Sandbox verification fails."
  echo -e "   2. Error context recaptured -> Attempt #2 patch generated & succeeds!"
else
  echo -e "${RED}[FAIL] Ingestion API returned HTTP ${HTTP_CODE}${NC}"
  echo -e "   Response: ${BODY}\n"
fi
