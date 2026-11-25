from sqlalchemy import Boolean, Column, Float, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from .database import Base

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    decision_variable = Column(String, nullable=False)
    profit_per_unit = Column(Float, nullable=False)
    labour_hours_per_unit = Column(Float, nullable=False)
    wood_units_per_unit = Column(Float, nullable=False)

class Constraint(Base):
    __tablename__ = "constraints"
    id = Column(Integer, primary_key=True)
    constraint_id = Column(String, unique=True, nullable=False)
    resource = Column(String, nullable=False)
    tables_coefficient = Column(Float, nullable=False)
    chairs_coefficient = Column(Float, nullable=False)
    limit = Column(Float, nullable=False)
    unit = Column(String, nullable=False)
    equation = Column(String, nullable=False)
    meaning = Column(Text, nullable=True)

class ProductionGrid(Base):
    __tablename__ = "production_grid"
    id = Column(Integer, primary_key=True)
    tables_x = Column(Integer, nullable=False)
    chairs_y = Column(Integer, nullable=False)
    labour_used = Column(Float, nullable=False)
    labour_available = Column(Float, nullable=False)
    wood_used = Column(Float, nullable=False)
    wood_available = Column(Float, nullable=False)
    labour_slack = Column(Float, nullable=False)
    wood_slack = Column(Float, nullable=False)
    profit = Column(Float, nullable=False)
    is_feasible = Column(String, nullable=False)
    feasible_profit = Column(Float, nullable=False)

class CornerPoint(Base):
    __tablename__ = "corner_points"
    id = Column(Integer, primary_key=True)
    vertex = Column(String, unique=True, nullable=False)
    tables_x = Column(Float, nullable=False)
    chairs_y = Column(Float, nullable=False)
    profit = Column(Float, nullable=False)
    labour_used = Column(Float, nullable=False)
    wood_used = Column(Float, nullable=False)
    is_optimal = Column(String, nullable=False)
    explanation = Column(Text, nullable=True)

class DashboardKPI(Base):
    __tablename__ = "dashboard_kpis"
    id = Column(Integer, primary_key=True)
    metric = Column(String, unique=True, nullable=False)
    value = Column(Float, nullable=False)
    unit = Column(String, nullable=False)

class SimulationHistory(Base):
    __tablename__ = "simulation_history"
    id = Column(Integer, primary_key=True)
    tables_x = Column(Integer, nullable=False)
    chairs_y = Column(Integer, nullable=False)
    profit = Column(Float, nullable=False)
    labour_used = Column(Float, nullable=False)
    wood_used = Column(Float, nullable=False)
    is_feasible = Column(Boolean, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
