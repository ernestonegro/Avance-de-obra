import { supabase } from './supabase'

/*
 * Notificaciones push (Web Push). Cada celular/navegador se suscribe por separado.
 * El envío lo hace la función de Netlify (netlify/functions/push-avisar.mjs).
 */

const FN = '/.netlify/functions'

export const esIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
export const esAppInstalada = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

/**
 * ¿Se puede usar push en este navegador?
 * @returns {'ok' | 'ios-sin-instalar' | 'no-soportado'}
 */
export function soportePush() {
  const api = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  // En iPhone/iPad las notificaciones web sólo existen con la app agregada a la pantalla de inicio (iOS 16.4+).
  if (esIOS() && !esAppInstalada()) return 'ios-sin-instalar'
  return api ? 'ok' : 'no-soportado'
}

async function registro() {
  const reg = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, rej) => setTimeout(() => rej(new Error('La app todavía se está instalando. Recargá la página e intentá de nuevo.')), 10_000)),
  ])
  return reg
}

function base64UrlABytes(b64) {
  const relleno = '='.repeat((4 - (b64.length % 4)) % 4)
  const crudo = atob((b64 + relleno).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(crudo, (c) => c.charCodeAt(0))
}

async function leerJson(resp) {
  const cuerpo = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    const e = new Error(cuerpo.error || `Error ${resp.status} del servidor de avisos`)
    e.codigo = cuerpo.codigo
    throw e
  }
  return cuerpo
}

/** Suscripción actual de este navegador (o null). */
export async function suscripcionActual() {
  if (soportePush() !== 'ok') return null
  const reg = await registro()
  return reg.pushManager.getSubscription()
}

/** Obras elegidas en el servidor para esta suscripción: { suscripto, proyectos } o null. */
export async function estadoEnServidor(sub) {
  if (!sub) return null
  const { data, error } = await supabase.rpc('estado_suscripcion_push', { p_endpoint: sub.endpoint })
  if (error) throw error
  return data
}

/**
 * Pide permiso, se suscribe y guarda la suscripción con las obras elegidas.
 * @param {string[] | null} proyectos null = todas las obras
 */
export async function activarAvisos(proyectos) {
  const permiso = await Notification.requestPermission()
  if (permiso !== 'granted') {
    throw new Error(
      permiso === 'denied'
        ? 'Los avisos están bloqueados para esta app. Habilitalos en los ajustes del navegador o del teléfono y volvé a intentar.'
        : 'No se otorgó el permiso para mostrar avisos.',
    )
  }
  const reg = await registro()
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    const { publica } = await leerJson(await fetch(`${FN}/push-clave`))
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlABytes(publica) })
  }
  await guardarPreferencias(sub, proyectos)
  return sub
}

export async function guardarPreferencias(sub, proyectos) {
  const { keys } = sub.toJSON()
  const { error } = await supabase.rpc('guardar_suscripcion_push', {
    p_endpoint: sub.endpoint,
    p_p256dh: keys.p256dh,
    p_auth: keys.auth,
    p_proyectos: proyectos && proyectos.length ? proyectos : null,
  })
  if (error) throw error
}

export async function desactivarAvisos() {
  const sub = await suscripcionActual()
  if (!sub) return
  await supabase.rpc('borrar_suscripcion_push', { p_endpoint: sub.endpoint })
  await sub.unsubscribe()
}

export async function enviarPrueba(sub) {
  return leerJson(
    await fetch(`${FN}/push-prueba`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }),
  )
}

/**
 * Avisar al equipo de un avance recién guardado. "Disparar y olvidar": si falla (sin
 * señal, función no configurada) el avance ya está guardado igual.
 */
export async function avisarAvance(avanceId) {
  try {
    const sub = soportePush() === 'ok' ? await Promise.race([suscripcionActual(), new Promise((r) => setTimeout(() => r(null), 1500))]) : null
    await fetch(`${FN}/push-avisar`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ avance_id: avanceId, excluir: sub?.endpoint }), // no avisarse a uno mismo
      keepalive: true,
    })
  } catch {
    /* sin aviso: no afecta al registro */
  }
}
