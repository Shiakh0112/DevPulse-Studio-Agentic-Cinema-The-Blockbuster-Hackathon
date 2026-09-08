# DevPulse Studio - 3-Minute Demo Video Recording Script

This document provides a precise, timestamped narration script for recording the 3-minute video submission for **DevPulse Studio**.

| Time | Visual | Script |
| --- | --- | --- |
| **0:00 - 0:15** | Show root `README.md` Architecture Diagram (Mermaid / ASCII block) highlighting Next.js frontend, Python Multi-Agent system, ClickHouse, and Google GenAI APIs. | "Welcome to DevPulse Studio! We are an autonomous, self-healing incident management platform built with Next.js, Gemini 1.5 Pro, and ClickHouse accessed via the official MCP server." |
| **0:15 - 0:35** | Split screen with terminal executing `python demo/simulate_multiple_crashes.py` showing colorama ANSI log stream with `[Agent: CrashSimulator]`. | "Watch our live terminal stream as media pipeline crashes trigger real-time telemetry ingestion with colorized agent logs." |
| **0:35 - 1:00** | Switch to browser showing `http://localhost:3000/feed`. Refresh feed as incidents stream in with Triage classification badges (e.g. `FRAME_BUFFER_OOM` / `HIGH`). | "Our Live Feed immediately updates with classified incidents, displaying severity tags, suspected failing components, and visual evidence." |
| **1:00 - 1:20** | Open `/audit` page or terminal log showing `McpClickHouseTool` execution logs with `run_query` and `insert_row` calls. | "Every telemetry record and state transition is written to ClickHouse exclusively through the official `mcp-clickhouse` server for complete auditability." |
| **1:20 - 1:45** | Click into an incident detail page. Scroll to `Timeline.tsx` showing Attempt 1 verification failure followed by Attempt 2 successful pass. | "Here is our Self-Healing Loop in action: when Attempt 1 fails sandbox testing, error logs are recaptured into context, enabling Gemini to generate a verified fix on Attempt 2." |
| **1:45 - 2:05** | Show `GovernanceAgent` auto-approval decision on `/approval/[id]` page, generated GitHub PR link, and Slack notification alert. | "Our Governance Policy Engine auto-approves low-risk verified patches, automatically creates a GitHub Pull Request, and dispatches multi-channel alerts to Slack." |
| **2:05 - 2:25** | Show Live Feed with top red pulsing Emergency Banner for 2000 affected users incident, and click `Emergency Rollback` button. | "When a critical incident affects 2000 users, our Auto-Rollback Guardrail flags an emergency banner, allowing one-click instant rollbacks." |
| **2:25 - 2:45** | Navigate to `http://localhost:3000/analytics`. Show glowing 4-stat `RoiWidget` grid ($ saved, hours saved, MTTR reduction %) and Recharts graphs. | "On the Analytics dashboard, transparent ROI calculations demonstrate engineering hours saved, dollar value preserved, and MTTR reduction trends." |
| **2:45 - 3:00** | Full screen view of dashboard showing DevPulse Studio header with Gemini & ClickHouse track logos. | "Powered by Gemini Enterprise AI Agents, ClickHouse MCP, and all 5 power features, DevPulse Studio turns pipeline crashes into self-healing resolution." |

---

## Recording Tips for Presenters

1. **Screen Layout**: Use a 1080p high-resolution screen with the browser on the left (60% width) and a clean dark terminal on the right (40% width).
2. **Terminal Colors**: Ensure ANSI colorama colors are visible in your terminal (Green for success, Yellow for retries, Red for emergency/errors, Cyan for dispatches).
3. **Pacing**: Speak at a clear, measured pace (~130 words per minute). The script above is optimized to fit exactly inside each 15-25 second window.
