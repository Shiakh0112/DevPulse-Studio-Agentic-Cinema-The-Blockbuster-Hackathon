import os
import sys
import json
import uuid
import logging
import traceback
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from agent.tools.clickhouse_mcp_tool import McpClickHouseTool
    from agent.tools.rollback_helper import build_rollback_event
    from agent.orchestrator import run_pipeline
except ImportError:
    from tools.clickhouse_mcp_tool import McpClickHouseTool
    from tools.rollback_helper import build_rollback_event
    from orchestrator import run_pipeline
from mcp_middleware import validate_query, CLICKHOUSE_URL
import httpx
from fastapi.responses import JSONResponse
from fastapi import Request

# Load environment variables
load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s")
logger = logging.getLogger("DevPulseMainAPI")

app = FastAPI(
    title="DevPulse Studio - AI Agent Orchestrator",
    description="FastAPI service for DevPulse Studio AI Agent Pipeline",
    version="1.0.0"
)

# Configure CORS middleware
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Integrated MCP Route to bypass Railway Mount/Routing bugs
@app.post("/mcp/query")
async def integrated_mcp_query(request: Request):
    try:
        body = await request.json()
        query = body.get("query", "")
        is_valid, msg = validate_query(query)
        if not is_valid:
            return JSONResponse(status_code=403, content={"error": msg})

        async with httpx.AsyncClient(timeout=30.0) as client:
            params = {
                "user": os.getenv("CLICKHOUSE_USER", "devpulse_web"),
                "password": os.getenv("CLICKHOUSE_PASSWORD", "devpulse123"),
            }
            resp = await client.post(
                CLICKHOUSE_URL,
                params=params,
                content=query.encode("utf-8"),
                headers={"Content-Type": "text/plain"},
            )

            if resp.status_code == 200:
                text = resp.text.strip()
                if not text:
                    return {"result": "OK", "rows_affected": 0}
                try:
                    import json
                    lines = [l for l in text.split("\n") if l.strip()]
                    rows = [json.loads(l) for l in lines]
                    return rows if len(rows) > 1 else rows[0] if rows else {"result": "OK"}
                except Exception:
                    return {"result": text}
            else:
                return JSONResponse(status_code=resp.status_code, content={"error": resp.text.strip()})

    except httpx.ConnectError as e:
        return JSONResponse(status_code=502, content={"error": str(e)})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


class TriggerPipelineRequest(BaseModel):
    incident_id: str
    payload: dict = None


class RollbackRequest(BaseModel):
    incident_id: str
    triggered_by: str = "system-auto"


def run_pipeline_task(incident_id: str, payload: dict = None):
    """Background task runner for executing the multi-agent pipeline asynchronously."""
    try:
        logger.info(f"[Main Agent API] Background task started for incident: {incident_id}")
        run_pipeline(incident_id, payload)
        logger.info(f"[Main Agent API] Background task completed for incident: {incident_id}")
    except Exception as exc:
        logger.error(
            f"[Main Agent API Error] Background task failed for incident {incident_id}: {exc}\n{traceback.format_exc()}"
        )


@app.get("/health")
def health_check():
    """Health check endpoint returning status ok."""
    return {"status": "ok"}


@app.post("/trigger-pipeline")
def trigger_pipeline(request: TriggerPipelineRequest, background_tasks: BackgroundTasks):
    """
    Triggers the end-to-end multi-agent AI orchestration pipeline asynchronously in the background.
    Returns immediately with status 'pipeline_started'.
    """
    if not request.incident_id:
        raise HTTPException(status_code=400, detail="incident_id is required")

    background_tasks.add_task(run_pipeline_task, request.incident_id, request.payload)

    return {
        "status": "pipeline_started",
        "incident_id": request.incident_id
    }


@app.post("/rollback")
def trigger_rollback(request: RollbackRequest):
    """
    Triggers emergency rollback for an incident, inserting a rollback_events record
    and updating the incident status to ROLLED_BACK.
    """
    if not request.incident_id:
        raise HTTPException(status_code=400, detail="incident_id is required")

    mcp_tool = McpClickHouseTool()

    # Attempt to fetch incident details from ClickHouse
    incident_data = {"incident_id": request.incident_id, "affected_users_estimate": 500}
    try:
        query_sql = f"SELECT incident_id, severity, affected_users_estimate FROM devpulse.incidents WHERE incident_id = '{request.incident_id}' FORMAT JSONEachRow;"
        res = mcp_tool.run_query(query_sql)
        if res.get("status") == "success" and res.get("output"):
            output_text = res["output"].strip()
            lines = output_text.split("\n")
            if lines and lines[0]:
                fetched = json.loads(lines[0])
                incident_data.update(fetched)
    except Exception:
        pass

    # Build rollback event record
    rollback_event = build_rollback_event(incident_data, request.triggered_by)

    # Insert into devpulse.rollback_events via McpClickHouseTool
    mcp_tool.insert_row("rollback_events", rollback_event)

    # Update devpulse.incidents status to ROLLED_BACK
    update_sql = f"ALTER TABLE devpulse.incidents UPDATE status = 'ROLLED_BACK' WHERE incident_id = '{request.incident_id}';"
    mcp_tool.run_query(update_sql)

    # Write incident_events timeline row
    event_payload = {
        "rollback_id": rollback_event["rollback_id"],
        "triggered_by": request.triggered_by,
        "affected_users": rollback_event["affected_users_at_trigger"]
    }
    event_record = {
        "event_id": str(uuid.uuid4()),
        "incident_id": request.incident_id,
        "event_type": "ROLLED_BACK",
        "payload": json.dumps(event_payload)
    }
    mcp_tool.insert_row("incident_events", event_record)

    return {
        "rollback_id": rollback_event["rollback_id"],
        "status": "TRIGGERED",
        "incident_id": request.incident_id,
        "affected_users": rollback_event["affected_users_at_trigger"],
        "previous_stable_version": rollback_event["previous_stable_version"]
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
