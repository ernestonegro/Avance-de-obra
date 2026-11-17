import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X, Clock, User, Camera, Layers } from 'lucide-react'
import { urlFoto } from '../../lib/supabase'
import { etiquetaEtapa } from '../../lib/constantes'
import { fechaLarga, horaExacta } from '../../lib/fechas'

/**
 * Visor a pantalla completa. Muestra fecha, hora exacta (hh:mm:ss) y autor del registro.
 * Navegación: deslizar, flechas en pantalla o teclado (← → Esc).
 * @param {{ fotos: any[], indice: number, avance: { registrado_en, autor_nombre, etapa, proyecto }, onCerrar: () => void }} props
 */
export default function Lightbox({ fotos, indice: indiceInicial, avance, onCerrar }) {
  const [indice, setIndice] = useState(indiceInicial)
  const [cargada, setCargada] = useState(false)
  const toqueX = useRef(null)
  const cerrarRef = useRef(null)
  const foto = fotos[indice]
  const total = fotos.length

  const ir = useCallback(
    (delta) => {
      setCargada(false)
      setIndice((i) => (i + delta + total) % total)
    },
    [total],
  )

  useEffect(() => {
    const anterior = document.activeElement
    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    cerrarRef.current?.focus()
    const alTeclear = (e) => {
      if (e.key === 'Escape') onCerrar()
      if (e.key === 'ArrowRight' && total > 1) ir(1)
      if (e.key === 'ArrowLeft' && total > 1) ir(-1)
    }
    window.addEventListener('keydown', alTeclear)
    return () => {
      document.body.style.overflow = overflowPrevio
      window.removeEventListener('keydown', alTeclear)
      anterior?.focus?.()
    }
  }, [ir, onCerrar, total])

  // Precargar la siguiente foto: al deslizar ya está en caché.
  useEffect(() => {
    if (total > 1) {
      const img = new Image()
      img.src = urlFoto(fotos[(indice + 1) % total].storage_path)
    }
  }, [indice, fotos, total])

  const alTocar = (e) => {
    toqueX.current = e.touches[0].clientX
  }
  const alSoltar = (e) => {
    if (toqueX.current === null || total < 2) return
    const dx = e.changedTouches[0].clientX - toqueX.current
    if (Math.abs(dx) > 50) ir(dx < 0 ? 1 : -1)
    toqueX.current = null
  }

  if (!foto) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label="Foto ampliada">
      <div className="pt-safe flex items-center justify-between gap-2 px-2">
        <span className="px-2 text-base font-bold" aria-live="polite">
          {total > 1 ? `${indice + 1} / ${total}` : ''}
        </span>
        <button ref={cerrarRef} onClick={onCerrar} className="flex size-14 items-center justify-center rounded-full active:bg-white/20" aria-label="Cerrar">
          <X className="size-8" />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center" onTouchStart={alTocar} onTouchEnd={alSoltar}>
        {/* Miniatura (ya en caché) como placeholder mientras carga la versión grande */}
        {!cargada && <img src={urlFoto(foto.thumb_path)} alt="" className="absolute max-h-full max-w-full object-contain opacity-60 blur-sm" />}
        <img
          key={foto.id}
          src={urlFoto(foto.storage_path)}
          alt={`Foto ${indice + 1} de ${etiquetaEtapa(avance.etapa)}`}
          onLoad={() => setCargada(true)}
          className={`relative max-h-full max-w-full object-contain transition-opacity ${cargada ? 'opacity-100' : 'opacity-0'}`}
          draggable={false}
        />
        {total > 1 && (
          <>
            <button onClick={() => ir(-1)} className="absolute top-1/2 left-1 flex size-14 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 active:bg-black/90" aria-label="Foto anterior">
              <ChevronLeft className="size-9" />
            </button>
            <button onClick={() => ir(1)} className="absolute top-1/2 right-1 flex size-14 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 active:bg-black/90" aria-label="Foto siguiente">
              <ChevronRight className="size-9" />
            </button>
          </>
        )}
      </div>

      <dl className="pb-safe space-y-1.5 border-t border-white/25 bg-black px-4 pt-3 text-[0.95rem]">
        <div className="flex items-center gap-2 font-bold">
          <Clock className="size-5 shrink-0 text-yellow-400" aria-hidden />
          <dt className="sr-only">Registrado</dt>
          <dd>
            {fechaLarga(avance.registrado_en)} · {horaExacta(avance.registrado_en)} h
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <User className="size-5 shrink-0 text-yellow-400" aria-hidden />
          <dt className="sr-only">Autor</dt>
          <dd>{avance.autor_nombre}</dd>
        </div>
        <div className="flex items-center gap-2">
          <Layers className="size-5 shrink-0 text-yellow-400" aria-hidden />
          <dt className="sr-only">Etapa</dt>
          <dd>
            {etiquetaEtapa(avance.etapa)}
            {avance.proyecto?.nombre && ` · ${avance.proyecto.nombre}`}
          </dd>
        </div>
        {foto.tomada_en && (
          <div className="flex items-center gap-2 text-neutral-300">
            <Camera className="size-5 shrink-0" aria-hidden />
            <dt className="sr-only">Foto tomada</dt>
            <dd>Foto tomada {horaExacta(foto.tomada_en)} h</dd>
          </div>
        )}
      </dl>
    </div>
  )
}
