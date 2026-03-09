import { NexusOS } from "./os.js";

const BOOT_STEPS = [
  { label: "Initializing analytics core", detail: "Kernel adapters, KPI telemetry buses, and dashboard orchestration layers are coming online.", accent: "cyan" },
  { label: "Connecting data pipelines", detail: "Binding ingestion sockets for CSV, Excel, JSON, and synthetic warehouse mirrors.", accent: "green" },
  { label: "Loading visualization modules", detail: "ECharts, Chart.js, Three.js, KPI surfaces, and terminal overlays are staged.", accent: "violet" },
  { label: "Starting AI insight engine", detail: "NEXUS AI is calibrating anomaly detection, correlation scanning, and executive summary prompts.", accent: "magenta" },
];

const SAMPLE_DATASETS = {
  flights: [
    { airline: "SkyJet", route: "NYC-LAX", month: "2026-01", price: 320, seats: 180, demand: 78, onTime: 92 },
    { airline: "SkyJet", route: "NYC-LAX", month: "2026-02", price: 350, seats: 180, demand: 81, onTime: 90 },
    { airline: "AeroNova", route: "NYC-MIA", month: "2026-01", price: 210, seats: 140, demand: 69, onTime: 94 },
    { airline: "AeroNova", route: "NYC-MIA", month: "2026-02", price: 240, seats: 140, demand: 74, onTime: 93 },
    { airline: "Zenith Air", route: "SFO-SEA", month: "2026-01", price: 165, seats: 110, demand: 63, onTime: 97 },
    { airline: "Zenith Air", route: "SFO-SEA", month: "2026-02", price: 175, seats: 110, demand: 68, onTime: 95 },
    { airline: "SkyJet", route: "LAX-DEN", month: "2026-03", price: 280, seats: 160, demand: 80, onTime: 91 },
    { airline: "AeroNova", route: "ATL-ORD", month: "2026-03", price: 230, seats: 135, demand: 75, onTime: 89 },
    { airline: "Zenith Air", route: "SEA-LAS", month: "2026-03", price: 190, seats: 120, demand: 70, onTime: 96 }
  ],
  ecommerce: [
    { category: "Electronics", region: "North America", month: "2026-01", revenue: 152000, orders: 860, margin: 34, ads: 42000 },
    { category: "Electronics", region: "Europe", month: "2026-02", revenue: 143000, orders: 790, margin: 31, ads: 38000 },
    { category: "Apparel", region: "North America", month: "2026-01", revenue: 98000, orders: 1180, margin: 29, ads: 26000 },
    { category: "Apparel", region: "Asia", month: "2026-02", revenue: 105000, orders: 1240, margin: 33, ads: 27000 },
    { category: "Home", region: "Europe", month: "2026-03", revenue: 112000, orders: 640, margin: 38, ads: 22000 },
    { category: "Beauty", region: "Asia", month: "2026-03", revenue: 88000, orders: 960, margin: 41, ads: 19000 },
    { category: "Fitness", region: "North America", month: "2026-03", revenue: 91000, orders: 510, margin: 43, ads: 15000 }
  ],
  gym: [
    { athlete: "Maya", program: "Strength", week: "2026-W01", sessions: 5, effort: 8.3, calories: 3400, recovery: 82 },
    { athlete: "Maya", program: "Strength", week: "2026-W02", sessions: 4, effort: 7.8, calories: 3010, recovery: 86 },
    { athlete: "Kian", program: "Endurance", week: "2026-W01", sessions: 6, effort: 8.9, calories: 4120, recovery: 75 },
    { athlete: "Kian", program: "Endurance", week: "2026-W02", sessions: 5, effort: 8.4, calories: 3970, recovery: 79 },
    { athlete: "Rhea", program: "Mobility", week: "2026-W01", sessions: 3, effort: 6.5, calories: 1810, recovery: 93 },
    { athlete: "Rhea", program: "Mobility", week: "2026-W02", sessions: 4, effort: 7.1, calories: 2050, recovery: 91 }
  ],
  retail: [
    { store: "Flagship", department: "Grocery", month: "2026-01", sales: 126000, footfall: 8120, basket: 32, satisfaction: 88 },
    { store: "Flagship", department: "Pharmacy", month: "2026-02", sales: 93000, footfall: 4740, basket: 41, satisfaction: 91 },
    { store: "City Central", department: "Grocery", month: "2026-01", sales: 98000, footfall: 7050, basket: 29, satisfaction: 85 },
    { store: "City Central", department: "Lifestyle", month: "2026-03", sales: 84000, footfall: 4420, basket: 48, satisfaction: 89 },
    { store: "Harbor", department: "Electronics", month: "2026-02", sales: 118000, footfall: 3920, basket: 71, satisfaction: 87 },
    { store: "Harbor", department: "Lifestyle", month: "2026-03", sales: 76000, footfall: 3880, basket: 43, satisfaction: 90 }
  ]
};

const PROJECTS = [
  { id: "proj-flights", name: "Flights Analytics", description: "Price elasticity, route demand forecasting, punctuality scoring, and airline performance benchmarking.", tools: ["Tableau", "SQLite", "ECharts", "NEXUS AI"], dashboard: "Flights Pricing Analytics", datasetKey: "flights" },
  { id: "proj-ecommerce", name: "E-Commerce Pricing Analytics", description: "Revenue mix, paid media efficiency, category margin health, and order conversion diagnostics.", tools: ["Chart.js", "SQLite", "PapaParse", "Insight Engine"], dashboard: "E-Commerce Revenue Dashboard", datasetKey: "ecommerce" },
  { id: "proj-gym", name: "Gym Performance Analytics", description: "Workout adherence, recovery correlation, energy burn, and athlete performance trend analysis.", tools: ["Three.js", "ECharts", "SheetJS", "NEXUS AI"], dashboard: "Gym Performance Analytics", datasetKey: "gym" },
  { id: "proj-retail", name: "Retail Sales Analytics", description: "Store comparison, department sales telemetry, footfall conversion, and satisfaction monitoring.", tools: ["Tableau", "Chart.js", "SQL.js", "Terminal Console"], dashboard: "Retail Sales Dashboard", datasetKey: "retail" }
];

const KPI_SEED = [
  { id: "dashboards", label: "Active dashboards", value: 12, delta: "+3", accent: "cyan" },
  { id: "projects", label: "Project count", value: 4, delta: "+1", accent: "magenta" },
  { id: "score", label: "Analytics score", value: 97, delta: "+6", accent: "green", suffix: "%" },
  { id: "dataset", label: "Dataset size", value: 2.4, delta: "+0.4", accent: "violet", suffix: "GB" },
  { id: "accuracy", label: "Model accuracy", value: 94.3, delta: "+1.2", accent: "cyan", suffix: "%" }
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function updateBootClock() {
  const clockNode = document.getElementById("boot-terminal-clock");
  const tick = () => {
    clockNode.textContent = new Date().toLocaleTimeString("en-US", { hour12: false });
  };
  tick();
  return window.setInterval(tick, 1000);
}

function appendBootLine(step, index) {
  const logNode = document.getElementById("boot-log");
  const row = document.createElement("div");
  row.className = `boot-log-line ${step.accent}`;
  row.innerHTML = `
    <div class="boot-log-topline">
      <span class="boot-log-index">[0${index + 1}]</span>
      <span class="boot-log-label">${step.label}</span>
      <span class="boot-log-status">OK</span>
    </div>
    <div class="boot-log-detail">${step.detail}</div>
  `;
  logNode.appendChild(row);
  row.classList.add("visible");
}

async function runBootSequence() {
  const progressBar = document.getElementById("boot-progress-bar");
  const progressLabel = document.getElementById("boot-progress-label");
  const clockInterval = updateBootClock();

  for (let index = 0; index < BOOT_STEPS.length; index += 1) {
    appendBootLine(BOOT_STEPS[index], index);
    for (let progress = index * 25; progress <= (index + 1) * 25; progress += 5) {
      progressBar.style.width = `${progress}%`;
      progressLabel.textContent = `${progress}%`;
      await sleep(65);
    }
    await sleep(240);
  }

  window.clearInterval(clockInterval);
  progressBar.style.width = "100%";
  progressLabel.textContent = "100%";
}

async function bootApplication() {
  await runBootSequence();
  const bootNode = document.getElementById("boot-screen");
  const desktopNode = document.getElementById("desktop");
  bootNode.classList.add("boot-complete");
  desktopNode.classList.remove("desktop-hidden");
  desktopNode.classList.add("desktop-visible");

  const nexusOS = new NexusOS({ mount: desktopNode, datasets: SAMPLE_DATASETS, projects: PROJECTS, kpis: KPI_SEED });
  nexusOS.init();

  window.setTimeout(() => bootNode.remove(), 950);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootApplication, { once: true });
} else {
  bootApplication();
}
