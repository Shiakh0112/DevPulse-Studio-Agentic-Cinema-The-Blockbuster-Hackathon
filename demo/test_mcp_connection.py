"""
DevPulse Studio - ClickHouse MCP Server Connection Verification Tool

Purpose:
    Standalone verification script that tests connectivity and query execution against
    the containerized mcp-clickhouse server (running at http://localhost:8000).

Usage:
    python demo/test_mcp_connection.py
"""

import sys
import httpx

MCP_SERVER_URL = "http://localhost:8000"


def test_mcp_connection():
    print("==================================================")
    print(" DevPulse Studio - ClickHouse MCP Server Test ")
    print(f" Target Server URL: {MCP_SERVER_URL}")
    print("==================================================\n")

    # Test Query 1: Basic connection check
    query_1 = "SELECT 1;"
    print(f"[Test 1/2] Sending Query: '{query_1}'")
    try:
        response = httpx.post(
            f"{MCP_SERVER_URL}/query",
            json={"query": query_1},
            timeout=5.0
        )
        if response.status_code == 200:
            print(" [SUCCESS] Response from MCP Server:")
            print(f"   Status: {response.status_code}")
            print(f"   Body:   {response.text.strip()}\n")
        else:
            print(f" [WARNING] MCP Server returned HTTP {response.status_code}:")
            print(f"   Body:   {response.text.strip()}\n")
    except httpx.ConnectError as exc:
        print(f" [ERROR] Could not connect to MCP Server at {MCP_SERVER_URL}.")
        print(f"   Reason: {exc}")
        print("\n [TROUBLESHOOTING CHECKLIST]:")
        print("   1. Verify your Docker container is running:")
        print("      docker run -p 8000:8000 -e CLICKHOUSE_HOST=... mcp-clickhouse")
        print("   2. Verify CLICKHOUSE_HOST, CLICKHOUSE_USER, and CLICKHOUSE_PASSWORD environment variables are set.\n")
        return
    except Exception as exc:
        print(f" [ERROR] Unexpected failure executing Query 1: {exc}\n")
        return

    # Test Query 2: Query devpulse.incidents count
    query_2 = "SELECT count() FROM devpulse.incidents;"
    print(f"[Test 2/2] Sending Query: '{query_2}'")
    try:
        response = httpx.post(
            f"{MCP_SERVER_URL}/query",
            json={"query": query_2},
            timeout=5.0
        )
        if response.status_code == 200:
            print(" [SUCCESS] Response from MCP Server:")
            print(f"   Status: {response.status_code}")
            print(f"   Body:   {response.text.strip()}\n")
        else:
            print(f" [WARNING] MCP Server returned HTTP {response.status_code}:")
            print(f"   Body:   {response.text.strip()}\n")
    except Exception as exc:
        print(f" [ERROR] Failure executing Query 2: {exc}\n")
        return

    print("==================================================")
    print(" MCP Server Connection Verification Complete")
    print("==================================================")


if __name__ == "__main__":
    test_mcp_connection()
