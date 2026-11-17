import { urlFoto } from '../../lib/supabase'

/** Grilla de miniaturas: 1 foto a lo ancho; 2+ en 2 columnas con "+N" en la última. */
export default function GaleriaAvance({ fotos, onAbrir, maxVisibles = 4 }) {
  if (!fotos?.length) return null
  if (fotos.length === 1) {
    const f = fotos[0]
    return (
      <button type="button" onClick={() => onAbrir(0)} className="block w-full overflow-hidden rounded-xl bg-neutral-200" aria-label="Ampliar foto">
        <img
          src={urlFoto(f.thumb_path)}
          alt=""
          loading="lazy"
          decoding="async"
          width={f.ancho || 480}
          height={f.alto || 360}
          className="aspect-[4/3] w-full object-cover"
        />
      </button>
    )
  }
  const visibles = fotos.slice(0, maxVisibles)
  const restantes = fotos.length - visibles.length
  return (
    <ul className="grid grid-cols-2 gap-1.5">
      {visibles.map((f, i) => {
        const ultima = i === visibles.length - 1 && restantes > 0
        return (
          <li key={f.id}>
            <button
              type="button"
              onClick={() => onAbrir(i)}
              className="relative block w-full overflow-hidden rounded-lg bg-neutral-200"
              aria-label={ultima ? `Ver ${restantes} fotos más` : `Ampliar foto ${i + 1}`}
            >
              <img src={urlFoto(f.thumb_path)} alt="" loading="lazy" decoding="async" className="aspect-square w-full object-cover" />
              {ultima && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/65 text-3xl font-black text-white">+{restantes}</span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
