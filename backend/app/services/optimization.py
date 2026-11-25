from itertools import combinations
import numpy as np
from scipy.optimize import linprog

LABOUR_LIMIT = 240
WOOD_LIMIT = 240


def simulate(tables_x: int, chairs_y: int):
    labour_used = 4 * tables_x + 2 * chairs_y
    wood_used = 2 * tables_x + 4 * chairs_y
    violations = []
    if labour_used > LABOUR_LIMIT:
        violations.append(f"Labour exceeds limit by {labour_used - LABOUR_LIMIT:.0f} hours")
    if wood_used > WOOD_LIMIT:
        violations.append(f"Wood exceeds limit by {wood_used - WOOD_LIMIT:.0f} units")
    feasible = not violations and tables_x >= 0 and chairs_y >= 0
    return {
        "tables_x": tables_x,
        "chairs_y": chairs_y,
        "profit": 40 * tables_x + 30 * chairs_y,
        "labour_used": labour_used,
        "wood_used": wood_used,
        "remaining_labour": LABOUR_LIMIT - labour_used,
        "remaining_wood": WOOD_LIMIT - wood_used,
        "feasible": feasible,
        "constraint_violations": violations,
    }


def solve_lpp():
    result = linprog(
        c=np.array([-40.0, -30.0]),
        A_ub=np.array([[4.0, 2.0], [2.0, 4.0]]),
        b_ub=np.array([LABOUR_LIMIT, WOOD_LIMIT]),
        bounds=[(0, None), (0, None)],
        method="highs",
    )

    if not result.success:
        return {"solver_status": "infeasible", "success": False}

    corner_points = [
        {"vertex": "O", "tables_x": 0, "chairs_y": 0, "profit": 0, "labour_used": 0, "wood_used": 0, "is_optimal": False},
        {"vertex": "A", "tables_x": 60, "chairs_y": 0, "profit": 2400, "labour_used": 240, "wood_used": 120, "is_optimal": False},
        {"vertex": "B", "tables_x": 40, "chairs_y": 40, "profit": 2800, "labour_used": 240, "wood_used": 240, "is_optimal": True},
        {"vertex": "C", "tables_x": 0, "chairs_y": 60, "profit": 1800, "labour_used": 120, "wood_used": 240, "is_optimal": False},
    ]

    tables_x = round(float(result.x[0]))
    chairs_y = round(float(result.x[1]))
    verified_profit = 40 * tables_x + 30 * chairs_y

    return {
        "success": True,
        "solver_status": result.message,
        "optimal_tables": tables_x,
        "optimal_chairs": chairs_y,
        "maximum_profit": verified_profit,
        "labour_used": 4 * tables_x + 2 * chairs_y,
        "wood_used": 2 * tables_x + 4 * chairs_y,
        "labour_utilization_percent": round((4 * tables_x + 2 * chairs_y) / LABOUR_LIMIT * 100, 2),
        "wood_utilization_percent": round((2 * tables_x + 4 * chairs_y) / WOOD_LIMIT * 100, 2),
        "corner_points": corner_points,
    }
