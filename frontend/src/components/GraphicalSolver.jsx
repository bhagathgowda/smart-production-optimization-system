import { useMemo, useState } from "react";
import { AlertTriangle, Box, Check, CheckCircle2, Info, Map, RotateCcw, SlidersHorizontal, Sparkles } from "lucide-react";
import Model3DViewer from "./Model3DViewer.jsx";

const plot = { left: 54, top: 20, width: 500, height: 330 };
const max = 70;
const scaleX = (value) => plot.left + (value / max) * plot.width;
const scaleY = (value) => plot.top + plot.height - (value / max) * plot.height;

function Graph({ tables, chairs, vertices, grid, onSelectPoint }) {
  const feasibleDots = useMemo(() => {
    if (!grid?.length) return [];
    const feasible = grid.filter((row) => row.Is_Feasible?.toLowerCase() === "yes");
    const stride = Math.max(1, Math.ceil(feasible.length / 260));
    return feasible.filter((_, index) => index % stride === 0);
  }, [grid]);

  const polygon = vertices.map((point) => `${scaleX(point.x)},${scaleY(point.y)}`).join(" ");
  const currentInside = tables >= 0 && tables <= max && chairs >= 0 && chairs <= max;

  return (
    <svg
      className="solver-graph"
      viewBox="0 0 600 410"
      role="img"
      aria-label="Cartesian graph of the labour and wood constraints with the feasible region and optimal point"
    >
      <defs>
        <clipPath id="plot-clip">
          <rect x={plot.left} y={plot.top} width={plot.width} height={plot.height} />
        </clipPath>
        <linearGradient id="feasible-fill" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#73a9ff" stopOpacity=".33" />
          <stop offset="100%" stopColor="#73a9ff" stopOpacity=".10" />
        </linearGradient>
      </defs>

      {[0, 10, 20, 30, 40, 50, 60, 70].map((tick) => (
        <g key={`grid-${tick}`}>
          <line
            x1={scaleX(tick)}
            y1={plot.top}
            x2={scaleX(tick)}
            y2={plot.top + plot.height}
            className="graph-grid-line"
          />
          <line
            x1={plot.left}
            y1={scaleY(tick)}
            x2={plot.left + plot.width}
            y2={scaleY(tick)}
            className="graph-grid-line"
          />
          <text x={scaleX(tick)} y={plot.top + plot.height + 20} textAnchor="middle" className="graph-tick">
            {tick}
          </text>
          <text x={plot.left - 13} y={scaleY(tick) + 4} textAnchor="end" className="graph-tick">
            {tick}
          </text>
        </g>
      ))}

      <g clipPath="url(#plot-clip)">
        {feasibleDots.map((row, index) => (
          <circle
            key={`${row.Tables_X}-${row.Chairs_Y}-${index}`}
            cx={scaleX(Number(row.Tables_X))}
            cy={scaleY(Number(row.Chairs_Y))}
            r="1.7"
            className="dataset-dot"
          />
        ))}
        <polygon points={polygon} fill="url(#feasible-fill)" stroke="#77aaf8" strokeWidth="1.3" />
        {/* Labour line 4X + 2Y = 240 */}
        <line x1={scaleX(25)} y1={scaleY(70)} x2={scaleX(60)} y2={scaleY(0)} className="constraint-line labour-line" />
        {/* Wood line 2X + 4Y = 240 */}
        <line x1={scaleX(0)} y1={scaleY(60)} x2={scaleX(70)} y2={scaleY(25)} className="constraint-line wood-line" />

        {/* Optimal Vertex B halo */}
        <circle cx={scaleX(40)} cy={scaleY(40)} r="9" className="optimal-halo" />
        <circle cx={scaleX(40)} cy={scaleY(40)} r="5" className="optimal-point" />

        {vertices.map((point) => (
          <g
            key={point.vertex}
            style={{ cursor: "pointer" }}
            onClick={() => onSelectPoint && onSelectPoint(point.x, point.y)}
          >
            <circle
              cx={scaleX(point.x)}
              cy={scaleY(point.y)}
              r={point.optimal ? 0 : 5}
              className="corner-point"
            />
          </g>
        ))}

        {currentInside && (
          <g>
            <circle cx={scaleX(tables)} cy={scaleY(chairs)} r="8" className="simulation-point-halo" />
            <circle cx={scaleX(tables)} cy={scaleY(chairs)} r="4.5" className="simulation-point" />
          </g>
        )}
      </g>

      <line x1={plot.left} y1={plot.top + plot.height} x2={plot.left + plot.width} y2={plot.top + plot.height} className="graph-axis" />
      <line x1={plot.left} y1={plot.top} x2={plot.left} y2={plot.top + plot.height} className="graph-axis" />
      <text x={plot.left + plot.width / 2} y="397" textAnchor="middle" className="graph-axis-label">
        Tables produced (X)
      </text>
      <text
        x="15"
        y={plot.top + plot.height / 2}
        textAnchor="middle"
        className="graph-axis-label"
        transform={`rotate(-90 15 ${plot.top + plot.height / 2})`}
      >
        Chairs produced (Y)
      </text>

      <text x={scaleX(0) + 8} y={scaleY(0) - 9} className="graph-point-label">
        O (0, 0)
      </text>
      <text x={scaleX(60) - 37} y={scaleY(0) - 10} className="graph-point-label">
        A (60, 0)
      </text>
      <text x={scaleX(40) + 10} y={scaleY(40) - 10} className="graph-point-label graph-point-optimal">
        B (40, 40) ★
      </text>
      <text x={scaleX(0) + 8} y={scaleY(60) - 9} className="graph-point-label">
        C (0, 60)
      </text>
      <text x={scaleX(60)} y={scaleY(0) + 25} textAnchor="middle" className="graph-intercept-label">
        Labour x-intercept 60
      </text>
      <text x={scaleX(0) + 6} y={scaleY(60) - 21} className="graph-intercept-label">
        Wood y-intercept 60
      </text>
    </svg>
  );
}

function Metric({ label, value, note, warning, highlight }) {
  return (
    <div className={`simulation-metric${warning ? " metric-warning" : ""}${highlight ? " metric-highlight" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

export default function GraphicalSolver({
  tables,
  chairs,
  onTablesChange,
  onChairsChange,
  onReset,
  onOptimize,
  vertices,
  grid,
  simulationResult,
  optimizerMessage,
  isOptimizing,
}) {
  const [viewMode, setViewMode] = useState("3d");
  const labour = simulationResult ? simulationResult.labour_used : 4 * tables + 2 * chairs;
  const wood = simulationResult ? simulationResult.wood_used : 2 * tables + 4 * chairs;
  const profit = simulationResult ? simulationResult.profit : 40 * tables + 30 * chairs;
  const feasible = simulationResult !== null && simulationResult !== undefined
    ? simulationResult.feasible
    : tables >= 0 && chairs >= 0 && labour <= 240 && wood <= 240;

  const labourSlack = 240 - labour;
  const woodSlack = 240 - wood;

  const presets = [
    { label: "O (0, 0)", desc: "Origin", x: 0, y: 0 },
    { label: "A (60, 0)", desc: "All Tables", x: 60, y: 0 },
    { label: "B (40, 40)", desc: "Optimal Mix", x: 40, y: 40 },
    { label: "C (0, 60)", desc: "All Chairs", x: 0, y: 60 },
    { label: "Mid (20, 20)", desc: "Feasible", x: 20, y: 20 },
    { label: "Over (50, 50)", desc: "Infeasible", x: 50, y: 50 },
  ];

  return (
    <div className="solver-layout">
      <div className="solver-main panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">GRAPHICAL METHOD & 3D OPTIMIZATION</p>
            <h3>Map the feasible region</h3>
            <p className="muted">
              {viewMode === "3d"
                ? "3D solution space: touch/drag to rotate, pinch/scroll to zoom. The feasible prism rises to the optimal peak at B (40, 40, 2800)."
                : "Every point inside the shaded region meets both resource limits. Click corner points to test them."}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="view-mode-toggle">
              <button
                type="button"
                className={`view-toggle-btn ${viewMode === "3d" ? "view-toggle-active" : ""}`}
                onClick={() => setViewMode("3d")}
                title="Interactive 3D Solution Space"
              >
                <Box size={13} /> 3D Space
              </button>
              <button
                type="button"
                className={`view-toggle-btn ${viewMode === "2d" ? "view-toggle-active" : ""}`}
                onClick={() => setViewMode("2d")}
                title="2D Cartesian Map"
              >
                <Map size={13} /> 2D Graph
              </button>
            </div>
            <span className="live-badge">
              <span /> Live
            </span>
          </div>
        </div>

        {viewMode === "3d" ? (
          <Model3DViewer
            tables={tables}
            chairs={chairs}
            vertices={vertices}
            onSelectPoint={(x, y) => {
              onTablesChange(x);
              onChairsChange(y);
            }}
          />
        ) : (
          <>
            <div className="graph-wrap">
              <Graph
                tables={tables}
                chairs={chairs}
                vertices={vertices}
                grid={grid}
                onSelectPoint={(x, y) => {
                  onTablesChange(x);
                  onChairsChange(y);
                }}
              />
            </div>

            <div className="graph-legend">
              <span><i className="legend-swatch labour-swatch" /> Labour · 4X + 2Y ≤ 240</span>
              <span><i className="legend-swatch wood-swatch" /> Wood · 2X + 4Y ≤ 240</span>
              <span><i className="legend-swatch region-swatch" /> Feasible region</span>
              <span><i className="legend-swatch current-swatch" /> Your plan ({tables}, {chairs})</span>
            </div>

            <div className="intercept-note">
              <strong>Constraint intercepts</strong>
              <span>Labour: (60, 0), (0, 120)</span>
              <span>Wood: (120, 0), (0, 60)</span>
              <small>Axis view is focused on the feasible region; the full intercept values are shown here.</small>
            </div>
          </>
        )}
      </div>

      <div className="solver-controls">
        <div className="panel control-panel">
          <div className="panel-heading compact-heading">
            <div>
              <p className="eyebrow">LIVE SIMULATION & SOLVER</p>
              <h3>Build a production plan</h3>
            </div>
            {isOptimizing && <span className="solver-tag-optimizing">Optimizing...</span>}
          </div>

          {/* Quick Presets */}
          <div className="presets-wrapper">
            <span className="presets-caption">
              <SlidersHorizontal size={12} /> Quick Presets:
            </span>
            <div className="presets-list">
              {presets.map((preset) => {
                const isActive = tables === preset.x && chairs === preset.y;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    className={`preset-btn ${isActive ? "preset-btn-active" : ""}`}
                    onClick={() => {
                      onTablesChange(preset.x);
                      onChairsChange(preset.y);
                    }}
                    title={`${preset.desc}: X=${preset.x}, Y=${preset.y}`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="range-label" htmlFor="tables-range">
            <span>
              <span className="range-icon table-icon">X</span> Tables Produced
            </span>
            <strong>
              {tables} <small>units</small>
            </strong>
          </label>
          <input
            id="tables-range"
            className="range-input"
            type="range"
            min="0"
            max="120"
            step="1"
            value={tables}
            style={{
              background: `linear-gradient(to right, #4c8df6 0%, #4c8df6 ${(tables / 120) * 100}%, #e8edf4 ${(tables / 120) * 100}%, #e8edf4 100%)`,
            }}
            onChange={(event) => onTablesChange(Number(event.target.value))}
            aria-label="Tables production quantity"
          />
          <div className="range-minmax">
            <span>0 min</span>
            <span>40 optimum</span>
            <span>120 max</span>
          </div>

          <label className="range-label" htmlFor="chairs-range">
            <span>
              <span className="range-icon chair-icon">Y</span> Chairs Produced
            </span>
            <strong>
              {chairs} <small>units</small>
            </strong>
          </label>
          <input
            id="chairs-range"
            className="range-input range-chair"
            type="range"
            min="0"
            max="120"
            step="1"
            value={chairs}
            style={{
              background: `linear-gradient(to right, #39aa8e 0%, #39aa8e ${(chairs / 120) * 100}%, #e8edf4 ${(chairs / 120) * 100}%, #e8edf4 100%)`,
            }}
            onChange={(event) => onChairsChange(Number(event.target.value))}
            aria-label="Chairs production quantity"
          />
          <div className="range-minmax">
            <span>0 min</span>
            <span>40 optimum</span>
            <span>120 max</span>
          </div>

          <div className={`feasibility-banner ${feasible ? "is-feasible" : "is-infeasible"}`}>
            {feasible ? <Check size={18} /> : <AlertTriangle size={18} />}
            <div>
              <strong>{feasible ? "FEASIBLE PLAN" : "INFEASIBLE PLAN"}</strong>
              <span>
                {feasible
                  ? "Production stays strictly within available resource limits."
                  : simulationResult?.constraint_violations?.length
                  ? simulationResult.constraint_violations.join(" · ")
                  : "This plan exceeds at least one resource limit."}
              </span>
            </div>
          </div>

          <div className="simulation-metrics">
            <Metric
              label="Total profit (Z)"
              value={`${profit.toLocaleString()} units`}
              note="Z = 40X + 30Y"
              highlight={tables === 40 && chairs === 40}
            />
            <Metric
              label="Labour used"
              value={`${labour} / 240 h`}
              note={
                labourSlack === 0
                  ? "0 h slack · Binding"
                  : labourSlack > 0
                  ? `${labourSlack} h slack remaining`
                  : `+${Math.abs(labourSlack)} h over capacity`
              }
              warning={labour > 240}
            />
            <Metric
              label="Wood used"
              value={`${wood} / 240 units`}
              note={
                woodSlack === 0
                  ? "0 units slack · Binding"
                  : woodSlack > 0
                  ? `${woodSlack} units remaining`
                  : `+${Math.abs(woodSlack)} units over capacity`
              }
              warning={wood > 240}
            />
            <Metric
              label="Constraint status"
              value={
                labourSlack === 0 && woodSlack === 0
                  ? "Both Binding"
                  : labourSlack === 0
                  ? "Labour Binding"
                  : woodSlack === 0
                  ? "Wood Binding"
                  : feasible
                  ? "Non-binding"
                  : "Violated"
              }
              note={feasible ? "Feasible region point" : "Exterior point"}
              warning={!feasible}
            />
          </div>

          {optimizerMessage && (
            <div className="optimizer-feedback-banner">
              <CheckCircle2 size={16} />
              <span>{optimizerMessage}</span>
            </div>
          )}

          <div className="sim-actions">
            <button
              type="button"
              className="button button-outline"
              onClick={onReset}
              title="Reset quantities to 0"
            >
              <RotateCcw size={15} /> Reset (0, 0)
            </button>
            <button
              type="button"
              className="button button-primary"
              onClick={onOptimize}
              disabled={isOptimizing}
              title="Solve via SciPy HiGHS LP Solver"
            >
              <Sparkles size={15} /> {isOptimizing ? "Solving..." : "Optimize (SciPy HiGHS)"}
            </button>
          </div>
        </div>

        <div className="profit-callout">
          <span className="callout-icon">
            <Sparkles size={17} />
          </span>
          <div>
            <strong>Optimal Solution: 40 tables + 40 chairs</strong>
            <p>Maximum Profit: 2,800 currency units · 100% Resource Efficiency (Zero Slack)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
