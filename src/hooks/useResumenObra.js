import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Indicadores de la obra (o de todas): se cuentan en el servidor con `head: true`,
 * sin descargar filas, así no pesan con señal débil.
 */
export function useResumenObra(proyectoId) {
  const [resumen, setResumen] = useState(null)
  const [cargando, setCargando] = useState(true)
  const consulta = useRef(0)

  const recargar = useCallback(async () => {
    const id = ++consulta.current
    setCargando(true)
    const contar = (q) => q.then(({ count, error }) => (error ? null : count))
    const avances = () => {
      const q = supabase.from('avances').select('id', { count: 'exact', head: true })
      return proyectoId ? q.eq('proyecto_id', proyectoId) : q
    }
    const fotos = proyectoId
      ? supabase
          .from('fotos_avance')
          .select('id, avances!inner(proyecto_id)', { count: 'exact', head: true })
          .eq('avances.proyecto_id', proyectoId)
      : supabase.from('fotos_avance').select('id', { count: 'exact', head: true })

    const [registros, cantFotos, problemas, inspeccion] = await Promise.all([
      contar(avances()),
      contar(fotos),
      contar(avances().in('estado', ['requiere_material', 'demora_imprevisto'])),
      contar(avances().eq('estado', 'listo_inspeccion')),
    ])
    if (id !== consulta.current) return
    setResumen({ registros, fotos: cantFotos, problemas, inspeccion })
    setCargando(false)
  }, [proyectoId])

  useEffect(() => {
    recargar()
  }, [recargar])

  return { resumen, cargando, recargar }
}
