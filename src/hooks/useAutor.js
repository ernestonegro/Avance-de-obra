import { useSyncExternalStore } from 'react'

/*
 * Sin login: quien registra escribe su nombre una vez y queda recordado en este teléfono.
 * Store compartido: el encabezado y el formulario ven siempre el mismo valor.
 */
const CLAVE = 'bitacora:autor'
const suscriptores = new Set()

let valor = (() => {
  try {
    return localStorage.getItem(CLAVE) || ''
  } catch {
    return ''
  }
})()

function setAutor(nombre) {
  valor = nombre
  try {
    if (nombre.trim()) localStorage.setItem(CLAVE, nombre.trim())
    else localStorage.removeItem(CLAVE)
  } catch {
    /* almacenamiento bloqueado: sólo en memoria */
  }
  suscriptores.forEach((fn) => fn())
}

const suscribir = (fn) => {
  suscriptores.add(fn)
  return () => suscriptores.delete(fn)
}

export function useAutor() {
  const autor = useSyncExternalStore(suscribir, () => valor)
  return [autor, setAutor]
}
