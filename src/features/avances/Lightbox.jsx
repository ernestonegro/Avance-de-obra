import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X, Clock, User, Camera, Layers, WifiOff } from 'lucide-react'
import { urlFoto } from '../../lib/supabase'
import { etiquetaEtapa } from '../../lib/constantes'
import BadgeEstado from '../../components/ui/BadgeEstado'
import { fechaLarga, horaExacta } from '../../lib/fechas'

/**
 * Visor a pantalla completa. Muestra fecha, hora exacta (hh:mm:ss) y autor del registro.
 * Navegación: deslizar, flechas en pantalla o teclado (← → Esc).
 * @param {{ fotos: any[], indice: number, avance: { registrado_en, autor_nombre, etapa, proyecto }, onCerrar: () => void, zonaHoraria?: string }} props
 */
export default function Lightbox({ fotos, indice: indiceInicial, avance, onCerrar, zonaHoraria }) {
  const [indice, setIndice] = useState(Math.min(indiceInicial, Math.max(fotos.length - 1, 0)))
  const [cargada, setCargada] = useState(false)
  const [fallo, setFallo] = useState(false)
  // Ref: si el padre pasa una función nueva en cada render, el efecto no se re-ejecuta.
  const onCerrarRef = useRef(onCerrar)
  onCerrarRef.current = onCerrar
  const toqueX = useRef(null)
  const cerrarRef = useRef(null)
  const foto = fotos[indice]
  const total = fotos.length

  const ir = useCallback(
    (delta) => {
      setCargada(false)
      setFallo(false)
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
      if (e.key === 'Escape') onCerrarRef.current()
      if (e.key === 'ArrowRight' && total > 1) ir(1)
      if (e.key === 'ArrowLeft' && total > 1) ir(-1)
    }
    window.addEventListener('keydown', alTeclear)
    return () => {
      document.body.style.overflow = overflowPrevio
      window.removeEventListener('keydown', alTeclear)
      anterior?.focus?.()
    }
  }, [ir, total])

  // Precargar la siguiente foto: al deslizar ya está en caché.
  useEffect(() => {
    if (total > 1) {
      const img = new Image()
      img.crossOrigin = 'anonymous' // mismo modo que el <img> visible: comparten caché
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
    <div className="no-imprimir fixed inset-0 z-50 flex flex-col bg-black text-white lg:flex-row" role="dialog" aria-modal="true" aria-label="Foto ampliada">
      <div className="flex min-h-0 flex-1 flex-col">
      <div className="pt-safe flex items-center justify-between gap-2 px-2 lg:px-4 lg:pt-2">
        <span className="px-2 text-base font-bold" aria-live="polite">
          {total > 1 ? `${indice + 1} / ${total}` : ''}
        </span>
        <button ref={cerrarRef} onClick={() => onCerrarRef.current()} className="flex size-14 items-center justify-center rounded-full hover:bg-white/10 active:bg-white/20" aria-label="Cerrar">
          <X className="size-8" />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center" onTouchStart={alTocar} onTouchEnd={alSoltar}>
        {/* Miniatura (ya en caché) como placeholder mientras carga la versión grande */}
        {!cargada && (
          <img
            src={urlFoto(foto.thumb_path)}
            crossOrigin="anonymous"
            alt=""
            className={`absolute max-h-full max-w-full object-contain ${fallo ? '' : 'opacity-60 blur-sm'}`}
          />
        )}
        {fallo && (
          <p className="absolute top-2 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/80 px-3 py-1.5 text-sm font-bold whitespace-nowrap">
            <WifiOff className="size-4" aria-hidden /> Sin señal: mostrando miniatura
          </p>
        )}
        <img
          key={foto.id}
          src={urlFoto(foto.storage_path)}
          alt={`Foto ${indice + 1} de ${etiquetaEtapa(avance.etapa)}`}
          crossOrigin="anonymous"
          onLoad={() => setCargada(true)}
          onError={() => setFallo(true)}
          className={`relative max-h-full max-w-full object-contain transition-opacity ${cargada ? 'opacity-100' : 'opacity-0'}`}
          draggable={false}
        />
        {total > 1 && (
          <>
            <button onClick={() => ir(-1)} className="absolute top-1/2 left-1 flex size-14 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 hover:bg-white/20 active:bg-black/90 lg:left-4" aria-label="Foto anterior">
              <ChevronLeft className="size-9" />
            </button>
            <button onClick={() => ir(1)} className="absolute top-1/2 right-1 flex size-14 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 hover:bg-white/20 active:bg-black/90 lg:right-4" aria-label="Foto siguiente">
              <ChevronRight className="size-9" />
            </button>
          </>
        )}
      </div>

      {/* Tira de miniaturas (escritorio) */}
      {total > 1 && (
        <div className="hidden justify-center gap-2 overflow-x-auto px-4 py-3 lg:flex">
          {fotos.map((f, i) => (
            <button
              key={f.id}
              onClick={() => i !== indice && ir(i - indice)}
              className={`size-16 shrink-0 overflow-hidden rounded-lg ring-2 transition ${i === indice ? 'ring-yellow-400' : 'opacity-60 ring-transparent hover:opacity-100'}`}
              aria-label={`Ver foto ${i + 1}`}
              aria-current={i === indice}
            >
              <img src={urlFoto(f.thumb_path)} crossOrigin="anonymous" alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
      </div>

      <dl className="pb-safe space-y-1.5 border-t border-white/25 bg-black px-4 pt-3 text-[0.95rem] lg:w-96 lg:shrink-0 lg:space-y-4 lg:overflow-y-auto lg:border-t-0 lg:border-l lg:bg-neutral-950 lg:p-6 lg:text-base">
        <div className="hidden lg:block">
          <div className="franja-obra -mx-6 -mt-6 mb-5 h-1.5" aria-hidden />
          <p className="text-2xl font-black">{etiquetaEtapa(avance.etapa)}</p>
          <div className="mt-2">
            <BadgeEstado estado={avance.estado} />
          </div>
        </div>
        <div className="flex items-center gap-2 font-bold">
          <Clock className="size-5 shrink-0 text-yellow-400" aria-hidden />
          <dt className="sr-only">Registrado</dt>
          <dd>
            {fechaLarga(avance.registrado_en, zonaHoraria)} · {horaExacta(avance.registrado_en, zonaHoraria)} h
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
            <dd>Foto tomada {horaExacta(foto.tomada_en, zonaHoraria)} h</dd>
          </div>
        )}
        {avance.comentario && (
          <div className="hidden border-t border-white/10 pt-4 lg:block">
            <dt className="mb-1 text-xs font-bold tracking-widest text-neutral-400 uppercase">Comentario</dt>
            <dd className="leading-snug whitespace-pre-line text-neutral-100">{avance.comentario}</dd>
          </div>
        )}
      </dl>
    </div>
  )
}
