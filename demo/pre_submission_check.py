"""
DevPulse Studio - Pre-Submission Checklist Script (Python Version)
Purpose: Executes automated compliance & power feature verification checks
         before submitting to Devpost / Google Hackathon judges.
"""

import sys
import os
import re
import subprocess

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

PASS_COUNT = 0
FAIL_COUNT = 0


def check_result(desc: str, passed: bool):
    global PASS_COUNT, FAIL_COUNT
    if HAS_COLORAMA:
        green = Fore.GREEN + Style.BRIGHT
        red = Fore.RED + Style.BRIGHT
        reset = Style.RESET_ALL
        if passed:
            print(f"{green}[PASS] {desc}{reset}")
            PASS_COUNT += 1
        else:
            print(f"{red}[FAIL] {desc}{reset}")
            FAIL_COUNT += 1
    else:
        if passed:
            print(f"[PASS] {desc}")
            PASS_COUNT += 1
        else:
            print(f"[FAIL] {desc}")
            FAIL_COUNT += 1


print("==================================================")
print(" DevPulse Studio - Pre-Submission Compliance Check")
print("==================================================\n")

print("--- Core Compliance ---")

# Check 1: Root LICENSE file exists
check_result("Root LICENSE file exists", os.path.exists("LICENSE"))

# Check 2: .env is gitignored and NOT tracked by git
env_gitignored = False
if os.path.exists(".gitignore"):
    with open(".gitignore", "r", encoding="utf-8", errors="ignore") as f:
        env_gitignored = any(re.search(r"^\.env$", line.strip()) or ".env" in line for line in f)

env_tracked = False
try:
    res = subprocess.run(["git", "ls-files", ".env"], capture_output=True, text=True)
    if res.stdout.strip():
        env_tracked = True
except Exception:
    pass

check_result(".env is gitignored and NOT tracked by git", env_gitignored and not env_tracked)

# Check 3: README.md required sections
readme_content = ""
if os.path.exists("README.md"):
    with open("README.md", "r", encoding="utf-8", errors="ignore") as f:
        readme_content = f.read()

required_sections = ["Architecture", "Setup", "ClickHouse", "License", "Power Features"]
readme_passed = all(sec.lower() in readme_content.lower() for sec in required_sections)
check_result("README.md contains Architecture, Setup, ClickHouse, License, and Power Features", readme_passed)

# Check 4: No forbidden AI packages (openai, anthropic, langchain)
forbidden_found = False
for root, _, files in os.walk("."):
    if "node_modules" in root or "venv" in root or ".next" in root:
        continue
    for fname in files:
        if fname in ("package.json", "requirements.txt"):
            fpath = os.path.join(root, fname)
            try:
                with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                    txt = f.read().lower()
                    if any(pkg in txt for pkg in ("openai", "anthropic", "langchain")):
                        forbidden_found = True
            except Exception:
                pass

check_result("No forbidden AI packages (openai, anthropic, langchain) in dependencies", not forbidden_found)

# Check 5: Demo video link/section referenced in README.md
video_ref = "demo" in readme_content.lower() or "video" in readme_content.lower()
check_result("Demo video section/link referenced in README.md", video_ref)

print("\n--- Power Features & Schema ---")

# Check 6: sql/001_schema.sql contains rollback_events and retry_count
schema_content = ""
if os.path.exists("sql/001_schema.sql"):
    with open("sql/001_schema.sql", "r", encoding="utf-8", errors="ignore") as f:
        schema_content = f.read()

schema_passed = "rollback_events" in schema_content and "retry_count" in schema_content
check_result("sql/001_schema.sql defines rollback_events & retry_count", schema_passed)

# Check 7: sql/002_materialized_views.sql contains mv_roi_summary
mv_content = ""
if os.path.exists("sql/002_materialized_views.sql"):
    with open("sql/002_materialized_views.sql", "r", encoding="utf-8", errors="ignore") as f:
        mv_content = f.read()

mv_passed = "mv_roi_summary" in mv_content
check_result("sql/002_materialized_views.sql contains mv_roi_summary view", mv_passed)

# Check 8: agent/tools/notification_tool.py exists
check_result("Multi-Channel Alerts tool (notification_tool.py) exists", os.path.exists("agent/tools/notification_tool.py"))

# Check 9: agent/tools/vision_helper.py exists
check_result("Multimodal Vision Analysis tool (vision_helper.py) exists", os.path.exists("agent/tools/vision_helper.py"))

# Check 10: agent/orchestrator_retry_loop.py exists
check_result("Self-Healing Iterative Loop (orchestrator_retry_loop.py) exists", os.path.exists("agent/orchestrator_retry_loop.py"))

# Check 11: DEMO_MODE environment check in verification_agent.py
verif_content = ""
if os.path.exists("agent/agents/verification_agent.py"):
    with open("agent/agents/verification_agent.py", "r", encoding="utf-8", errors="ignore") as f:
        verif_content = f.read()

check_result("DEMO_MODE env var check confirmed in verification_agent.py", "DEMO_MODE" in verif_content)

print("\n==================================================")
print(f" Pre-Submission Check Complete: {PASS_COUNT} Passed, {FAIL_COUNT} Failed")
print("==================================================")

if FAIL_COUNT == 0:
    print("🎉 All pre-submission checks PASSED! Ready for Devpost submission.\n")
    sys.exit(0)
else:
    print("⚠️ Some checks failed. Please fix issues before submitting.\n")
    sys.exit(1)
