# Google Cloud Platform (GCP) Service Accounts & IAM Least Privilege Specification

This document details the 3 Google Cloud Service Accounts created for **DevPulse Studio**, enforcing strict Principle of Least Privilege (PoLP) across Python AI Agent orchestrators, Model Context Protocol (MCP) ClickHouse database servers, and Next.js web application workloads.

---

## 1. `sa-agent-runtime` — Python Agent Orchestrator

- **Purpose**: Used by the Python FastAPI agent orchestrator service deployed on Cloud Run (including Triage Agent, Fix Agent, Verification Agent, Governance Agent, and `POST /rollback` endpoint).
- **IAM Roles**:
  - `roles/aiplatform.user` (*Vertex AI User*) — Required for Gemini 1.5 Pro multimodal vision and text reasoning.
  - `roles/secretmanager.secretAccessor` (*Secret Manager Secret Accessor*) — Access to ClickHouse & GitHub credentials.

### `gcloud` CLI Commands:
```bash
# Create Service Account
gcloud iam service-accounts create sa-agent-runtime \
    --display-name="DevPulse Agent Orchestrator Runtime SA" \
    --description="Service account for Gemini AI Agents and Python orchestrator Cloud Run service"

# Bind Vertex AI User Role
gcloud projects add-iam-policy-binding ${GCP_PROJECT_ID} \
    --member="serviceAccount:sa-agent-runtime@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"

# Bind Secret Manager Secret Accessor Role
gcloud projects add-iam-policy-binding ${GCP_PROJECT_ID} \
    --member="serviceAccount:sa-agent-runtime@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

---

## 2. `sa-mcp-clickhouse` — MCP Database Server

- **Purpose**: Used by the Model Context Protocol (`mcp-clickhouse`) container.
- **Security Boundary**: **NO Vertex AI or AI Model Access**. This service account strictly manages ClickHouse database connection credentials via Secret Manager.
- **IAM Roles**:
  - `roles/secretmanager.secretAccessor` (*Secret Manager Secret Accessor*) ONLY.

### `gcloud` CLI Commands:
```bash
# Create Service Account
gcloud iam service-accounts create sa-mcp-clickhouse \
    --display-name="DevPulse MCP ClickHouse SA" \
    --description="Service account for MCP ClickHouse Server container with no AI model access"

# Bind Secret Manager Secret Accessor Role ONLY
gcloud projects add-iam-policy-binding ${GCP_PROJECT_ID} \
    --member="serviceAccount:sa-mcp-clickhouse@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

---

## 3. `sa-webapp` — Next.js Web Dashboard & API Routes

- **Purpose**: Used by the Next.js Web Dashboard, Live Incident Feed, `/api/stream` SSE server, Slack Interactivity callback handler, and `/api/rollback` endpoint.
- **IAM Roles**:
  - `roles/secretmanager.secretAccessor` (*Secret Manager Secret Accessor*) — Access to app secret tokens.
  - `roles/run.invoker` (*Cloud Run Invoker*) — Authorized to invoke the Python Agent Cloud Run service backend securely.

### `gcloud` CLI Commands:
```bash
# Create Service Account
gcloud iam service-accounts create sa-webapp \
    --display-name="DevPulse Web Application SA" \
    --description="Service account for Next.js Dashboard, Slack Interactivity, and Cloud Run agent invocation"

# Bind Secret Manager Secret Accessor Role
gcloud projects add-iam-policy-binding ${GCP_PROJECT_ID} \
    --member="serviceAccount:sa-webapp@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

# Bind Cloud Run Invoker Role
gcloud projects add-iam-policy-binding ${GCP_PROJECT_ID} \
    --member="serviceAccount:sa-webapp@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/run.invoker"
```
