from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel, Field, validator
from typing import List, Dict, Any, Optional
from solver import solve_tkb
import re
import uuid

app = FastAPI(title="TKB Maker OR-Tools Server", version="1.0.0")


# ====== Schema vào/ra ======

class Assignment(BaseModel):
    teacher: str
    subject: str
    clazz: str
    periods: int = Field(gt=0)

class Config(BaseModel):
    days: List[str] = Field(default_factory=lambda: ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"])
    periods_per_day: int = Field(default=5, gt=0, le=12)
    sessions: List[str] = Field(default_factory=lambda: ["sáng"])  # chưa dùng session ở solver core

    @validator("days")
    def unique_days(cls, v):
        if len(set(v)) != len(v):
            raise ValueError("days phải là duy nhất")
        if len(v) < 1:
            raise ValueError("days ít nhất 1")
        return v

class Constraints(BaseModel):
    shdc: bool = True
    shl: bool = True
    special_teachers: Dict[str, List[str]] = Field(default_factory=dict)  # {"Thắng": ["Thứ 2","Thứ 4"], ...}
    require_double_lit: bool = True
    avoid_period_4: List[str] = Field(default_factory=list)               # soft: tránh tiết 4
    start_at_period_1: List[str] = Field(default_factory=list)            # hard: ngày nào dạy phải có tiết 1
    exact_4_days_if_ge4: Dict[str, bool] = Field(default_factory=dict)    # {"*": True} hoặc chỉ định GV
    exact_4_days_exceptions: List[str] = Field(default_factory=list)      # ngoại lệ, vd ["Thắng","Thơ"]
    no_overlap_pairs: List[List[str]] = Field(default_factory=list)       # [[\"Yên\",\"Thúy\"], ...]
    gdtc_one_per_day: bool = True
    max_two_same_subject_per_day: bool = True

class Payload(BaseModel):
    request_id: Optional[str] = None
    assignments: List[Assignment]
    config: Config = Config()
    constraints: Constraints = Constraints()

class ScheduleItem(BaseModel):
    teacher: str
    day: str
    period: int
    subject: str
    clazz: str

class SolveResponse(BaseModel):
    status: str
    request_id: str
    schedule: List[ScheduleItem] = Field(default_factory=list)
    summary: Dict[str, Any] = Field(default_factory=dict)
    pretty: Optional[str] = None
    error: Optional[str] = None


# ====== Endpoints ======

@app.post("/run", response_model=SolveResponse)
async def run_tkb(payload: Payload):
    # mỗi request là độc lập (stateless) -> đa người dùng OK
    req_id = payload.request_id or str(uuid.uuid4())
    try:
        result = solve_tkb(payload.dict())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Solver error: {e}")

    # format đẹp theo yêu cầu
    pretty_lines = []
    for r in result.get("schedule", []):
        pretty_lines.append(f"{r['teacher']} - {r['day']} - Tiết {r['period']} - {r['subject']} - {r['clazz']}")
    pretty = "\n".join(pretty_lines)

    return SolveResponse(
        status=result.get("status", "ok"),
        request_id=req_id,
        schedule=[ScheduleItem(**r) for r in result.get("schedule", [])],
        summary=result.get("summary", {}),
        pretty=pretty,
        error=result.get("error")
    )


@app.post("/parse-and-run", response_model=SolveResponse)
async def parse_and_run(request: Request):
    """
    Dự phòng: nhận raw text người dùng dán (phân công chuyên môn ...),
    tự parse thành JSON assignments đơn giản rồi chạy solver.
    (Khuyến nghị: GPT nên parse phía client để chủ động hơn.)
    """
    text = await request.body()
    text = text.decode("utf-8", errors="ignore")

    # tìm config cơ bản (mặc định nếu không có)
    config = Config().dict()

    # regex tách dòng dạng "Tên – Môn – Lớp – Số tiết"
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    asg = []
    for l in lines:
        # chuẩn hóa dấu gạch ngang
        norm = re.sub(r"[–—]+", "-", l)
        parts = [p.strip() for p in norm.split("-")]
        if len(parts) == 4:
            teacher, subject, clazz, periods = parts
            # lọc số tiết
            m = re.search(r"\d+", periods)
            if m:
                per = int(m.group())
                asg.append({"teacher": teacher, "subject": subject, "clazz": clazz, "periods": per})

    constraints = Constraints().dict()
    payload = {
        "request_id": str(uuid.uuid4()),
        "assignments": asg,
        "config": config,
        "constraints": constraints
    }

    try:
        result = solve_tkb(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Solver error: {e}")

    pretty_lines = []
    for r in result.get("schedule", []):
        pretty_lines.append(f"{r['teacher']} - {r['day']} - Tiết {r['period']} - {r['subject']} - {r['clazz']}")
    pretty = "\n".join(pretty_lines)

    return SolveResponse(
        status=result.get("status", "ok"),
        request_id=payload["request_id"],
        schedule=[ScheduleItem(**r) for r in result.get("schedule", [])],
        summary=result.get("summary", {}),
        pretty=pretty,
        error=result.get("error")
    )
