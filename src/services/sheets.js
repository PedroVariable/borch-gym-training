/**
 * Pulls the latest mesocycle plan from a public Google Sheets CSV export.
 *
 * The URL is stored per-device in AsyncStorage (Setup screen on first launch).
 * If empty / unreachable, the app falls back to the bundled snapshot so it
 * still works offline.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import bundled from '../data/planMeso.json'
import { getCsvUrl } from './storage'

const CACHE_KEY = 'plan-meso-cache-v2'
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours

export async function getPlan({ force = false } = {}) {
  const url = await getCsvUrl()
  if (!url) return bundled

  if (!force) {
    const cached = await readCache(url)
    if (cached) return cached
  }

  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error(`Sheets HTTP ${res.status}`)
    const csv = await res.text()
    const plan = parseMesoCsv(csv, bundled)
    await writeCache(url, plan)
    return plan
  } catch (err) {
    console.warn('[Sheets] sync failed, using bundled snapshot:', err.message)
    return bundled
  }
}

/** Quick test — checks the URL responds with a valid CSV. Used by Setup screen. */
export async function validateCsvUrl(url) {
  if (!url || typeof url !== 'string') return { ok: false, reason: 'URL vacía' }
  if (!url.includes('output=csv')) return { ok: false, reason: 'Esperaba una URL "Publicar en la web" como CSV.' }
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return { ok: false, reason: `Google respondió ${res.status}` }
    const text = await res.text()
    if (!text || text.trim().length < 50) return { ok: false, reason: 'Respuesta vacía o muy corta.' }
    // Parse a tiny sample to confirm it's the Meso sheet
    const sample = parseMesoCsv(text, bundled)
    if (!sample.sessions || sample.sessions.length === 0) {
      return { ok: false, reason: 'No encontré sesiones. ¿Publicaste la hoja "Meso"?' }
    }
    return { ok: true, sessionsCount: sample.sessions.length, exercisesCount: sample.sessions.reduce((a, s) => a + (s.exercises?.length || 0), 0) }
  } catch (err) {
    return { ok: false, reason: err?.message || 'Error de red' }
  }
}

async function readCache(url) {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const c = JSON.parse(raw)
    if (c.url !== url) return null                          // URL changed → invalid
    if (Date.now() - c.timestamp > CACHE_TTL_MS) return null
    return c.plan
  } catch { return null }
}
async function writeCache(url, plan) {
  try { await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ url, plan, timestamp: Date.now() })) }
  catch {}
}

/**
 * Convert the raw CSV of the Meso sheet into the same shape as bundled JSON.
 * Layout: 5 session blocks (rows 5/17/29/41/53), 12-row stride, exercises in cols F-P.
 */
function parseMesoCsv(csv, fallback) {
  try {
    const rows = csv.split(/\r?\n/).map((line) => splitCsvLine(line))
    const get = (r, c) => (rows[r - 1] && rows[r - 1][c - 1] !== undefined ? rows[r - 1][c - 1] : '')
    const num = (v) => (v === '' || v == null ? null : Number.isNaN(Number(v)) ? v : Number(v))

    const meta = {
      tipo_meso: get(6, 3) || fallback.meta.tipo_meso,
      duracion_semanas: parseInt(get(7, 3)) || fallback.meta.duracion_semanas,
      fecha_inicio: (get(8, 3) || '').slice(0, 10) || fallback.meta.fecha_inicio,
      fecha_competicion: (get(9, 3) || '').slice(0, 10) || fallback.meta.fecha_competicion,
      weeks_out: get(10, 3),
      blocks_out: get(11, 3),
    }

    const DAYS = ['Lunes','Martes','Miercoles','Miércoles','Jueves','Viernes','Sabado','Sábado','Domingo']
    const starts = [5, 17, 29, 41, 53]
    const COLS = { name: 6, tipo: 7, variante: 8, patron: 9, sets: 10, reps: 11, rpe: 12, peso_sugerido: 13, peso_w1: 14, rpe_obtenido: 15, realizado: 16 }

    const sessions = starts.map((start, idx) => {
      const headerCells = [5,6,7,8,9,10,11,12].map((c) => get(start, c))
      const day = DAYS.find((d) => headerCells.some((c) => String(c).includes(d))) || null
      const labelHit = headerCells.find((c) => /PRIMARI|SECUNDARI/i.test(String(c)))
      const exercises = []
      for (let r = start + 2; r < start + 11; r++) {
        const name = get(r, COLS.name)
        if (!name || /^---+$/.test(String(name).trim())) continue
        const ex = {}
        for (const [k, c] of Object.entries(COLS)) ex[k] = num(get(r, c))
        ex.name = String(ex.name).trim()
        exercises.push(ex)
      }
      return { n: idx + 1, day, label: labelHit || `Sesión ${idx + 1}`, exercises }
    })

    return { ...fallback, meta, sessions }
  } catch (err) {
    console.warn('[Sheets] CSV parse failed, using bundled:', err.message)
    return fallback
  }
}

function splitCsvLine(line) {
  const out = []
  let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (ch === '"') inQ = false
      else cur += ch
    } else {
      if (ch === ',') { out.push(cur); cur = '' }
      else if (ch === '"') inQ = true
      else cur += ch
    }
  }
  out.push(cur)
  return out
}
