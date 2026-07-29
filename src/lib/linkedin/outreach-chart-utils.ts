/** Compute a Y-axis domain and evenly-spaced round-number ticks for count charts. */
export function computeCountAxis(
  dataMax: number,
  preferredTicks = 6
): { domain: [number, number]; ticks: number[] } {
  if (dataMax <= 0) {
    return { domain: [0, 100], ticks: [0, 20, 40, 60, 80, 100] };
  }

  const roughStep = dataMax / preferredTicks;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalized = roughStep / magnitude;

  let niceStep: number;
  if (normalized <= 1) niceStep = magnitude;
  else if (normalized <= 2) niceStep = 2 * magnitude;
  else if (normalized <= 5) niceStep = 5 * magnitude;
  else niceStep = 10 * magnitude;

  const niceMax = Math.ceil(dataMax / niceStep) * niceStep;
  const ticks: number[] = [];
  for (let t = 0; t <= niceMax; t += niceStep) {
    ticks.push(t);
  }

  return { domain: [0, niceMax], ticks };
}

/** Compute a percentage Y-axis with 5-point increments, minimum ceiling of 35%. */
export function computePercentAxis(
  dataMax: number
): { domain: [number, number]; ticks: number[] } {
  const niceMax = Math.max(35, Math.ceil(dataMax / 5) * 5);
  const ticks: number[] = [];
  for (let t = 0; t <= niceMax; t += 5) {
    ticks.push(t);
  }
  return { domain: [0, niceMax], ticks };
}

/** Return the maximum numeric value across one or more keys in chart rows. */
export function maxOfKeys(
  data: Record<string, unknown>[],
  keys: string[]
): number {
  let max = 0;
  for (const row of data) {
    for (const key of keys) {
      const val = Number(row[key] ?? 0);
      if (!Number.isNaN(val) && val > max) max = val;
    }
  }
  return max;
}

/** Return the maximum stacked total for the given keys in each row. */
export function maxStackTotal(
  data: Record<string, unknown>[],
  keys: string[]
): number {
  let max = 0;
  for (const row of data) {
    const total = keys.reduce(
      (sum, key) => sum + Number(row[key] ?? 0),
      0
    );
    if (total > max) max = total;
  }
  return max;
}
