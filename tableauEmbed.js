const DASHBOARDS = [
  {
    id: "flights",
    label: "Flights Pricing Analytics",
    category: "Transportation",
    description: "Monitor airfare trends, route performance, pricing spread, and demand pressure by route and carrier.",
    url: "https://public.tableau.com/views/RegionalSampleWorkbook/College",
  },
  {
    id: "ecommerce",
    label: "E-Commerce Revenue Dashboard",
    category: "Commerce",
    description: "Track revenue mix, orders, media efficiency, region-level trends, and category margin expansion.",
    url: "https://public.tableau.com/views/RegionalSampleWorkbook/Stocks",
  },
  {
    id: "gym",
    label: "Gym Performance Analytics",
    category: "Sports Science",
    description: "Compare athlete workload, recovery, effort, and coaching interventions over weekly cycles.",
    url: "https://public.tableau.com/views/RegionalSampleWorkbook/Obesity",
  },
  {
    id: "retail",
    label: "Retail Sales Dashboard",
    category: "Retail",
    description: "Evaluate store demand, department performance, footfall conversion, and satisfaction metrics.",
    url: "https://public.tableau.com/views/RegionalSampleWorkbook/Storms",
  },
];

export class TableauEmbed {
  constructor() {
    this.dashboards = DASHBOARDS;
  }

  render() {
    const tabs = this.dashboards.map((dashboard, index) => `
      <button class="tab-button ${index === 0 ? "active" : ""}" data-dashboard-tab="${dashboard.id}">
        <span class="tab-title">${dashboard.label}</span>
        <span class="tab-caption">${dashboard.category}</span>
      </button>
    `).join("");

    const panes = this.dashboards.map((dashboard, index) => `
      <section class="dashboard-pane ${index === 0 ? "active" : ""}" data-dashboard-pane="${dashboard.id}">
        <div class="dashboard-pane-meta">
          <div>
            <div class="section-kicker">BI Dashboard Center</div>
            <h2>${dashboard.label}</h2>
            <p>${dashboard.description}</p>
          </div>
          <a class="pill-link" href="${dashboard.url}" target="_blank" rel="noreferrer">Open Tableau</a>
        </div>
        <div class="dashboard-frame-shell">
          <iframe class="tableau-frame" loading="lazy" src="${dashboard.url}?:showVizHome=no" title="${dashboard.label}"></iframe>
        </div>
      </section>
    `).join("");

    return `
      <div class="dashboard-center">
        <div class="panel-heading">
          <div>
            <div class="section-kicker">Control Center</div>
            <h1>BI DASHBOARD CENTER</h1>
            <p>Switch between embedded Tableau dashboards to demonstrate live analytics storytelling across domains.</p>
          </div>
          <div class="panel-badges">
            <span class="badge badge-cyan">Embedded Tableau</span>
            <span class="badge badge-magenta">Multi-domain KPIs</span>
            <span class="badge badge-violet">Executive view</span>
          </div>
        </div>
        <div class="tab-row">${tabs}</div>
        <div class="dashboard-pane-stack">${panes}</div>
      </div>
    `;
  }

  bind(container) {
    const tabButtons = [...container.querySelectorAll("[data-dashboard-tab]")];
    const panes = [...container.querySelectorAll("[data-dashboard-pane]")];
    const activate = (id) => {
      tabButtons.forEach((button) => button.classList.toggle("active", button.dataset.dashboardTab === id));
      panes.forEach((pane) => pane.classList.toggle("active", pane.dataset.dashboardPane === id));
    };
    tabButtons.forEach((button) => button.addEventListener("click", () => activate(button.dataset.dashboardTab)));
  }
}
