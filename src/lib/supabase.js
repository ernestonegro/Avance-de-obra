import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
export const BUCKET_FOTOS = 'fotos-avance'

export const configuracionValida = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

export const supabase = configuracionValida
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      // Modo sin login: sólo anon key, sin sesión persistida.
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  : null

/** URL pública (cacheable por el service worker) de un archivo del bucket de fotos. */
export function urlFoto(path) {
  if (!path) return ''
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_FOTOS}/${path.split('/').map(encodeURIComponent).join('/')}`
}

/** Traduce errores de PostgREST/Storage a mensajes entendibles en obra. */
export function mensajeError(error) {
  if (!error) return ''
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'Sin conexión. Revisá la señal e intentá de nuevo.'
  const msg = error.message || String(error)
  if (error.code === '42501' || /row-level security|permission denied/i.test(msg)) return 'Esta acción no está permitida.'
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return 'Error de red. Revisá la señal e intentá de nuevo.'
  return msg
}
