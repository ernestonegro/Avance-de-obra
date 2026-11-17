import { useCallback, useEffect, useState } from 'react'
import { supabase, mensajeError } from '../lib/supabase'

const CLAVE_OBRA_ACTIVA = 'bitacora:obra-activa'

/** Obras registradas. */
export function useProyectos({ incluirInactivos = false } = {}) {
  const [proyectos, setProyectos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const recargar = useCallback(async () => {
    setCargando(true)
    setError('')
    let q = supabase
      .from('proyectos')
      .select('id, nombre, direccion, cliente_nombre, fecha_inicio, zona_horaria, activo, created_at')
      .order('nombre')
    if (!incluirInactivos) q = q.eq('activo', true)
    const { data, error } = await q
    if (error) setError(mensajeError(error))
    else setProyectos(data)
    setCargando(false)
  }, [incluirInactivos])

  useEffect(() => {
    recargar()
  }, [recargar])

  return { proyectos, cargando, error, recargar }
}

/** Obra seleccionada, recordada entre sesiones en este dispositivo. */
export function useObraActiva() {
  const [obraActiva, setObraActivaState] = useState(() => {
    try {
      return localStorage.getItem(CLAVE_OBRA_ACTIVA) || ''
    } catch {
      return ''
    }
  })
  const setObraActiva = useCallback((id) => {
    setObraActivaState(id)
    try {
      if (id) localStorage.setItem(CLAVE_OBRA_ACTIVA, id)
      else localStorage.removeItem(CLAVE_OBRA_ACTIVA)
    } catch {
      /* almacenamiento bloqueado: se usa sólo en memoria */
    }
  }, [])
  return [obraActiva, setObraActiva]
}
