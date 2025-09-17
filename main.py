from fastapi import FastAPI
from pydantic import BaseModel
import uuid
from solver import solve_timetable

app = FastAPI()

class RequestData(BaseModel):
    request_id: str | None = None
    code: str | None = None
    assignments: list[str]
    config: dict  # bắt buộc, nhưng có thể rỗng {}

@app.post("/run")
async def run_solver(data: RequestData):
    request_id = data.request_id or str(uuid.uuid4())

    try:
        # gọi solver trong solver.py
        result = solve_timetable({
            "assignments": data.assignments,
            "config": data.config
        })

        return {
            "request_id": request_id,
            "status": "ok",
            "result": result
        }

    except Exception as e:
        return {
            "request_id": request_id,
            "status": "error",
            "message": str(e)
        }
