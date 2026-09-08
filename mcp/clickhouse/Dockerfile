# Dockerfile for MCP ClickHouse Server
# Base Image: Python 3.11 slim
FROM python:3.11-slim

# Set working directory inside container
WORKDIR /app

# Environment configuration for Python
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install dependencies including mcp-clickhouse
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy source directory files
COPY . /app

# Expose service port
EXPOSE 8000

# ==============================================================================
# SECURITY & CONFIGURATION NOTICE:
# Environment variables MUST be passed at runtime via `docker run -e` flags
# or Google Cloud Run environment variable configuration.
# NEVER bake database credentials into this image or Dockerfile!
#
# Required Runtime Environment Variables:
#   - CLICKHOUSE_HOST
#   - CLICKHOUSE_PORT
#   - CLICKHOUSE_USER
#   - CLICKHOUSE_PASSWORD
#   - CLICKHOUSE_SECURE
#   - CLICKHOUSE_VERIFY
# ==============================================================================

# Entrypoint running the official mcp-clickhouse server
ENTRYPOINT ["mcp-clickhouse"]
