/**
 * Generate the description Pedro wants:
 *   "W1S2 SQ 3x4*150kg REP 7"
 *
 * Decoded:
 *   W{week} S{session#} {exerciseShortcode} {sets}x{reps}*{weight}kg REP {repNumber}
 */

const SHORTCODE = {
  'SQ': 'SQ',
  'BP': 'BP',
  'BP 2cnt': 'BP2',
  'DL': 'DL',
  'DL CONV': 'DL',
  'DL SUMO': 'SDL',
  'Bp Inclinado Barra': 'BPi',
  'Press Militar': 'OHP',
  'Laterales': 'LAT',
  'Ext Tricep': 'TRX',
  'Jalon al Pecho': 'JP',
  'Cristos': 'CR',
  'Remo Barra': 'RB',
  'Cable Row': 'CR',
  'Lapulldown': 'LPD',
  'Curl Bicep Maquina': 'BIC',
  'Patada de Gluteo': 'PG',
  'Leg Ext': 'LE',
  'Leg Curl': 'LC',
  'BSSQ': 'BSSQ',
}

export function shortcodeFor(exerciseName) {
  if (!exerciseName) return '?'
  const trimmed = exerciseName.trim()
  if (SHORTCODE[trimmed]) return SHORTCODE[trimmed]
  // fallback: first 3 chars uppercase
  return trimmed.slice(0, 3).toUpperCase().replace(/\s+/g, '')
}

/**
 * Build a caption for one filmed rep.
 * @param {object} args
 * @param {number} args.week       Current week of meso, 1-based
 * @param {number} args.session    Session number, 1-based
 * @param {string} args.exercise   Exercise name (raw, will shortcode)
 * @param {number} args.sets       Prescribed sets
 * @param {number} args.reps       Prescribed reps
 * @param {number} args.weight     Weight in kg
 * @param {number} args.repNumber  Rep being filmed (1-based)
 * @param {string} [args.rpeTarget] Optional target RPE label
 */
export function buildCaption({ week, session, exercise, sets, reps, weight, repNumber, rpeTarget }) {
  const code = shortcodeFor(exercise)
  const base = `W${week}S${session} ${code} ${sets}x${reps}*${weight}kg REP ${repNumber}`
  return rpeTarget ? `${base} RPE ${rpeTarget}` : base
}

export function buildSessionCaption({ week, session, sessionLabel }) {
  return `W${week}S${session} — ${sessionLabel || 'Sesión'}`
}
