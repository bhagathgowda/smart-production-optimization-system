# Smart Production Optimization System

Team T13's interactive college Activity-Based Learning (ABL) demonstration of **Linear Programming Problems (LPP)**, terminology, assumptions, and the **Graphical Method** applied to a furniture manufacturer.

---

## Architecture & Tech Stack

- **Frontend:** React 18, Vite 6, Tailwind CSS, Recharts, Lucide Icons
- **Backend Service:** FastAPI, Uvicorn, Pydantic v2
- **Database:** SQLite (`production.db`) managed via SQLAlchemy 2.0 with automated seeding
- **Mathematical Optimization Engine:** SciPy `linprog` using the **HiGHS** simplex/interior-point solver
- **Datasets:** Pre-loaded CSV datasets (14,641 production grid combinations, resource constraints, feasible region corner points, unit economics, and dashboard KPIs)

---

## Quickstart Guide

### 1. Requirements

- Python 3.10+ (with `venv`)
- Node.js 18+ and `npm`

### 2. Backend Setup & Startup

```bash
# Navigate to backend and create virtual environment
python3 -m venv backend/venv
source backend/venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Start the FastAPI server (runs on http://127.0.0.1:8000)
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

The backend automatically creates and seeds `production.db` from the project CSV files on startup.
- API Documentation (Swagger UI): `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/api/health`

### 3. Frontend Setup & Startup

```bash
# Navigate to frontend and install dependencies
cd frontend
npm install

# Start development server with Vite (runs on http://localhost:5173)
npm run dev
```

Open `http://localhost:5173/` in your browser.

---

## Configuration & Environment Variables

- `backend/.env`:
  ```env
  HOST=127.0.0.1
  PORT=8000
  DATABASE_URL=sqlite:///production.db
  ```

- `frontend/.env`:
  ```env
  VITE_API_BASE_URL=http://127.0.0.1:8000/api
  VITE_TABLEAU_EMBED_URL=
  ```

### Tableau Public Integration
To embed a published Tableau Public dashboard:
1. Set `VITE_TABLEAU_EMBED_URL=https://public.tableau.com/views/...` in `frontend/.env`.
2. Restart Vite (`npm run dev`).
3. The dashboard will automatically embed into the **Tableau & Grid Explorer** section.

---

## Mathematical Formulation & Solution

- **Decision Variables:**
  - $X$: Number of tables produced
  - $Y$: Number of chairs produced
- **Objective Function:** Maximize Total Profit
  $$\max Z = 40X + 30Y$$
- **Subject to Constraints:**
  - Labour: $4X + 2Y \le 240$ hours
  - Wood: $2X + 4Y \le 240$ units
  - Non-negativity: $X \ge 0, Y \ge 0$

### Feasible Region Vertices & Optimum:
| Vertex | Coordinates $(X, Y)$ | Profit ($Z$) | Labour Used | Wood Used | Status |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **O** | $(0, 0)$ | 0 | 0 / 240 h | 0 / 240 u | Feasible |
| **A** | $(60, 0)$ | 2,400 | 240 / 240 h | 120 / 240 u | Feasible (Wood slack = 120) |
| **B** | **(40, 40)** | **2,800** | **240 / 240 h** | **240 / 240 u** | **OPTIMAL (Zero Slack)** |
| **C** | $(0, 60)$ | 1,800 | 120 / 240 h | 240 / 240 u | Feasible (Labour slack = 120) |

---

## Key Features

1. **Interactive Graphical Solver:**
   - Real-time cartesian graph visualizing the feasible region polygon, constraint boundary lines, sample points, and optimal point.
   - Dual sliders for Tables and Chairs with live constraint verification, slack calculations, and deficit alerts.
   - One-click presets: Origin $(0, 0)$, All Tables $(60, 0)$, Optimal Mix $(40, 40)$, All Chairs $(0, 60)$, Mid-Range $(20, 20)$, and Overload $(50, 50)$.
2. **SciPy HiGHS Solver Integration:**
   - Click "Optimize (SciPy HiGHS)" to trigger the backend linear programming solver.
   - Instant calculation of optimal decision variables, maximum profit, and capacity utilization.
3. **Database Simulation History:**
   - Every simulation run is persisted to SQLite (`simulation_history`).
   - The UI displays recent runs with timestamps, resource usage, slack, and feasibility tags, with a "Load" button to restore any historical plan.
4. **Production Grid Explorer:**
   - Tab to browse all 14,641 combinations from `01_tableau_production_grid.csv` stored in SQLite with pagination and Feasible/Infeasible filters.
5. **Tableau BI Integration:**
   - Seamlessly connect and render published Tableau Public visualizations.
6. **Responsive & Presentation-Ready:**
   - Fullscreen presentation mode for classroom and lecture demonstrations.
