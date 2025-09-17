from fastapi import FastAPI
from pydantic import BaseModel
import uuid
import tempfile
import runpy

app = FastAPI()

class RequestData(BaseModel):
    request_id: str | None = None
    code: str
    assignments: list[str]
    config: dict

@app.post("/run")
async def run_solver(data: RequestData):
    request_id = data.request_id or str(uuid.uuid4())

    # Lưu code solver thành file Python tạm
    with tempfile.NamedTemporaryFile(mode="w+", suffix=".py", delete=False) as tmp_file:
        tmp_file.write(data.code)
        tmp_file.flush()
        tmp_path = tmp_file.name

    try:
        # Import code từ file tạm
        module_globals = runpy.run_path(tmp_path)

        if "solve_timetable" not in module_globals:
            return {
                "request_id": request_id,
                "status": "error",
                "message": "Code không có hàm solve_timetable(data)"
            }

        solve_func = module_globals["solve_timetable"]

        # Chạy solver
        result = solve_func({
            "assignments": data.assignments,
            "config": data.config
        })

        # Chỉ trả về kết quả dạng list chuỗi
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
