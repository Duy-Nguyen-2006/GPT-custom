from ortools.sat.python import cp_model

def solve_timetable(data: dict) -> list[str]:
    """
    Hàm nhận dữ liệu JSON (phân công + ràng buộc),
    chạy OR-Tools và trả kết quả dạng list[str],
    mỗi dòng: 'Tên - Thứ - Tiết - Môn - Lớp'.
    """
    # TODO: viết code CP-SAT solver tại đây
    # Bây giờ giả sử trả về kết quả mẫu:
    return [
        "Sơn - Thứ 2 - Tiết 1 - Toán - 6A",
        "Dung - Thứ 2 - Tiết 2 - Văn - 6B"
    ]
