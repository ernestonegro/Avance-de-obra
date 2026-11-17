import { createClient } from '@supabase/supabase-js'

// Normalizado: sin espacios ni "/" final (si no, quedan URLs con "//storage").
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '')
// Acepta la anon key clásica (JWT "eyJ…") o la nueva publishable key ("sb_publishable_…").
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()
export const BUCKET_FOTOS = 'fotos-avance'

export const configuracionValida = /^https?:\/\//.test(SUPABASE_URL) && SUPABASE_ANON_KEY.length > 0

export const supabase = configuracionValida
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      // Modo sin login: sólo anon key, sin sesión persistida.
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  : null

/**
 * Headers para llamar a la API REST de Supabase "a mano" (subida de fotos por XHR).
 * Las publishable keys nuevas NO son JWT: no pueden ir en Authorization (el gateway
 * las rechaza); con ellas alcanza el header apikey. La anon key clásica sí va en ambos.
 */
export function headersApi() {
  const h = { apikey: SUPABASE_ANON_KEY }
  if (SUPABASE_ANON_KEY.startsWith('eyJ')) h.Authorization = `Bearer ${SUPABASE_ANON_KEY}`
  return h
}

/** URL pública (cacheable por el service worker) de un archivo del bucket de fotos. */
export function urlFoto(path) {
  if (!path) return ''
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_FOTOS}/${path.split('/').map(encodeURIComponent).join('/')}`
}

/** ¿El error es de red (vale la pena reintentar) y no un rechazo de la base de datos? */
export function esErrorDeRed(error) {
  if (!error) return false
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true
  const msg = error.message || String(error)
  return /Failed to fetch|NetworkError|Load failed|network|fetch failed|timed? ?out/i.test(msg)
}

/** Traduce errores de PostgREST/Storage a mensajes entendibles en obra. */
export function mensajeError(error) {
  if (!error) return ''
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'Sin conexión. Revisá la señal e intentá de nuevo.'
  const msg = error.message || String(error)
  if (error.code === '42501' || /row-level security|permission denied/i.test(msg)) return 'Esta acción no está permitida.'
  if (error.code === '22P02') return 'Hay un dato con formato inválido. Recargá la página.'
  if (esErrorDeRed(error)) return 'Error de red. Revisá la señal e intentá de nuevo.'
  return msg
}
