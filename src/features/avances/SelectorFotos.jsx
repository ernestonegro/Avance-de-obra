import { useRef, useState } from 'react'
import { Camera, Images, X, Loader2, CheckCircle2, AlertTriangle, UploadCloud } from 'lucide-react'
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
  const [aviso, setAviso] = useState('')

  const [arrastrando, setArrastrando] = useState(false)

  const alElegir = (e) => {
    const elegidos = Array.from(e.target.files || [])
    e.target.value = '' // permite volver a elegir el mismo archivo
    agregar(elegidos)
  }

  const agregar = (elegidos) => {
    if (!elegidos.length) return
    const descartadas = onAgregar(elegidos)
    setAviso(descartadas ? `${descartadas} archivo(s) no son imágenes y se ignoraron.` : '')
  }

  // Escritorio: arrastrar y soltar archivos desde el explorador.
  const alSoltar = (e) => {
    e.preventDefault()
    setArrastrando(false)
    if (bloqueado) return
    agregar(Array.from(e.dataTransfer.files || []))
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={bloqueado}
        onClick={() => galeriaRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          if (!bloqueado) setArrastrando(true)
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={alSoltar}
        className={`hidden min-h-36 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 text-center transition lg:flex ${
          arrastrando ? 'border-yellow-500 bg-yellow-50' : 'border-neutral-300 bg-neutral-50 hover:border-neutral-500 hover:bg-neutral-100'
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span className={`flex size-12 items-center justify-center rounded-full ${arrastrando ? 'bg-yellow-400' : 'bg-neutral-950 text-white'}`}>
          <UploadCloud className="size-6" aria-hidden />
        </span>
        <span className="font-black">{arrastrando ? 'Soltá las fotos acá' : 'Arrastrá fotos acá o hacé clic para elegir'}</span>
        <span className="text-sm text-neutral-600">JPG, PNG o WebP · sin límite de cantidad · se comprimen antes de subir</span>
      </button>

      <div className="grid grid-cols-2 gap-3 lg:hidden">
        <button
          type="button"
          disabled={bloqueado}
          onClick={() => camaraRef.current?.click()}
          className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl bg-neutral-950 text-base font-bold text-white active:bg-neutral-700 disabled:bg-neutral-400"
        >
          <Camera className="size-7" aria-hidden /> Sacar foto
        </button>
        <button
          type="button"
          disabled={bloqueado}
          onClick={() => galeriaRef.current?.click()}
          className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-neutral-950 bg-white text-base font-bold active:bg-neutral-100 disabled:border-neutral-300 disabled:text-neutral-400"
        >
          <Images className="size-7" aria-hidden /> Galería
        </button>
      </div>

      {/* capture="environment" abre directo la cámara trasera en Android/iOS */}
      <input ref={camaraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={alElegir} />
      <input ref={galeriaRef} type="file" accept="image/*" multiple className="hidden" onChange={alElegir} />

      {aviso && (
        <p role="status" className="rounded-lg border-2 border-orange-500 bg-orange-50 p-2 text-sm font-bold text-orange-950">
          {aviso}
        </p>
      )}

      {fotos.length > 0 && (
        <>
          <ul className="grid grid-cols-3 gap-2 lg:grid-cols-4">
            {fotos.map((f) => (
              <MiniaturaFoto key={f.id} foto={f} onQuitar={onQuitar} bloqueado={bloqueado} />
            ))}
          </ul>
          {fotos.some((f) => f.estado === 'error' && f.error) && (
            <ul className="space-y-1 text-sm font-bold text-red-800">
              {fotos.map((f, i) =>
                f.estado === 'error' && f.error ? (
                  <li key={f.id}>
                    Foto {i + 1}: {f.error}
                  </li>
                ) : null,
              )}
            </ul>
          )}
          <p className="text-sm text-neutral-600">
            {fotos.length} foto{fotos.length !== 1 && 's'} · se comprimen en el teléfono antes de subir
          </p>
        </>
      )}
    </div>
  )
}
