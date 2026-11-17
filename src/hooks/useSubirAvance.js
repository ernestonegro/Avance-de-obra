import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, mensajeError } from '../lib/supabase'
import { comprimirFoto } from '../lib/imagenes'
import { subirArchivo } from '../lib/subida'

/*
 * Estados por foto: pendiente → comprimiendo → subiendo → lista | error
 * Peso en la barra de cada foto: compresión 25 %, principal 65 %, miniatura 10 %.
 *
 * Las fotos ya subidas no se vuelven a subir en un reintento, y el UUID del avance
 * se mantiene hasta que el alta se confirma: reintentar nunca duplica registros.
 */

const nuevoId = () => crypto.randomUUID()

export function useSubirAvance() {
  const [fotos, setFotos] = useState([])
  const [fase, setFase] = useState('editando') // editando | enviando | guardando | listo | error
  const [error, setError] = useState('')
  const avanceIdRef = useRef(nuevoId())
  const abortRef = useRef(null)
  const fotosRef = useRef(fotos)
  fotosRef.current = fotos

  // Liberar object URLs al desmontar.
  useEffect(() => () => fotosRef.current.forEach((f) => URL.revokeObjectURL(f.preview)), [])

  const actualizarFoto = useCallback((id, cambios) => {
    setFotos((prev) => prev.map((f) => (f.id === id ? { ...f, ...cambios } : f)))
  }, [])

  const agregarArchivos = useCallback((archivos) => {
    const nuevas = Array.from(archivos)
      .filter((a) => a.type.startsWith('image/'))
      .map((archivo) => ({
        id: nuevoId(),
        archivo,
        preview: URL.createObjectURL(archivo),
        estado: 'pendiente',
        progreso: 0,
        comprimida: null,
        subida: null,
        error: '',
      }))
    setFotos((prev) => [...prev, ...nuevas])
    return nuevas.length
  }, [])

  const quitarFoto = useCallback((id) => {
    setFotos((prev) => {
      const f = prev.find((x) => x.id === id)
      if (f) URL.revokeObjectURL(f.preview)
      return prev.filter((x) => x.id !== id)
    })
  }, [])

  const procesarFoto = useCallback(
    async (foto, proyectoId, orden, signal) => {
      if (foto.subida) return foto.subida
      let comprimida = foto.comprimida
      if (!comprimida) {
        actualizarFoto(foto.id, { estado: 'comprimiendo', progreso: 0, error: '' })
        comprimida = await comprimirFoto(foto.archivo, (p) => actualizarFoto(foto.id, { progreso: Math.round(p * 0.25) }))
        actualizarFoto(foto.id, { comprimida })
      }
      const base = `${proyectoId}/${avanceIdRef.current}/${foto.id}`
      const storage_path = `${base}.jpg`
      const thumb_path = `${base}_m.jpg`

      actualizarFoto(foto.id, { estado: 'subiendo', progreso: 25, error: '' })
      await subirArchivo({
        ruta: storage_path,
        blob: comprimida.principal,
        signal,
        onProgreso: (p) => actualizarFoto(foto.id, { progreso: 25 + Math.round(p * 0.65) }),
      })
      await subirArchivo({
        ruta: thumb_path,
        blob: comprimida.miniatura,
        signal,
        onProgreso: (p) => actualizarFoto(foto.id, { progreso: 90 + Math.round(p * 0.1) }),
      })

      const subida = {
        storage_path,
        thumb_path,
        ancho: comprimida.ancho,
        alto: comprimida.alto,
        bytes: comprimida.principal.size,
        orden,
        tomada_en: comprimida.tomadaEn,
      }
      actualizarFoto(foto.id, { estado: 'lista', progreso: 100, subida })
      return subida
    },
    [actualizarFoto],
  )

  /**
   * Comprime y sube las fotos de a una (con señal débil, en serie es más estable
   * que en paralelo) y luego registra el avance en una sola transacción.
   */
  const enviar = useCallback(
    async ({ proyectoId, etapa, estado, comentario, notaInterna }) => {
      setError('')
      setFase('enviando')
      const controlador = new AbortController()
      abortRef.current = controlador
      const lista = fotosRef.current
      const subidas = []
      let fallo = null

      for (const [i, foto] of lista.entries()) {
        try {
          subidas.push(await procesarFoto(foto, proyectoId, i, controlador.signal))
        } catch (e) {
          fallo = fallo ?? e
          actualizarFoto(foto.id, { estado: 'error', error: e.message || 'Error' })
          if (controlador.signal.aborted) break
        }
      }

      if (fallo) {
        setFase('error')
        setError(
          controlador.signal.aborted
            ? 'Subida cancelada. Las fotos ya subidas se conservan.'
            : `No se pudieron subir todas las fotos: ${mensajeError(fallo)}. Tocá "Reintentar": sólo se suben las que faltan.`,
        )
        return false
      }

      setFase('guardando')
      const { error: errorRpc } = await supabase.rpc('crear_avance', {
        p_id: avanceIdRef.current,
        p_proyecto_id: proyectoId,
        p_etapa: etapa,
        p_estado: estado,
        p_comentario: comentario,
        p_nota_interna: notaInterna,
        p_fotos: subidas,
      })
      if (errorRpc) {
        setFase('error')
        setError(`Las fotos se subieron pero no se pudo guardar el registro: ${mensajeError(errorRpc)}`)
        return false
      }
      setFase('listo')
      return true
    },
    [actualizarFoto, procesarFoto],
  )

  const cancelar = useCallback(() => abortRef.current?.abort(), [])

  const reiniciar = useCallback(() => {
    fotosRef.current.forEach((f) => URL.revokeObjectURL(f.preview))
    setFotos([])
    setFase('editando')
    setError('')
    avanceIdRef.current = nuevoId()
  }, [])

  const progresoTotal = fotos.length
    ? Math.round(fotos.reduce((s, f) => s + f.progreso, 0) / fotos.length)
    : fase === 'listo'
      ? 100
      : 0

  return {
    fotos,
    fase,
    error,
    progresoTotal,
    enviando: fase === 'enviando' || fase === 'guardando',
    agregarArchivos,
    quitarFoto,
    enviar,
    cancelar,
    reiniciar,
  }
}
