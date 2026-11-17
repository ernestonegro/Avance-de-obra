import { useCallback, useState } from 'react'

const CLAVE = 'bitacora:autor'

/** Sin login: quien registra escribe su nombre una vez y queda recordado en este teléfono. */
export function useAutor() {
  const [autor, setAutorState] = useState(() => {
    try {
      return localStorage.getItem(CLAVE) || ''
    } catch {
      return ''
    }
  })
  const setAutor = useCallback((nombre) => {
    setAutorState(nombre)
    try {
      if (nombre.trim()) localStorage.setItem(CLAVE, nombre.trim())
    } catch {
      /* almacenamiento bloqueado: sólo en memoria */
    }
  }, [])
  return [autor, setAutor]
}
