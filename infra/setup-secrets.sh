#!/usr/bin/env bash
# ==============================================================================
# DevPulse Studio - GCP Secret Manager Provisioning Script
# ==============================================================================
#
# DEVELOPER WARNING & RE-RUN CONSTRAINTS:
# 1. 'gcloud secrets create' MUST only be run ONCE per secret name in a GCP project.
# 2. To update secret values subsequently, use 'gcloud secrets versions add' (do NOT call create again).
#
# MULTI-PLATFORM NOTIFICATION NOTE:
# If using Discord or Telegram instead of Slack for interactive alerts:
# - 'discord-webhook-url' or 'telegram-bot-token' should be provisioned using the exact same pattern below.
# ==============================================================================

set -euo pipefail

ENV_FILE="../.env font-mono"
if [ ! -f ".env" ] && [ -f "../.env" ]; then
  ENV_FILE="../.env"
elif [ -f ".env" ]; then
  ENV_FILE=".env"
fi

echo "🔐 Provisioning DevPulse Studio secrets from '${ENV_FILE}' to GCP Secret Manager..."

# Helper function to parse key from .env file
get_env_val() {
  local key="$1"
  if [ -f "${ENV_FILE}" ]; then
    grep "^${key}=" "${ENV_FILE}" | cut -d'=' -f2- | tr -d '"' | tr -d "'"
  else
    echo ""
  fi
}

# List of target secrets
SECRETS=(
  "gemini-api-key:GEMINI_API_KEY"
  "clickhouse-password:CLICKHOUSE_PASSWORD"
  "github-token:GITHUB_TOKEN"
  "slack-webhook-url:SLACK_WEBHOOK_URL"
  "slack-signing-secret:SLACK_SIGNING_SECRET"
)

for entry in "${SECRETS[@]}"; do
  SECRET_NAME="${entry%%:*}"
  ENV_KEY="${entry##*:}"

  VAL=$(get_env_val "${ENV_KEY}")

  if [ -z "${VAL}" ]; then
    echo "⚠️ Warning: Key '${ENV_KEY}' not found or empty in '${ENV_FILE}'. Skipping secret '${SECRET_NAME}'."
    continue
  fi

  echo "🔑 Processing secret '${SECRET_NAME}' for env key '${ENV_KEY}'..."

  # Create secret container if it doesn't exist yet
  if gcloud secrets describe "${SECRET_NAME}" >/dev/null 2>&1; then
    echo "ℹ️ Secret '${SECRET_NAME}' already exists. Adding new secret version..."
  else
    echo "✨ Creating secret container '${SECRET_NAME}'..."
    gcloud secrets create "${SECRET_NAME}" \
      --replication-policy="automatic" \
      --labels="app=devpulse-studio,managed-by=script"
  fi

  # Add secret version with payload from local .env
  echo -n "${VAL}" | gcloud secrets versions add "${SECRET_NAME}" --data-file=-
  echo "✅ Successfully added new version for '${SECRET_NAME}'."
done

echo "=============================================================================="
echo "🎉 GCP Secret Manager setup completed successfully."
echo "=============================================================================="
