import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDown, ArrowRight, ArrowUp, BarChart3, BookOpen, Boxes, BriefcaseBusiness,
  Check, ChevronDown, CircleHelp, ClipboardList, Expand, Factory, Gauge, Lightbulb,
  Menu, MousePointer2, Presentation, RotateCcw, Sparkles, Target, TrendingUp,
  X, Zap,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import GraphicalSolver from "./components/GraphicalSolver.jsx";
import {
  FALLBACK_CONSTRAINTS, FALLBACK_KPIS, FALLBACK_PRODUCTS, FALLBACK_VERTICES,
  loadProjectData, TABLEAU_EMBED_URL,
} from "./data.js";

const navItems = [
  { id: "home", label: "Overview", icon: Factory },
  { id: "introduction", label: "Linear programming", icon: BookOpen },
  { id: "terminologies", label: "Terminologies", icon: ClipboardList },
  { id: "assumptions", label: "Assumptions", icon: CircleHelp },
  { id: "business-problem", label: "Business problem", icon: BriefcaseBusiness },
  { id: "mathematical-model", label: "Mathematical model", icon: Boxes },
  { id: "solver", label: "Live solver", icon: MousePointer2 },
  { id: "dashboard", label: "Results dashboard", icon: BarChart3 },
  { id: "tableau", label: "Tableau dashboard", icon: Presentation },
  { id: "insights", label: "Business insights", icon: Lightbulb },
  { id: "conclusion", label: "Conclusion", icon: Check },
  { id: "team", label: "Our team", icon: Activity },
];

const terms = [
  ["01", "Decision variables", "The unknown quantities a business can choose.", "X = tables produced; Y = chairs produced."],
  ["02", "Objective function", "The measurable goal to maximize or minimize.", "Maximize profit: Z = 40X + 30Y."],
  ["03", "Constraints", "Limits on resources or other business requirements.", "4X + 2Y ≤ 240 labour hours."],
  ["04", "Feasible solution", "Any decision-variable values that satisfy every constraint.", "X = 20, Y = 20 uses 120 labour hours and 120 wood units."],
  ["05", "Feasible region", "The set of all feasible combinations, shown as a shaded area on the graph.", "The common area below both resource lines and above the axes."],
  ["06", "Optimal solution", "The feasible combination with the best objective-function value.", "40 tables and 40 chairs earns 2,800 currency units."],
  ["07", "Binding constraints", "Constraints that are exactly met at the optimal solution.", "At (40, 40), labour = 240 and wood = 240."],
  ["08", "Non-binding constraints", "Constraints with unused capacity (positive slack) at a solution.", "At (60, 0), wood use is 120; 120 wood units remain."],
  ["09", "Non-negativity restrictions", "Production quantities cannot be negative.", "X ≥ 0 and Y ≥ 0."],
];

const assumptions = [
  ["Proportionality", "Per-unit contribution stays constant as output changes.", "Every table earns 40 and uses 4 labour hours and 2 wood units."],
  ["Additivity", "Total profit and resource use equal the sum of each product's contribution.", "Combined labour = 4X + 2Y; combined wood = 2X + 4Y."],
  ["Divisibility", "The mathematical model permits fractional decision-variable values.", "The graph allows any point in the feasible region; for this classroom model the optimal quantities happen to be whole units."],
  ["Certainty", "All coefficients and resource limits are known and fixed for the model.", "Profit, labour, wood, and available capacities are treated as given values."],
  ["Non-negativity", "Decision variables must be zero or greater.", "The factory cannot produce −3 tables: X ≥ 0 and Y ≥ 0."],
];

function fmt(value) {
  return Number(value).toLocaleString("en-IN");
}

function IconTile({ children, color = "blue" }) {
  return <span className={`icon-tile tile-${color}`}>{children}</span>;
}

function SectionHeading({ eyebrow, title, description, number }) {
  return (
    <div className="section-heading">
      <div className="section-title-wrap">
        <span className="section-number">{number}</span>
        <div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>
      </div>
      {description && <p className="section-description">{description}</p>}
    </div>
  );
}

function App() {
  const [activeSection, setActiveSection] = useState("home");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [tables, setTables] = useState(40);
  const [chairs, setChairs] = useState(40);
  const [projectData, setProjectData] = useState(null);
  const [dataError, setDataError] = useState("");
  const [presentationError, setPresentationError] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    let active = true;
    loadProjectData()
      .then((datasets) => { if (active) setProjectData(datasets); })
      .catch((error) => {
        console.error("Project CSV datasets were not loaded:", error);
        if (active) setDataError(error.message);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveSection(visible.target.id);
    }, { rootMargin: "-18% 0px -65% 0px", threshold: [0, 0.1, 0.3] });
    navItems.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const products = useMemo(() => projectData?.products?.map((row) => ({
    product: row.Product, variable: row.Decision_Variable, profit: Number(row.Profit_Per_Unit),
    labour: Number(row.Labour_Hours_Per_Unit), wood: Number(row.Wood_Units_Per_Unit),
  })) || FALLBACK_PRODUCTS, [projectData]);
  const constraints = useMemo(() => projectData?.constraints?.filter((row) => row.Resource !== "Non-negativity").map((row) => ({
    resource: row.Resource, x: Number(row.Tables_Coefficient), y: Number(row.Chairs_Coefficient),
    limit: Number(row.Limit), unit: row.Unit, equation: row.Equation.replace("<=", "≤"),
  })) || FALLBACK_CONSTRAINTS, [projectData]);
  const vertices = useMemo(() => projectData?.vertices?.map((row) => ({
    vertex: row.Vertex, x: Number(row.Tables_X), y: Number(row.Chairs_Y), profit: Number(row.Profit),
    labour: Number(row.Labour_Used), wood: Number(row.Wood_Used), optimal: row.Is_Optimal.toLowerCase() === "yes",
  })) || FALLBACK_VERTICES, [projectData]);
  const kpis = useMemo(() => projectData?.kpis?.reduce((result, row) => ({ ...result, [row.Metric]: Number(row.Value) }), {}) || FALLBACK_KPIS, [projectData]);
  const optimal = vertices.find((point) => point.optimal) || FALLBACK_VERTICES[2];
  const grid = projectData?.grid;

  const profitData = vertices.map((point) => ({ name: point.vertex, profit: point.profit }));
  const resourceData = [
    { name: "Labour", used: optimal.labour, available: 240, fill: "#4b8ff6" },
    { name: "Wood", used: optimal.wood, available: 240, fill: "#3db89b" },
  ];
  const quantityData = [
    { name: "Tables", quantity: Number(kpis["Optimal Tables"] || optimal.x), fill: "#4b8ff6" },
    { name: "Chairs", quantity: Number(kpis["Optimal Chairs"] || optimal.y), fill: "#8c78ea" },
  ];

  function navigateTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(id);
    setMobileNavOpen(false);
  }

  async function togglePresentation() {
    setPresentationError("");
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else setPresentationError("Fullscreen presentation is not supported in this browser.");
    } catch (error) {
      console.error("Could not change presentation mode:", error);
      setPresentationError(`Could not change presentation mode: ${error.message}`);
    }
  }

  return (
    <div className={`app-shell ${isFullscreen ? "presentation-mode" : ""}`}>
      <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
        <a className="brand-lockup" href="#home" onClick={(event) => { event.preventDefault(); navigateTo("home"); }}>
          <span className="brand-mark"><Factory size={21} strokeWidth={2.2} /></span>
          <span><strong>OPTIMA</strong><small>PRODUCTION INTELLIGENCE</small></span>
        </a>
        <div className="sidebar-project"><span>PROJECT WORKSPACE</span><strong>Smart Production<br />Optimization</strong><small><span className="workspace-dot" /> Team T13 · ABL Project</small></div>
        <nav className="side-nav" aria-label="Project sections">
          <p className="nav-caption">DEMONSTRATION</p>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className={`nav-link ${activeSection === id ? "nav-active" : ""}`} onClick={() => navigateTo(id)}>
              <Icon size={17} strokeWidth={1.8} /><span>{label}</span>{id === "solver" && <span className="nav-live-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="data-health"><span className={`health-dot ${projectData ? "health-on" : dataError ? "health-fallback" : ""}`} /><div><strong>{projectData ? "Project data connected" : dataError ? "Using project defaults" : "Loading project data"}</strong><small>{grid ? `${grid.length.toLocaleString()} grid records loaded` : "Furniture model · 2 products"}</small></div></div>
          <div className="sidebar-footnote">Linear Programming Problem<br />Graphical Method · v1.0</div>
        </div>
      </aside>

      <div className="content-shell">
        <header className="topbar">
          <button type="button" className="icon-button mobile-menu-button" aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"} onClick={() => setMobileNavOpen(!mobileNavOpen)}>{mobileNavOpen ? <X size={20} /> : <Menu size={20} />}</button>
          <div className="breadcrumb"><span>Workspace</span><ChevronDown size={14} /><strong>Production Optimization</strong></div>
          <div className="topbar-actions"><span className="team-pill"><span /> T13 · ABL Demonstration</span><button type="button" className="button button-top" onClick={togglePresentation}><Expand size={15} /> {isFullscreen ? "Exit presentation" : "Presentation mode"}</button></div>
        </header>

        <main className="main-content">
          {dataError && <div className="data-warning" role="status">Dataset files could not be loaded ({dataError}); using the exact project values from the brief.</div>}
          {presentationError && <div className="data-warning" role="alert">{presentationError}</div>}

          <section id="home" className="hero-section scroll-section">
            <div className="hero-copy">
              <div className="hero-kicker"><span className="kicker-spark"><Sparkles size={13} /></span> COLLEGE ABL PROJECT <span className="kicker-divider" /> TEAM T13</div>
              <h1>Make every<br /><em>resource</em> count.</h1>
              <p className="hero-subtitle">Smart Production Optimization System</p>
              <p className="hero-description">An interactive demonstration of Linear Programming and graphical optimization in furniture manufacturing.</p>
              <p className="hero-course-line">Linear Programming Problem <i>·</i> Terminologies, Assumptions and Solving LPP Using Graphical Methods</p>
              <div className="hero-buttons">
                <button className="button button-primary hero-primary" onClick={() => navigateTo("introduction")}>Explore project <ArrowRight size={17} /></button>
                <button className="button button-white" onClick={() => navigateTo("solver")}><MousePointer2 size={16} /> Start live simulation</button>
              </div>
              <button className="hero-dashboard-link" onClick={() => navigateTo("dashboard")}>View results dashboard <ArrowDown size={14} /></button>
              <div className="hero-proof"><div className="proof-avatars"><span>J</span><span>B</span><span>J</span><span>S</span></div><div><strong>Team T13</strong><small>Linear Programming Problem · Graphical Method</small></div></div>
            </div>
            <div className="hero-art" aria-label="Illustration of production optimization">
              <div className="art-glow" />
              <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
              <div className="art-label label-upper"><span className="label-dot blue-dot" /> RESOURCE EFFICIENCY <b>100%</b></div>
              <div className="art-board">
                <div className="art-board-top"><span><i /> OPTIMIZATION MODEL</span><span>LIVE</span></div>
                <div className="art-chart">
                  <div className="chart-y-label">Chairs (Y)</div>
                  <div className="art-chart-grid">
                    <svg viewBox="0 0 330 195" aria-hidden="true">
                      <defs><linearGradient id="hero-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#5e9aff" stopOpacity=".36" /><stop offset="100%" stopColor="#5e9aff" stopOpacity=".02" /></linearGradient></defs>
                      {[0, 1, 2, 3, 4].map((i) => <g key={i}><line x1="24" y1={24 + i * 36} x2="318" y2={24 + i * 36} stroke="#243b5a" strokeDasharray="3 5" /><line x1={24 + i * 73.5} y1="24" x2={24 + i * 73.5} y2="168" stroke="#243b5a" strokeDasharray="3 5" /></g>)}
                      <polygon points="24,168 165,168 118,72 24,72" fill="url(#hero-area)" />
                      <polyline points="24,24 165,168" fill="none" stroke="#4e91f7" strokeWidth="2.5" />
                      <polyline points="24,72 318,168" fill="none" stroke="#46c2a4" strokeWidth="2.5" />
                      <circle cx="118" cy="72" r="13" fill="#4e91f7" opacity=".18" /><circle cx="118" cy="72" r="5" fill="#fff" stroke="#4e91f7" strokeWidth="3" />
                      <rect x="132" y="46" width="79" height="27" rx="8" fill="#203859" stroke="#395d8b" /><text x="171" y="63" textAnchor="middle" fill="#dcecff" fontSize="10" fontFamily="sans-serif">OPTIMAL · B</text>
                      <line x1="24" y1="168" x2="318" y2="168" stroke="#607795" /><line x1="24" y1="24" x2="24" y2="168" stroke="#607795" />
                      <text x="165" y="190" textAnchor="middle" fill="#90a5bf" fontSize="10" fontFamily="sans-serif">Tables produced (X)</text>
                    </svg>
                  </div>
                </div>
                <div className="art-legend"><span><i className="legend-labour" /> Labour</span><span><i className="legend-wood" /> Wood</span><span><i className="legend-feasible" /> Feasible region</span></div>
              </div>
              <div className="art-label label-profit"><span className="profit-icon"><TrendingUp size={17} /></span><span><small>MAXIMUM PROFIT</small><b>2,800 <small>units</small></b></span><i><ArrowUp size={13} /></i></div>
              <div className="art-note"><span className="note-icon"><Target size={17} /></span><span><small>OPTIMAL MIX</small><strong>40 tables <b>·</b> 40 chairs</strong></span></div>
              <span className="art-coordinate coordinate-one">X + Y</span><span className="art-coordinate coordinate-two">Z → max</span>
            </div>
            <div className="hero-bottom">
              <div className="hero-scroll"><span className="scroll-line" /> A practical introduction to optimization</div>
              <div className="hero-bottom-metric"><span className="metric-dot" /><strong>2</strong> products <i /> <strong>2</strong> limited resources <i /> <strong>1</strong> optimal plan</div>
            </div>
          </section>

          <section className="highlight-strip" aria-label="Project highlights">
            {[
              [<Target size={19} />, "Maximum profit", "Find the best product mix"],
              [<Gauge size={19} />, "Resource allocation", "Put every unit to work"],
              [<Activity size={19} />, "Graphical method", "See the solution, not just numbers"],
              [<BriefcaseBusiness size={19} />, "Decision support", "Turn limits into clear choices"],
            ].map(([icon, title, text], index) => <div className="highlight-item" key={title}><IconTile color={["blue", "mint", "violet", "amber"][index]}>{icon}</IconTile><div><strong>{title}</strong><span>{text}</span></div></div>)}
          </section>

          <section id="introduction" className="content-section scroll-section">
            <SectionHeading number="01" eyebrow="THE FOUNDATIONS" title="What is Linear Programming?" description="A clear mathematical way to make the best possible decision when resources are limited." />
            <div className="intro-grid">
              <div className="intro-main panel">
                <div className="definition-mark">“</div><p className="eyebrow">A DECISION-MAKING FRAMEWORK</p>
                <h3>Linear Programming turns<br />trade-offs into a plan.</h3>
                <p>Linear Programming (LP), also called a Linear Programming Problem (LPP), is a mathematical method for finding the best outcome—such as the highest profit—when relationships are linear and resources are limited.</p>
                <div className="definition-equation"><span>Objective</span><b>Choose quantities</b><i>subject to</i><b>Resource limits</b><ArrowRight size={15} /><strong>Best outcome</strong></div>
              </div>
              <div className="intro-side panel">
                <div className="mini-illustration"><div className="mini-stack stack-a"><span /><span /><span /></div><div className="mini-stack stack-b"><span /><span /></div><div className="mini-arrow"><ArrowRight size={20} /></div><div className="mini-outcome"><Target size={24} /><small>BEST MIX</small></div></div>
                <h3>Where LP makes a difference</h3>
                <p>Manufacturing, transportation, staffing, scheduling, agriculture, finance and supply-chain planning.</p>
                <div className="chips"><span>Plan</span><span>Allocate</span><span>Optimize</span></div>
              </div>
            </div>
            <div className="value-grid">
              {[
                [<Zap size={18} />, "Why businesses use it", "Compare thousands of possible production plans systematically."],
                [<BarChart3 size={18} />, "The business advantage", "Make resource trade-offs explicit and decisions explainable."],
                [<Check size={18} />, "What it delivers", "A feasible, measurable recommendation backed by the model."],
              ].map(([icon, title, body], index) => <article className="value-card" key={title}><IconTile color={["blue", "mint", "violet"][index]}>{icon}</IconTile><div><h3>{title}</h3><p>{body}</p></div></article>)}
            </div>
          </section>

          <section id="terminologies" className="content-section scroll-section">
            <SectionHeading number="02" eyebrow="THE LANGUAGE OF LPP" title="Key terminologies" description="Nine essential ideas, each grounded in the tables-and-chairs production example." />
            <div className="term-grid">{terms.map(([number, title, description, example]) => <article className="term-card panel" key={title}><div className="term-top"><span>{number}</span><IconTile color={number === "06" ? "mint" : "blue"}><CircleHelp size={17} /></IconTile></div><h3>{title}</h3><p>{description}</p><div className="term-example"><span>IN THIS MODEL</span><p>{example}</p></div></article>)}</div>
          </section>

          <section id="assumptions" className="content-section scroll-section">
            <SectionHeading number="03" eyebrow="MODEL FOUNDATIONS" title="Assumptions of LPP" description="These assumptions let us represent a real production system with a clear, solvable linear model." />
            <div className="assumption-list">{assumptions.map(([title, description, example], index) => <article className="assumption-row panel" key={title}><div className="assumption-index">0{index + 1}</div><div className="assumption-name"><span className={`assumption-icon assumption-${index}`}><Check size={16} /></span><h3>{title}</h3></div><p>{description}</p><div className="assumption-example"><span>FURNITURE EXAMPLE</span><p>{example}</p></div></article>)}</div>
          </section>

          <section id="business-problem" className="content-section scroll-section">
            <SectionHeading number="04" eyebrow="THE BUSINESS CASE" title="A furniture maker's challenge" description="Two products compete for the same limited labour and wood. Which production mix earns the most?" />
            <div className="problem-banner"><div className="problem-emblem"><Factory size={27} /></div><div><span>SCENARIO</span><h3>One workshop. Two products. Limited resources.</h3><p>The company wants to maximize profit without exceeding its available labour hours or wood units.</p></div><div className="problem-resources"><div><span className="resource-symbol labour-symbol"><Activity size={16} /></span><strong>240 <small>hours</small></strong><span>Labour capacity</span></div><div><span className="resource-symbol wood-symbol"><Boxes size={16} /></span><strong>240 <small>units</small></strong><span>Wood capacity</span></div></div></div>
            <div className="product-card-grid">{products.map((product, index) => <article className={`product-card panel product-${index}`} key={product.product}><div className="product-card-head"><span className={`product-illustration illustration-${index}`}>{index === 0 ? <span className="table-illustration"><i /><b /><em /></span> : <span className="chair-illustration"><i /><b /><em /><strong /></span>}</span><span className="product-code">PRODUCT {product.variable}</span></div><div className="product-title"><div><span>FURNITURE LINE</span><h3>{product.product}</h3></div><div className="unit-profit"><strong>{product.profit}</strong><span>profit / unit</span></div></div><div className="product-specs"><div><span>LABOUR</span><strong><Activity size={15} /> {product.labour} <small>hours</small></strong></div><div><span>WOOD</span><strong><Boxes size={15} /> {product.wood} <small>units</small></strong></div></div><div className="product-brief">Per-unit contribution to the factory's shared resource limits.</div></article>)}</div>
            <div className="product-table-wrap panel"><div className="table-title"><div><p className="eyebrow">INPUT DATA</p><h3>Unit economics & resource requirements</h3></div><span className="dataset-source">{projectData ? "Loaded from project CSV" : "Project brief values"}</span></div><table className="data-table"><thead><tr><th>Product</th><th>Decision variable</th><th>Profit / unit</th><th>Labour / unit</th><th>Wood / unit</th></tr></thead><tbody>{products.map((item) => <tr key={item.product}><td><strong>{item.product}</strong></td><td>{item.variable}</td><td>{item.profit}</td><td>{item.labour} hours</td><td>{item.wood} units</td></tr>)}</tbody></table></div>
          </section>

          <section id="mathematical-model" className="content-section scroll-section">
            <SectionHeading number="05" eyebrow="FROM WORDS TO EQUATIONS" title="Build the mathematical model" description="Translate the business objective and each scarce resource into a linear equation." />
            <div className="model-grid">
              <div className="model-main panel"><div className="model-title"><span className="equation-mark">ƒx</span><div><p className="eyebrow">DECISION VARIABLES</p><h3>What can the factory choose?</h3></div></div><div className="variable-pair"><div><span>X</span><p><strong>Number of tables</strong><small>Production quantity for tables</small></p></div><div><span>Y</span><p><strong>Number of chairs</strong><small>Production quantity for chairs</small></p></div></div><div className="objective-box"><div className="objective-label"><span><Target size={16} /> OBJECTIVE FUNCTION</span><small>Maximize total profit</small></div><div className="equation">MAX <em>Z</em> = <b>40X</b> + <b>30Y</b></div><p>Each table contributes 40; each chair contributes 30 currency units.</p></div><div className="constraint-list"><p className="eyebrow">SUBJECT TO RESOURCE CONSTRAINTS</p>{constraints.map((constraint, index) => <div className="constraint-equation" key={constraint.resource}><span className={`constraint-index c-index-${index}`}>C{index + 1}</span><div><strong>{constraint.equation}</strong><small>{constraint.resource}: {constraint.limit} {constraint.unit} available</small></div><span className="constraint-meaning">Per-unit use × quantity ≤ capacity</span></div>)}<div className="constraint-equation nonnegative-row"><span className="constraint-index c-index-n">N</span><div><strong>X ≥ 0 &nbsp;&nbsp; Y ≥ 0</strong><small>Non-negativity restrictions</small></div><span className="constraint-meaning">No negative production</span></div></div></div>
              <aside className="model-aside"><div className="model-side-card"><span className="aside-step">01</span><h3>Profit objective</h3><p>Multiply each unit's profit by its production quantity, then maximize the total.</p><div className="aside-math"><span>40 × Tables</span><b>+</b><span>30 × Chairs</span></div></div><div className="model-side-card"><span className="aside-step">02</span><h3>Resource constraints</h3><p>Each product's resource use adds up; production cannot use more than the factory has.</p><div className="aside-math"><span>Used</span><b>≤</b><span>Available</span></div></div><div className="model-note"><Lightbulb size={17} /><p><strong>Think of a constraint as a boundary.</strong> The best feasible answer is found at a corner of the shaded region.</p></div></aside>
            </div>
          </section>

          <section id="solver" className="content-section solver-section scroll-section">
            <SectionHeading number="06" eyebrow="TRY THE MODEL YOURSELF" title="Interactive graphical solver" description="Move the sliders and watch the plan move on the graph. The simulation recalculates profit, resource use and feasibility in real time." />
            <GraphicalSolver tables={tables} chairs={chairs} onTablesChange={setTables} onChairsChange={setChairs} onReset={() => { setTables(0); setChairs(0); }} onOptimize={() => { setTables(Number(optimal.x)); setChairs(Number(optimal.y)); }} vertices={vertices} grid={grid} />
            <div className="corner-comparison panel"><div className="table-title"><div><p className="eyebrow">VERTEX TEST</p><h3>Evaluate the objective at each corner</h3></div><span className="pill-note">Linear programming optimum occurs at a feasible vertex</span></div><div className="corner-cards">{vertices.map((point) => <div className={`corner-card ${point.optimal ? "corner-best" : ""}`} key={point.vertex}><div className="corner-name"><span>{point.vertex}</span>{point.optimal && <span className="best-chip"><Sparkles size={11} /> OPTIMAL</span>}</div><strong>{fmt(point.profit)}</strong><small>currency units</small><div className="corner-coordinates">({point.x}, {point.y}) · {point.x} tables, {point.y} chairs</div><div className="corner-bar"><i style={{ width: `${(point.profit / Math.max(...vertices.map((v) => v.profit))) * 100}%` }} /></div></div>)}</div><div className="corner-takeaway"><span className="takeaway-check"><Check size={15} /></span><span><strong>Highest value: B (40, 40).</strong> Z = 40(40) + 30(40) = 2,800 currency units.</span></div></div>
          </section>

          <section id="dashboard" className="content-section dashboard-section scroll-section">
            <SectionHeading number="07" eyebrow="THE OPTIMAL PRODUCTION PLAN" title="Optimization results dashboard" description="A concise view of the best mix, its returns and how it uses available capacity." />
            <div className="kpi-grid">
              {[
                { label: "Optimal tables", value: fmt(kpis["Optimal Tables"] ?? optimal.x), unit: "units", icon: <Boxes size={18} />, color: "blue", trend: "Decision variable X" },
                { label: "Optimal chairs", value: fmt(kpis["Optimal Chairs"] ?? optimal.y), unit: "units", icon: <BriefcaseBusiness size={18} />, color: "violet", trend: "Decision variable Y" },
                { label: "Maximum profit", value: fmt(kpis["Maximum Profit"] ?? optimal.profit), unit: "currency units", icon: <TrendingUp size={18} />, color: "mint", trend: "Objective function Z" },
                { label: "Resource utilization", value: `${Math.min(Number(kpis["Labour Utilization"] ?? 100), Number(kpis["Wood Utilization"] ?? 100))}%`, unit: "labour & wood", icon: <Gauge size={18} />, color: "amber", trend: "Both constraints binding" },
              ].map((kpi) => <article className="kpi-card panel" key={kpi.label}><div className="kpi-top"><IconTile color={kpi.color}>{kpi.icon}</IconTile><span className="kpi-trend"><ArrowUp size={13} /> OPTIMAL</span></div><span className="kpi-label">{kpi.label}</span><div className="kpi-value">{kpi.value}<small>{kpi.unit}</small></div><div className="kpi-foot"><span className="kpi-dot" />{kpi.trend}</div></article>)}
            </div>
            <div className="chart-grid">
              <article className="chart-card panel"><div className="chart-card-heading"><div><p className="eyebrow">OBJECTIVE FUNCTION</p><h3>Profit by corner point</h3></div><span className="chart-unit">Currency units</span></div><div className="chart-content"><ResponsiveContainer width="100%" height="100%"><BarChart data={profitData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}><CartesianGrid vertical={false} stroke="#edf1f7" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#738198", fontSize: 12 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#738198", fontSize: 11 }} tickFormatter={(value) => value === 0 ? "0" : `${value / 1000}k`} /><Tooltip formatter={(value) => [fmt(value), "Profit"]} contentStyle={{ border: "1px solid #e4eaf2", borderRadius: 12, boxShadow: "0 8px 30px #1a2e4a12" }} /><Bar dataKey="profit" radius={[7, 7, 0, 0]} maxBarSize={56}>{profitData.map((point) => <Cell key={point.name} fill={point.name === optimal.vertex ? "#4c8df6" : "#c7d7ed"} />)}</Bar></BarChart></ResponsiveContainer></div><div className="chart-footnote"><span className="chart-dot optimum-dot" /> B earns the highest profit at 2,800</div></article>
              <article className="chart-card panel"><div className="chart-card-heading"><div><p className="eyebrow">RESOURCE CAPACITY</p><h3>Capacity utilization</h3></div><span className="chart-unit">Used / available</span></div><div className="chart-content"><ResponsiveContainer width="100%" height="100%"><BarChart data={resourceData} layout="vertical" margin={{ top: 8, right: 24, left: 2, bottom: 4 }}><CartesianGrid horizontal={false} stroke="#edf1f7" /><XAxis type="number" domain={[0, 260]} hide /><YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: "#44546a", fontSize: 12, fontWeight: 600 }} width={52} /><Tooltip formatter={(value, name) => [value, name === "available" ? "Available" : "Used"]} contentStyle={{ border: "1px solid #e4eaf2", borderRadius: 12 }} /><Bar dataKey="available" fill="#eff3f8" radius={[4, 4, 4, 4]} barSize={24} /><Bar dataKey="used" radius={[4, 4, 4, 4]} barSize={24}>{resourceData.map((row) => <Cell key={row.name} fill={row.fill} />)}</Bar><Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "#738198" }} /></BarChart></ResponsiveContainer></div><div className="chart-footnote"><span className="chart-dot utilization-dot" /> Labour 240 / 240 h · Wood 240 / 240 units</div></article>
              <article className="chart-card panel"><div className="chart-card-heading"><div><p className="eyebrow">RECOMMENDED MIX</p><h3>Production quantities</h3></div><span className="chart-unit">Optimal units</span></div><div className="chart-content chart-content-small"><ResponsiveContainer width="100%" height="100%"><BarChart data={quantityData} margin={{ top: 10, right: 18, left: 2, bottom: 0 }}><CartesianGrid vertical={false} stroke="#edf1f7" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#738198", fontSize: 12 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#738198", fontSize: 11 }} /><Tooltip formatter={(value) => [`${value} units`, "Production"]} contentStyle={{ border: "1px solid #e4eaf2", borderRadius: 12 }} /><Bar dataKey="quantity" radius={[7, 7, 0, 0]} maxBarSize={62}>{quantityData.map((row) => <Cell key={row.name} fill={row.fill} />)}</Bar></BarChart></ResponsiveContainer></div><div className="chart-footnote"><span className="chart-dot table-dot" /> 40 tables <span className="chart-dot chair-dot" /> 40 chairs</div></article>
              <article className="chart-card panel"><div className="chart-card-heading"><div><p className="eyebrow">DECISION COMPARISON</p><h3>Corner point profitability</h3></div><span className="chart-unit">Relative share</span></div><div className="chart-content pie-content"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={profitData.filter((row) => row.profit > 0)} dataKey="profit" nameKey="name" cx="50%" cy="50%" innerRadius="49%" outerRadius="76%" paddingAngle={4} stroke="none">{profitData.filter((row) => row.profit > 0).map((point) => <Cell key={point.name} fill={point.name === optimal.vertex ? "#4c8df6" : "#d3dfee"} />)}</Pie><Tooltip formatter={(value) => [fmt(value), "Profit"]} contentStyle={{ border: "1px solid #e4eaf2", borderRadius: 12 }} /></PieChart></ResponsiveContainer><div className="pie-center"><strong>4</strong><span>vertices</span></div></div><div className="chart-footnote"><span className="chart-dot optimum-dot" /> B (40, 40) is the profit maximum</div></article>
            </div>
            <p className="dashboard-source">{grid ? `Production grid dataset: ${grid.length.toLocaleString()} production combinations loaded and used to plot feasible sample points in the solver.` : "Dashboard metrics and corner-point comparisons are derived from the supplied project datasets."}</p>
          </section>

          <section id="tableau" className="content-section scroll-section">
            <SectionHeading number="08" eyebrow="EXTEND THE ANALYSIS" title="Business Intelligence Dashboard" description="Connect the mathematical model to a published Tableau visualization when your dashboard is ready." />
            <div className="tableau-panel panel"><div className="tableau-toolbar"><div className="tableau-brand"><span className="tableau-mark"><BarChart3 size={19} /></span><div><strong>Business Intelligence Dashboard</strong><small>POWERED BY TABLEAU</small></div></div><span className="tableau-status"><i /> {TABLEAU_EMBED_URL ? "Connected dashboard" : "Awaiting dashboard URL"}</span></div>{TABLEAU_EMBED_URL ? <iframe className="tableau-frame" src={TABLEAU_EMBED_URL} title="Tableau production optimization dashboard" loading="lazy" allowFullScreen /> : <div className="tableau-placeholder"><div className="tableau-empty-icon"><Presentation size={26} /></div><span className="eyebrow">TABLEAU PUBLIC EMBED</span><h3>Your dashboard goes here.</h3><p>Tableau dashboard will be available here after publishing.</p><div className="config-hint"><span>CONFIGURATION</span><code>VITE_TABLEAU_EMBED_URL</code><span>Set in <code>frontend/.env.local</code></span></div></div>}</div>
          </section>

          <section id="insights" className="content-section scroll-section">
            <SectionHeading number="09" eyebrow="READING THE RESULT" title="Business insights" description="What the optimal solution says about this company's production choices and limited resources." />
            <div className="insight-grid">
              <article className="insight-card insight-feature"><span className="insight-number">01 / THE ANSWER</span><div className="insight-feature-metric"><span>Optimal mix</span><strong>40 <i>+</i> 40</strong><small>tables <i>·</i> chairs</small></div><h3>Why 40 tables and 40 chairs?</h3><p>The labour and wood boundaries intersect at (40, 40). Evaluating the objective function at each feasible corner gives 2,800 here—the highest of the four corner-point values.</p><div className="insight-formula">Z = 40(40) + 30(40) = <strong>2,800</strong></div></article>
              <div className="insight-stack">
                {[
                  ["02", "Both resources are fully utilized", "At the optimum: 4(40) + 2(40) = 240 labour hours and 2(40) + 4(40) = 240 wood units. Both constraints bind; slack is zero."],
                  ["03", "Scarcity shapes the production mix", "Tables use more labour per unit; chairs use more wood. The shared limits create the two boundaries that bound the feasible region."],
                  ["04", "Other corners earn less", "A earns 2,400; C earns 1,800; O earns 0. Comparing feasible vertices shows why neither single-product plan beats the balanced mix."],
                ].map(([number, title, text]) => <article className="insight-row panel" key={number}><span className="insight-row-number">{number}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}
              </div>
            </div>
            <div className="business-application"><span><Lightbulb size={18} /></span><div><strong>In practice, LP makes constraints actionable.</strong><p>Companies use optimization to allocate scarce capacity, compare trade-offs and justify a profit-maximizing plan—then update the model as business conditions change.</p></div><ArrowRight size={17} /></div>
          </section>

          <section id="conclusion" className="content-section conclusion-section scroll-section">
            <SectionHeading number="10" eyebrow="TAKEAWAYS" title="Conclusion" description="Linear Programming provides a disciplined path from competing demands to an explainable business decision." />
            <div className="conclusion-panel"><div className="conclusion-icon"><Target size={24} /></div><div className="conclusion-content"><p className="eyebrow">THE MODEL IN ONE SENTENCE</p><h3>Use the best mix of products to make the most of limited resources.</h3><p>In this furniture production example, the graphical method turns the profit objective and two resource constraints into a visible feasible region. Comparing the objective at its corner points identifies 40 tables and 40 chairs as the optimal production plan, earning 2,800 currency units while using all 240 labour hours and 240 units of wood.</p><div className="conclusion-takeaways"><span><Check size={14} /> A clear objective</span><span><Check size={14} /> Explicit constraints</span><span><Check size={14} /> An evidence-based optimum</span></div></div><div className="conclusion-decoration"><span>40</span><i>×</i><span>40</span><small>THE OPTIMAL MIX</small></div></div>
          </section>

          <section id="team" className="content-section team-section scroll-section">
            <SectionHeading number="11" eyebrow="THE PEOPLE BEHIND THE MODEL" title="Meet Team T13" description="A college Activity-Based Learning project on applying Linear Programming to a real-world production decision." />
            <div className="team-project-line"><div><span className="team-project-icon"><Factory size={18} /></span><div><span>PROJECT TOPIC</span><strong>Smart Production Optimization System</strong></div></div><div><span className="team-project-icon"><BookOpen size={18} /></span><div><span>ABL ACTIVITY</span><strong>Linear Programming · Graphical Method</strong></div></div></div>
            <div className="team-grid">{["Janush H S", "Bhagat Gowda BY", "Jayashree T K", "Sannidhi"].map((name, index) => <article className="member-card panel" key={name}><div className={`member-avatar avatar-${index}`}><span>{name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><i /></div><div className="member-name">{name}</div><span className="member-meta">TEAM T13 <i /> PROJECT CONTRIBUTOR</span><div className="member-card-line" /></article>)}</div>
          </section>

          <footer className="footer"><div className="footer-main"><a className="footer-brand" href="#home" onClick={(event) => { event.preventDefault(); navigateTo("home"); }}><span className="brand-mark"><Factory size={19} /></span><span><strong>OPTIMA</strong><small>PRODUCTION INTELLIGENCE</small></span></a><p>Smart Production Optimization System<br />A Linear Programming demonstration by Team T13.</p><button className="footer-top" onClick={() => navigateTo("home")}>Back to top <ArrowUp size={15} /></button></div><div className="footer-bottom"><span>COLLEGE ABL PROJECT · TEAM T13</span><span>Linear Programming · Terminologies, Assumptions & Graphical Method</span><span>© 2026</span></div></footer>
        </main>
      </div>
      <button className="back-to-top" type="button" aria-label="Back to top" onClick={() => navigateTo("home")}><ArrowUp size={18} /></button>
    </div>
  );
}

export default App;
