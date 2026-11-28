from itertools import combinations
import numpy as np
from scipy.optimize import linprog

LABOUR_LIMIT = 240.0
WOOD_LIMIT = 240.0


def simulate(tables_x: int, chairs_y: int, labour_limit: float = LABOUR_LIMIT, wood_limit: float = WOOD_LIMIT):
    labour_used = 4 * tables_x + 2 * chairs_y
    wood_used = 2 * tables_x + 4 * chairs_y
    violations = []
    if labour_used > labour_limit:
        violations.append(f"Labour exceeds limit by {labour_used - labour_limit:.0f} hours")
    if wood_used > wood_limit:
        violations.append(f"Wood exceeds limit by {wood_used - wood_limit:.0f} units")
    feasible = not violations and tables_x >= 0 and chairs_y >= 0
    return {
        "tables_x": tables_x,
        "chairs_y": chairs_y,
        "profit": 40 * tables_x + 30 * chairs_y,
        "labour_used": labour_used,
        "wood_used": wood_used,
        "remaining_labour": max(0, int(labour_limit - labour_used)),
        "remaining_wood": max(0, int(wood_limit - wood_used)),
        "labour_slack": labour_limit - labour_used,
        "wood_slack": wood_limit - wood_used,
        "feasible": feasible,
        "constraint_violations": violations,
    }


def solve_lpp(profit_x: float = 40.0, profit_y: float = 30.0, labour_limit: float = LABOUR_LIMIT, wood_limit: float = WOOD_LIMIT):
    result = linprog(
        c=np.array([-profit_x, -profit_y]),
        A_ub=np.array([[4.0, 2.0], [2.0, 4.0]]),
        b_ub=np.array([labour_limit, wood_limit]),
        bounds=[(0, None), (0, None)],
        method="highs",
    )

    if not result.success:
        return {"solver_status": "infeasible", "success": False}

    # Intersections of 4X + 2Y = L and 2X + 4Y = W
    # 6X = 2L - W => X = (2L - W) / 6
    # 6Y = 2W - L => Y = (2W - L) / 6
    x_b = (2 * labour_limit - wood_limit) / 6.0
    y_b = (2 * wood_limit - labour_limit) / 6.0

    raw_corners = [
        {"vertex": "O", "tables_x": 0.0, "chairs_y": 0.0, "label": "Origin"},
        {"vertex": "A", "tables_x": round(labour_limit / 4.0, 2), "chairs_y": 0.0, "label": "Tables Only"},
        {"vertex": "B", "tables_x": round(x_b, 2), "chairs_y": round(y_b, 2), "label": "Balanced Mix"},
        {"vertex": "C", "tables_x": 0.0, "chairs_y": round(wood_limit / 4.0, 2), "label": "Chairs Only"},
    ]

    corner_points = []
    max_p = -1.0
    for pt in raw_corners:
        tx = pt["tables_x"]
        cy = pt["chairs_y"]
        p = round(profit_x * tx + profit_y * cy, 2)
        l_used = round(4 * tx + 2 * cy, 2)
        w_used = round(2 * tx + 4 * cy, 2)
        if p > max_p:
            max_p = p
        corner_points.append({
            "vertex": pt["vertex"],
            "tables_x": tx,
            "chairs_y": cy,
            "profit": p,
            "labour_used": l_used,
            "wood_used": w_used,
            "is_optimal": False,
        })
    for pt in corner_points:
        if abs(pt["profit"] - max_p) < 1e-4:
            pt["is_optimal"] = True

    tables_x = round(float(result.x[0]))
    chairs_y = round(float(result.x[1]))
    verified_profit = round(profit_x * tables_x + profit_y * chairs_y, 2)

    return {
        "success": True,
        "solver_status": result.message,
        "optimal_tables": tables_x,
        "optimal_chairs": chairs_y,
        "maximum_profit": verified_profit,
        "labour_used": 4 * tables_x + 2 * chairs_y,
        "wood_used": 2 * tables_x + 4 * chairs_y,
        "labour_utilization_percent": round((4 * tables_x + 2 * chairs_y) / labour_limit * 100, 2),
        "wood_utilization_percent": round((2 * tables_x + 4 * chairs_y) / wood_limit * 100, 2),
        "corner_points": corner_points,
    }
