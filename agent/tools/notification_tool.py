"""
DevPulse Studio - Multi-Channel Notification & Interactive Alerting Tool

Purpose:
    Provides multi-channel interactive notifications (Slack Block Kit, Discord Webhooks, Telegram Inline Keyboards)
    powering the Multi-Channel Alerts Power Feature for real-time incident alerting, triage dispatches,
    and governance approval notifications.
"""

import os
import logging
import httpx
from typing import Dict, Any, List, Optional

try:
    from agent.logger import log_agent
except ImportError:
    try:
        from logger import log_agent
    except ImportError:
        def log_agent(agent, action, summary, level="info"):
            print(f"[Agent: {agent}] {action} → {summary}")


class NotificationTool:
    """
    Multi-channel notification dispatcher supporting Slack, Discord, and Telegram.
    """

    def __init__(self, platform: Optional[str] = None):
        self.platform = (platform or os.getenv("NOTIFICATION_PLATFORM", "none")).lower()

    def send_alert(
        self,
        message: str,
        incident: Dict[str, Any],
        buttons: Optional[List[Dict[str, str]]] = None,
        urgent: bool = False
    ) -> None:
        """
        Dispatches an alert message to the configured notification platform.

        Args:
            message (str): Main alert body text.
            incident (dict): Incident dictionary containing incident_id, project, severity, etc.
            buttons (list[dict], optional): List of interactive button dicts with 'text', 'action_id', 'url'.
            urgent (bool): Flag indicating urgent/emergency incident escalation.
        """
        if self.platform == "slack":
            self._send_slack(message, incident, buttons, urgent)
        elif self.platform == "discord":
            self._send_discord(message, incident, buttons, urgent)
        elif self.platform == "telegram":
            self._send_telegram(message, incident, buttons, urgent)
        else:
            # Fallback for 'none' or unconfigured platform
            log_agent("NotificationTool", "Multi-Channel Alert", f"Dispatched alert to console ({self.platform}): {message[:60]}...", "notification")

    def _send_slack(
        self,
        message: str,
        incident: Dict[str, Any],
        buttons: Optional[List[Dict[str, str]]],
        urgent: bool
    ) -> None:
        webhook_url = os.getenv("SLACK_WEBHOOK_URL")
        if not webhook_url:
            logger.warning("[Notification Tool] Sent to slack | Status: failed (SLACK_WEBHOOK_URL missing)")
            return

        incident_id = incident.get("incident_id", "N/A")
        header_text = f"🔴 EMERGENCY: {message}" if urgent else message

        blocks = [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": header_text[:150], "emoji": True}
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Project:* {incident.get('project', 'N/A')}"},
                    {"type": "mrkdwn", "text": f"*Severity:* {incident.get('severity', 'N/A')}"},
                    {"type": "mrkdwn", "text": f"*Incident ID:* `{incident_id}`"},
                    {"type": "mrkdwn", "text": f"*Exit Code:* `{incident.get('exit_code', 'N/A')}`"}
                ]
            }
        ]

        if buttons:
            action_elements = []
            for b in buttons:
                action_elements.append({
                    "type": "button",
                    "text": {"type": "plain_text", "text": b.get("text", "Click"), "emoji": True},
                    "value": incident_id,
                    "action_id": b.get("action_id", "view_logs"),
                    "url": b.get("url")
                })
            blocks.append({"type": "actions", "elements": action_elements})

        payload = {"blocks": blocks}

        try:
            res = httpx.post(webhook_url, json=payload, timeout=5.0)
            if res.status_code == 200:
                log_agent("NotificationTool", "Slack Alert", "Sent alert to Slack successfully", "notification")
            else:
                log_agent("NotificationTool", "Slack Alert Failed", f"HTTP {res.status_code}", "warning")
        except Exception as exc:
            log_agent("NotificationTool", "Slack Alert Exception", str(exc), "warning")

    def _send_discord(
        self,
        message: str,
        incident: Dict[str, Any],
        buttons: Optional[List[Dict[str, str]]],
        urgent: bool
    ) -> None:
        webhook_url = os.getenv("DISCORD_WEBHOOK_URL")
        if not webhook_url:
            log_agent("NotificationTool", "Discord Alert Skipped", "DISCORD_WEBHOOK_URL missing", "warning")
            return

        title_prefix = "🔴 EMERGENCY:" if urgent else "📢 Alert:"
        description = f"{message}\n\n**Project:** {incident.get('project')}\n**Severity:** {incident.get('severity')}\n**Incident ID:** `{incident.get('incident_id')}`"

        # Discord embeds do not support true interactive buttons via simple webhooks;
        # buttons are represented as clickable markdown links to the dashboard approval/detail page.
        if buttons:
            links_text = "\n".join([f"👉 [{b.get('text')}]({b.get('url', 'http://localhost:3000')})" for b in buttons])
            description += f"\n\n**Actions:**\n{links_text}"

        embed = {
            "title": f"{title_prefix} DevPulse Studio",
            "description": description,
            "color": 15158332 if urgent else 3447003
        }

        try:
            res = httpx.post(webhook_url, json={"embeds": [embed]}, timeout=5.0)
            if res.status_code in (200, 204):
                log_agent("NotificationTool", "Discord Alert", "Sent alert to Discord successfully", "notification")
            else:
                log_agent("NotificationTool", "Discord Alert Failed", f"HTTP {res.status_code}", "warning")
        except Exception as exc:
            log_agent("NotificationTool", "Discord Alert Exception", str(exc), "warning")

    def _send_telegram(
        self,
        message: str,
        incident: Dict[str, Any],
        buttons: Optional[List[Dict[str, str]]],
        urgent: bool
    ) -> None:
        token = os.getenv("TELEGRAM_BOT_TOKEN")
        chat_id = os.getenv("TELEGRAM_CHAT_ID")
        if not token or not chat_id:
            log_agent("NotificationTool", "Telegram Alert Skipped", "TELEGRAM credentials missing", "warning")
            return

        text = f"{'🔴 EMERGENCY:' if urgent else ''} {message}\n\nProject: {incident.get('project')}\nSeverity: {incident.get('severity')}\nIncident ID: {incident.get('incident_id')}"

        payload: Dict[str, Any] = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "Markdown"
        }

        if buttons:
            inline_keyboard = []
            for b in buttons:
                inline_keyboard.append([{"text": b.get("text", "Open"), "url": b.get("url", "http://localhost:3000")}])
            payload["reply_markup"] = {"inline_keyboard": inline_keyboard}

        try:
            url = f"https://api.telegram.org/bot{token}/sendMessage"
            res = httpx.post(url, json=payload, timeout=5.0)
            if res.status_code == 200:
                log_agent("NotificationTool", "Telegram Alert", "Sent alert to Telegram successfully", "notification")
            else:
                log_agent("NotificationTool", "Telegram Alert Failed", f"HTTP {res.status_code}", "warning")
        except Exception as exc:
            log_agent("NotificationTool", "Telegram Alert Exception", str(exc), "warning")


# Convenience Module-Level Wrapper Functions
def notify_crash_detected(incident: Dict[str, Any]) -> None:
    """
    Sends a '🚨 Crash Detected' notification with project name & severity details.
    """
    tool = NotificationTool()
    msg = f"🚨 Crash Detected on project '{incident.get('project', 'unknown')}' (Severity: {incident.get('severity', 'UNKNOWN')})"
    urgent = incident.get("severity") == "CRITICAL"
    tool.send_alert(message=msg, incident=incident, urgent=urgent)


def notify_fix_verified(incident: Dict[str, Any], verification_result: Dict[str, Any]) -> None:
    """
    Sends a '🛠️ AI Fix Verified' notification with pass/fail test counts and interactive buttons.
    """
    tool = NotificationTool()
    passed = verification_result.get("passed_tests", 1)
    total = verification_result.get("total_tests", 1)
    msg = f"🛠️ AI Fix Verified ({passed}/{total} tests passed) for incident '{incident.get('incident_id')}'"

    dashboard_url = os.getenv("DASHBOARD_URL", "http://localhost:3000")
    incident_id = incident.get("incident_id", "")

    buttons = [
        {"text": "Approve PR", "action_id": "approve_fix", "url": f"{dashboard_url}/approval/{incident_id}"},
        {"text": "View Logs", "action_id": "view_logs", "url": f"{dashboard_url}/incident/{incident_id}"}
    ]

    tool.send_alert(message=msg, incident=incident, buttons=buttons, urgent=False)


if __name__ == "__main__":
    print("--- Testing NotificationTool Class ---")
    sample_inc = {"incident_id": "123e4567", "project": "nebula", "severity": "HIGH", "exit_code": 137}
    notify_crash_detected(sample_inc)
    notify_fix_verified(sample_inc, {"passed_tests": 5, "total_tests": 5})
