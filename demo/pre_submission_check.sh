#!/usr/bin/env bash
# ==============================================================================
# DevPulse Studio - Pre-Submission Checklist Script
# Purpose: Executes automated compliance & power feature verification checks
#          before submitting to Devpost / Google Hackathon judges.
# ==============================================================================

GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS_COUNT=0
FAIL_COUNT=0

check_result() {
  local desc="$1"
  local status="$2"
  if [ "$status" -eq 0 ]; then
    echo -e "${GREEN}[PASS] ${desc}${NC}"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo -e "${RED}[FAIL] ${desc}${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

echo -e "${CYAN}=================================================="
echo -e " DevPulse Studio - Pre-Submission Compliance Check"
echo -e "==================================================${NC}\n"

# ------------------------------------------------------------------------------
# CORE COMPLIANCE
# ------------------------------------------------------------------------------
echo -e "${YELLOW}--- Core Compliance ---${NC}"

# Check 1: Root LICENSE file exists
if [ -f "LICENSE" ]; then
  check_result "Root LICENSE file exists" 0
else
  check_result "Root LICENSE file exists" 1
fi

# Check 2: .env is in .gitignore and not tracked by git
ENV_GITIGNORE=$(grep -q "\.env" .gitignore && echo "0" || echo "1")
ENV_TRACKED=$(git ls-files .env 2>/dev/null)
if [ "$ENV_GITIGNORE" -eq 0 ] && [ -z "$ENV_TRACKED" ]; then
  check_result ".env is gitignored and NOT tracked by git" 0
else
  check_result ".env is gitignored and NOT tracked by git" 1
fi

# Check 3: README.md required sections
README_PASS=0
for section in "Architecture" "Setup" "ClickHouse" "License" "Power Features"; do
  if ! grep -qi "$section" README.md; then
    README_PASS=1
  fi
done
check_result "README.md contains Architecture, Setup, ClickHouse, License, and Power Features" "$README_PASS"

# Check 4: No forbidden AI packages (openai, anthropic, langchain)
FORBIDDEN_FOUND=0
for f in $(find . -name "package.json" -o -name "requirements.txt" | grep -v "node_modules" | grep -v "venv"); do
  if grep -qi -E "openai|anthropic|langchain" "$f"; then
    FORBIDDEN_FOUND=1
  fi
done
check_result "No forbidden AI packages (openai, anthropic, langchain) in dependencies" "$FORBIDDEN_FOUND"

# Check 5: Demo video link/section referenced in README.md
if grep -qi -E "demo|video" README.md; then
  check_result "Demo video section/link referenced in README.md" 0
else
  check_result "Demo video section/link referenced in README.md" 1
fi

echo ""

# ------------------------------------------------------------------------------
# POWER FEATURES & SCHEMA
# ------------------------------------------------------------------------------
echo -e "${YELLOW}--- Power Features & Schema ---${NC}"

# Check 6: sql/001_schema.sql contains rollback_events and retry_count
if grep -q "rollback_events" sql/001_schema.sql && grep -q "retry_count" sql/001_schema.sql; then
  check_result "sql/001_schema.sql defines rollback_events & retry_count" 0
else
  check_result "sql/001_schema.sql defines rollback_events & retry_count" 1
fi

# Check 7: sql/002_materialized_views.sql contains mv_roi_summary
if grep -q "mv_roi_summary" sql/002_materialized_views.sql; then
  check_result "sql/002_materialized_views.sql contains mv_roi_summary view" 0
else
  check_result "sql/002_materialized_views.sql contains mv_roi_summary view" 1
fi

# Check 8: agent/tools/notification_tool.py exists
if [ -f "agent/tools/notification_tool.py" ]; then
  check_result "Multi-Channel Alerts tool (notification_tool.py) exists" 0
else
  check_result "Multi-Channel Alerts tool (notification_tool.py) exists" 1
fi

# Check 9: agent/tools/vision_helper.py exists
if [ -f "agent/tools/vision_helper.py" ]; then
  check_result "Multimodal Vision Analysis tool (vision_helper.py) exists" 0
else
  check_result "Multimodal Vision Analysis tool (vision_helper.py) exists" 1
fi

# Check 10: agent/orchestrator_retry_loop.py exists
if [ -f "agent/orchestrator_retry_loop.py" ]; then
  check_result "Self-Healing Iterative Loop (orchestrator_retry_loop.py) exists" 0
else
  check_result "Self-Healing Iterative Loop (orchestrator_retry_loop.py) exists" 1
fi

# Check 11: DEMO_MODE environment check in verification_agent.py
if grep -q "DEMO_MODE" agent/agents/verification_agent.py; then
  check_result "DEMO_MODE env var check confirmed in verification_agent.py" 0
else
  check_result "DEMO_MODE env var check confirmed in verification_agent.py" 1
fi

echo ""
echo -e "${CYAN}=================================================="
echo -e " Pre-Submission Check Complete: ${GREEN}${PASS_COUNT} Passed${CYAN}, ${RED}${FAIL_COUNT} Failed${CYAN}"
echo -e "==================================================${NC}"

if [ "$FAIL_COUNT" -eq 0 ]; then
  echo -e "${GREEN}🎉 All pre-submission checks PASSED! Ready for Devpost submission.${NC}\n"
  exit 0
else
  echo -e "${RED}⚠️ Some checks failed. Please fix issues before submitting.${NC}\n"
  exit 1
fi
