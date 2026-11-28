from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
import pandas as pd
import io

from ..database import get_db
from ..models import Product, Constraint, ProductionGrid, CornerPoint, DashboardKPI, SimulationHistory
from ..schemas import SimulationInput
from ..services.optimization import simulate, solve_lpp

router = APIRouter(prefix="/api")

@router.api_route("/health", methods=["GET", "HEAD"])
def health():
    return {"status": "healthy", "service": "Smart Production Optimization API"}

@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    kpis = {row.metric: row.value for row in db.query(DashboardKPI).all()}
    optimization = solve_lpp()
    grid = db.query(ProductionGrid).all()
    feasible_count = sum(1 for row in grid if str(row.is_feasible).lower() == "yes")
    return {
        "kpis": kpis,
        "optimization": optimization,
        "grid_summary": {"total": len(grid), "feasible": feasible_count, "infeasible": len(grid) - feasible_count},
    }

@router.get("/products")
def products(db: Session = Depends(get_db)):
    return [{"name": r.name, "decision_variable": r.decision_variable, "profit_per_unit": r.profit_per_unit, "labour_hours_per_unit": r.labour_hours_per_unit, "wood_units_per_unit": r.wood_units_per_unit} for r in db.query(Product).all()]

@router.get("/constraints")
def constraints(db: Session = Depends(get_db)):
    return [{"constraint_id": r.constraint_id, "resource": r.resource, "tables_coefficient": r.tables_coefficient, "chairs_coefficient": r.chairs_coefficient, "limit": r.limit, "unit": r.unit, "equation": r.equation, "meaning": r.meaning} for r in db.query(Constraint).all()]

@router.get("/dataset")
def dataset(db: Session = Depends(get_db)):
    return {
        "datasets": [
            {"name": "Production Grid", "records": db.query(ProductionGrid).count(), "description": "Integer production combinations with feasibility and resource calculations"},
            {"name": "Constraints", "records": db.query(Constraint).count(), "description": "Resource limits and constraint equations"},
            {"name": "Corner Points", "records": db.query(CornerPoint).count(), "description": "Feasible-region vertices and objective values"},
            {"name": "Product Resource Data", "records": db.query(Product).count(), "description": "Table and chair unit economics"},
            {"name": "Dashboard KPIs", "records": db.query(DashboardKPI).count(), "description": "Validated dashboard summary metrics"},
        ]
    }

@router.get("/dataset/grid")
def grid_dataset(page: int = Query(1, ge=1), page_size: int = Query(100, ge=1, le=500), feasible: str | None = None, db: Session = Depends(get_db)):
    query = db.query(ProductionGrid)
    if feasible:
        query = query.filter(func.lower(ProductionGrid.is_feasible) == feasible.lower())
    total = query.count()
    rows = query.offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "page": page, "page_size": page_size, "rows": [{"tables_x": r.tables_x, "chairs_y": r.chairs_y, "labour_used": r.labour_used, "labour_available": r.labour_available, "wood_used": r.wood_used, "wood_available": r.wood_available, "labour_slack": r.labour_slack, "wood_slack": r.wood_slack, "profit": r.profit, "is_feasible": r.is_feasible, "feasible_profit": r.feasible_profit} for r in rows]}

@router.get("/vertices")
def vertices(db: Session = Depends(get_db)):
    return [{"vertex": r.vertex, "tables_x": r.tables_x, "chairs_y": r.chairs_y, "profit": r.profit, "labour_used": r.labour_used, "wood_used": r.wood_used, "is_optimal": r.is_optimal, "explanation": r.explanation} for r in db.query(CornerPoint).all()]

@router.post("/simulate")
def simulate_endpoint(payload: SimulationInput, db: Session = Depends(get_db)):
    result = simulate(payload.tables_x, payload.chairs_y)
    db.add(SimulationHistory(tables_x=payload.tables_x, chairs_y=payload.chairs_y, profit=result["profit"], labour_used=result["labour_used"], wood_used=result["wood_used"], is_feasible=result["feasible"]))
    db.commit()
    return result

@router.post("/optimize")
def optimize_endpoint():
    return solve_lpp()

@router.get("/history")
def history(db: Session = Depends(get_db)):
    rows = db.query(SimulationHistory).order_by(SimulationHistory.id.desc()).limit(50).all()
    return [{"id": r.id, "tables_x": r.tables_x, "chairs_y": r.chairs_y, "profit": r.profit, "labour_used": r.labour_used, "wood_used": r.wood_used, "is_feasible": r.is_feasible, "created_at": r.created_at.isoformat() if r.created_at else None} for r in rows]

@router.post("/dataset/upload")
async def upload_dataset(dataset_type: str = Form(...), file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")
    required = {
        "grid": {"Tables_X", "Chairs_Y", "Labour_Used_Hours", "Labour_Available_Hours", "Wood_Used_Units", "Wood_Available_Units", "Labour_Slack_Hours", "Wood_Slack_Units", "Profit", "Is_Feasible", "Feasible_Profit"},
        "constraints": {"Constraint_ID", "Resource", "Tables_Coefficient", "Chairs_Coefficient", "Limit", "Unit", "Equation"},
        "vertices": {"Vertex", "Tables_X", "Chairs_Y", "Profit", "Labour_Used", "Wood_Used", "Is_Optimal", "Explanation"},
        "products": {"Product", "Decision_Variable", "Profit_Per_Unit", "Labour_Hours_Per_Unit", "Wood_Units_Per_Unit"},
        "kpis": {"Metric", "Value", "Unit"},
    }
    if dataset_type not in required:
        raise HTTPException(status_code=400, detail="dataset_type must be grid, constraints, vertices, products, or kpis")
    try:
        frame = pd.read_csv(io.BytesIO(await file.read()))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid CSV: {exc}")
    missing = required[dataset_type] - set(frame.columns)
    if missing:
        raise HTTPException(status_code=422, detail=f"Missing required columns: {', '.join(sorted(missing))}")
    if dataset_type != "grid" and frame.isna().any().any():
        raise HTTPException(status_code=422, detail="CSV contains missing values")

    imported = 0
    if dataset_type == "grid":
        db.query(ProductionGrid).delete()
        grid_items = []
        for _, row in frame.iterrows():
            fp = row.get("Feasible_Profit")
            feasible_profit = float(fp) if pd.notna(fp) and str(fp).strip() != "" else None
            grid_items.append(ProductionGrid(
                tables_x=int(row.Tables_X),
                chairs_y=int(row.Chairs_Y),
                labour_used=float(row.Labour_Used_Hours),
                labour_available=float(row.Labour_Available_Hours),
                wood_used=float(row.Wood_Used_Units),
                wood_available=float(row.Wood_Available_Units),
                labour_slack=float(row.Labour_Slack_Hours),
                wood_slack=float(row.Wood_Slack_Units),
                profit=float(row.Profit),
                is_feasible=str(row.Is_Feasible),
                feasible_profit=feasible_profit
            ))
            imported += 1
        db.add_all(grid_items)
    elif dataset_type == "constraints":
        db.query(Constraint).delete()
        for _, row in frame.iterrows():
            db.add(Constraint(constraint_id=str(row.Constraint_ID), resource=str(row.Resource), tables_coefficient=float(row.Tables_Coefficient), chairs_coefficient=float(row.Chairs_Coefficient), limit=float(row.Limit), unit=str(row.Unit), equation=str(row.Equation), meaning=str(row.get("Meaning", ""))))
            imported += 1
    elif dataset_type == "vertices":
        db.query(CornerPoint).delete()
        for _, row in frame.iterrows():
            db.add(CornerPoint(vertex=str(row.Vertex), tables_x=float(row.Tables_X), chairs_y=float(row.Chairs_Y), profit=float(row.Profit), labour_used=float(row.Labour_Used), wood_used=float(row.Wood_Used), is_optimal=str(row.Is_Optimal), explanation=str(row.Explanation)))
            imported += 1
    elif dataset_type == "products":
        db.query(Product).delete()
        for _, row in frame.iterrows():
            db.add(Product(name=str(row.Product), decision_variable=str(row.Decision_Variable), profit_per_unit=float(row.Profit_Per_Unit), labour_hours_per_unit=float(row.Labour_Hours_Per_Unit), wood_units_per_unit=float(row.Wood_Units_Per_Unit)))
            imported += 1
    elif dataset_type == "kpis":
        db.query(DashboardKPI).delete()
        for _, row in frame.iterrows():
            db.add(DashboardKPI(metric=str(row.Metric), value=float(row.Value), unit=str(row.Unit)))
            imported += 1
    db.commit()
    return {"dataset": dataset_type, "imported": imported, "message": f"Imported {imported} rows"}
