export const Statistics = {
  toFiniteNumber(value) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value.replace(/,/g, "").trim());
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  },

  mean(values) {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  },

  sum(values) {
    return values.reduce((sum, value) => sum + value, 0);
  },

  variance(values) {
    if (values.length < 2) return 0;
    const mean = this.mean(values);
    return this.mean(values.map((value) => (value - mean) ** 2));
  },

  standardDeviation(values) {
    return Math.sqrt(this.variance(values));
  },

  median(values) {
    if (!values.length) return 0;
    const ordered = [...values].sort((a, b) => a - b);
    const mid = Math.floor(ordered.length / 2);
    return ordered.length % 2 === 0 ? (ordered[mid - 1] + ordered[mid]) / 2 : ordered[mid];
  },

  quantile(values, q) {
    if (!values.length) return 0;
    const ordered = [...values].sort((a, b) => a - b);
    const pos = (ordered.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    return ordered[base + 1] !== undefined
      ? ordered[base] + rest * (ordered[base + 1] - ordered[base])
      : ordered[base];
  },

  correlation(a, b) {
    if (!a.length || a.length !== b.length) return 0;
    const meanA = this.mean(a);
    const meanB = this.mean(b);
    let numerator = 0;
    let denomA = 0;
    let denomB = 0;

    for (let index = 0; index < a.length; index += 1) {
      const deltaA = a[index] - meanA;
      const deltaB = b[index] - meanB;
      numerator += deltaA * deltaB;
      denomA += deltaA ** 2;
      denomB += deltaB ** 2;
    }

    const denominator = Math.sqrt(denomA * denomB);
    return denominator ? numerator / denominator : 0;
  },

  inferDataType(values) {
    const filtered = values.filter((value) => value !== null && value !== undefined && value !== "");
    if (!filtered.length) return "empty";
    const numeric = filtered.filter((value) => this.toFiniteNumber(value) !== null).length;
    const dates = filtered.filter((value) => !Number.isNaN(Date.parse(value))).length;
    if (numeric === filtered.length) return "number";
    if (dates >= Math.ceil(filtered.length * 0.7)) return "date";
    return "category";
  },

  unique(values) {
    return [...new Set(values)];
  },

  numericProfile(values) {
    const numbers = values.map((value) => this.toFiniteNumber(value)).filter((value) => value !== null);
    if (!numbers.length) return null;
    return {
      count: numbers.length,
      min: Math.min(...numbers),
      max: Math.max(...numbers),
      mean: this.mean(numbers),
      median: this.median(numbers),
      q1: this.quantile(numbers, 0.25),
      q3: this.quantile(numbers, 0.75),
      variance: this.variance(numbers),
      standardDeviation: this.standardDeviation(numbers),
      sum: this.sum(numbers),
    };
  },

  categoryProfile(values) {
    const counts = values.reduce((acc, value) => {
      const key = String(value ?? "Unknown");
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return {
      count: values.length,
      unique: Object.keys(counts).length,
      topValues: Object.entries(counts)
        .sort((left, right) => right[1] - left[1])
        .slice(0, 5)
        .map(([label, total]) => ({ label, total })),
    };
  },

  buildCorrelationMatrix(rows, numericColumns) {
    return numericColumns.map((rowColumn) =>
      numericColumns.map((column) => {
        const a = [];
        const b = [];
        rows.forEach((row) => {
          const left = this.toFiniteNumber(row[rowColumn]);
          const right = this.toFiniteNumber(row[column]);
          if (left !== null && right !== null) {
            a.push(left);
            b.push(right);
          }
        });
        return Number(this.correlation(a, b).toFixed(3));
      }),
    );
  },

  formatMetric(value) {
    return typeof value === "number"
      ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)
      : String(value);
  },

  describeDistribution(profile) {
    if (!profile) return "No numeric distribution available.";
    const spread = profile.max - profile.min;
    if (!spread) return "Values are flat with no measurable spread.";
    if (profile.standardDeviation < spread * 0.1) return "Distribution is tightly clustered.";
    if (profile.standardDeviation < spread * 0.2) return "Distribution shows moderate variability.";
    return "Distribution is broad with notable dispersion.";
  },
};
