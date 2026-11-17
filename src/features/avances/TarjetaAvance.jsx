import { Lock, User, Building2, Clock } from 'lucide-react'
import BadgeEstado from '../../components/ui/BadgeEstado'
import GaleriaAvance from './GaleriaAvance'
import { etapaPorValor, estadoPorValor } from '../../lib/constantes'
import { hora } from '../../lib/fechas'

export default function TarjetaAvance({ avance, mostrarObra, onAbrirFoto }) {
  const etapa = etapaPorValor(avance.etapa)
  const estado = estadoPorValor(avance.estado)
  const IconoEtapa = etapa.icono

  return (
    <article
      className={`relative flex flex-col gap-3 rounded-2xl border-l-[6px] bg-white p-4 shadow-sm ring-1 ring-neutral-200 transition hover:shadow-md ${estado.borde}`}
    >
      {/* Si no entra al lado del título (celular angosto), el estado baja a su propia línea. */}
      <header className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-yellow-400">
          <IconoEtapa className="size-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 basis-40">
          <h3 className="text-lg leading-tight font-black">{etapa.etiqueta}</h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-neutral-700">
            <span className="inline-flex items-center gap-1 font-bold text-neutral-950">
              <Clock className="size-3.5" aria-hidden />
              <time dateTime={avance.registrado_en}>{hora(avance.registrado_en)} h</time>
            </span>
            <span className="inline-flex items-center gap-1">
              <User className="size-3.5" aria-hidden />
              {avance.autor_nombre}
            </span>
          </p>
        </div>
        <BadgeEstado estado={avance.estado} />
      </header>

      {mostrarObra && avance.proyecto && (
        <p className="-mt-1 inline-flex items-center gap-1.5 self-start rounded-full bg-neutral-100 px-2.5 py-1 text-sm font-bold text-neutral-800">
          <Building2 className="size-3.5" aria-hidden />
          {avance.proyecto.nombre}
        </p>
      )}

      <GaleriaAvance fotos={avance.fotos} onAbrir={(i) => onAbrirFoto(avance, i)} />

      {avance.comentario && <p className="text-base leading-snug whitespace-pre-line">{avance.comentario}</p>}

      {avance.nota_interna && (
        <div className="flex gap-2 rounded-xl border-2 border-dashed border-amber-500 bg-amber-50 p-2.5 text-[0.95rem] text-amber-950">
          <Lock className="mt-0.5 size-4 shrink-0" aria-label="Nota interna" />
          <p className="whitespace-pre-line">{avance.nota_interna}</p>
        </div>
      )}
    </article>
  )
}
