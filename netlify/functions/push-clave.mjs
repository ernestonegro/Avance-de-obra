// GET /.netlify/functions/push-clave → { publica } (clave VAPID pública, para suscribirse)
import { clienteAdmin, clavesVapid, json, manejar } from '../lib/push.mjs'

export default manejar(async () => {
  const { publica } = await clavesVapid(clienteAdmin())
  return json({ publica })
})
