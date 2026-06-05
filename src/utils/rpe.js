/**
 * RPE-based weight calculator. Uses the standard Reactive Training Systems %1RM chart.
 * Given a completed set (weight × reps × RPE), estimates 1RM.
 * Given a target (reps × RPE), returns the suggested weight.
 *
 * Source: RTS chart (Mike Tuchscherer). Aligned with the Excel file:
 * percentages match within ±1% for the rows covered there.
 */

// RPE_CHART[rpe][reps] = % of 1RM
// Only the rows/cols we actually use; missing pairs fall back to linear interp.
const RPE_CHART = {
  10:  { 1: 100.0, 2: 95.5, 3: 92.2, 4: 89.2, 5: 86.3, 6: 83.7, 7: 81.1, 8: 78.6, 9: 76.2, 10: 73.9, 12: 69.4, 15: 63.0 },
  9.5: { 1:  97.8, 2: 93.9, 3: 90.7, 4: 87.8, 5: 85.0, 6: 82.4, 7: 79.9, 8: 77.4, 9: 75.1, 10: 72.3, 12: 67.5, 15: 61.5 },
  9:   { 1:  95.5, 2: 92.2, 3: 89.2, 4: 86.3, 5: 83.7, 6: 81.1, 7: 78.6, 8: 76.2, 9: 73.9, 10: 70.7, 12: 65.6, 15: 60.0 },
  8.5: { 1:  93.9, 2: 90.7, 3: 87.8, 4: 85.0, 5: 82.4, 6: 79.9, 7: 77.4, 8: 75.1, 9: 72.3, 10: 69.4, 12: 64.0, 15: 58.5 },
  8:   { 1:  92.2, 2: 89.2, 3: 86.3, 4: 83.7, 5: 81.1, 6: 78.6, 7: 76.2, 8: 73.9, 9: 70.7, 10: 68.0, 12: 62.6, 15: 57.0 },
  7.5: { 1:  90.7, 2: 87.8, 3: 85.0, 4: 82.4, 5: 79.9, 6: 77.4, 7: 75.1, 8: 72.3, 9: 69.4, 10: 66.7, 12: 61.3, 15: 55.5 },
  7:   { 1:  89.2, 2: 86.3, 3: 83.7, 4: 81.1, 5: 78.6, 6: 76.2, 7: 73.9, 8: 70.7, 9: 68.0, 10: 65.3, 12: 59.9, 15: 54.0 },
  6.5: { 1:  87.8, 2: 85.0, 3: 82.4, 4: 79.9, 5: 77.4, 6: 75.1, 7: 72.3, 8: 69.4, 9: 66.7, 10: 64.0, 12: 58.6, 15: 52.5 },
  6:   { 1:  86.3, 2: 83.7, 3: 81.1, 4: 78.6, 5: 76.2, 6: 73.9, 7: 70.7, 8: 68.0, 9: 65.3, 10: 62.6, 12: 57.3, 15: 51.0 },
  5.5: { 1:  85.0, 2: 82.4, 3: 79.9, 4: 77.4, 5: 75.1, 6: 72.3, 7: 69.4, 8: 66.7, 9: 64.0, 10: 61.3, 12: 56.0, 15: 49.5 },
  5:   { 1:  83.7, 2: 81.1, 3: 78.6, 4: 76.2, 5: 73.9, 6: 70.7, 7: 68.0, 8: 65.3, 9: 62.6, 10: 59.9, 12: 54.7, 15: 48.0 },
}

function nearestRpe(rpe) {
  const keys = Object.keys(RPE_CHART).map(Number)
  return keys.reduce((a, b) => (Math.abs(b - rpe) < Math.abs(a - rpe) ? b : a))
}

/** Look up % of 1RM with linear interpolation between reps cols if needed */
export function pctOf1RM(rpe, reps) {
  const r = nearestRpe(rpe)
  const row = RPE_CHART[r]
  if (row[reps] != null) return row[reps] / 100
  // Linear interp across reps
  const repCols = Object.keys(row).map(Number).sort((a, b) => a - b)
  let lo = repCols[0], hi = repCols[repCols.length - 1]
  for (let i = 0; i < repCols.length - 1; i++) {
    if (reps >= repCols[i] && reps <= repCols[i + 1]) { lo = repCols[i]; hi = repCols[i + 1]; break }
  }
  if (reps < lo) return row[lo] / 100
  if (reps > hi) return row[hi] / 100
  const t = (reps - lo) / (hi - lo)
  return (row[lo] * (1 - t) + row[hi] * t) / 100
}

/** Estimated 1RM from a completed set */
export function estimateOneRm(weight, reps, rpe) {
  if (!weight || !reps || !rpe) return 0
  const pct = pctOf1RM(rpe, reps)
  if (!pct) return 0
  return weight / pct
}

/** Suggested weight for a target reps × RPE, given an estimated 1RM */
export function suggestedWeight(oneRm, targetReps, targetRpe) {
  if (!oneRm || !targetReps || !targetRpe) return 0
  const pct = pctOf1RM(targetRpe, targetReps)
  return oneRm * pct
}

/** Round to nearest sensible barbell increment (default 2.5 kg / 2.5 lb) */
export function roundToPlate(weight, increment = 2.5) {
  return Math.round(weight / increment) * increment
}

/** Convenience: full calc from a previous set + a target */
export function calculate({ prevWeight, prevReps, prevRpe, targetReps, targetRpe }) {
  const e1rm = estimateOneRm(prevWeight, prevReps, prevRpe)
  const raw  = suggestedWeight(e1rm, targetReps, targetRpe)
  return {
    estimatedOneRm: e1rm,
    rawSuggested: raw,
    suggested: roundToPlate(raw, 2.5),
  }
}
