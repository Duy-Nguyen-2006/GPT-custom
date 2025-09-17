from fastapi import FastAPI, Request
from solver import solve_tkb

app = FastAPI()

@app.post("/run")
async def run_tkb(request: Request):
    data = await request.json()
    result = solve_tkb(data)
    return {"status": "ok", "schedule": result}
