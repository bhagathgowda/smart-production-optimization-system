export const FALLBACK_PRODUCTS = [
  { product: "Tables", variable: "X", profit: 40, labour: 4, wood: 2 },
  { product: "Chairs", variable: "Y", profit: 30, labour: 2, wood: 4 },
];

export const FALLBACK_CONSTRAINTS = [
  { resource: "Labour", x: 4, y: 2, limit: 240, unit: "hours", equation: "4X + 2Y ≤ 240" },
  { resource: "Wood", x: 2, y: 4, limit: 240, unit: "units", equation: "2X + 4Y ≤ 240" },
];

export const FALLBACK_VERTICES = [
  { vertex: "O", x: 0, y: 0, profit: 0, labour: 0, wood: 0, optimal: false },
  { vertex: "A", x: 60, y: 0, profit: 2400, labour: 240, wood: 120, optimal: false },
  { vertex: "B", x: 40, y: 40, profit: 2800, labour: 240, wood: 240, optimal: true },
  { vertex: "C", x: 0, y: 60, profit: 1800, labour: 120, wood: 240, optimal: false },
];

export const FALLBACK_KPIS = {
  "Optimal Tables": 40,
  "Optimal Chairs": 40,
  "Maximum Profit": 2800,
  "Labour Utilization": 100,
  "Wood Utilization": 100,
};

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
export const TABLEAU_EMBED_URL = import.meta.env.VITE_TABLEAU_EMBED_URL || "";

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"' && text[index + 1] === '"' && quoted) {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    if (row.some((value) => value !== "")) rows.push(row);
  }

  const [headers, ...records] = rows;
  if (!headers) return [];
  return records.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header.trim(), (values[index] || "").trim()])),
  );
}

export async function checkApiHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) return { online: false };
    const data = await res.json();
    return { online: true, ...data };
  } catch (err) {
    return { online: false, error: err.message };
  }
}

export async function simulatePlan(tables, chairs) {
  try {
    const res = await fetch(`${API_BASE_URL}/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tables_x: tables, chairs_y: chairs }),
    });
    if (!res.ok) throw new Error(`Simulation failed (${res.status})`);
    return await res.json();
  } catch (err) {
    const labour_used = 4 * tables + 2 * chairs;
    const wood_used = 2 * tables + 4 * chairs;
    const violations = [];
    if (labour_used > 240) violations.push(`Labour exceeds limit by ${labour_used - 240} hours`);
    if (wood_used > 240) violations.push(`Wood exceeds limit by ${wood_used - 240} units`);
    return {
      tables_x: tables,
      chairs_y: chairs,
      profit: 40 * tables + 30 * chairs,
      labour_used,
      wood_used,
      remaining_labour: Math.max(0, 240 - labour_used),
      remaining_wood: Math.max(0, 240 - wood_used),
      labour_slack: 240 - labour_used,
      wood_slack: 240 - wood_used,
      feasible: violations.length === 0 && tables >= 0 && chairs >= 0,
      constraint_violations: violations,
      fallback: true,
    };
  }
}

export async function optimizePlan() {
  try {
    const res = await fetch(`${API_BASE_URL}/optimize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`Optimization failed (${res.status})`);
    return await res.json();
  } catch (err) {
    return {
      success: true,
      solver_status: "Optimization completed (client fallback)",
      optimal_tables: 40,
      optimal_chairs: 40,
      maximum_profit: 2800,
      labour_used: 240,
      wood_used: 240,
      labour_utilization_percent: 100,
      wood_utilization_percent: 100,
      fallback: true,
    };
  }
}

export async function fetchSimulationHistory() {
  try {
    const res = await fetch(`${API_BASE_URL}/history`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchGridData(page = 1, pageSize = 20, feasible = "") {
  try {
    let url = `${API_BASE_URL}/dataset/grid?page=${page}&page_size=${pageSize}`;
    if (feasible) url += `&feasible=${feasible}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function loadProjectData() {
  // Try loading from FastAPI backend first
  try {
    const [productsRes, constraintsRes, verticesRes, dashRes] = await Promise.all([
      fetch(`${API_BASE_URL}/products`),
      fetch(`${API_BASE_URL}/constraints`),
      fetch(`${API_BASE_URL}/vertices`),
      fetch(`${API_BASE_URL}/dashboard`),
    ]);

    if (productsRes.ok && constraintsRes.ok && verticesRes.ok && dashRes.ok) {
      const productsData = await productsRes.json();
      const constraintsData = await constraintsRes.json();
      const verticesData = await verticesRes.json();
      const dashData = await dashRes.json();

      let gridCsv = [];
      try {
        const gridRes = await fetch("/data/01_tableau_production_grid.csv");
        if (gridRes.ok) gridCsv = parseCsv(await gridRes.text());
      } catch (e) {
        console.warn("Could not load grid CSV points:", e);
      }

      return {
        products: productsData.map((p) => ({
          Product: p.name,
          Decision_Variable: p.decision_variable,
          Profit_Per_Unit: String(p.profit_per_unit),
          Labour_Hours_Per_Unit: String(p.labour_hours_per_unit),
          Wood_Units_Per_Unit: String(p.wood_units_per_unit),
        })),
        constraints: constraintsData.map((c) => ({
          Constraint_ID: c.constraint_id,
          Resource: c.resource,
          Tables_Coefficient: String(c.tables_coefficient),
          Chairs_Coefficient: String(c.chairs_coefficient),
          Limit: String(c.limit),
          Unit: c.unit,
          Equation: c.equation,
          Meaning: c.meaning || "",
        })),
        vertices: verticesData.map((v) => ({
          Vertex: v.vertex,
          Tables_X: String(v.tables_x),
          Chairs_Y: String(v.chairs_y),
          Profit: String(v.profit),
          Labour_Used: String(v.labour_used),
          Wood_Used: String(v.wood_used),
          Is_Optimal: String(v.is_optimal),
          Explanation: v.explanation || "",
        })),
        kpis: Object.entries(dashData.kpis || {}).map(([Metric, Value]) => ({
          Metric,
          Value: String(Value),
          Unit: Metric.includes("Profit") ? "Currency" : Metric.includes("Utilization") ? "%" : "Units",
        })),
        grid: gridCsv,
        source: "backend-api",
      };
    }
  } catch (err) {
    console.warn("Backend API not reachable during loadProjectData, falling back to static CSVs:", err);
  }

  // Fallback to static CSV files
  const files = {
    products: "04_product_resource_data.csv",
    constraints: "02_constraints.csv",
    vertices: "03_feasible_region_vertices.csv",
    kpis: "05_dashboard_kpis.csv",
    grid: "01_tableau_production_grid.csv",
  };
  const results = await Promise.all(
    Object.entries(files).map(async ([key, file]) => {
      const response = await fetch(`/data/${file}`);
      if (!response.ok) throw new Error(`${file} could not be loaded (${response.status})`);
      return [key, parseCsv(await response.text())];
    }),
  );
  const data = Object.fromEntries(results);
  data.source = "local-csv";
  return data;
}
