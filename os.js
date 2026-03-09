
import { DatasetEngine } from "./analytics/datasetEngine.js";
import { Statistics } from "./analytics/statistics.js";
import { TableauEmbed } from "./dashboards/tableauEmbed.js";
import { InsightEngine } from "./ai/insightEngine.js";
import { TerminalConsole } from "./terminal.js";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export class NexusOS {
  constructor({ mount, datasets, projects, kpis }) {
    this.mount = mount;
    this.windowLayer = document.getElementById("window-layer");
    this.taskbarApps = document.getElementById("taskbar-apps");
    this.kpiStrip = document.getElementById("kpi-strip");
    this.datasetEngine = new DatasetEngine(datasets);
    this.insightEngine = new InsightEngine();
    this.tableauEmbed = new TableauEmbed();
    this.projects = projects;
    this.kpis = kpis;
    this.windows = new Map();
    this.windowTemplate = document.getElementById("window-template");
    this.windowCounter = 1;
    this.zIndex = 300;
    this.sqlDb = null;
    this.sqlReadyPromise = null;
    this.activeDatasetKey = "ecommerce";
    this.charts = [];
    this.threeScenes = new Map();
    this.pipelineTimers = new Map();
    this.datasetEngine.loadSeedDataset(this.activeDatasetKey);
  }

  init() {
    this.seedDesktopTelemetry();
    this.bindDock();
    this.renderKpis();
    this.initClock();
    this.initBackground();
    this.initSqlRuntime();
    this.openWindow("dashboard");
    this.openWindow("dataset");
    this.openWindow("ai");
    this.openWindow("terminal");
    window.addEventListener("resize", () => this.handleResize());
  }

  seedDesktopTelemetry() {
    const seed = { dashboards: "92%", ingestion: "88%", forecasting: "84%" };
    Object.entries(seed).forEach(([key, value]) => {
      document.querySelector(`[data-meter="${key}"]`).style.width = value;
    });

    window.setInterval(() => {
      const dashboardValue = `${88 + Math.round(Math.random() * 8)}%`;
      const ingestionValue = `${82 + Math.round(Math.random() * 11)}%`;
      const forecastingValue = `${80 + Math.round(Math.random() * 10)}%`;
      document.getElementById("meter-dashboards").textContent = dashboardValue;
      document.getElementById("meter-ingestion").textContent = ingestionValue;
      document.getElementById("meter-forecasting").textContent = forecastingValue;
      document.querySelector('[data-meter="dashboards"]').style.width = dashboardValue;
      document.querySelector('[data-meter="ingestion"]').style.width = ingestionValue;
      document.querySelector('[data-meter="forecasting"]').style.width = forecastingValue;
    }, 2600);
  }

  initClock() {
    const widgetTime = document.getElementById("widget-time");
    const widgetDate = document.getElementById("widget-date");
    const trayClock = document.getElementById("tray-clock");
    const tick = () => {
      const now = new Date();
      widgetTime.textContent = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
      widgetDate.textContent = now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
      trayClock.textContent = now.toLocaleTimeString("en-US", { hour12: false });
    };
    tick();
    window.setInterval(tick, 1000);
  }

  initBackground() {
    const canvas = document.getElementById("desktop-background");
    const context = canvas.getContext("2d");
    const particles = new Array(90).fill(null).map(() => ({
      x: Math.random(),
      y: Math.random(),
      speed: 0.001 + Math.random() * 0.002,
      radius: 1 + Math.random() * 2.4,
      hue: Math.random() > 0.5 ? "cyan" : "magenta",
    }));

    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };

    const draw = () => {
      resize();
      context.clearRect(0, 0, canvas.width, canvas.height);
      const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, "rgba(0, 255, 255, 0.08)");
      gradient.addColorStop(0.4, "rgba(8, 11, 26, 0.04)");
      gradient.addColorStop(1, "rgba(255, 0, 160, 0.08)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        particle.y += particle.speed;
        if (particle.y > 1.05) {
          particle.y = -0.05;
          particle.x = Math.random();
        }
        const x = particle.x * canvas.width;
        const y = particle.y * canvas.height;
        const color = particle.hue === "cyan" ? "rgba(0, 240, 255, 0.75)" : "rgba(255, 0, 180, 0.6)";
        context.beginPath();
        context.arc(x, y, particle.radius, 0, Math.PI * 2);
        context.fillStyle = color;
        context.shadowBlur = 18;
        context.shadowColor = color;
        context.fill();
        context.shadowBlur = 0;
      });

      for (let index = 0; index < particles.length; index += 1) {
        for (let pointer = index + 1; pointer < particles.length; pointer += 1) {
          const a = particles[index];
          const b = particles[pointer];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 0.12) {
            context.strokeStyle = `rgba(0, 240, 255, ${0.1 - distance / 1.2})`;
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(a.x * canvas.width, a.y * canvas.height);
            context.lineTo(b.x * canvas.width, b.y * canvas.height);
            context.stroke();
          }
        }
      }

      requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
  }

  renderKpis() {
    this.kpiStrip.innerHTML = this.kpis.map((kpi) => `
      <div class="kpi-card ${kpi.accent}" data-kpi-id="${kpi.id}">
        <div class="kpi-card-grid"></div>
        <div class="kpi-card-value">${kpi.value}${kpi.suffix || ""}</div>
        <div class="kpi-card-label">${kpi.label}</div>
        <div class="kpi-card-delta">${kpi.delta} this cycle</div>
      </div>
    `).join("");

    window.setInterval(() => {
      this.kpis = this.kpis.map((kpi) => ({
        ...kpi,
        value: typeof kpi.value === "number" ? Number((kpi.value + (Math.random() - 0.5) * (kpi.id === "projects" ? 0 : 0.8)).toFixed(1)) : kpi.value,
      }));

      [...this.kpiStrip.children].forEach((node, index) => {
        const kpi = this.kpis[index];
        node.querySelector(".kpi-card-value").textContent = `${kpi.value}${kpi.suffix || ""}`;
        node.classList.add("pulse");
        window.setTimeout(() => node.classList.remove("pulse"), 900);
      });
    }, 3600);
  }

  bindDock() {
    document.querySelectorAll(".dock-app").forEach((button) => {
      button.addEventListener("click", () => this.openWindow(button.dataset.app));
    });
  }

  async initSqlRuntime() {
    if (this.sqlReadyPromise) return this.sqlReadyPromise;
    this.sqlReadyPromise = window.initSqlJs({
      locateFile: () => "https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/sql-wasm.wasm",
    }).then((SQL) => {
      this.sqlDb = new SQL.Database();
      this.seedSqlTables();
    });
    return this.sqlReadyPromise;
  }

  seedSqlTables() {
    const statements = [];
    Object.entries(this.datasetEngine.seedDatasets).forEach(([tableName, rows]) => {
      if (!rows.length) return;
      const columns = Object.keys(rows[0]);
      const definitions = columns.map((column) => {
        const numeric = rows.every((row) => typeof row[column] === "number");
        return `"${column}" ${numeric ? "REAL" : "TEXT"}`;
      }).join(", ");
      statements.push(`DROP TABLE IF EXISTS "${tableName}";`);
      statements.push(`CREATE TABLE "${tableName}" (${definitions});`);
      rows.forEach((row) => {
        const values = columns.map((column) => {
          const value = row[column];
          if (typeof value === "number") return value;
          return `'${String(value).replace(/'/g, "''")}'`;
        }).join(", ");
        statements.push(`INSERT INTO "${tableName}" (${columns.map((column) => `"${column}"`).join(", ")}) VALUES (${values});`);
      });
    });
    this.sqlDb.run(statements.join("\n"));
  }

  handleResize() {
    this.windows.forEach(({ node }) => {
      const bounds = node.getBoundingClientRect();
      if (bounds.right > window.innerWidth) node.style.left = `${window.innerWidth - bounds.width - 24}px`;
      if (bounds.bottom > window.innerHeight - 44) node.style.top = `${window.innerHeight - bounds.height - 60}px`;
    });
    this.resizeActiveCharts();
    this.threeScenes.forEach((sceneRef) => sceneRef.resize());
  }

  resizeActiveCharts() {
    this.charts.forEach((chart) => {
      if (chart && typeof chart.resize === "function") chart.resize();
    });
  }

  getWindowDescriptor(app) {
    return {
      dashboard: { id: "dashboard", title: "BI Dashboard Center", subtitle: "Embedded Tableau analytics", width: 880, height: 620, x: 110, y: 56 },
      dataset: { id: "dataset", title: "Dataset Analyzer", subtitle: "Ingestion, statistics, charts", width: 920, height: 660, x: 185, y: 88 },
      sql: { id: "sql", title: "SQL Query Console", subtitle: "Browser SQLite analytics", width: 860, height: 560, x: 220, y: 126 },
      ai: { id: "ai", title: "NEXUS AI", subtitle: "Analytics assistant", width: 860, height: 580, x: 260, y: 90 },
      pipeline: { id: "pipeline", title: "Data Pipeline Visualizer", subtitle: "Animated workflow telemetry", width: 760, height: 510, x: 250, y: 120 },
      visuals: { id: "visuals", title: "3D Analytics Visualization", subtitle: "Three.js scatter and KPI cube", width: 820, height: 570, x: 240, y: 70 },
      projects: { id: "projects", title: "Projects Database", subtitle: "Portfolio intelligence", width: 820, height: 540, x: 205, y: 92 },
      terminal: { id: "terminal", title: "Terminal Console", subtitle: "Unix-style command center", width: 760, height: 440, x: 300, y: 180 },
    }[app];
  }

  openWindow(app) {
    const descriptor = this.getWindowDescriptor(app);
    if (!descriptor) return;
    if (this.windows.has(descriptor.id)) {
      const existing = this.windows.get(descriptor.id);
      existing.node.classList.remove("minimized");
      this.focusWindow(descriptor.id);
      return;
    }

    const fragment = this.windowTemplate.content.cloneNode(true);
    const node = fragment.querySelector("[data-window]");
    const body = fragment.querySelector("[data-window-body]");
    fragment.querySelector("[data-window-title]").textContent = descriptor.title;
    fragment.querySelector("[data-window-subtitle]").textContent = descriptor.subtitle;
    node.dataset.windowId = descriptor.id;
    node.id = `${descriptor.id}-${this.windowCounter += 1}`;
    node.style.width = `${descriptor.width}px`;
    node.style.height = `${descriptor.height}px`;
    node.style.left = `${descriptor.x}px`;
    node.style.top = `${descriptor.y}px`;
    node.style.zIndex = `${this.zIndex += 1}`;
    body.innerHTML = this.renderAppBody(descriptor.id);
    this.windowLayer.appendChild(fragment);
    const insertedNode = this.windowLayer.lastElementChild;
    this.installWindowBehavior(insertedNode, descriptor);
    this.windows.set(descriptor.id, { id: descriptor.id, node: insertedNode, descriptor });
    this.createTaskbarButton(descriptor);
    this.bindApp(descriptor.id, insertedNode);
    this.focusWindow(descriptor.id);
  }

  renderAppBody(app) {
    switch (app) {
      case "dashboard": return this.tableauEmbed.render();
      case "dataset": return this.renderDatasetAnalyzer();
      case "sql": return this.renderSqlConsole();
      case "ai": return this.renderAiAssistant();
      case "pipeline": return this.renderPipelineVisualizer();
      case "visuals": return this.renderVisualsApp();
      case "projects": return this.renderProjectsDatabase();
      case "terminal": return new TerminalConsole().render();
      default: return '<div class="empty-state">Unknown app</div>';
    }
  }
  installWindowBehavior(node, descriptor) {
    const dragHandle = node.querySelector("[data-drag-handle]");
    const resizeHandle = node.querySelector("[data-resize-handle]");
    const controls = node.querySelectorAll("[data-action]");

    dragHandle.addEventListener("pointerdown", (event) => {
      if (event.target.closest("[data-action]")) return;
      this.focusWindow(descriptor.id);
      const originRect = node.getBoundingClientRect();
      const offsetX = event.clientX - originRect.left;
      const offsetY = event.clientY - originRect.top;
      const onMove = (moveEvent) => {
        node.style.left = `${clamp(moveEvent.clientX - offsetX, 74, window.innerWidth - 220)}px`;
        node.style.top = `${clamp(moveEvent.clientY - offsetY, 16, window.innerHeight - 200)}px`;
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    });

    resizeHandle.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      this.focusWindow(descriptor.id);
      const rect = node.getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;
      const startWidth = rect.width;
      const startHeight = rect.height;
      const onMove = (moveEvent) => {
        node.style.width = `${clamp(startWidth + moveEvent.clientX - startX, 420, window.innerWidth - rect.left - 24)}px`;
        node.style.height = `${clamp(startHeight + moveEvent.clientY - startY, 220, window.innerHeight - rect.top - 56)}px`;
        this.resizeActiveCharts();
        this.threeScenes.forEach((sceneRef) => sceneRef.resize());
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    });

    node.addEventListener("pointerdown", () => this.focusWindow(descriptor.id));
    controls.forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.action;
        if (action === "close") this.closeWindow(descriptor.id);
        if (action === "minimize") {
          node.classList.toggle("minimized");
          this.syncTaskbarState();
        }
        if (action === "maximize") node.classList.toggle("maximized");
      });
    });
  }

  createTaskbarButton(descriptor) {
    const button = document.createElement("button");
    button.className = "taskbar-app active";
    button.dataset.windowTask = descriptor.id;
    button.innerHTML = `<span class="taskbar-app-dot"></span><span>${descriptor.title}</span>`;
    button.addEventListener("click", () => {
      const record = this.windows.get(descriptor.id);
      if (!record) return;
      record.node.classList.toggle("minimized");
      if (!record.node.classList.contains("minimized")) this.focusWindow(descriptor.id);
      this.syncTaskbarState();
    });
    this.taskbarApps.appendChild(button);
  }

  syncTaskbarState() {
    this.taskbarApps.querySelectorAll("[data-window-task]").forEach((button) => {
      const record = this.windows.get(button.dataset.windowTask);
      button.classList.toggle("active", Boolean(record) && !record.node.classList.contains("minimized"));
    });
  }

  focusWindow(id) {
    this.windows.forEach((record, key) => {
      const focused = key === id;
      record.node.classList.toggle("focused", focused);
      if (focused) record.node.style.zIndex = `${this.zIndex += 1}`;
    });
    this.syncTaskbarState();
  }

  closeWindow(id) {
    const record = this.windows.get(id);
    if (!record) return;
    if (id === "visuals") this.destroyThreeScene(id);
    if (id === "pipeline") window.clearInterval(this.pipelineTimers.get(id));
    record.node.remove();
    this.windows.delete(id);
    this.taskbarApps.querySelector(`[data-window-task="${id}"]`)?.remove();
  }

  bindApp(app, node) {
    if (app === "dashboard") this.tableauEmbed.bind(node);
    if (app === "dataset") this.bindDatasetAnalyzer(node);
    if (app === "sql") this.bindSqlConsole(node);
    if (app === "ai") this.bindAiAssistant(node);
    if (app === "pipeline") this.bindPipelineVisualizer(node, app);
    if (app === "visuals") this.bindVisualsApp(node, app);
    if (app === "projects") this.bindProjects(node);
    if (app === "terminal") this.bindTerminal(node);
  }

  renderDatasetAnalyzer() {
    const dataset = this.datasetEngine.getCurrentDataset();
    const schemaMarkup = (dataset?.schema || []).map((column) => `
      <div class="schema-card">
        <div class="schema-column">${column.column}</div>
        <div class="schema-meta"><span>${column.type}</span><span>${Math.round(column.completeness * 100)}% filled</span><span>${column.distinct} distinct</span></div>
      </div>
    `).join("");

    const previewRows = dataset?.preview || [];
    const headers = previewRows.length ? Object.keys(previewRows[0]).map((key) => `<th>${key}</th>`).join("") : "";
    const rows = previewRows.map((row) => `<tr>${Object.values(row).map((value) => `<td>${value}</td>`).join("")}</tr>`).join("");

    return `
      <div class="dataset-workstation">
        <div class="panel-heading">
          <div>
            <div class="section-kicker">Dataset Analytics Engine</div>
            <h1>INGEST. PROFILE. VISUALIZE.</h1>
            <p>Upload CSV, Excel, or JSON to trigger data ingestion, column detection, summary statistics, and chart generation.</p>
          </div>
          <div class="panel-actions">
            <label class="button button-cyan file-button">Upload dataset<input type="file" data-upload-input accept=".csv,.json,.xlsx,.xls"></label>
            <button class="button button-magenta" data-load-seed="flights">Flights</button>
            <button class="button button-violet" data-load-seed="ecommerce">Commerce</button>
            <button class="button button-green" data-load-seed="retail">Retail</button>
          </div>
        </div>
        <div class="analytics-summary-grid">
          <div class="analytics-summary-card"><span class="summary-label">Rows</span><strong data-summary-rows>${dataset?.rowCount || 0}</strong></div>
          <div class="analytics-summary-card"><span class="summary-label">Columns</span><strong data-summary-columns>${dataset?.columnCount || 0}</strong></div>
          <div class="analytics-summary-card"><span class="summary-label">Primary metric</span><strong data-summary-metric>${dataset?.columns.primaryMetric || "N/A"}</strong></div>
          <div class="analytics-summary-card"><span class="summary-label">Primary dimension</span><strong data-summary-dimension>${dataset?.columns.primaryDimension || "N/A"}</strong></div>
        </div>
        <div class="dataset-layout">
          <div class="dataset-left-column">
            <section class="panel-block">
              <div class="block-heading"><h2>Column detection</h2><span>Automated schema mapping</span></div>
              <div class="schema-grid" data-schema-grid>${schemaMarkup}</div>
            </section>
            <section class="panel-block">
              <div class="block-heading"><h2>Summary statistics</h2><span>Key metrics and data quality</span></div>
              <div class="summary-lines" data-summary-lines>${this.datasetEngine.describeDataset(dataset).map((line) => `<div class="summary-line">${line}</div>`).join("")}</div>
            </section>
            <section class="panel-block">
              <div class="block-heading"><h2>Dataset preview</h2><span>First records sampled</span></div>
              <div class="table-shell"><table class="data-table" data-preview-table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>
            </section>
          </div>
          <div class="dataset-chart-column">
            <section class="panel-block">
              <div class="block-heading"><h2>Generated charts</h2><span>Histogram, scatter, box, heatmap, time series</span></div>
              <div class="chart-grid">
                <div class="chart-card"><canvas data-chart="histogram"></canvas></div>
                <div class="chart-card"><canvas data-chart="scatter"></canvas></div>
                <div class="chart-card"><div class="echart-host" data-echart="box"></div></div>
                <div class="chart-card"><div class="echart-host" data-echart="heatmap"></div></div>
                <div class="chart-card chart-card-wide"><canvas data-chart="timeseries"></canvas></div>
              </div>
            </section>
          </div>
        </div>
      </div>
    `;
  }

  bindDatasetAnalyzer(node) {
    const uploadInput = node.querySelector("[data-upload-input]");
    const seedButtons = node.querySelectorAll("[data-load-seed]");
    const refresh = (dataset) => {
      node.querySelector("[data-summary-rows]").textContent = dataset.rowCount;
      node.querySelector("[data-summary-columns]").textContent = dataset.columnCount;
      node.querySelector("[data-summary-metric]").textContent = dataset.columns.primaryMetric || "N/A";
      node.querySelector("[data-summary-dimension]").textContent = dataset.columns.primaryDimension || "N/A";
      node.querySelector("[data-schema-grid]").innerHTML = dataset.schema.map((column) => `
        <div class="schema-card">
          <div class="schema-column">${column.column}</div>
          <div class="schema-meta"><span>${column.type}</span><span>${Math.round(column.completeness * 100)}% filled</span><span>${column.distinct} distinct</span></div>
        </div>
      `).join("");
      node.querySelector("[data-summary-lines]").innerHTML = this.datasetEngine.describeDataset(dataset).map((line) => `<div class="summary-line">${line}</div>`).join("");
      const previewTable = node.querySelector("[data-preview-table]");
      const preview = dataset.preview;
      previewTable.querySelector("thead").innerHTML = preview.length ? `<tr>${Object.keys(preview[0]).map((key) => `<th>${key}</th>`).join("")}</tr>` : "";
      previewTable.querySelector("tbody").innerHTML = preview.map((row) => `<tr>${Object.values(row).map((value) => `<td>${value}</td>`).join("")}</tr>`).join("");
      this.renderDatasetCharts(node, dataset);
      this.refreshAiWindow();
      this.refreshSqlWindowStatus();
    };

    uploadInput.addEventListener("change", async (event) => {
      const [file] = event.target.files;
      if (!file) return;
      const dataset = await this.datasetEngine.loadFile(file);
      this.activeDatasetKey = file.name;
      refresh(dataset);
    });

    seedButtons.forEach((button) => {
      button.addEventListener("click", () => {
        this.activeDatasetKey = button.dataset.loadSeed;
        refresh(this.datasetEngine.loadSeedDataset(button.dataset.loadSeed));
      });
    });

    if (this.datasetEngine.getCurrentDataset()) this.renderDatasetCharts(node, this.datasetEngine.getCurrentDataset());
  }
  destroyChartsIn(node) {
    this.charts = this.charts.filter((chart) => {
      const target = chart?.canvas || chart?.getDom?.();
      if (target && node.contains(target)) {
        chart.destroy?.();
        return false;
      }
      return true;
    });
  }

  renderDatasetCharts(node, dataset) {
    this.destroyChartsIn(node);
    const recommendations = this.datasetEngine.getChartRecommendations(dataset);
    if (!recommendations) return;

    const histogramCanvas = node.querySelector('[data-chart="histogram"]');
    const scatterCanvas = node.querySelector('[data-chart="scatter"]');
    const timeCanvas = node.querySelector('[data-chart="timeseries"]');
    const boxHost = node.querySelector('[data-echart="box"]');
    const heatmapHost = node.querySelector('[data-echart="heatmap"]');

    if (recommendations.histogram) {
      const values = recommendations.histogram.values;
      const bins = 6;
      const min = Math.min(...values);
      const max = Math.max(...values);
      const step = (max - min || 1) / bins;
      const labels = [];
      const totals = new Array(bins).fill(0);
      for (let index = 0; index < bins; index += 1) labels.push(`${Math.round(min + index * step)}-${Math.round(min + (index + 1) * step)}`);
      values.forEach((value) => totals[Math.min(bins - 1, Math.floor((value - min) / (step || 1)))] += 1);
      const chart = new window.Chart(histogramCanvas, {
        type: "bar",
        data: { labels, datasets: [{ label: recommendations.histogram.metric, data: totals, backgroundColor: "rgba(0, 240, 255, 0.45)", borderColor: "rgba(0, 240, 255, 0.95)", borderWidth: 1.5 }] },
        options: this.chartOptions("Histogram"),
      });
      this.charts.push(chart);
    }

    if (recommendations.scatter) {
      const chart = new window.Chart(scatterCanvas, {
        type: "scatter",
        data: { datasets: [{ label: `${recommendations.scatter.x} vs ${recommendations.scatter.y}`, data: recommendations.scatter.points.map(([x, y]) => ({ x, y })), backgroundColor: "rgba(255, 0, 180, 0.6)", borderColor: "rgba(255, 0, 180, 0.9)" }] },
        options: this.chartOptions("Scatter"),
      });
      this.charts.push(chart);
    }

    if (recommendations.timeSeries) {
      const chart = new window.Chart(timeCanvas, {
        type: "line",
        data: {
          labels: recommendations.timeSeries.series.map((item) => item.label),
          datasets: [{ label: recommendations.timeSeries.metric, data: recommendations.timeSeries.series.map((item) => item.value), borderColor: "rgba(164, 93, 255, 1)", backgroundColor: "rgba(164, 93, 255, 0.22)", fill: true, tension: 0.35 }],
        },
        options: this.chartOptions("Time Series"),
      });
      this.charts.push(chart);
    }

    if (recommendations.box) {
      const ordered = [...recommendations.box.values].sort((a, b) => a - b);
      const chart = window.echarts.init(boxHost);
      chart.setOption({
        backgroundColor: "transparent",
        xAxis: { type: "category", data: [recommendations.box.metric], axisLabel: { color: "#9ec8d8" } },
        yAxis: { type: "value", axisLabel: { color: "#9ec8d8" }, splitLine: { lineStyle: { color: "rgba(0,240,255,0.08)" } } },
        series: [{ type: "boxplot", data: [[ordered[0], Statistics.quantile(ordered, 0.25), Statistics.median(ordered), Statistics.quantile(ordered, 0.75), ordered[ordered.length - 1]]], itemStyle: { color: "rgba(255,0,180,0.15)", borderColor: "#ff4bd1" } }],
      });
      this.charts.push(chart);
    }

    if (recommendations.heatmap) {
      const heatmapData = [];
      recommendations.heatmap.matrix.forEach((row, rowIndex) => row.forEach((value, columnIndex) => heatmapData.push([columnIndex, rowIndex, value])));
      const chart = window.echarts.init(heatmapHost);
      chart.setOption({
        backgroundColor: "transparent",
        xAxis: { type: "category", data: recommendations.heatmap.columns, axisLabel: { color: "#9ec8d8", rotate: 20 } },
        yAxis: { type: "category", data: recommendations.heatmap.columns, axisLabel: { color: "#9ec8d8" } },
        visualMap: { min: -1, max: 1, calculable: false, orient: "horizontal", left: "center", bottom: 0, textStyle: { color: "#9ec8d8" }, inRange: { color: ["#ff0080", "#1a2440", "#00f0ff"] } },
        series: [{ type: "heatmap", data: heatmapData, label: { show: true, color: "#e8fcff" } }],
      });
      this.charts.push(chart);
    }
  }

  chartOptions(title) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: { display: true, text: title, color: "#ecfeff", font: { family: "Orbitron", size: 12 } },
        legend: { labels: { color: "#9ec8d8" } },
      },
      scales: {
        x: { ticks: { color: "#9ec8d8" }, grid: { color: "rgba(0,240,255,0.06)" } },
        y: { ticks: { color: "#9ec8d8" }, grid: { color: "rgba(0,240,255,0.06)" } },
      },
    };
  }

  renderSqlConsole() {
    return `
      <div class="sql-workstation">
        <div class="panel-heading">
          <div>
            <div class="section-kicker">SQL Query Console</div>
            <h1>IN-BROWSER SQLITE ANALYTICS</h1>
            <p>Run live SQL against seeded analytics tables and transform results into operational charts.</p>
          </div>
          <div class="panel-badges">
            <span class="badge badge-cyan">SQLite</span>
            <span class="badge badge-magenta">Chart output</span>
            <span class="badge badge-violet" data-sql-status>Initializing</span>
          </div>
        </div>
        <div class="sql-layout">
          <div class="sql-editor-card">
            <div class="block-heading"><h2>Query editor</h2><span>Tables: flights, ecommerce, gym, retail</span></div>
            <textarea class="sql-editor" data-sql-input>SELECT category, SUM(revenue) AS total_revenue
FROM ecommerce
GROUP BY category
ORDER BY total_revenue DESC;</textarea>
            <div class="sql-actions">
              <button class="button button-cyan" data-run-sql>Run query</button>
              <button class="button button-magenta" data-load-query="SELECT AVG(price) AS avg_price FROM flights;">SELECT AVG(price)</button>
              <button class="button button-violet" data-load-query="SELECT airline, COUNT(*) AS flights_count FROM flights GROUP BY airline;">SELECT airline, COUNT(*)</button>
              <button class="button button-green" data-load-query="SELECT category, SUM(revenue) AS revenue FROM ecommerce GROUP BY category;">SELECT category, SUM(revenue)</button>
            </div>
          </div>
          <div class="sql-results-card">
            <div class="block-heading"><h2>Results</h2><span>Tabular and chart views</span></div>
            <div class="sql-result-table" data-sql-table></div>
            <div class="chart-card sql-chart-card"><canvas data-sql-chart></canvas></div>
          </div>
        </div>
      </div>
    `;
  }

  bindSqlConsole(node) {
    const input = node.querySelector("[data-sql-input]");
    const tableNode = node.querySelector("[data-sql-table]");
    const chartCanvas = node.querySelector("[data-sql-chart]");
    const statusNode = node.querySelector("[data-sql-status]");
    let sqlChart = null;

    const renderResult = (rows) => {
      if (!rows || !rows.length) {
        tableNode.innerHTML = '<div class="empty-state">Query executed. No rows returned.</div>';
        sqlChart?.destroy();
        return;
      }
      const columns = Object.keys(rows[0]);
      tableNode.innerHTML = `<table class="data-table"><thead><tr>${columns.map((column) => `<th>${column}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${columns.map((column) => `<td>${row[column]}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
      const numericColumns = columns.filter((column) => rows.every((row) => typeof row[column] === "number" || !Number.isNaN(Number(row[column]))));
      const categoryColumn = columns.find((column) => !numericColumns.includes(column));
      if (categoryColumn && numericColumns[0]) {
        sqlChart?.destroy();
        sqlChart = new window.Chart(chartCanvas, {
          type: "bar",
          data: { labels: rows.map((row) => row[categoryColumn]), datasets: [{ label: numericColumns[0], data: rows.map((row) => Number(row[numericColumns[0]])), borderColor: "rgba(0,240,255,1)", backgroundColor: "rgba(0,240,255,0.35)", borderWidth: 1.5 }] },
          options: this.chartOptions("SQL chart"),
        });
        this.charts.push(sqlChart);
      }
    };

    const execute = async () => {
      await this.initSqlRuntime();
      statusNode.textContent = "Ready";
      try {
        const statement = this.sqlDb.exec(input.value);
        const [firstResult] = statement;
        if (!firstResult) return renderResult([]);
        const rows = firstResult.values.map((values) => Object.fromEntries(firstResult.columns.map((column, index) => [column, values[index]])));
        renderResult(rows);
      } catch (error) {
        tableNode.innerHTML = `<div class="empty-state error">SQL error: ${error.message}</div>`;
      }
    };

    node.querySelector("[data-run-sql]").addEventListener("click", execute);
    node.querySelectorAll("[data-load-query]").forEach((button) => button.addEventListener("click", () => {
      input.value = button.dataset.loadQuery;
      execute();
    }));

    this.initSqlRuntime().then(() => {
      statusNode.textContent = "Ready";
      execute();
    });
  }

  refreshSqlWindowStatus() {
    const sqlWindow = this.windows.get("sql");
    if (sqlWindow) sqlWindow.node.querySelector("[data-sql-status]")?.classList.add("badge-live");
  }
  renderAiAssistant() {
    const insights = this.insightEngine.generateInsights(this.datasetEngine.getCurrentDataset());
    return `
      <div class="ai-workstation">
        <div class="panel-heading">
          <div>
            <div class="section-kicker">AI Analytics Assistant</div>
            <h1>NEXUS AI</h1>
            <p>Explain dataset insights, detect correlations, suggest KPIs, forecast trends, and generate executive summaries.</p>
          </div>
          <div class="panel-badges"><span class="badge badge-magenta">Correlation scanner</span><span class="badge badge-cyan">Executive summary</span><span class="badge badge-violet">KPI strategist</span></div>
        </div>
        <div class="ai-layout">
          <div class="ai-ring-panel">
            <div class="ai-ring-shell"><div class="ai-ring"></div><div class="ai-ring-inner"></div><div class="ai-ring-core"><span>NEXUS</span><strong>AI</strong></div></div>
            <div class="ai-button-stack">
              <button class="button button-cyan" data-ai-action="analyze">Analyze dataset</button>
              <button class="button button-magenta" data-ai-action="insights">Generate insights</button>
              <button class="button button-violet" data-ai-action="forecast">Forecast trends</button>
              <button class="button button-green" data-ai-action="summary">Create executive summary</button>
            </div>
          </div>
          <div class="ai-report-panel">
            <div class="ai-report-card"><div class="block-heading"><h2 data-ai-headline>${insights.headline}</h2><span>Live synthesis</span></div><p class="ai-summary" data-ai-summary>${insights.summary}</p><div class="insight-list" data-ai-bullets>${insights.bullets.map((bullet) => `<div class="insight-item">${bullet}</div>`).join("")}</div></div>
            <div class="ai-kpi-grid" data-ai-kpis>${insights.kpis.map((kpi) => `<div class="ai-kpi-card ${kpi.accent}"><span>${kpi.label}</span><strong>${kpi.value}</strong></div>`).join("")}</div>
            <div class="ai-report-card"><div class="block-heading"><h2>Suggested KPIs</h2><span>Operational next steps</span></div><div class="kpi-suggestion-list" data-ai-suggestions>${insights.suggestedKPIs.map((item) => `<span class="suggestion-chip">${item}</span>`).join("")}</div></div>
            <div class="ai-report-card"><div class="block-heading"><h2>Executive Summary</h2><span>Board-ready narrative</span></div><p class="executive-summary" data-ai-executive>${insights.executiveSummary}</p></div>
          </div>
        </div>
      </div>
    `;
  }

  bindAiAssistant(node) {
    const refresh = (mode = "analyze") => {
      const insights = this.insightEngine.generateInsights(this.datasetEngine.getCurrentDataset());
      const summaryLookup = {
        analyze: insights.summary,
        insights: insights.bullets.join(" "),
        forecast: insights.bullets.find((line) => line.includes("Trend")) || insights.summary,
        summary: insights.executiveSummary,
      };
      node.querySelector("[data-ai-headline]").textContent = insights.headline;
      node.querySelector("[data-ai-summary]").textContent = summaryLookup[mode];
      node.querySelector("[data-ai-bullets]").innerHTML = insights.bullets.map((bullet) => `<div class="insight-item">${bullet}</div>`).join("");
      node.querySelector("[data-ai-kpis]").innerHTML = insights.kpis.map((kpi) => `<div class="ai-kpi-card ${kpi.accent}"><span>${kpi.label}</span><strong>${kpi.value}</strong></div>`).join("");
      node.querySelector("[data-ai-suggestions]").innerHTML = insights.suggestedKPIs.map((item) => `<span class="suggestion-chip">${item}</span>`).join("");
      node.querySelector("[data-ai-executive]").textContent = insights.executiveSummary;
    };
    node.querySelectorAll("[data-ai-action]").forEach((button) => button.addEventListener("click", () => refresh(button.dataset.aiAction)));
  }

  refreshAiWindow() {
    const aiWindow = this.windows.get("ai");
    if (!aiWindow) return;
    aiWindow.node.querySelector('[data-ai-action="analyze"]')?.click();
  }

  renderPipelineVisualizer() {
    return `
      <div class="pipeline-workstation">
        <div class="panel-heading">
          <div>
            <div class="section-kicker">Pipeline Visualizer</div>
            <h1>DATA PIPELINE FLOW</h1>
            <p>Animate each stage from ingestion to business insight, simulating a real analytics operating chain.</p>
          </div>
          <div class="panel-badges"><span class="badge badge-cyan">Streaming stages</span><span class="badge badge-green">Telemetry active</span></div>
        </div>
        <div class="pipeline-stage-stack" data-pipeline-stages>
          ${["DATA SOURCES", "DATA CLEANING", "EDA", "STATISTICAL ANALYSIS", "VISUALIZATION", "BUSINESS INSIGHT"].map((stage, index) => `
            <div class="pipeline-stage ${index === 0 ? "active" : ""}" data-stage-index="${index}">
              <div class="pipeline-stage-node">${stage}</div>
              ${index < 5 ? '<div class="pipeline-connector"></div>' : ""}
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  bindPipelineVisualizer(node, id) {
    const stages = [...node.querySelectorAll(".pipeline-stage")];
    let activeIndex = 0;
    const timer = window.setInterval(() => {
      stages.forEach((stage, index) => stage.classList.toggle("active", index === activeIndex));
      activeIndex = (activeIndex + 1) % stages.length;
    }, 1400);
    this.pipelineTimers.set(id, timer);
  }

  renderVisualsApp() {
    return `
      <div class="visuals-workstation">
        <div class="panel-heading">
          <div>
            <div class="section-kicker">3D Analytics Visualization</div>
            <h1>IMMERSIVE KPI SPACE</h1>
            <p>Navigate a Three.js scene containing a 3D scatter plot, network graph, and rotating KPI cube.</p>
          </div>
          <div class="panel-badges"><span class="badge badge-cyan">Zoom enabled</span><span class="badge badge-magenta">Rotation enabled</span><span class="badge badge-violet">3D scatter</span></div>
        </div>
        <div class="visuals-layout">
          <div class="three-stage" data-three-stage></div>
          <div class="visuals-legend">
            <div class="legend-card"><strong>3D Scatter Plot</strong><span>Data points plot metric interplay in volumetric space.</span></div>
            <div class="legend-card"><strong>Network Graph</strong><span>Nodes show KPI dependencies and linked signals.</span></div>
            <div class="legend-card"><strong>Rotating KPI Cube</strong><span>A persistent centerpiece reflecting analytics stability.</span></div>
          </div>
        </div>
      </div>
    `;
  }

  bindVisualsApp(node, sceneKey) {
    const container = node.querySelector("[data-three-stage]");
    const scene = new window.THREE.Scene();
    scene.background = new window.THREE.Color("#09101f");
    const camera = new window.THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 10, 30);
    const renderer = new window.THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    scene.add(new window.THREE.AmbientLight(0x77ffff, 0.9));
    const point = new window.THREE.PointLight(0xff44dd, 2.1, 180);
    point.position.set(10, 10, 12);
    scene.add(point);
    scene.add(new window.THREE.GridHelper(40, 20, 0x00f0ff, 0x10263f));

    const dataset = this.datasetEngine.getCurrentDataset()?.rows || [];
    const group = new window.THREE.Group();
    dataset.slice(0, 40).forEach((row, index) => {
      const values = Object.values(row).map((value) => (typeof value === "number" ? value : Number(value))).filter((value) => Number.isFinite(value));
      const mesh = new window.THREE.Mesh(
        new window.THREE.SphereGeometry(0.35, 24, 24),
        new window.THREE.MeshStandardMaterial({ color: index % 2 === 0 ? 0x00f0ff : 0xff4bd1, emissive: index % 2 === 0 ? 0x003844 : 0x420024 }),
      );
      mesh.position.set((values[0] || index) * 0.03 - 8, (values[1] || index) * 0.03 - 4, (values[2] || index) * 0.03 - 8);
      group.add(mesh);
    });
    scene.add(group);

    const nodes = [];
    for (let index = 0; index < 6; index += 1) {
      const mesh = new window.THREE.Mesh(new window.THREE.IcosahedronGeometry(0.45, 0), new window.THREE.MeshStandardMaterial({ color: 0x9d6cff, emissive: 0x250d5a }));
      mesh.position.set(Math.cos(index) * 5, Math.sin(index * 1.6) * 3 + 4, Math.sin(index) * 5);
      nodes.push(mesh);
      scene.add(mesh);
    }
    nodes.forEach((mesh, index) => {
      const next = nodes[(index + 1) % nodes.length];
      const geometry = new window.THREE.BufferGeometry().setFromPoints([mesh.position, next.position]);
      scene.add(new window.THREE.Line(geometry, new window.THREE.LineBasicMaterial({ color: 0x00f0ff })));
    });

    const cube = new window.THREE.Mesh(new window.THREE.BoxGeometry(3.8, 3.8, 3.8), new window.THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x032d32, metalness: 0.55, roughness: 0.2, transparent: true, opacity: 0.82 }));
    cube.position.set(9, 4, 0);
    scene.add(cube);

    let rotationX = 0.2;
    let rotationY = 0.3;
    let isDragging = false;
    let pointerStart = null;
    renderer.domElement.addEventListener("pointerdown", (event) => { isDragging = true; pointerStart = { x: event.clientX, y: event.clientY }; });
    window.addEventListener("pointerup", () => { isDragging = false; });
    window.addEventListener("pointermove", (event) => {
      if (!isDragging || !pointerStart) return;
      rotationY += (event.clientX - pointerStart.x) * 0.002;
      rotationX += (event.clientY - pointerStart.y) * 0.002;
      pointerStart = { x: event.clientX, y: event.clientY };
    });
    renderer.domElement.addEventListener("wheel", (event) => {
      event.preventDefault();
      camera.position.z = clamp(camera.position.z + event.deltaY * 0.01, 18, 60);
    });

    const animate = () => {
      const sceneRef = this.threeScenes.get(sceneKey);
      if (!sceneRef) return;
      group.rotation.y += 0.004;
      group.rotation.x = rotationX;
      nodes.forEach((mesh, index) => { mesh.position.y += Math.sin(Date.now() * 0.0015 + index) * 0.01; });
      cube.rotation.x += 0.009;
      cube.rotation.y += 0.01;
      scene.rotation.y = rotationY;
      renderer.render(scene, camera);
      sceneRef.frame = requestAnimationFrame(animate);
    };

    const resize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    this.threeScenes.set(sceneKey, { renderer, frame: null, resize });
    animate();
  }

  destroyThreeScene(sceneKey) {
    const sceneRef = this.threeScenes.get(sceneKey);
    if (!sceneRef) return;
    cancelAnimationFrame(sceneRef.frame);
    sceneRef.renderer.dispose();
    this.threeScenes.delete(sceneKey);
  }
  renderProjectsDatabase() {
    return `
      <div class="projects-workstation">
        <div class="panel-heading">
          <div>
            <div class="section-kicker">Project Database</div>
            <h1>PORTFOLIO INTELLIGENCE GRID</h1>
            <p>Explore analytics projects, linked dashboards, supporting tools, and domain-specific business cases.</p>
          </div>
          <div class="panel-badges"><span class="badge badge-cyan">Portfolio</span><span class="badge badge-magenta">Dashboard links</span><span class="badge badge-green">Data-ready</span></div>
        </div>
        <div class="projects-grid">
          ${this.projects.map((project) => `
            <article class="project-card" data-project-card="${project.datasetKey}">
              <div class="project-card-topline">${project.dashboard}</div>
              <h2>${project.name}</h2>
              <p>${project.description}</p>
              <div class="tool-chip-row">${project.tools.map((tool) => `<span class="tool-chip">${tool}</span>`).join("")}</div>
              <div class="project-card-actions">
                <button class="button button-cyan" data-project-open="${project.datasetKey}">Load dataset</button>
                <button class="button button-magenta" data-project-dashboard>Open dashboard</button>
              </div>
            </article>
          `).join("")}
        </div>
      </div>
    `;
  }

  bindProjects(node) {
    node.querySelectorAll("[data-project-open]").forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.dataset.projectOpen;
        this.datasetEngine.loadSeedDataset(key);
        this.activeDatasetKey = key;
        this.openWindow("dataset");
        this.windows.get("dataset")?.node.querySelector(`[data-load-seed="${key}"]`)?.click();
        this.openWindow("ai");
        this.refreshAiWindow();
      });
    });
    node.querySelectorAll("[data-project-dashboard]").forEach((button) => button.addEventListener("click", () => this.openWindow("dashboard")));
  }

  bindTerminal(node) {
    const terminal = new TerminalConsole({
      onCommand: (normalized) => {
        if (normalized === "open dashboard") {
          this.openWindow("dashboard");
          return "BI Dashboard Center opened.";
        }
        if (normalized === "show projects") {
          this.openWindow("projects");
          return "Projects Database opened.";
        }
        if (normalized === "run analysis") {
          this.openWindow("dataset");
          this.openWindow("ai");
          this.refreshAiWindow();
          return this.datasetEngine.describeDataset(this.datasetEngine.getCurrentDataset());
        }
        if (normalized === "load dataset") {
          this.openWindow("dataset");
          return "Dataset Analyzer opened. Upload a CSV, Excel, or JSON file.";
        }
        if (normalized === "generate report") {
          this.openWindow("ai");
          const report = this.insightEngine.generateInsights(this.datasetEngine.getCurrentDataset());
          return [report.headline, report.executiveSummary];
        }
        if (normalized === "open sql") {
          this.openWindow("sql");
          return "SQL Query Console opened.";
        }
        if (normalized === "open ai") {
          this.openWindow("ai");
          return "NEXUS AI opened.";
        }
        return null;
      },
    });
    terminal.bind(node);
  }
}
