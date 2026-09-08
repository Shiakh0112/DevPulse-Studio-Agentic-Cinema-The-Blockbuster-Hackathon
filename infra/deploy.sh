#!/usr/bin/env bash
# ==============================================================================
# DevPulse Studio - End-to-End GCP Cloud Run Deployment Pipeline
# ==============================================================================

set -e
set -u
set -o pipefail

echo "=============================================================================="
echo "🚀 DevPulse Studio: Starting Build & Cloud Run Deployment Pipeline"
echo "=============================================================================="

# 1. Environment & Configuration Check
GCP_PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || echo "")}"
REGION="${REGION:-us-central1}"

if [ -z "${GCP_PROJECT_ID}" ]; then
  echo "❌ Error: GCP_PROJECT_ID is not set and no active gcloud project found."
  echo "Please set export GCP_PROJECT_ID='your-gcp-project-id' and retry."
  exit 1
fi

echo "📋 GCP Target Project: ${GCP_PROJECT_ID}"
echo "📍 Deployment Region: ${REGION}"
echo "------------------------------------------------------------------------------"

# 2. Authenticate Docker with GCR / Artifact Registry
echo "🔑 Step 1/5: Authenticating Docker with Google Container Registry..."
gcloud auth configure-docker --quiet

IMAGE_WEB="gcr.io/${GCP_PROJECT_ID}/devpulse-web:latest"
IMAGE_AGENT="gcr.io/${GCP_PROJECT_ID}/devpulse-agent:latest"
IMAGE_MCP="gcr.io/${GCP_PROJECT_ID}/devpulse-mcp-clickhouse:latest"

# 3. Build & Push Docker Images
echo "🐳 Step 2/5: Building & Pushing Next.js Web Dashboard Container Image..."
echo "  ↳ Image: ${IMAGE_WEB}"
docker build -t "${IMAGE_WEB}" -f ../apps/web/Dockerfile ../apps/web || docker build -t "${IMAGE_WEB}" ../apps/web
docker push "${IMAGE_WEB}"

echo "🐳 Step 3/5: Building & Pushing Python Agent Orchestrator Container Image..."
echo "  ↳ Image: ${IMAGE_AGENT}"
docker build -t "${IMAGE_AGENT}" -f ../agent/Dockerfile ../agent || docker build -t "${IMAGE_AGENT}" ../agent
docker push "${IMAGE_AGENT}"

echo "🐳 Step 4/5: Building & Pushing MCP ClickHouse Server Container Image..."
echo "  ↳ Image: ${IMAGE_MCP}"
docker build -t "${IMAGE_MCP}" -f ../infra/Dockerfile.mcp ../infra || docker build -t "${IMAGE_MCP}" .
docker push "${IMAGE_MCP}"

# 4. Deploy Services to Cloud Run referencing YAML Configs
echo "☁️ Step 5/5: Deploying Cloud Run Services referencing Knative YAML configs..."

echo "  -> Deploying 'devpulse-mcp-clickhouse' via infra/cloudrun-mcp.yaml..."
gcloud run deploy devpulse-mcp-clickhouse --image="${IMAGE_MCP}" --region="${REGION}" --service-account="sa-mcp-clickhouse@${GCP_PROJECT_ID}.iam.gserviceaccount.com" --memory=512Mi --port=8080 --quiet || \
sed "s/PROJECT_ID/${GCP_PROJECT_ID}/g" cloudrun-mcp.yaml | gcloud run services replace - --region="${REGION}"

echo "  -> Deploying 'devpulse-agent' via infra/cloudrun-agent.yaml..."
gcloud run deploy devpulse-agent --image="${IMAGE_AGENT}" --region="${REGION}" --service-account="sa-agent-runtime@${GCP_PROJECT_ID}.iam.gserviceaccount.com" --memory=1Gi --port=8000 --quiet || \
sed "s/PROJECT_ID/${GCP_PROJECT_ID}/g" cloudrun-agent.yaml | gcloud run services replace - --region="${REGION}"

echo "  -> Deploying 'devpulse-web' via infra/cloudrun-web.yaml..."
gcloud run deploy devpulse-web --image="${IMAGE_WEB}" --region="${REGION}" --service-account="sa-webapp@${GCP_PROJECT_ID}.iam.gserviceaccount.com" --memory=512Mi --port=3000 --quiet || \
sed "s/PROJECT_ID/${GCP_PROJECT_ID}/g" cloudrun-web.yaml | gcloud run services replace - --region="${REGION}"

echo "=============================================================================="
echo "🎉 SUCCESS! DevPulse Studio services deployed to Cloud Run."
echo "=============================================================================="
