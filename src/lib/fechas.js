const LOCALE = 'es-AR'

// Formateadores cacheados por zona horaria (crear Intl.DateTimeFormat es costoso).
const cache = new Map()
function fmt(tipo, tz) {
  const k = `${tipo}|${tz || ''}`
  if (!cache.has(k)) {
    const opciones = {
      dia: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
      hora: { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' },
      horaExacta: { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' },
      fechaCorta: { day: '2-digit', month: '2-digit', year: 'numeric' },
      clave: { year: 'numeric', month: '2-digit', day: '2-digit' },
    }[tipo]
    // en-CA formatea la clave como YYYY-MM-DD
    cache.set(k, new Intl.DateTimeFormat(tipo === 'clave' ? 'en-CA' : LOCALE, { ...opciones, ...(tz && { timeZone: tz }) }))
  }
  return cache.get(k)
}

const capitalizar = (t) => t.charAt(0).toUpperCase() + t.slice(1)

/** Clave YYYY-MM-DD para agrupar por día (hora local del dispositivo o de la zona indicada). */
export const claveDia = (iso, tz) => fmt('clave', tz).format(new Date(iso))

export const hoyISO = (tz) => claveDia(new Date().toISOString(), tz)

/** Resta días a una clave YYYY-MM-DD (aritmética de calendario, sin zona horaria). */
export function restarDias(clave, dias) {
  const [y, m, d] = clave.split('-').map(Number)
  const f = new Date(Date.UTC(y, m - 1, d - dias))
  return f.toISOString().slice(0, 10)
}

/** Fecha de calendario (YYYY-MM-DD) como Date al mediodía UTC: no se corre de día en ninguna zona. */
const desdeClave = (clave) => {
  const [y, m, d] = clave.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12))
}

/** "Hoy", "Ayer" o "Lunes, 17 de noviembre de 2026". */
export function tituloDia(clave, tz) {
  const hoy = hoyISO(tz)
  if (clave === hoy) return 'Hoy'
  if (clave === restarDias(hoy, 1)) return 'Ayer'
  return capitalizar(fmt('dia', 'UTC').format(desdeClave(clave)))
}

/** Siempre la fecha completa (para reportes, donde "Hoy" pierde sentido al imprimir). */
export const tituloDiaCompleto = (clave) => capitalizar(fmt('dia', 'UTC').format(desdeClave(clave)))

export const hora = (iso, tz) => fmt('hora', tz).format(new Date(iso))
export const horaExacta = (iso, tz) => fmt('horaExacta', tz).format(new Date(iso))
export const fechaCorta = (iso, tz) => fmt('fechaCorta', tz).format(new Date(iso))
export const fechaLarga = (iso, tz) => capitalizar(fmt('dia', tz).format(new Date(iso)))

/** Para fechas "date" de Postgres (YYYY-MM-DD) sin corrimiento por zona horaria. */
export const fechaCortaDesdeDia = (clave) => fmt('fechaCorta', 'UTC').format(desdeClave(clave))
