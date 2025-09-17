from fastapi import FastAPI
from pydantic import BaseModel
from solver import solve_timetable
import uuid

app = FastAPI()

class RequestData(BaseModel):
    request_id: str | None = None
    assignments: list[str]   # danh sách "GV - Môn - Lớp - Số tiết"
    config: dict             # thông tin ngày, ca, số tiết, ràng buộc

@app.post("/run")
async def run_solver(data: RequestData):
    request_id = data.request_id or str(uuid.uuid4())
    result = solve_timetable(data.dict())

    return {
        "request_id": request_id,
        "status": "ok",
        "result": result
    }
