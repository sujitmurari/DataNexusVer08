import { Statistics } from "../analytics/statistics.js";

function sentimentFromCorrelation(value) {
  if (value > 0.75) return "strong positive";
  if (value > 0.35) return "moderate positive";
  if (value < -0.75) return "strong negative";
  if (value < -0.35) return "moderate negative";
  return "weak";
}

function pickTopCorrelations(dataset) {
  const numericColumns = dataset.columns.numericColumns.slice(0, 6);
  const pairs = [];
  numericColumns.forEach((left, rowIndex) => {
    numericColumns.forEach((right, columnIndex) => {
      if (columnIndex <= rowIndex) return;
      pairs.push({ pair: [left, right], value: dataset.correlationMatrix[rowIndex][columnIndex] });
    });
  });
  return pairs.sort((left, right) => Math.abs(right.value) - Math.abs(left.value)).slice(0, 3);
}

function estimateTrend(rows, metric, timeColumn) {
  const series = rows.map((row, index) => ({
    x: timeColumn ? (Date.parse(row[timeColumn]) || index) : index,
    y: Statistics.toFiniteNumber(row[metric]),
  })).filter((point) => point.y !== null).sort((left, right) => left.x - right.x);

  if (series.length < 2) return { direction: "stable", slope: 0, forecast: [] };

  const meanX = Statistics.mean(series.map((point) => point.x));
  const meanY = Statistics.mean(series.map((point) => point.y));
  let numerator = 0;
  let denominator = 0;

  series.forEach((point) => {
    numerator += (point.x - meanX) * (point.y - meanY);
    denominator += (point.x - meanX) ** 2;
  });

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const direction = slope > 0 ? "upward" : slope < 0 ? "downward" : "stable";
  const step = series.length > 1 ? series[series.length - 1].x - series[series.length - 2].x : 1;
  const lastPoint = series[series.length - 1];
  const forecast = new Array(3).fill(null).map((_, index) => ({
    x: lastPoint.x + step * (index + 1),
    y: Number((lastPoint.y + slope * step * (index + 1)).toFixed(2)),
  }));

  return { direction, slope, forecast };
}

export class InsightEngine {
  generateInsights(dataset) {
    if (!dataset) {
      return {
        headline: "No dataset loaded",
        bullets: ["Upload a CSV, Excel, or JSON file to begin automated analytics."],
        kpis: [],
        summary: "NEXUS AI is waiting for data input before it can generate insights.",
        executiveSummary: "Load a dataset to produce an executive summary.",
        suggestedKPIs: [],
      };
    }

    const primaryMetric = dataset.columns.primaryMetric;
    const primaryDimension = dataset.columns.primaryDimension;
    const primaryTime = dataset.columns.primaryTime;
    const bullets = [];
    const kpis = [];

    if (primaryMetric) {
      const profile = dataset.schema.find((entry) => entry.column === primaryMetric)?.profile;
      if (profile) {
        bullets.push(`${primaryMetric} averages ${Statistics.formatMetric(profile.mean)} with a median of ${Statistics.formatMetric(profile.median)}.`);
        bullets.push(Statistics.describeDistribution(profile));
        kpis.push({ label: `Avg ${primaryMetric}`, value: Statistics.formatMetric(profile.mean), accent: "cyan" });
      }
    }

    if (primaryDimension && primaryMetric) {
      const groups = {};
      dataset.rows.forEach((row) => {
        const dimension = row[primaryDimension] ?? "Unknown";
        const metric = Statistics.toFiniteNumber(row[primaryMetric]) ?? 0;
        groups[dimension] = (groups[dimension] || 0) + metric;
      });
      const leader = Object.entries(groups).sort((left, right) => right[1] - left[1])[0];
      if (leader) {
        bullets.push(`${leader[0]} leads ${primaryMetric} contribution at ${Statistics.formatMetric(leader[1])}.`);
        kpis.push({ label: `Top ${primaryDimension}`, value: leader[0], accent: "magenta" });
      }
    }

    const topCorrelations = pickTopCorrelations(dataset);
    topCorrelations.forEach((item) => {
      bullets.push(`${item.pair[0]} and ${item.pair[1]} show a ${sentimentFromCorrelation(item.value)} correlation (${item.value}).`);
    });

    if (primaryMetric) {
      const trend = estimateTrend(dataset.rows, primaryMetric, primaryTime);
      bullets.push(`Trend for ${primaryMetric} is ${trend.direction} with slope ${trend.slope.toFixed(4)}.`);
      kpis.push({ label: `${primaryMetric} trend`, value: trend.direction.toUpperCase(), accent: "green" });
      kpis.push({ label: "Forecast horizon", value: trend.forecast.map((item) => item.y).join(" / "), accent: "violet" });
    }

    return {
      headline: `Insight synthesis for ${dataset.sourceName}`,
      bullets: bullets.slice(0, 6),
      kpis: kpis.slice(0, 4),
      summary: `NEXUS AI processed ${dataset.rowCount} records and ${dataset.columnCount} columns.`,
      executiveSummary: this.createExecutiveSummary(dataset, topCorrelations),
      suggestedKPIs: this.suggestKPIs(dataset),
    };
  }

  createExecutiveSummary(dataset, topCorrelations = []) {
    const primaryMetric = dataset.columns.primaryMetric || "metric";
    const primaryDimension = dataset.columns.primaryDimension || "segment";
    const primaryTime = dataset.columns.primaryTime;
    const strongest = topCorrelations[0];
    const strongestLine = strongest
      ? `${strongest.pair[0]} and ${strongest.pair[1]} are the most structurally linked variables in the current sample.`
      : "Correlation strength is limited by the current schema.";

    return [
      `The dataset ${dataset.sourceName} exhibits a healthy analytical shape with ${dataset.rowCount} records supporting business review.`,
      `${primaryMetric} should be tracked at the ${primaryDimension} level to surface performance variance faster.`,
      primaryTime
        ? `Because ${primaryTime} is available, leadership should monitor period-over-period acceleration and forecast changes proactively.`
        : "A dedicated time dimension would improve forecasting and trend management.",
      strongestLine,
      "Recommended next step: align KPIs, trigger anomaly alerts, and operationalize the strongest metrics inside the BI dashboard center.",
    ].join(" ");
  }

  suggestKPIs(dataset) {
    const primaryMetric = dataset.columns.primaryMetric;
    const secondaryMetric = dataset.columns.secondaryMetric;
    const primaryDimension = dataset.columns.primaryDimension;
    const kpis = [];
    if (primaryMetric) {
      kpis.push(`Average ${primaryMetric}`);
      kpis.push(`${primaryMetric} variance`);
    }
    if (primaryDimension && primaryMetric) kpis.push(`${primaryMetric} by ${primaryDimension}`);
    if (secondaryMetric) kpis.push(`${secondaryMetric} correlation index`);
    if (dataset.columns.primaryTime && primaryMetric) kpis.push(`${primaryMetric} growth rate`);
    return kpis.slice(0, 5);
  }
}
