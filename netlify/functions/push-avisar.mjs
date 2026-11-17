/*
 * POST /.netlify/functions/push-avisar  { avance_id, excluir?: endpoint }
 * La app lo llama cuando un avance se guardó. Para que no se pueda usar para mandar
 * avisos falsos o repetidos: sólo avisa avances reales, creados hace menos de 15 minutos
 * y todavía no notificados (se marca de forma atómica con notificado_en).
 */
import { clienteAdmin, clavesVapid, enviarAvisos, json, manejar, sujetoVapid, urlFoto, ETAPAS, ESTADOS, RE_UUID } from '../lib/push.mjs'

export default manejar(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)
  const { avance_id: id, excluir } = await req.json().catch(() => ({}))
  if (!RE_UUID.test(id || '')) return json({ error: 'avance_id inválido' }, 400)

  const db = clienteAdmin()
  const hace15min = new Date(Date.now() - 15 * 60 * 1000).toISOString()
  const { data: avances, error } = await db
    .from('avances')
    .update({ notificado_en: new Date().toISOString() })
    .eq('id', id)
    .is('notificado_en', null)
    .gt('created_at', hace15min)
    .select('id, proyecto_id, etapa, estado, comentario, autor_nombre, proyecto:proyectos(nombre), fotos:fotos_avance(thumb_path, orden)')
  if (error) throw error
  const avance = avances?.[0]
  if (!avance) return json({ enviados: 0, motivo: 'ya notificado, inexistente o antiguo' })

  const { data: subs, error: errSubs } = await db
    .from('suscripciones_push')
    .select('endpoint, p256dh, auth')
    .or(`proyecto_ids.is.null,proyecto_ids.cs.{${avance.proyecto_id}}`)
  if (errSubs) throw errSubs
  const destinatarios = subs.filter((s) => s.endpoint !== excluir)
  if (!destinatarios.length) return json({ enviados: 0, motivo: 'sin suscriptos' })

  const fotos = [...(avance.fotos || [])].sort((a, b) => a.orden - b.orden)
  const textoFotos = fotos.length ? ` · ${fotos.length} foto${fotos.length !== 1 ? 's' : ''}` : ''
  const aviso = {
    title: `${ETAPAS[avance.etapa] ?? avance.etapa} · ${avance.proyecto?.nombre ?? 'Obra'}`,
    body: `${ESTADOS[avance.estado] ?? ''}\n${avance.autor_nombre}: ${(avance.comentario || 'Nuevo registro').slice(0, 140)}${textoFotos}`,
    image: fotos[0] ? urlFoto(fotos[0].thumb_path) : undefined,
    url: `/?obra=${avance.proyecto_id}`,
    tag: `avance-${avance.id}`,
  }
  const r = await enviarAvisos(db, await clavesVapid(db), destinatarios, aviso, sujetoVapid(req))
  return json(r)
})
