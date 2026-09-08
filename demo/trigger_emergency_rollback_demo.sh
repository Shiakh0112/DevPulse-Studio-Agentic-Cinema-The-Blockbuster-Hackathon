#!/usr/bin/env bash
# ==============================================================================
# DevPulse Studio - Trigger Emergency Rollback Guardrail Demo
# ==============================================================================
# Purpose: Dispatches a CRITICAL severity crash event with affected_users_estimate=2000
# to trigger the Emergency Auto-Rollback Guardrail and showcase the red Emergency
# banner and Rollback button on the dashboard live.
# ==============================================================================

GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

API_URL="${INGEST_API_URL:-http://localhost:3000/api/ingest/crash}"
PAYLOAD_FILE="demo/sample_payloads/emergency_mass_outage.json"

echo -e "${CYAN}=================================================="
echo -e " DevPulse Studio - Emergency Rollback Guardrail Demo "
echo -e " Target Ingestion Endpoint: ${API_URL}"
echo -e "==================================================${NC}\n"

if [ ! -f "$PAYLOAD_FILE" ]; then
  echo -e "${RED}[FAIL] Emergency payload file not found: ${PAYLOAD_FILE}${NC}\n"
  exit 1
fi

echo -e "${YELLOW}Dispatching Mass Outage Incident (affected_users = 2000)...${NC}"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}" \
  -H "Content-Type: application/json" \
  -d @"${PAYLOAD_FILE}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 201 ] || [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${RED}[SUCCESS] Ingested Emergency Mass Outage Crash (HTTP ${HTTP_CODE})${NC}"
  echo -e "   Response: ${BODY}\n"
  echo -e "${CYAN}Check your DevPulse Studio Live Incident Feed!${NC}"
  echo -e "   - Red Emergency Banner should appear at top of feed."
  echo -e "   - Emergency Rollback button will be active for instant mitigation."
else
  echo -e "${RED}[FAIL] Server returned HTTP ${HTTP_CODE}${NC}"
  echo -e "   Response: ${BODY}\n"
fi
