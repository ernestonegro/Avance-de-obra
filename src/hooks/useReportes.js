import { useCallback, useEffect, useState } from 'react'
import { supabase, mensajeError } from '../lib/supabase'

export function useReportes(proyectoId) {
  const [reportes, setReportes] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const recargar = useCallback(async () => {
    if (!proyectoId) {
      setReportes([])
      return
    }
    setCargando(true)
    setError('')
    const { data, error } = await supabase
      .from('reportes_publicos')
      .select('id, token, titulo, fecha_desde, fecha_hasta, incluir_notas_internas, incluir_problemas, expira_en, revocado, created_at')
      .eq('proyecto_id', proyectoId)
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) setError(mensajeError(error))
    else setReportes(data)
    setCargando(false)
  }, [proyectoId])

  useEffect(() => {
    recargar()
  }, [recargar])

  const crear = useCallback(
    async (datos) => {
      const { data, error } = await supabase
        .from('reportes_publicos')
        .insert({ proyecto_id: proyectoId, ...datos })
        .select('id, token')
        .single()
      // 23502 (not null) en las fechas: la base todavía no tiene la migración de enlaces en vivo.
      if (error?.code === '23502' && /fecha_(desde|hasta)/.test(error.message)) {
        throw new Error('La base todavía no admite enlaces en vivo: falta correr en Supabase el SQL "20261121000000_enlaces_en_vivo.sql".')
      }
      if (error) throw new Error(mensajeError(error))
      await recargar()
      return data
    },
    [proyectoId, recargar],
  )

  const revocar = useCallback(
    async (id) => {
      const { error } = await supabase.from('reportes_publicos').update({ revocado: true }).eq('id', id)
      if (error) throw new Error(mensajeError(error))
      await recargar()
    },
    [recargar],
  )

  return { reportes, cargando, error, recargar, crear, revocar }
}

export const urlReportePublico = (token) => `${window.location.origin}/r/${token}`
