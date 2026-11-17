import { useRef } from 'react'
import { Camera, Images, X, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { MAX_FOTOS_POR_AVANCE } from '../../lib/constantes'
import { formatearBytes } from '../../lib/imagenes'

const TEXTO_ESTADO = {
  pendiente: 'En espera',
  comprimiendo: 'Comprimiendo…',
  subiendo: 'Subiendo…',
  lista: 'Subida',
  error: 'Error',
}

function MiniaturaFoto({ foto, onQuitar, bloqueado }) {
  const activa = foto.estado === 'comprimiendo' || foto.estado === 'subiendo'
  return (
    <li className="relative aspect-square overflow-hidden rounded-xl border-2 border-neutral-950 bg-neutral-100">
      <img src={foto.preview} alt="" className="size-full object-cover" />

      {foto.estado !== 'pendiente' && (
        <div
          className={`absolute inset-x-0 bottom-0 px-1.5 pt-1 pb-1.5 text-xs font-bold ${
            foto.estado === 'error' ? 'bg-red-700 text-white' : foto.estado === 'lista' ? 'bg-green-700 text-white' : 'bg-neutral-950/85 text-white'
          }`}
        >
          <div className="flex items-center gap-1">
            {activa && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
            {foto.estado === 'lista' && <CheckCircle2 className="size-3.5" aria-hidden />}
            {foto.estado === 'error' && <AlertTriangle className="size-3.5" aria-hidden />}
            <span className="truncate">
              {TEXTO_ESTADO[foto.estado]}
              {activa && ` ${foto.progreso}%`}
              {foto.estado === 'lista' && foto.comprimida && ` · ${formatearBytes(foto.comprimida.principal.size)}`}
            </span>
          </div>
          {activa && (
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/30">
              <div className="h-full bg-yellow-400 transition-[width] duration-300" style={{ width: `${foto.progreso}%` }} />
            </div>
          )}
        </div>
      )}

      {!bloqueado && foto.estado !== 'lista' && (
        <button
          type="button"
          onClick={() => onQuitar(foto.id)}
          className="absolute top-1 right-1 flex size-11 items-center justify-center"
          aria-label="Quitar foto"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-neutral-950 text-white shadow">
            <X className="size-5" />
          </span>
        </button>
      )}
    </li>
  )
}

export default function SelectorFotos({ fotos, onAgregar, onQuitar, bloqueado }) {
  const camaraRef = useRef(null)
  const galeriaRef = useRef(null)
  const lleno = fotos.length >= MAX_FOTOS_POR_AVANCE

  const alElegir = (e) => {
    const disponibles = MAX_FOTOS_POR_AVANCE - fotos.length
    onAgregar(Array.from(e.target.files || []).slice(0, disponibles))
    e.target.value = '' // permite volver a elegir el mismo archivo
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={bloqueado || lleno}
          onClick={() => camaraRef.current?.click()}
          className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl bg-neutral-950 text-base font-bold text-white active:bg-neutral-700 disabled:bg-neutral-400"
        >
          <Camera className="size-7" aria-hidden /> Sacar foto
        </button>
        <button
          type="button"
          disabled={bloqueado || lleno}
          onClick={() => galeriaRef.current?.click()}
          className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-neutral-950 bg-white text-base font-bold active:bg-neutral-100 disabled:border-neutral-300 disabled:text-neutral-400"
        >
          <Images className="size-7" aria-hidden /> Galería
        </button>
      </div>

      {/* capture="environment" abre directo la cámara trasera en Android/iOS */}
      <input ref={camaraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={alElegir} />
      <input ref={galeriaRef} type="file" accept="image/*" multiple className="hidden" onChange={alElegir} />

      {fotos.length > 0 && (
        <>
          <ul className="grid grid-cols-3 gap-2">
            {fotos.map((f) => (
              <MiniaturaFoto key={f.id} foto={f} onQuitar={onQuitar} bloqueado={bloqueado} />
            ))}
          </ul>
          <p className="text-sm text-neutral-600">
            {fotos.length} de {MAX_FOTOS_POR_AVANCE} fotos · se comprimen en el teléfono antes de subir
          </p>
        </>
      )}
    </div>
  )
}
