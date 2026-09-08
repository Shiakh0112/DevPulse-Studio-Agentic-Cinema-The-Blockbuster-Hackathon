#!/usr/bin/env bash
# ==============================================================================
# DevPulse Studio - Crash Simulation Script
# Purpose: Dispatches 4 distinct render/transcode crash payload scenarios to the API
# ==============================================================================

GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="${INGEST_API_URL:-http://localhost:3000/api/ingest/crash}"

echo -e "${CYAN}=================================================="
echo -e " DevPulse Studio - Pipeline Crash Simulation "
echo -e " Target Ingestion Endpoint: ${API_URL}"
echo -e "==================================================${NC}\n"

PAYLOADS=(
  "demo/sample_payloads/oom_crash.json:OOM Memory Allocation Crash (Exit Code 137)"
  "demo/sample_payloads/codec_mismatch.json:Codec Mismatch Error (Exit Code 1)"
  "demo/sample_payloads/critical_timeout.json:Critical Frame Render Timeout (Exit Code 124 - Emergency Trigger)"
  "demo/sample_payloads/missing_asset.json:Missing Asset Exception (Exit Code 2)"
)

TOTAL=${#PAYLOADS[@]}
COUNT=1

for ITEM in "${PAYLOADS[@]}"; do
  FILE=$(echo "$ITEM" | cut -d':' -f1)
  DESC=$(echo "$ITEM" | cut -d':' -f2)

  echo -e "${YELLOW}[${COUNT}/${TOTAL}] Simulating Scenario: ${DESC}...${NC}"

  if [ ! -f "$FILE" ]; then
    echo -e "${RED}[FAIL] File not found: ${FILE}${NC}\n"
    continue
  fi

  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}" \
    -H "Content-Type: application/json" \
    -d @"${FILE}")

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')

  if [ "$HTTP_CODE" -eq 201 ] || [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}[SUCCESS] Ingested (HTTP ${HTTP_CODE})${NC}"
    echo -e "   Payload: ${BODY}\n"
  else
    echo -e "${RED}[FAIL] Server returned HTTP ${HTTP_CODE}${NC}"
    echo -e "   Response: ${BODY}\n"
  fi

  if [ "$COUNT" -lt "$TOTAL" ]; then
    echo -e "${CYAN}Waiting 3 seconds before sending next crash event...${NC}\n"
    sleep 3
  fi

  COUNT=$((COUNT + 1))
done

echo -e "${CYAN}=================================================="
echo -e " Crash Simulation Complete!"
echo -e " Check your DevPulse Studio Live Incident Feed!"
echo -e "==================================================${NC}"
