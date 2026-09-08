# ⚡ DevPulse Studio: The Autonomous Self-Healing AI Pipeline

![DevPulse Banner](<!-- URL_FOR_HERO_BANNER_IMAGE_HERE -->)
> **Note:** Insert a wide, high-quality image of the main DevPulse dashboard here showing the Live Feed and Analytics.

DevPulse Studio is not just an error tracker—it is an **Enterprise-Grade Autonomous Self-Healing Platform**. While traditional tools like Sentry tell you *when* your app crashes, DevPulse uses a Multi-Agent AI system to **Detect, Diagnose, Fix, Verify, and Merge** the solution—completely autonomously, with strict Governance Guardrails.

---

## ✨ Key Features

1. **Multi-Agent Orchestration:** Specialized AI agents (Triage, Diagnose, Fix Proposal, Verification, Governance) work in parallel to resolve issues.
2. **Deterministic Self-Healing Loop:** If an AI-generated patch fails in the sandbox, the failure logs are fed back into the AI to learn from its mistake and generate a perfect Attempt #2.
3. **Omni-Ingestion Route (Universal Webhook):** Seamlessly ingest crashes from any language or framework via a single universal endpoint.
4. **Governance & Auto-Rollback Guardrails:** For critical, massive-impact outages (e.g., affecting 1000+ users), the system immediately blocks AI fixes and triggers a 1-Click Rollback to stop the bleeding, ensuring human-in-the-loop safety.
5. **Live Analytics:** Real-time materialized views in ClickHouse to track MTTR (Mean Time To Resolution), Crash Rates, and estimated Developer Hours Saved.

---

## 📸 Screenshots

### 1. Live Incident Feed & Analytics
![Dashboard Analytics](<!-- URL_FOR_ANALYTICS_DASHBOARD_IMAGE_HERE -->)
> **Note:** Insert a screenshot of the main dashboard showing the beautiful charts, MTTR metrics, and live incident feed.

### 2. Autonomous Incident Investigation
![Incident Timeline](<!-- URL_FOR_INCIDENT_TIMELINE_IMAGE_HERE -->)
> **Note:** Insert a screenshot of an Incident Detail page showing the "Triage -> Diagnose -> Fix -> Verified" timeline.

### 3. Emergency Guardrail & Human-in-the-Loop
![Emergency Guardrail](<!-- URL_FOR_EMERGENCY_GUARDRAIL_IMAGE_HERE -->)
> **Note:** Insert a screenshot showing the RED Emergency Rollback Banner and the Human-in-the-Loop "Approve AI Fix" panel.

---

## 🏗️ Architecture: The Omni-Route

DevPulse is designed to be a drop-in replacement for any webhook-based alerting system. 

It exposes a single universal webhook: `POST /api/ingest/crash`. 
When your application crashes, your global error handler (or a tool like Sentry/Datadog) forwards the stack trace and telemetry to this Omni-Route.

**The Multi-Agent Pipeline:**
1. **Frontend Omni-Route:** Receives the crash payload and writes raw telemetry to ClickHouse.
2. **Orchestrator Agent (Python MCP):** Picks up the telemetry and coordinates the AI workers.
3. **Triage & Diagnose Agents:** Classify the error and formulate an empirical root cause.
4. **Fix & Verification Agents:** Generate a code/config patch and run it against an isolated sandbox.
5. **Governance Agent:** Evaluates business risk. If safe, it creates a GitHub PR. If dangerous, it halts and requests Human Approval or Rollback.

---

## 🚀 How to Integrate DevPulse into YOUR Repository

Judges and developers can easily integrate DevPulse into their own projects to enable autonomous self-healing.

### Step 1: Add a Global Error Catcher
In your application (e.g., Node.js, Python, Go), catch unhandled exceptions and send them to the DevPulse Omni-Route.

**Example (Node.js Express):**
```javascript
app.use(async (err, req, res, next) => {
  // Send crash telemetry to DevPulse
  await fetch("http://localhost:3000/api/ingest/crash", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project: "my-custom-project",
      service: "api-backend",
      exit_code: 1,
      stderr_tail: err.stack,
      command: req.method + " " + req.url,
      affected_users_estimate: 10,
      severity: "HIGH"
    })
  });
  res.status(500).send("Internal Error");
});
```

### Step 2: Watch the Magic Happen
As soon as your app crashes, DevPulse will instantly catch the webhook, spawn the AI agents, analyze the stack trace, and generate a GitHub Pull Request against your repository to fix the bug!

---

## 💻 Local Setup & Installation

Follow these steps to run DevPulse Studio locally on your machine.

### Prerequisites
- **Node.js** (v18+)
- **Python** (3.10+)
- **ClickHouse** (Local Docker instance or ClickHouse Cloud)

### 1. Clone the Repository
```bash
git clone https://github.com/YourUsername/devpulse-studio.git
cd devpulse-studio
```

### 2. Environment Setup
Create a `.env` file in the root directory. Use the following template:

```env
# Gemini API Key for AI Agents
GEMINI_API_KEY=your_gemini_api_key_here

# Google Cloud (Optional)
GOOGLE_CLOUD_PROJECT=devpulse-studio
GOOGLE_APPLICATION_CREDENTIALS=./secrets/service-account.json

# ClickHouse Database Configuration
CLICKHOUSE_HOST=http://localhost:8123   # Or your ClickHouse Cloud URL
CLICKHOUSE_PORT=8123                    # 8443 for Cloud
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=your_secure_password
CLICKHOUSE_SECURE=false                 # true for Cloud
CLICKHOUSE_VERIFY=false                 # true for Cloud

# GitHub Configuration for Auto-Fix PRs
GITHUB_TOKEN=ghp_your_github_personal_access_token
GITHUB_DEMO_REPO=YourUsername/your_demo_repo_name

# App Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
PORT=3000
```

### 3. Install Frontend Dependencies & Start UI
```bash
cd apps/web
npm install
npm run dev
```
The dashboard will be live at `http://localhost:3000`.

### 4. Start the Python Agent MCP Server
In a new terminal window:
```bash
cd devpulse-studio
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Start the FastApi/MCP server
python agent/main.py
```

---

## 🧪 Running the Demos

If you want to test the capabilities without setting up a custom repository, we have included 3 deterministic PowerShell demo scripts that simulate real-world crashes.

Run these in your terminal while the app is running:

**1. The Automation Demo (OOM Crash)**
Simulates a memory buffer limit. The AI will successfully diagnose, patch, verify, and resolve it autonomously.
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/ingest/crash" -Method Post -ContentType "application/json" -Body '{"project":"render-pipeline-prod","service":"encoder-worker","exit_code":137,"stderr_tail":"FATAL: Out of memory buffer limit reached.","affected_users_estimate":150,"severity":"HIGH"}'
```

**2. The AI Learning Demo (Codec Mismatch)**
Forces the AI to fail its first attempt. The system captures the failure log, feeds it back to the AI, and successfully generates a correct fix on Attempt #2.
*(See `demo/sample_payloads/codec_mismatch.json` for payload).*

**3. The Governance Guardrail Demo (Emergency Mass Outage)**
Simulates a massive crash affecting 2000+ users. The Governance AI immediately blocks any automated fixes, flags the incident as `NEEDS_REVIEW`, and triggers the Emergency 1-Click Rollback UI.
*(See `demo/sample_payloads/emergency_mass_outage.json` for payload).*

---

## 🏆 Hackathon Notes
Built with Next.js, Python FastAPI, ClickHouse, and Google Gemini 1.5 Pro. This project redefines error tracking by transitioning from **Observability** to **Autonomous Actionablity**. 

*Made with ❤️ for the Hackathon.*
