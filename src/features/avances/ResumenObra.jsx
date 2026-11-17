import { ClipboardList, Images, AlertTriangle, ClipboardCheck } from 'lucide-react'

const TARJETAS = [
  { clave: 'registros', etiqueta: 'Registros', icono: ClipboardList, clases: 'bg-neutral-950 text-white', iconoClases: 'bg-yellow-400 text-neutral-950' },
  { clave: 'fotos', etiqueta: 'Fotos', icono: Images, clases: 'bg-white', iconoClases: 'bg-neutral-100 text-neutral-950' },
  { clave: 'problemas', etiqueta: 'Con problemas', icono: AlertTriangle, clases: 'bg-white', iconoClases: 'bg-red-50 text-red-700' },
  { clave: 'inspeccion', etiqueta: 'Para inspección', icono: ClipboardCheck, clases: 'bg-white', iconoClases: 'bg-blue-50 text-blue-700' },
]

/** Fila de indicadores de la obra seleccionada. */
export default function ResumenObra({ resumen, cargando }) {
  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4" aria-label="Resumen de la obra">
      {TARJETAS.map(({ clave, etiqueta, icono: Icono, clases, iconoClases }) => {
        const valor = resumen?.[clave]
        return (
          <li key={clave} className={`flex items-center gap-3 rounded-2xl p-3 shadow-sm ring-1 ring-neutral-200 lg:p-4 ${clases}`}>
            <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl lg:size-12 ${iconoClases}`}>
              <Icono className="size-6" aria-hidden />
            </span>
            <div className="min-w-0">
              {cargando && valor == null ? (
                <span className="block h-7 w-10 animate-pulse rounded bg-neutral-300/60" aria-hidden />
              ) : (
                <p className="text-2xl leading-none font-black tabular-nums lg:text-3xl">{valor ?? '—'}</p>
              )}
              <p className={`mt-1 text-xs leading-tight font-bold lg:text-sm ${clases.includes('text-white') ? 'text-neutral-300' : 'text-neutral-600'}`}>{etiqueta}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
