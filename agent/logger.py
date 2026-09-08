"""
DevPulse Studio - Standardized Agent Logger with ANSI Color Output

Format:
"[Agent: {AgentName}] {action} → {result_summary}"

Color Mapping:
- Green (Fore.GREEN): Success / Passed / Verified
- Yellow (Fore.YELLOW): In-progress / Retrying / Warning
- Red (Fore.RED): Failures / Errors / EMERGENCY
- Cyan (Fore.CYAN): Notifications / Diagnostics / Alerts
"""

import sys
try:
    from colorama import init, Fore, Style
    init(autoreset=True)
    HAS_COLORAMA = True
except ImportError:
    HAS_COLORAMA = False

# Ensure sys.stdout can print unicode characters like '→' on Windows terminal
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


def log_agent(agent_name: str, action: str, result_summary: str, level: str = "info"):
    """
    Prints a standardized colored log line for agent actions.
    Format: [Agent: {AgentName}] {action} → {result_summary}
    Levels:
        - success/passed/verified: GREEN
        - warning/retry/retrying/in_progress: YELLOW
        - error/emergency/failed/rollback/failure: RED
        - notification/alert/cyan/info: CYAN
    """
    level_lower = level.lower()
    
    arrow = "→"
    
    if HAS_COLORAMA:
        if level_lower in ("success", "passed", "verified", "green"):
            color = Fore.GREEN + Style.BRIGHT
        elif level_lower in ("warning", "retry", "retrying", "in_progress", "yellow"):
            color = Fore.YELLOW + Style.BRIGHT
        elif level_lower in ("error", "emergency", "failed", "rollback", "red", "failure"):
            color = Fore.RED + Style.BRIGHT
        elif level_lower in ("notification", "alert", "cyan", "info"):
            color = Fore.CYAN + Style.BRIGHT
        else:
            color = Fore.CYAN
        
        reset = Style.RESET_ALL
        try:
            print(f"{color}[Agent: {agent_name}] {action} {arrow} {result_summary}{reset}")
        except UnicodeEncodeError:
            print(f"{color}[Agent: {agent_name}] {action} -> {result_summary}{reset}")
    else:
        try:
            print(f"[Agent: {agent_name}] {action} {arrow} {result_summary}")
        except UnicodeEncodeError:
            print(f"[Agent: {agent_name}] {action} -> {result_summary}")


