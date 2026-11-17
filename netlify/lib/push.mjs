/*
 * Lógica compartida de las funciones de notificaciones push (corre en Netlify, Node).
 * Usa la service_role key de Supabase, que vive sólo en las variables de entorno de
 * Netlify: nunca llega al navegador.
 */
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

// La URL del proyecto es pública (también está en netlify.toml). Las variables de
// [build.environment] no llegan a las funciones en ejecución, por eso el valor por defecto.
const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://evwoxjmpbrvcfadnzitr.supabase.co').replace(/\/+$/, '')

export const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export class ErrorConfig extends Error {}

export function json(cuerpo, status = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}

export function clienteAdmin() {
  const clave = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!clave) throw new ErrorConfig('Falta configurar SUPABASE_SERVICE_ROLE_KEY en las variables de entorno de Netlify.')
  return createClient(SUPABASE_URL, clave, { auth: { persistSession: false, autoRefreshToken: false } })
}

let clavesEnMemoria = null

/** Claves VAPID: se leen de config_push; si no existen (primer uso) se generan y guardan. */
export async function clavesVapid(db) {
  if (clavesEnMemoria) return clavesEnMemoria
  const leer = () => db.from('config_push').select('vapid_publica, vapid_privada').maybeSingle()
  let { data, error } = await leer()
  if (error) throw error
  if (!data) {
    const k = webpush.generateVAPIDKeys()
    // Si otra instancia las creó al mismo tiempo, el insert choca con la PK y se relee.
    await db.from('config_push').insert({ vapid_publica: k.publicKey, vapid_privada: k.privateKey })
    ;({ data, error } = await leer())
    if (error || !data) throw error || new Error('No se pudieron crear las claves de notificación')
  }
  clavesEnMemoria = { publica: data.vapid_publica, privada: data.vapid_privada }
  return clavesEnMemoria
}

/**
 * Envía el mismo aviso a varias suscripciones. Las que el servicio de push da por
 * vencidas (404/410: el usuario desinstaló o revocó el permiso) se borran.
 */
export async function enviarAvisos(db, vapid, suscripciones, aviso, sujeto) {
  const opciones = {
    vapidDetails: { subject: sujeto, publicKey: vapid.publica, privateKey: vapid.privada },
    TTL: 60 * 60 * 24, // si el celular está apagado, el aviso espera hasta 24 h
    urgency: 'normal',
  }
  const cuerpo = JSON.stringify(aviso)
  const vencidas = []
  let enviados = 0
  await Promise.all(
    suscripciones.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, cuerpo, opciones)
        enviados++
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) vencidas.push(s.endpoint)
        else console.error('push falló', e.statusCode, e.body || e.message)
      }
    }),
  )
  if (vencidas.length) await db.from('suscripciones_push').delete().in('endpoint', vencidas)
  return { enviados, vencidas: vencidas.length }
}

/** "mailto:" o URL https del sitio: los servicios de push lo exigen para contactar al emisor. */
export const sujetoVapid = (req) => `https://${new URL(req.url).host}`

export const urlFoto = (path) => `${SUPABASE_URL}/storage/v1/object/public/fotos-avance/${path}`

// Copia mínima de las etiquetas (src/lib/constantes.js importa íconos de React).
export const ETAPAS = {
  preliminares: 'Preliminares',
  movimiento_suelos: 'Movimiento de suelos',
  fundaciones: 'Fundaciones',
  estructura: 'Estructura',
  albanileria: 'Albañilería',
  instalaciones_sanitarias: 'Inst. sanitarias',
  instalaciones_electricas: 'Inst. eléctricas',
  instalaciones_gas: 'Inst. de gas',
  revoques: 'Revoques',
  contrapisos: 'Contrapisos',
  pisos_revestimientos: 'Pisos y revestimientos',
  carpinterias: 'Carpinterías',
  pintura: 'Pintura',
  terminaciones: 'Terminaciones',
  limpieza_entrega: 'Limpieza y entrega',
  otros: 'Otros',
}
export const ESTADOS = {
  avance_normal: '✅ Avance normal',
  requiere_material: '📦 Requiere material',
  demora_imprevisto: '⚠️ Demora / Imprevisto',
  listo_inspeccion: '📋 Listo para inspección',
}

/** Envuelve un handler: errores de configuración → 503 con mensaje claro; el resto → 500. */
export function manejar(handler) {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx)
    } catch (e) {
      if (e instanceof ErrorConfig) return json({ error: e.message, codigo: 'config' }, 503)
      console.error(e)
      return json({ error: 'Error interno al procesar el aviso' }, 500)
    }
  }
}
