// POST /.netlify/functions/borrar-avance { avance_id } → borra el avance, sus fotos y los archivos.
// Va por el servidor porque desde la app (anon) no se puede borrar: así los archivos del
// Storage también se eliminan y no quedan fotos huérfanas ocupando espacio.
import { clienteAdmin, json, manejar, RE_UUID } from '../lib/push.mjs'

export default manejar(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)
  const { avance_id } = await req.json().catch(() => ({}))
  if (typeof avance_id !== 'string' || !RE_UUID.test(avance_id)) return json({ error: 'Avance inválido' }, 400)

  const db = clienteAdmin()
  const { data: avance, error } = await db
    .from('avances')
    .select('id, fotos:fotos_avance ( storage_path, thumb_path )')
    .eq('id', avance_id)
    .maybeSingle()
  if (error) throw error
  if (!avance) return json({ borrado: true }) // ya no existía: mismo resultado

  const rutas = avance.fotos.flatMap((f) => [f.storage_path, f.thumb_path]).filter(Boolean)
  // Primero el registro (con sus fotos, en cascada): si falla, no se tocan los archivos.
  const { error: errorBorrar } = await db.from('avances').delete().eq('id', avance_id)
  if (errorBorrar) throw errorBorrar
  if (rutas.length) {
    const { error: errorArchivos } = await db.storage.from('fotos-avance').remove(rutas)
    if (errorArchivos) console.error('No se pudieron borrar los archivos', avance_id, errorArchivos)
  }
  return json({ borrado: true, archivos: rutas.length })
})
