from ortools.sat.python import cp_model


def solve_tkb(data):
    """
    Input: data (dict) gồm các keys chính:
    - assignments: [
        {"teacher": "Sơn", "subject": "Toán", "clazz": "9A", "periods": 3},
        {"teacher": "Dung", "subject": "Toán", "clazz": "8A", "periods": 3},
        ...
      ]
    - config: {
        "days": ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"],
        "periods_per_day": 5,
        "sessions": ["sáng"],   # có thể là ["sáng","chiều"]
    }
    - constraints: {
        "shdc": true,   # Thứ 2 tiết 1 = SHDC
        "shl": true,    # Thứ 6 tiết cuối = SHL
        "special_teachers": {"Thắng": ["Thứ 2","Thứ 4"], "Thơ": ["Thứ 2","Thứ 6"]},
        "avoid_period_4": ["Hương","Thuận","Ngân","Trọng","Học","Phương","Thúy","Lan"],
        "require_double_lit": true,   # Văn cần 2 tiết liền
        "teacher_no_conflict": [["Yên","Thúy"]],
        "gdtc_one_per_day": true,
        "max_two_same_subject": true
    }
    """

    days = data["config"]["days"]
    periods_per_day = data["config"]["periods_per_day"]

    assignments = data["assignments"]

    model = cp_model.CpModel()

    # === Biến quyết định ===
    # x[(i,d,p)] = 1 nếu assignment i (giáo viên-môn-lớp) được xếp vào ngày d, tiết p
    x = {}
    for i, a in enumerate(assignments):
        for d in range(len(days)):
            for p in range(1, periods_per_day+1):
                x[(i, d, p)] = model.NewBoolVar(f"x_{i}_{d}_{p}")

    # === Ràng buộc số tiết / tuần ===
    for i, a in enumerate(assignments):
        model.Add(sum(x[(i, d, p)]
                      for d in range(len(days))
                      for p in range(1, periods_per_day+1)) == a["periods"])

    # === Mỗi lớp, mỗi tiết chỉ có 1 môn ===
    for d in range(len(days)):
        for p in range(1, periods_per_day+1):
            classes = {}
            for i, a in enumerate(assignments):
                clazz = a["clazz"]
                if clazz not in classes:
                    classes[clazz] = []
                classes[clazz].append(x[(i, d, p)])
            for clazz, vars_ in classes.items():
                model.Add(sum(vars_) <= 1)

    # === Không trùng lịch giáo viên ===
    for d in range(len(days)):
        for p in range(1, periods_per_day+1):
            teachers = {}
            for i, a in enumerate(assignments):
                t = a["teacher"]
                if t not in teachers:
                    teachers[t] = []
                teachers[t].append(x[(i, d, p)])
            for t, vars_ in teachers.items():
                model.Add(sum(vars_) <= 1)

    # === SHDC / SHL ===
    if data["constraints"].get("shdc", False):
        # Thứ 2 = index 0, tiết 1: chặn
        for i in range(len(assignments)):
            model.Add(x[(i, 0, 1)] == 0)
    if data["constraints"].get("shl", False):
        # Thứ 6 = index cuối, tiết cuối
        for i in range(len(assignments)):
            model.Add(x[(i, len(days)-1, periods_per_day)] == 0)

    # === Giáo viên đặc biệt chỉ dạy ngày cố định ===
    for teacher, allowed_days in data["constraints"].get("special_teachers", {}).items():
        allowed_idx = [days.index(d) for d in allowed_days if d in days]
        for i, a in enumerate(assignments):
            if a["teacher"] == teacher:
                for d in range(len(days)):
                    if d not in allowed_idx:
                        for p in range(1, periods_per_day+1):
                            model.Add(x[(i, d, p)] == 0)

    # === Hạn chế tiết 4 cho một số GV ===
    avoid_list = data["constraints"].get("avoid_period_4", [])
    for i, a in enumerate(assignments):
        if a["teacher"] in avoid_list:
            model.Add(sum(x[(i, d, 4)] for d in range(len(days))) <= 1)

    # === Solve ===
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 20
    status = solver.Solve(model)

    result = []
    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        for i, a in enumerate(assignments):
            for d in range(len(days)):
                for p in range(1, periods_per_day+1):
                    if solver.Value(x[(i, d, p)]) == 1:
                        result.append({
                            "teacher": a["teacher"],
                            "day": days[d],
                            "period": p,
                            "subject": a["subject"],
                            "clazz": a["clazz"]
                        })
    else:
        result.append({"error": "No feasible schedule"})

    return result
