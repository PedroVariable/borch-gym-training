/**
 * Date helpers — figure out current week (W#) and session (S#) of the meso,
 * mapping today's day-of-week → session in the plan.
 */

const DAY_TO_INDEX = {
  Lunes: 1, Martes: 2, Miercoles: 3, Miércoles: 3, Jueves: 4,
  Viernes: 5, Sabado: 6, Sábado: 6, Domingo: 0,
}

const INDEX_TO_DAY = ['Domingo','Lunes','Martes','Miercoles','Jueves','Viernes','Sabado']

const MS_PER_DAY = 1000 * 60 * 60 * 24

export function weekOfMeso(today, fechaInicioStr) {
  const start = new Date(fechaInicioStr + 'T00:00:00')
  const diffDays = Math.floor((startOfDay(today) - startOfDay(start)) / MS_PER_DAY)
  if (diffDays < 0) return 0
  return Math.floor(diffDays / 7) + 1
}

export function startOfDay(d) {
  const x = new Date(d); x.setHours(0,0,0,0); return x
}

export function dayLabel(date = new Date()) {
  return INDEX_TO_DAY[date.getDay()]
}

/**
 * Given today's date and the sessions[] from the plan, return the session
 * whose day matches today. If none matches (rest day), returns null + the next session.
 */
export function pickSessionForDay(sessions, date = new Date()) {
  const today = dayLabel(date)
  const exact = sessions.find((s) => normalizeDay(s.day) === today)
  if (exact) return { match: 'today', session: exact }
  // No session today — find next one ahead in the week
  const todayIdx = date.getDay()
  let bestDelta = 99
  let next = null
  for (const s of sessions) {
    const sIdx = DAY_TO_INDEX[s.day] ?? 99
    let delta = sIdx - todayIdx
    if (delta <= 0) delta += 7
    if (delta < bestDelta) { bestDelta = delta; next = s }
  }
  return { match: 'rest', nextSession: next }
}

function normalizeDay(d) {
  if (!d) return ''
  return d.replace('é','e').replace('á','a')
}
