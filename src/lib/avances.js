/** Borra un avance con sus fotos (lo hace la función de Netlify con la clave de servidor). */
export async function borrarAvance(avanceId) {
  let resp
  try {
    resp = await fetch('/.netlify/functions/borrar-avance', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ avance_id: avanceId }),
    })
  } catch {
    throw new Error('Sin conexión. Probá de nuevo cuando vuelva la señal.')
  }
  const cuerpo = await resp.json().catch(() => ({}))
  if (!resp.ok) throw new Error(cuerpo.error || `Error ${resp.status} al borrar`)
  return cuerpo
}
