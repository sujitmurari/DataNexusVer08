import { Statistics } from "./statistics.js";

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function normalizeRow(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key.trim(), typeof value === "string" ? value.trim() : value]));
}

function inferSchema(rows) {
  const columns = Object.keys(rows[0] || {});
  return columns.map((column) => {
    const values = rows.map((row) => row[column]);
    const type = Statistics.inferDataType(values);
    return {
      column,
      type,
      completeness: values.filter((value) => value !== "" && value !== null && value !== undefined).length / Math.max(values.length, 1),
      distinct: Statistics.unique(values).length,
      profile: type === "number" ? Statistics.numericProfile(values) : Statistics.categoryProfile(values),
    };
  });
}

function chooseColumns(schema) {
  const numericColumns = schema.filter((item) => item.type === "number").map((item) => item.column);
  const categoryColumns = schema.filter((item) => item.type === "category").map((item) => item.column);
  const dateColumns = schema.filter((item) => item.type === "date").map((item) => item.column);
  return {
    numericColumns,
    categoryColumns,
    dateColumns,
    primaryMetric: numericColumns[0] || null,
    secondaryMetric: numericColumns[1] || numericColumns[0] || null,
    primaryDimension: categoryColumns[0] || dateColumns[0] || null,
    primaryTime: dateColumns[0] || null,
  };
}

function summarizeDataset(rows, schema) {
  const columns = chooseColumns(schema);
  return {
    rows,
    rowCount: rows.length,
    columnCount: schema.length,
    schema,
    columns,
    correlationMatrix: Statistics.buildCorrelationMatrix(rows, columns.numericColumns.slice(0, 6)),
    preview: rows.slice(0, 8),
  };
}

function parseCsvText(text) {
  return window.Papa.parse(text, { header: true, skipEmptyLines: true }).data.map(normalizeRow);
}

function parseJsonText(text) {
  const parsed = JSON.parse(text);
  if (Array.isArray(parsed)) return parsed.map(normalizeRow);
  if (Array.isArray(parsed.data)) return parsed.data.map(normalizeRow);
  return [];
}

function parseWorkbook(buffer) {
  const workbook = window.XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return window.XLSX.utils.sheet_to_json(sheet, { raw: false }).map(normalizeRow);
}

function groupTotals(rows, dimension, metric) {
  const totals = {};
  rows.forEach((row) => {
    const key = String(row[dimension] ?? "Unknown");
    totals[key] = (totals[key] || 0) + (Statistics.toFiniteNumber(row[metric]) ?? 0);
  });
  return Object.entries(totals).map(([label, value]) => ({ label, value })).sort((left, right) => right.value - left.value);
}

function timeSeries(rows, timeColumn, metric) {
  const totals = {};
  rows.forEach((row) => {
    const key = row[timeColumn];
    totals[key] = (totals[key] || 0) + (Statistics.toFiniteNumber(row[metric]) ?? 0);
  });
  return Object.entries(totals).map(([label, value]) => ({ label, value })).sort((left, right) => new Date(left.label) - new Date(right.label));
}

export class DatasetEngine {
  constructor(seedDatasets = {}) {
    this.seedDatasets = seedDatasets;
    this.currentDataset = null;
  }

  async loadFile(file) {
    const extension = file.name.split(".").pop().toLowerCase();
    let rows = [];
    if (extension === "csv") rows = parseCsvText(await readFileAsText(file));
    else if (extension === "json") rows = parseJsonText(await readFileAsText(file));
    else if (["xlsx", "xls"].includes(extension)) rows = parseWorkbook(await readFileAsArrayBuffer(file));
    else throw new Error("Unsupported file type. Upload CSV, Excel, or JSON.");
    return this.ingestRows(rows, file.name);
  }

  loadSeedDataset(key) {
    const rows = this.seedDatasets[key];
    if (!rows) throw new Error(`Unknown seed dataset: ${key}`);
    return this.ingestRows(rows, `${key}.json`);
  }

  ingestRows(rows, sourceName = "dataset") {
    const normalized = rows.map(normalizeRow);
    const schema = inferSchema(normalized);
    this.currentDataset = { id: `${sourceName}-${Date.now()}`, sourceName, ...summarizeDataset(normalized, schema) };
    return this.currentDataset;
  }

  getCurrentDataset() {
    return this.currentDataset;
  }

  getChartRecommendations(dataset = this.currentDataset) {
    if (!dataset) return null;
    const { columns, rows } = dataset;
    const metric = columns.primaryMetric;
    const secondary = columns.secondaryMetric;
    return {
      histogram: metric ? { metric, values: rows.map((row) => Statistics.toFiniteNumber(row[metric])).filter((value) => value !== null) } : null,
      scatter: metric && secondary ? {
        x: metric,
        y: secondary,
        points: rows.map((row) => [Statistics.toFiniteNumber(row[metric]), Statistics.toFiniteNumber(row[secondary])]).filter((point) => point[0] !== null && point[1] !== null),
      } : null,
      box: metric ? { metric, values: rows.map((row) => Statistics.toFiniteNumber(row[metric])).filter((value) => value !== null) } : null,
      heatmap: columns.numericColumns.length >= 2 ? { columns: columns.numericColumns.slice(0, 6), matrix: dataset.correlationMatrix } : null,
      timeSeries: columns.primaryTime && metric ? { timeColumn: columns.primaryTime, metric, series: timeSeries(rows, columns.primaryTime, metric) } : null,
      bars: columns.primaryDimension && metric ? { dimension: columns.primaryDimension, metric, values: groupTotals(rows, columns.primaryDimension, metric).slice(0, 10) } : null,
    };
  }

  describeDataset(dataset = this.currentDataset) {
    if (!dataset) return [];
    const highlights = [`${dataset.rowCount} rows ingested across ${dataset.columnCount} columns.`];
    dataset.schema.forEach((entry) => {
      if (entry.type === "number" && entry.profile) {
        highlights.push(`${entry.column}: avg ${Statistics.formatMetric(entry.profile.mean)}, median ${Statistics.formatMetric(entry.profile.median)}, range ${Statistics.formatMetric(entry.profile.min)}-${Statistics.formatMetric(entry.profile.max)}.`);
      }
      if (entry.type === "category") highlights.push(`${entry.column}: ${entry.distinct} distinct values detected.`);
    });
    return highlights.slice(0, 6);
  }
}
