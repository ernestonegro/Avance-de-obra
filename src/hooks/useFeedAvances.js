import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, mensajeError } from '../lib/supabase'

const TAM_PAGINA = 15

const SELECT_AVANCE = `
  id, proyecto_id, etapa, estado, comentario, nota_interna, registrado_en, autor_id,
  autor:perfiles!avances_autor_id_fkey ( nombre ),
  proyecto:proyectos ( nombre ),
  fotos:fotos_avance ( id, storage_path, thumb_path, ancho, alto, orden, tomada_en )
`

/**
 * Feed cronológico inverso con filtros y paginación incremental.
 * @param {{ proyectoId?: string, etapa?: string, estado?: string }} filtros
 */
export function useFeedAvances({ proyectoId = '', etapa = '', estado = '' } = {}) {
  const [avances, setAvances] = useState([])
  const [cargando, setCargando] = useState(true)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [hayMas, setHayMas] = useState(true)
  const [error, setError] = useState('')
  const consultaActual = useRef(0)

  const traerPagina = useCallback(
    async (desde) => {
      let q = supabase
        .from('avances')
        .select(SELECT_AVANCE)
        .order('registrado_en', { ascending: false })
        .order('id', { ascending: false })
        .range(desde, desde + TAM_PAGINA - 1)
      if (proyectoId) q = q.eq('proyecto_id', proyectoId)
      if (etapa) q = q.eq('etapa', etapa)
      if (estado) q = q.eq('estado', estado)
      const { data, error } = await q
      if (error) throw error
      return data.map((a) => ({ ...a, fotos: [...a.fotos].sort((x, y) => x.orden - y.orden) }))
    },
    [proyectoId, etapa, estado],
  )

  const recargar = useCallback(async () => {
    const id = ++consultaActual.current
    setCargando(true)
    setError('')
    try {
      const datos = await traerPagina(0)
      if (id !== consultaActual.current) return // respuesta vieja: filtros cambiaron
      setAvances(datos)
      setHayMas(datos.length === TAM_PAGINA)
    } catch (e) {
      if (id === consultaActual.current) setError(mensajeError(e))
    } finally {
      if (id === consultaActual.current) setCargando(false)
    }
  }, [traerPagina])

  const cargarMas = useCallback(async () => {
    if (cargando || cargandoMas || !hayMas) return
    const id = consultaActual.current
    setCargandoMas(true)
    try {
      const datos = await traerPagina(avances.length)
      if (id !== consultaActual.current) return
      setAvances((prev) => {
        const vistos = new Set(prev.map((a) => a.id))
        return [...prev, ...datos.filter((a) => !vistos.has(a.id))]
      })
      setHayMas(datos.length === TAM_PAGINA)
    } catch (e) {
      if (id === consultaActual.current) setError(mensajeError(e))
    } finally {
      setCargandoMas(false)
    }
  }, [avances.length, cargando, cargandoMas, hayMas, traerPagina])

  useEffect(() => {
    recargar()
  }, [recargar])

  return { avances, cargando, cargandoMas, hayMas, error, recargar, cargarMas }
}
