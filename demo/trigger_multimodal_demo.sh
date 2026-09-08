#!/usr/bin/env bash
# ==============================================================================
# DevPulse Studio - Trigger Multimodal Vision Analysis Demo
# ==============================================================================
# Purpose: Posts a crash event with a sample screenshot image attachment to the
# `/api/ingest/crash-with-screenshot` endpoint, showcasing Gemini 1.5 Pro's
# Multimodal Vision Analysis capability live on the dashboard.
# ==============================================================================

GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

API_URL="${MULTIMODAL_API_URL:-http://localhost:3000/api/ingest/crash-with-screenshot}"
SCREENSHOT_FILE="demo/sample_screenshots/color_banding_example.png"

echo -e "${CYAN}=================================================="
echo -e " DevPulse Studio - Multimodal Vision Analysis Demo "
echo -e " Target Ingestion Endpoint: ${API_URL}"
echo -e "==================================================${NC}\n"

if [ ! -f "$SCREENSHOT_FILE" ]; then
  echo -e "${RED}[FAIL] Sample screenshot file not found: ${SCREENSHOT_FILE}${NC}\n"
  exit 1
fi

echo -e "${YELLOW}Dispatching Multimodal Crash Event with screenshot artifact...${NC}"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}" \
  -F "project=cinematch-vfx" \
  -F "service=lut-processor" \
  -F "job_id=job_vision_8810" \
  -F "worker_id=gpu-node-02" \
  -F "exit_code=1" \
  -F "stderr_tail=Color grading output failed quality check: Severe 10-bit quantization color banding detected across dark luminance channels." \
  -F "command=lut_apply --cube film_print_v2.cube --input plate_01.dpx" \
  -F "affected_users_estimate=280" \
  -F "screenshot=@${SCREENSHOT_FILE};type=image/png")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 201 ] || [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}[SUCCESS] Ingested Multimodal Crash with Screenshot (HTTP ${HTTP_CODE})${NC}"
  echo -e "   Response: ${BODY}\n"
  echo -e "${CYAN}Check your DevPulse Studio Incident Details page!${NC}"
  echo -e "   - Visual Evidence section will display the uploaded crash frame."
  echo -e "   - Gemini Vision analysis report will show visual defect findings."
else
  echo -e "${RED}[FAIL] Server returned HTTP ${HTTP_CODE}${NC}"
  echo -e "   Response: ${BODY}\n"
fi
