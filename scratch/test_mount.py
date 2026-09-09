from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import uvicorn
import httpx
import asyncio
import threading

mcp_app = FastAPI()
@mcp_app.post("/query")
async def handle_query(request: Request):
    return {"result": "OK"}

app = FastAPI()
app.mount("/mcp", mcp_app)

async def test():
    await asyncio.sleep(2)
    async with httpx.AsyncClient() as client:
        resp = await client.post("http://127.0.0.1:8000/mcp/query", json={"query": "SELECT 1;"})
        print(f"TEST RESULT: {resp.status_code} {resp.text}")
    
    import os, signal
    os.kill(os.getpid(), signal.SIGINT)

def start_test():
    asyncio.run(test())

if __name__ == "__main__":
    threading.Thread(target=start_test).start()
    uvicorn.run(app, host="127.0.0.1", port=8000)
