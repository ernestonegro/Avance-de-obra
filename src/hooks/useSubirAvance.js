import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, mensajeError, esErrorDeRed } from '../lib/supabase'
import { comprimirFoto } from '../lib/imagenes'
import { subirArchivo, esperarSenal } from '../lib/subida'

/*
 * Estados por foto: pendiente → comprimiendo → subiendo → lista | error
 * Peso en la barra de cada foto: compresión 25 %, principal 65 %, miniatura 10 %.
 *
 * Las fotos ya subidas no se vuelven a subir en un reintento, y el UUID del avance
 * se mantiene hasta que el alta se confirma: reintentar nunca duplica registros.
 */

const nuevoId = () => crypto.randomUUID()
const pausa = (ms) => new Promise((r) => setTimeout(r, ms))

// Algunas galerías de Android entregan archivos sin tipo MIME: se aceptan por extensión.
const esImagen = (a) => a.type.startsWith('image/') || (!a.type && /\.(jpe?g|png|webp|heic|heif|gif|bmp)$/i.test(a.name))

export function useSubirAvance() {
  const [fotos, setFotos] = useState([])
  const [fase, setFase] = useState('editando') // editando | enviando | guardando | listo | error
  const [error, setError] = useState('')
  const avanceIdRef = useRef(nuevoId())
  const abortRef = useRef(null)
  const enCursoRef = useRef(false) // evita dos envíos simultáneos por doble toque
  const fotosRef = useRef(fotos)
  fotosRef.current = fotos

  // Liberar object URLs al desmontar.
  useEffect(() => () => fotosRef.current.forEach((f) => URL.revokeObjectURL(f.preview)), [])

  const actualizarFoto = useCallback((id, cambios) => {
    setFotos((prev) => prev.map((f) => (f.id === id ? { ...f, ...cambios } : f)))
  }, [])

  /** Agrega imágenes y devuelve cuántos archivos se descartaron por no ser imágenes. */
  const agregarArchivos = useCallback((archivos) => {
    const lista = Array.from(archivos)
    const nuevas = lista.filter(esImagen).map((archivo) => ({
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
    return lista.length - nuevas.length
  }, [])

  const quitarFoto = useCallback((id) => {
    if (enCursoRef.current) return
    setFotos((prev) => {
      const f = prev.find((x) => x.id === id)
      if (f) URL.revokeObjectURL(f.preview)
      return prev.filter((x) => x.id !== id)
    })
  }, [])

  const procesarFoto = useCallback(
    async (foto, proyectoId, signal) => {
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
    async ({ proyectoId, autorNombre, etapa, estado, comentario, notaInterna }) => {
      if (enCursoRef.current) return false
      enCursoRef.current = true
      setError('')
      setFase('enviando')
      const controlador = new AbortController()
      abortRef.current = controlador

      try {
        const lista = fotosRef.current
        const subidas = []
        let fallo = null

        for (const [i, foto] of lista.entries()) {
          if (controlador.signal.aborted) break
          try {
            // El orden sale siempre de la posición actual, no de un intento previo.
            subidas.push({ ...(await procesarFoto(foto, proyectoId, controlador.signal)), orden: i })
          } catch (e) {
            fallo = fallo ?? e
            actualizarFoto(foto.id, { estado: 'error', error: e.message || 'Error' })
          }
        }

        if (fallo || controlador.signal.aborted) {
          setFase('error')
          setError(
            controlador.signal.aborted
              ? 'Subida cancelada. Las fotos ya subidas se conservan: tocá "Reintentar" para seguir.'
              : `No se pudieron subir todas las fotos: ${mensajeError(fallo)}. Tocá "Reintentar": sólo se suben las que faltan (o quitá la que falla).`,
          )
          return false
        }

        setFase('guardando')
        const parametros = {
          p_id: avanceIdRef.current,
          p_proyecto_id: proyectoId,
          p_autor_nombre: autorNombre,
          p_etapa: etapa,
          p_estado: estado,
          p_comentario: comentario,
          p_nota_interna: notaInterna,
          p_fotos: subidas,
        }
        // Si se corta la red al guardar, se reintenta: la RPC es idempotente.
        let errorRpc = null
        for (let intento = 0; intento < 4; intento++) {
          if (intento > 0) {
            await esperarSenal()
            await pausa(1000 * 2 ** (intento - 1))
          }
          ;({ error: errorRpc } = await supabase.rpc('crear_avance', parametros))
          if (!errorRpc || !esErrorDeRed(errorRpc)) break
        }
        if (errorRpc) {
          setFase('error')
          setError(
            subidas.length
              ? `Las fotos se subieron pero no se pudo guardar el registro: ${mensajeError(errorRpc)}`
              : `No se pudo guardar el registro: ${mensajeError(errorRpc)}`,
          )
          return false
        }
        setFase('listo')
        return true
      } finally {
        enCursoRef.current = false
      }
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
