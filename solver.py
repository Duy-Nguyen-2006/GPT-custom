from ortools.sat.python import cp_model

def solve_timetable(data):
    assignments = data["assignments"]
    config = data.get("config", {})  # luôn nhận config, kể cả {}

    # Tách assignments và rules
    teacher_subject_class = []
    rules = []
    for line in assignments:
        if line.startswith("RULE"):
            rules.append(line[7:].strip())
        else:
            try:
                teacher, subject, class_name, periods = [x.strip() for x in line.split("-")]
                periods = int(periods)
                teacher_subject_class.append((teacher, subject, class_name, periods))
            except:
                continue

    # Cấu hình mặc định từ config (nếu không có thì fallback)
    days = config.get("days", ["Thu2", "Thu3", "Thu4", "Thu5", "Thu6"])
    periods_per_day = config.get("periods_per_day", {"Thu2": 5, "Thu3": 4, "Thu4": 4, "Thu5": 4, "Thu6": 5})

    model = cp_model.CpModel()
    x = {}
    for (gv, mon, lop, so_tiet) in teacher_subject_class:
        for d in days:
            for p in range(1, periods_per_day[d] + 1):
                x[(gv, mon, lop, d, p)] = model.NewBoolVar(f"{gv}_{mon}_{lop}_{d}_{p}")

    # Ràng buộc số tiết
    for (gv, mon, lop, so_tiet) in teacher_subject_class:
        model.Add(
            sum(x[(gv, mon, lop, d, p)] for d in days for p in range(1, periods_per_day[d] + 1))
            == so_tiet
        )

    # Mỗi lớp mỗi tiết chỉ có 1 môn
    for lop in set(l for _, _, l, _ in teacher_subject_class):
        for d in days:
            for p in range(1, periods_per_day[d] + 1):
                model.Add(
                    sum(
                        x[(gv, mon, lop, d, p)]
                        for (gv, mon, lop2, _) in teacher_subject_class
                        if lop2 == lop
                    )
                    <= 1
                )

    # Mỗi GV mỗi tiết chỉ dạy 1 lớp
    for gv in set(g for g, _, _, _ in teacher_subject_class):
        for d in days:
            for p in range(1, periods_per_day[d] + 1):
                model.Add(
                    sum(
                        x[(gv, mon, lop, d, p)]
                        for (gv2, mon, lop, _) in teacher_subject_class
                        if gv2 == gv
                    )
                    <= 1
                )

    # Một số rule mẫu
    for rule in rules:
        if "Thứ2 tiết1" in rule and "SHDC" in rule:
            for lop in set(l for _, _, l, _ in teacher_subject_class):
                model.Add(
                    sum(
                        x[(gv, mon, lop, "Thu2", 1)]
                        for (gv, mon, lop2, _) in teacher_subject_class
                        if lop2 == lop
                    )
                    == 0
                )
        if "Thứ6 tiết5" in rule and "SHL" in rule:
            for lop in set(l for _, _, l, _ in teacher_subject_class):
                model.Add(
                    sum(
                        x[(gv, mon, lop, "Thu6", 5)]
                        for (gv, mon, lop2, _) in teacher_subject_class
                        if lop2 == lop
                    )
                    == 0
                )

    solver = cp_model.CpSolver()
    status = solver.Solve(model)

    result = []
    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        for (gv, mon, lop, d, p), var in x.items():
            if solver.Value(var) == 1:
                result.append(f"{gv} - {d} - Tiet{p} - {mon} - {lop}")
    else:
        result.append("No solution found")

    return result
