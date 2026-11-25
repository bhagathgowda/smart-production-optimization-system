import { useMemo } from "react";
import { AlertTriangle, Check, RotateCcw, Sparkles } from "lucide-react";

const plot = { left: 54, top: 20, width: 500, height: 330 };
const max = 70;
const scaleX = (value) => plot.left + (value / max) * plot.width;
const scaleY = (value) => plot.top + plot.height - (value / max) * plot.height;

function Graph({ tables, chairs, vertices, grid }) {
  const feasibleDots = useMemo(() => {
    if (!grid?.length) return [];
    const feasible = grid.filter((row) => row.Is_Feasible?.toLowerCase() === "yes");
    const stride = Math.max(1, Math.ceil(feasible.length / 260));
    return feasible.filter((_, index) => index % stride === 0);
  }, [grid]);
  const polygon = vertices.map((point) => `${scaleX(point.x)},${scaleY(point.y)}`).join(" ");
  const currentInside = tables >= 0 && tables <= max && chairs >= 0 && chairs <= max;

  return (
    <svg className="solver-graph" viewBox="0 0 600 410" role="img" aria-label="Cartesian graph of the labour and wood constraints with the feasible region and optimal point">
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
          <line x1={scaleX(tick)} y1={plot.top} x2={scaleX(tick)} y2={plot.top + plot.height} className="graph-grid-line" />
          <line x1={plot.left} y1={scaleY(tick)} x2={plot.left + plot.width} y2={scaleY(tick)} className="graph-grid-line" />
          <text x={scaleX(tick)} y={plot.top + plot.height + 20} textAnchor="middle" className="graph-tick">{tick}</text>
          <text x={plot.left - 13} y={scaleY(tick) + 4} textAnchor="end" className="graph-tick">{tick}</text>
        </g>
      ))}
      <g clipPath="url(#plot-clip)">
        {feasibleDots.map((row, index) => (
          <circle key={`${row.Tables_X}-${row.Chairs_Y}-${index}`} cx={scaleX(Number(row.Tables_X))} cy={scaleY(Number(row.Chairs_Y))} r="1.7" className="dataset-dot" />
        ))}
        <polygon points={polygon} fill="url(#feasible-fill)" stroke="#77aaf8" strokeWidth="1.3" />
        <line x1={scaleX(25)} y1={scaleY(70)} x2={scaleX(60)} y2={scaleY(0)} className="constraint-line labour-line" />
        <line x1={scaleX(0)} y1={scaleY(60)} x2={scaleX(70)} y2={scaleY(25)} className="constraint-line wood-line" />
        <circle cx={scaleX(40)} cy={scaleY(40)} r="9" className="optimal-halo" />
        <circle cx={scaleX(40)} cy={scaleY(40)} r="5" className="optimal-point" />
        {vertices.map((point) => (
          <g key={point.vertex}>
            <circle cx={scaleX(point.x)} cy={scaleY(point.y)} r={point.optimal ? 0 : 4} className="corner-point" />
          </g>
        ))}
        {currentInside && (
          <g>
            <circle cx={scaleX(tables)} cy={scaleY(chairs)} r="7" className="simulation-point-halo" />
            <circle cx={scaleX(tables)} cy={scaleY(chairs)} r="4" className="simulation-point" />
          </g>
        )}
      </g>
      <line x1={plot.left} y1={plot.top + plot.height} x2={plot.left + plot.width} y2={plot.top + plot.height} className="graph-axis" />
      <line x1={plot.left} y1={plot.top} x2={plot.left} y2={plot.top + plot.height} className="graph-axis" />
      <text x={plot.left + plot.width / 2} y="397" textAnchor="middle" className="graph-axis-label">Tables produced (X)</text>
      <text x="15" y={plot.top + plot.height / 2} textAnchor="middle" className="graph-axis-label" transform={`rotate(-90 15 ${plot.top + plot.height / 2})`}>Chairs produced (Y)</text>
      <text x={scaleX(0) + 8} y={scaleY(0) - 9} className="graph-point-label">O (0, 0)</text>
      <text x={scaleX(60) - 37} y={scaleY(0) - 10} className="graph-point-label">A (60, 0)</text>
      <text x={scaleX(40) + 10} y={scaleY(40) - 10} className="graph-point-label graph-point-optimal">B (40, 40)</text>
      <text x={scaleX(0) + 8} y={scaleY(60) - 9} className="graph-point-label">C (0, 60)</text>
      <text x={scaleX(60)} y={scaleY(0) + 25} textAnchor="middle" className="graph-intercept-label">Labour x-intercept 60</text>
      <text x={scaleX(0) + 6} y={scaleY(60) - 21} className="graph-intercept-label">Wood y-intercept 60</text>
    </svg>
  );
}

function Metric({ label, value, note, warning }) {
  return (
    <div className={`simulation-metric${warning ? " metric-warning" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

export default function GraphicalSolver({ tables, chairs, onTablesChange, onChairsChange, onReset, onOptimize, vertices, grid }) {
  const labour = 4 * tables + 2 * chairs;
  const wood = 2 * tables + 4 * chairs;
  const profit = 40 * tables + 30 * chairs;
  const feasible = tables >= 0 && chairs >= 0 && labour <= 240 && wood <= 240;

  return (
    <div className="solver-layout">
      <div className="solver-main panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">GRAPHICAL METHOD</p>
            <h3>Map the feasible region</h3>
            <p className="muted">Every point inside the shaded region meets both resource limits.</p>
          </div>
          <span className="live-badge"><span /> Live</span>
        </div>
        <div className="graph-wrap"><Graph tables={tables} chairs={chairs} vertices={vertices} grid={grid} /></div>
        <div className="graph-legend">
          <span><i className="legend-swatch labour-swatch" /> Labour · 4X + 2Y = 240</span>
          <span><i className="legend-swatch wood-swatch" /> Wood · 2X + 4Y = 240</span>
          <span><i className="legend-swatch region-swatch" /> Feasible region</span>
          <span><i className="legend-swatch current-swatch" /> Your plan</span>
        </div>
        <div className="intercept-note"><strong>Constraint intercepts</strong><span>Labour: (60, 0), (0, 120)</span><span>Wood: (120, 0), (0, 60)</span><small>Axis view is focused on the feasible region; the full intercept values are shown here.</small></div>
      </div>
      <div className="solver-controls">
        <div className="panel control-panel">
          <div className="panel-heading compact-heading">
            <div><p className="eyebrow">LIVE SIMULATION</p><h3>Build a production plan</h3></div>
          </div>
          <label className="range-label" htmlFor="tables-range"><span><span className="range-icon table-icon">X</span> Tables</span><strong>{tables} <small>units</small></strong></label>
          <input id="tables-range" className="range-input" type="range" min="0" max="120" step="1" value={tables} style={{ background: `linear-gradient(to right, #4c8df6 0%, #4c8df6 ${(tables / 120) * 100}%, #e8edf4 ${(tables / 120) * 100}%, #e8edf4 100%)` }} onChange={(event) => onTablesChange(Number(event.target.value))} aria-label="Tables production quantity" />
          <div className="range-minmax"><span>0</span><span>120</span></div>
          <label className="range-label" htmlFor="chairs-range"><span><span className="range-icon chair-icon">Y</span> Chairs</span><strong>{chairs} <small>units</small></strong></label>
          <input id="chairs-range" className="range-input range-chair" type="range" min="0" max="120" step="1" value={chairs} style={{ background: `linear-gradient(to right, #39aa8e 0%, #39aa8e ${(chairs / 120) * 100}%, #e8edf4 ${(chairs / 120) * 100}%, #e8edf4 100%)` }} onChange={(event) => onChairsChange(Number(event.target.value))} aria-label="Chairs production quantity" />
          <div className="range-minmax"><span>0</span><span>120</span></div>
          <div className={`feasibility-banner ${feasible ? "is-feasible" : "is-infeasible"}`}>
            {feasible ? <Check size={18} /> : <AlertTriangle size={18} />}
            <div><strong>{feasible ? "FEASIBLE PLAN" : "INFEASIBLE PLAN"}</strong><span>{feasible ? "Production stays within available resources." : "This plan exceeds at least one resource limit."}</span></div>
          </div>
          <div className="simulation-metrics">
            <Metric label="Total profit" value={`${profit.toLocaleString()} currency units`} note="40X + 30Y" />
            <Metric label="Labour used" value={`${labour} / 240 h`} note={`${240 - labour} h remaining`} warning={labour > 240} />
            <Metric label="Wood used" value={`${wood} / 240`} note={`${240 - wood} units remaining`} warning={wood > 240} />
          </div>
          <div className="sim-actions">
            <button type="button" className="button button-outline" onClick={onReset}><RotateCcw size={15} /> Reset</button>
            <button type="button" className="button button-primary" onClick={onOptimize}><Sparkles size={15} /> Optimize automatically</button>
          </div>
        </div>
        <div className="profit-callout">
          <span className="callout-icon"><Sparkles size={17} /></span>
          <div><strong>Best known plan: 40 tables + 40 chairs</strong><p>Profit 2,800 · both resources fully utilized</p></div>
        </div>
      </div>
    </div>
  );
}
