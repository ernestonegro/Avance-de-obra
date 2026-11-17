import { ZoomIn } from 'lucide-react'
import { urlFoto } from '../../lib/supabase'

function Miniatura({ foto, indice, onAbrir, className = '', extra = 0 }) {
  return (
    <button
      type="button"
      onClick={() => onAbrir(indice)}
      className={`group relative block overflow-hidden rounded-xl bg-neutral-200 ${className}`}
      aria-label={extra > 0 ? `Ver ${extra} fotos más` : `Ampliar foto ${indice + 1}`}
    >
      <img
        src={urlFoto(foto.thumb_path)}
        crossOrigin="anonymous"
        alt=""
        loading="lazy"
        decoding="async"
        className="size-full object-cover transition duration-300 group-hover:scale-105"
      />
      {extra > 0 ? (
        <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-3xl font-black text-white">+{extra}</span>
      ) : (
        <span className="absolute inset-0 hidden items-center justify-center bg-black/0 text-white transition group-hover:bg-black/25 lg:flex">
          <ZoomIn className="size-8 opacity-0 drop-shadow transition group-hover:opacity-100" aria-hidden />
        </span>
      )}
    </button>
  )
}

/**
 * Mosaico de miniaturas:
 * 1 foto → ancha · 2 → mitad y mitad · 3 → una grande + dos · 4+ → 2×2 con "+N".
 */
export default function GaleriaAvance({ fotos, onAbrir }) {
  if (!fotos?.length) return null
  const n = fotos.length

  if (n === 1) {
    return <Miniatura foto={fotos[0]} indice={0} onAbrir={onAbrir} className="aspect-[16/10] w-full" />
  }
  if (n === 2) {
    return (
      <div className="grid grid-cols-2 gap-1.5">
        {fotos.map((f, i) => (
          <Miniatura key={f.id} foto={f} indice={i} onAbrir={onAbrir} className="aspect-[4/5]" />
        ))}
      </div>
    )
  }
  if (n === 3) {
    return (
      <div className="grid aspect-[16/10] grid-cols-3 grid-rows-2 gap-1.5">
        <Miniatura foto={fotos[0]} indice={0} onAbrir={onAbrir} className="col-span-2 row-span-2" />
        <Miniatura foto={fotos[1]} indice={1} onAbrir={onAbrir} />
        <Miniatura foto={fotos[2]} indice={2} onAbrir={onAbrir} />
      </div>
    )
  }
  const visibles = fotos.slice(0, 4)
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {visibles.map((f, i) => (
        <Miniatura key={f.id} foto={f} indice={i} onAbrir={onAbrir} className="aspect-[4/3]" extra={i === 3 ? n - 4 : 0} />
      ))}
    </div>
  )
}
