"""
DevPulse Studio - ClickHouse MCP Middleware & SQL Guardrail Safety Layer

Purpose:
    Defense-in-depth safety middleware that inspects and validates raw SQL query strings
    before execution by the ClickHouse MCP Server. Prevents destructive database operations
    (e.g., DROP, TRUNCATE, GRANT, KILL) and database namespace escapes, protecting the system
    against prompt injections, unauthorized operations, or AI agent runtime logic errors.
"""

import re
import logging
import os
import httpx
from typing import Tuple
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

logging.basicConfig(level=logging.INFO, format="%(asctime)s - [SQL GUARDRAIL] - %(levelname)s - %(message)s")


def _strip_string_literals(query: str) -> str:
    """Remove all single-quoted string literals from a query so regex only matches SQL keywords."""
    return re.sub(r"'[^']*'", "''", query)


def validate_query(query: str) -> Tuple[bool, str]:
    """
    Inspects an incoming SQL query string for security policy compliance.
    Only checks SQL KEYWORDS outside of string literals.
    """
    if not query or not query.strip():
        return False, "Empty or whitespace-only query string provided."

    clean_query = query.strip()

    # Strip string literals so we only match SQL keywords, not data values like 'system-auto'
    stripped = _strip_string_literals(clean_query).upper()

    # 1. Check for forbidden SQL commands (only outside string literals)
    forbidden = [
        (r"\bDROP\b", "DROP"),
        (r"\bTRUNCATE\b", "TRUNCATE"),
        (r"\bSYSTEM\b", "SYSTEM"),
        (r"\bDETACH\b", "DETACH"),
        (r"\bKILL\b", "KILL"),
        (r"\bGRANT\b", "GRANT"),
        (r"\bREVOKE\b", "REVOKE"),
        (r"\bCREATE\s+USER\b", "CREATE USER"),
        (r"\bDROP\s+USER\b", "DROP USER"),
    ]
    for pattern, keyword in forbidden:
        if re.search(pattern, stripped, re.IGNORECASE):
            msg = f"Security Violation: Query contains prohibited command/keyword '{keyword}'."
            logging.warning(f"BLOCKED query: '{clean_query[:120]}...' | Rationale: {msg}")
            return False, msg

    # 2. Check ALTER statements: Only allow 'ALTER TABLE [devpulse.]<table> UPDATE ...'
    if "ALTER" in stripped:
        alter_update_pattern = r"^ALTER\s+TABLE\s+(devpulse\.[a-zA-Z0-9_]+|[a-zA-Z0-9_]+)\s+UPDATE\b"
        if not re.search(alter_update_pattern, stripped, re.IGNORECASE):
            msg = "Security Violation: ALTER statements are restricted strictly to 'ALTER TABLE devpulse.<table> UPDATE ...'."
            logging.warning(f"BLOCKED query: '{clean_query[:120]}...' | Rationale: {msg}")
            return False, msg

    # 3. Restrict statement types to allowed verbs (SELECT, INSERT, ALTER, WITH)
    first_word = stripped.split()[0]
    if first_word not in ("SELECT", "INSERT", "ALTER", "WITH"):
        msg = f"Security Violation: Prohibited SQL command '{first_word}'."
        logging.warning(f"BLOCKED query: '{clean_query[:120]}...' | Rationale: {msg}")
        return False, msg

    logging.info(f"PERMITTED query: '{clean_query[:120]}...'")
    return True, "Query validated successfully."


# ============================================================================
# FastAPI MCP Middleware Server
# ============================================================================

app = FastAPI(title="ClickHouse MCP Middleware")
from dotenv import load_dotenv
load_dotenv()

_host = os.getenv("CLICKHOUSE_HOST", "http://127.0.0.1")
_port = os.getenv("CLICKHOUSE_PORT", "8123")
_secure = os.getenv("CLICKHOUSE_SECURE", "false").lower() == "true"
_scheme = "https" if _secure else "http"
if not _host.startswith("http"):
    _host = f"{_scheme}://{_host}"
CLICKHOUSE_URL = f"{_host}:{_port}"



@app.post("/query")
async def handle_query(request: Request):
    try:
        body = await request.json()
        query = body.get("query", "")

        # 1. Guardrail Validation
        is_valid, msg = validate_query(query)
        if not is_valid:
            return JSONResponse(status_code=403, content={"error": msg})

        # 2. Forward to ClickHouse HTTP API
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
                    # Try parsing as JSON lines (FORMAT JSONEachRow)
                    lines = [l for l in text.split("\n") if l.strip()]
                    rows = [json.loads(l) for l in lines]
                    return rows if len(rows) > 1 else rows[0] if rows else {"result": "OK"}
                except Exception:
                    return {"result": text}
            else:
                error_text = resp.text.strip()
                logging.error(f"ClickHouse Error ({resp.status_code}): {error_text[:200]}")
                return JSONResponse(
                    status_code=resp.status_code,
                    content={"error": error_text}
                )

    except httpx.ConnectError as e:
        logging.error(f"Cannot connect to ClickHouse at {CLICKHOUSE_URL}: {e}")
        return JSONResponse(status_code=502, content={"error": f"Cannot connect to ClickHouse: {e}"})
    except Exception as e:
        logging.error(f"Middleware internal error: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/health")
async def health():
    return {"status": "ok", "clickhouse_url": CLICKHOUSE_URL}
