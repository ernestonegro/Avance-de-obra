import { ChevronDown, Layers, RefreshCw } from 'lucide-react'
import SelectorObra from '../../components/ui/SelectorObra'
import { ETAPAS, ESTADOS } from '../../lib/constantes'

function Chip({ activo, onClick, children, clasesActivo = 'border-neutral-950 bg-neutral-950 text-white' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border-2 px-3.5 text-sm font-bold whitespace-nowrap ${
        activo ? clasesActivo : 'border-neutral-300 bg-white text-neutral-900 hover:border-neutral-500 active:bg-neutral-100'
      }`}
    >
      {children}
    </button>
  )
}

export default function FiltrosFeed({ proyectos, filtros, onCambiar, onRecargar, recargando }) {
  const set = (k) => (v) => onCambiar({ ...filtros, [k]: v })

  return (
    // Celular: fija bajo el encabezado, a todo el ancho. Escritorio: una fila en una tarjeta.
    <div className="sticky top-[var(--alto-header,3.5rem)] z-20 -mx-4 space-y-2 border-b-2 border-neutral-200 bg-white/95 px-4 pt-3 pb-3 backdrop-blur lg:static lg:mx-0 lg:flex lg:flex-wrap lg:items-center lg:gap-3 lg:space-y-0 lg:rounded-2xl lg:border-0 lg:bg-white lg:p-4 lg:shadow-sm lg:ring-1 lg:ring-neutral-200">
      <div className="flex gap-2 lg:w-80">
        <div className="min-w-0 flex-1">
          <SelectorObra id="filtro-obra" proyectos={proyectos} valor={filtros.obra} onCambiar={set('obra')} permitirTodas />
        </div>
        <button
          type="button"
          onClick={onRecargar}
          disabled={recargando}
          className="flex size-12 shrink-0 items-center justify-center rounded-xl border-2 border-neutral-950 hover:bg-neutral-100 active:bg-neutral-200"
          aria-label="Actualizar"
        >
          <RefreshCw className={`size-5 ${recargando ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="relative lg:w-64">
        <Layers className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2" aria-hidden />
        <select
          value={filtros.etapa}
          onChange={(e) => set('etapa')(e.target.value)}
          aria-label="Filtrar por etapa"
          className="min-h-12 w-full appearance-none rounded-xl border-2 border-neutral-950 bg-white py-2 pr-10 pl-10 text-base font-bold"
        >
          <option value="">Todas las etapas</option>
          {ETAPAS.map((e) => (
            <option key={e.valor} value={e.valor}>
              {e.etiqueta}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2" aria-hidden />
      </div>

      <div className="scrollbar-none flex gap-2 overflow-x-auto lg:basis-full lg:flex-wrap lg:overflow-visible" role="group" aria-label="Filtrar por estado">
        <Chip activo={!filtros.estado} onClick={() => set('estado')('')}>
          Todos
        </Chip>
        {ESTADOS.map((e) => {
          const Icono = e.icono
          return (
            <Chip
              key={e.valor}
              activo={filtros.estado === e.valor}
              clasesActivo={e.boton}
              onClick={() => set('estado')(filtros.estado === e.valor ? '' : e.valor)}
            >
              <Icono className="size-4" aria-hidden />
              {e.etiqueta}
            </Chip>
          )
        })}
      </div>
    </div>
  )
}
