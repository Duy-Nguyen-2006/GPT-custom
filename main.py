from fastapi import FastAPI
from pydantic import BaseModel
import uuid
import tempfile
import runpy

app = FastAPI()

class RequestData(BaseModel):
    request_id: str | None = None
    code: str                # đoạn code solver do GPT gửi
    assignments: list[str]   # danh sách phân công
    config: dict             # thông tin ngày/tiết, ràng buộc

@app.post("/run")
async def run_solver(data: RequestData):
    request_id = data.request_id or str(uuid.uuid4())

    # Lưu code solver thành file Python tạm
    with tempfile.NamedTemporaryFile(mode="w+", suffix=".py", delete=False) as tmp_file:
        tmp_file.write(data.code)
        tmp_file.flush()
        tmp_path = tmp_file.name

    try:
        # Chạy file solver vừa lưu
        module_globals = runpy.run_path(tmp_path)

        # Yêu cầu code solver phải có hàm solve_timetable
        if "solve_timetable" not in module_globals:
            return {
                "request_id": request_id,
                "status": "error",
                "message": "Code không có hàm solve_timetable(data)"
            }

        solve_func = module_globals["solve_timetable"]

        # Gọi solver với dữ liệu
        result = solve_func(data.dict())

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
