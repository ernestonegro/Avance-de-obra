const LOCALE = 'es-AR'

const fmtDia = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const fmtHora = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit', hour12: false })
const fmtHoraExacta = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
const fmtFechaCorta = new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric' })

/** Clave YYYY-MM-DD en hora local del dispositivo, para agrupar el feed. */
export function claveDia(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function hoyISO() {
  return claveDia(new Date().toISOString())
}

export function restarDias(fechaISO, dias) {
  const [y, m, d] = fechaISO.split('-').map(Number)
  const f = new Date(y, m - 1, d - dias)
  return claveDia(f.toISOString())
}

/** "Hoy", "Ayer" o "lunes, 17 de noviembre de 2026". */
export function tituloDia(clave) {
  const hoy = hoyISO()
  if (clave === hoy) return 'Hoy'
  if (clave === restarDias(hoy, 1)) return 'Ayer'
  const [y, m, d] = clave.split('-').map(Number)
  const texto = fmtDia.format(new Date(y, m - 1, d))
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export const hora = (iso) => fmtHora.format(new Date(iso))
export const horaExacta = (iso) => fmtHoraExacta.format(new Date(iso))
export const fechaCorta = (iso) => fmtFechaCorta.format(new Date(iso))
export function fechaLarga(iso) {
  const t = fmtDia.format(new Date(iso))
  return t.charAt(0).toUpperCase() + t.slice(1)
}
/** Para fechas "date" de Postgres (YYYY-MM-DD) sin corrimiento por zona horaria. */
export function fechaCortaDesdeDia(clave) {
  const [y, m, d] = clave.split('-').map(Number)
  return fmtFechaCorta.format(new Date(y, m - 1, d))
}
