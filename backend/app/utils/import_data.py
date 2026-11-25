from pathlib import Path
import pandas as pd
from sqlalchemy.orm import Session
from ..database import DATA_DIR
from ..models import Product, Constraint, ProductionGrid, CornerPoint, DashboardKPI


def clean_frame(frame: pd.DataFrame) -> pd.DataFrame:
    return frame.replace({pd.NA: None}).where(pd.notna(frame), None)


def seed_database(db: Session):
    if db.query(Product).count() == 0:
        frame = clean_frame(pd.read_csv(DATA_DIR / "04_product_resource_data.csv"))
        for _, row in frame.iterrows():
            db.add(Product(name=str(row["Product"]), decision_variable=str(row["Decision_Variable"]), profit_per_unit=float(row["Profit_Per_Unit"]), labour_hours_per_unit=float(row["Labour_Hours_Per_Unit"]), wood_units_per_unit=float(row["Wood_Units_Per_Unit"])))

    if db.query(Constraint).count() == 0:
        frame = clean_frame(pd.read_csv(DATA_DIR / "02_constraints.csv"))
        for _, row in frame.iterrows():
            db.add(Constraint(constraint_id=str(row["Constraint_ID"]), resource=str(row["Resource"]), tables_coefficient=float(row["Tables_Coefficient"]), chairs_coefficient=float(row["Chairs_Coefficient"]), limit=float(row["Limit"]), unit=str(row["Unit"]), equation=str(row["Equation"]), meaning=row.get("Meaning") if isinstance(row.get("Meaning"), str) else None))

    if db.query(CornerPoint).count() == 0:
        frame = clean_frame(pd.read_csv(DATA_DIR / "03_feasible_region_vertices.csv"))
        for _, row in frame.iterrows():
            db.add(CornerPoint(vertex=str(row["Vertex"]), tables_x=float(row["Tables_X"]), chairs_y=float(row["Chairs_Y"]), profit=float(row["Profit"]), labour_used=float(row["Labour_Used"]), wood_used=float(row["Wood_Used"]), is_optimal=str(row["Is_Optimal"]), explanation=row.get("Explanation") if isinstance(row.get("Explanation"), str) else None))

    if db.query(DashboardKPI).count() == 0:
        frame = clean_frame(pd.read_csv(DATA_DIR / "05_dashboard_kpis.csv"))
        for _, row in frame.iterrows():
            db.add(DashboardKPI(metric=str(row["Metric"]), value=float(row["Value"]), unit=str(row["Unit"])))

    if db.query(ProductionGrid).count() == 0:
        frame = clean_frame(pd.read_csv(DATA_DIR / "01_tableau_production_grid.csv"))
        for _, row in frame.iterrows():
            db.add(ProductionGrid(tables_x=int(row["Tables_X"]), chairs_y=int(row["Chairs_Y"]), labour_used=float(row["Labour_Used_Hours"]), labour_available=float(row["Labour_Available_Hours"]), wood_used=float(row["Wood_Used_Units"]), wood_available=float(row["Wood_Available_Units"]), labour_slack=float(row["Labour_Slack_Hours"]), wood_slack=float(row["Wood_Slack_Units"]), profit=float(row["Profit"]), is_feasible=str(row["Is_Feasible"]), feasible_profit=float(row["Feasible_Profit"])))
    db.commit()
