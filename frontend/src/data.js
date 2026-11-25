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

export async function loadProjectData() {
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
  return Object.fromEntries(results);
}
