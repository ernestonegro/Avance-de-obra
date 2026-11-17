import { Lock, User, Building2 } from 'lucide-react'
import BadgeEstado from '../../components/ui/BadgeEstado'
import GaleriaAvance from './GaleriaAvance'
import { etiquetaEtapa } from '../../lib/constantes'
import { hora } from '../../lib/fechas'

export default function TarjetaAvance({ avance, mostrarObra, onAbrirFoto }) {
  return (
    <article className="space-y-3 rounded-2xl border-2 border-neutral-950 bg-white p-3">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-lg leading-tight font-black">{etiquetaEtapa(avance.etapa)}</h3>
          <p className="flex flex-wrap items-center gap-x-2 text-sm text-neutral-700">
            <time dateTime={avance.registrado_en} className="font-bold text-neutral-950">
              {hora(avance.registrado_en)} h
            </time>
            <span className="inline-flex items-center gap-1">
              <User className="size-3.5" aria-hidden />
              {avance.autor_nombre}
            </span>
          </p>
          {mostrarObra && avance.proyecto && (
            <p className="mt-0.5 inline-flex items-center gap-1 text-sm font-bold text-neutral-700">
              <Building2 className="size-3.5" aria-hidden />
              {avance.proyecto.nombre}
            </p>
          )}
        </div>
        <BadgeEstado estado={avance.estado} />
      </header>

      <GaleriaAvance fotos={avance.fotos} onAbrir={(i) => onAbrirFoto(avance, i)} />

      {avance.comentario && <p className="text-base leading-snug whitespace-pre-line">{avance.comentario}</p>}

      {avance.nota_interna && (
        <div className="flex gap-2 rounded-lg border-2 border-dashed border-amber-600 bg-amber-50 p-2.5 text-[0.95rem] text-amber-950">
          <Lock className="mt-0.5 size-4 shrink-0" aria-label="Nota interna" />
          <p className="whitespace-pre-line">{avance.nota_interna}</p>
        </div>
      )}
    </article>
  )
}
