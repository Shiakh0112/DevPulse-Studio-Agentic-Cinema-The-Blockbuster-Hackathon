"""
DevPulse Studio - ClickHouse MCP Tool Integration for AI Agents

HACKATHON COMPLIANCE & ARCHITECTURAL REQUIREMENT:
    Per the official ClickHouse Hackathon rules, all AI agents (Triage, Fix Proposal,
    Verification, Governance, Alerting) MUST interact with ClickHouse exclusively via
    the Model Context Protocol (mcp-clickhouse server).

    This module (`McpClickHouseTool`) is the SOLE runtime database query wrapper used
    by all Python agents. Direct database driver calls are strictly forbidden in the
    agent execution environment.
"""

import os
import logging
import httpx
from typing import Dict, Any, Optional

# Configure standard logging to produce explicit evidence of MCP usage for demo recordings
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s")
logger = logging.getLogger("McpClickHouseTool")


class McpClickHouseTool:
    """
    Client tool wrapper for sending SQL queries and INSERT statements to the containerized
    mcp-clickhouse server via HTTP requests.
    """

    def __init__(self, mcp_url: Optional[str] = None):
        self.mcp_url = mcp_url or os.getenv("MCP_CLICKHOUSE_URL", "http://127.0.0.1:8000").rstrip("/")

    def run_query(self, sql: str) -> Dict[str, Any]:
        """
        Sends a raw SQL query string to the mcp-clickhouse server.

        Args:
            sql (str): The SQL statement to execute.

        Returns:
            dict: Response object containing success flag, dataset, and status code.
        """
        # Force synchronous mutations for ALTER TABLE so UI updates instantly
        if sql.strip().upper().startswith("ALTER TABLE") and "SETTINGS mutations_sync" not in sql:
            sql = sql.rstrip(";") + " SETTINGS mutations_sync = 1;"

        clean_sql = sql.strip().replace("\n", " ")
        truncated_sql = (clean_sql[:70] + "...") if len(clean_sql) > 70 else clean_sql
        endpoint = f"{self.mcp_url}/query"

        try:
            with httpx.Client(timeout=60.0) as client:
                response = client.post(endpoint, json={"query": sql})

            if response.status_code == 200:
                result = response.json()
                logger.info(f"[MCP Tool] Query: {truncated_sql} | Status: success")
                return {"success": True, "data": result, "status_code": 200}
            else:
                error_msg = f"HTTP {response.status_code}: {response.text}"
                logger.error(f"[MCP Tool] Query: {truncated_sql} | Status: failed")
                return {"success": False, "error": error_msg, "status_code": response.status_code}

        except Exception as exc:
            logger.error(f"[MCP Tool] Query: {truncated_sql} | Status: failed")
            return {"success": False, "error": str(exc), "status_code": 500}

    def insert_row(self, table: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Constructs an INSERT SQL statement from a Python dictionary and executes it via run_query.

        Args:
            table (str): Target table name (e.g. 'incidents', 'incident_events', 'fix_proposals').
            data (dict): Dictionary mapping column names to values.

        Returns:
            dict: Server response object returned by run_query.
        """
        target_table = table if table.startswith("devpulse.") else f"devpulse.{table}"
        columns = list(data.keys())
        formatted_values = []

        for val in data.values():
            if val is None:
                formatted_values.append("NULL")
            elif isinstance(val, bool):
                formatted_values.append("true" if val else "false")
            elif isinstance(val, (int, float)):
                formatted_values.append(str(val))
            else:
                escaped_val = str(val).replace("\\", "\\\\").replace("'", "\\'")
                formatted_values.append(f"'{escaped_val}'")

        sql = f"INSERT INTO {target_table} ({', '.join(columns)}) VALUES ({', '.join(formatted_values)});"
        return self.run_query(sql)


if __name__ == "__main__":
    print("--- Testing McpClickHouseTool Class ---")
    tool = McpClickHouseTool()
    res = tool.run_query("SELECT count() FROM devpulse.incidents;")
    print("Execution Output:", res)
