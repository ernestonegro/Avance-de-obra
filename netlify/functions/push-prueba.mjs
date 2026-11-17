// POST /.netlify/functions/push-prueba { endpoint } → manda un aviso de prueba sólo a ese celular.
import { clienteAdmin, clavesVapid, enviarAvisos, json, manejar, sujetoVapid } from '../lib/push.mjs'

export default manejar(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)
  const { endpoint } = await req.json().catch(() => ({}))
  if (typeof endpoint !== 'string' || !endpoint.startsWith('https://')) return json({ error: 'endpoint inválido' }, 400)

  const db = clienteAdmin()
  const { data: sub, error } = await db.from('suscripciones_push').select('endpoint, p256dh, auth').eq('endpoint', endpoint).maybeSingle()
  if (error) throw error
  if (!sub) return json({ error: 'Este celular no está suscripto' }, 404)

  const r = await enviarAvisos(
    db,
    await clavesVapid(db),
    [sub],
    { title: 'Bitácora de Obra', body: '🔔 ¡Los avisos funcionan! Vas a recibir uno cada vez que se cargue un avance.', url: '/avisos', tag: 'prueba' },
    sujetoVapid(req),
  )
  return json(r)
})
