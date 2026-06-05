import AsyncStorage from '@react-native-async-storage/async-storage'

const LOG_KEY    = 'set-log-v1'
const PREFS_KEY  = 'prefs-v1'

export async function readLog() {
  try { const raw = await AsyncStorage.getItem(LOG_KEY); return raw ? JSON.parse(raw) : [] }
  catch { return [] }
}

export async function appendSet(entry) {
  const log = await readLog()
  const stamped = { ...entry, id: Date.now() + '-' + Math.random().toString(36).slice(2, 6), at: Date.now() }
  log.unshift(stamped)
  await AsyncStorage.setItem(LOG_KEY, JSON.stringify(log.slice(0, 500)))
  return stamped
}

export async function lastSetFor(exerciseName) {
  const log = await readLog()
  return log.find((e) => e.exercise === exerciseName) || null
}

export const DEFAULT_PREFS = {
  csvUrl: '',              // user's published Google Sheets CSV URL
  coachPhone: '',          // e.g. '5214771234567' (no +)
  unit: 'kg',
  defaultIncrement: 2.5,
}

export async function readPrefs() {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY)
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS
  } catch { return DEFAULT_PREFS }
}

export async function savePrefs(patch) {
  const cur = await readPrefs()
  const next = { ...cur, ...patch }
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next))
  return next
}

export async function getCsvUrl() {
  const p = await readPrefs()
  return p.csvUrl || ''
}
