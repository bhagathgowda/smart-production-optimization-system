# Smart Production Optimization System

Team T13's interactive college ABL demonstration of Linear Programming, its terminology and assumptions, and the graphical method applied to a furniture manufacturer.

## Requirements

- Node.js 18 or newer
- npm

## Run the website

1. Open a terminal in `frontend`.
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Open the local URL printed by Vite (normally `http://localhost:5173`).

Create a production build with `npm run build`; preview it with `npm run preview`.

The React/Vite website is self-contained and reads the project CSVs in `frontend/public/data`. If these files are unavailable, it displays a visible data notice and uses the exact values from the project brief. The existing FastAPI backend in `backend` can be run separately; the website's interactive solver calculates the model directly in the browser.

## Tableau Public

To display a published dashboard, create `frontend/.env.local` and set:

```env
VITE_TABLEAU_EMBED_URL=https://public.tableau.com/views/your-published-dashboard/...
```

Restart Vite after setting the variable. No placeholder or fabricated Tableau URL is used.

## Project model

- Tables (X): profit 40; labour 4 hours; wood 2 units
- Chairs (Y): profit 30; labour 2 hours; wood 4 units
- Availability: 240 labour hours and 240 wood units
- Objective: maximize `Z = 40X + 30Y`
- Constraints: `4X + 2Y ≤ 240`, `2X + 4Y ≤ 240`, `X ≥ 0`, `Y ≥ 0`
- Optimum: 40 tables and 40 chairs; profit 2,800 currency units

The supplied production grid, constraint, vertex, product-resource and KPI CSV files are used by the site. The production grid provides feasible sample points to the solver graph; the other datasets populate model details and result comparisons.
