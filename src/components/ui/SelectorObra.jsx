import { Building2, ChevronDown } from 'lucide-react'

/** Select nativo: en el celular abre el picker del sistema, ideal para una mano. */
export default function SelectorObra({ proyectos, valor, onCambiar, permitirTodas = false, id = 'selector-obra', disabled }) {
  return (
    <div className="relative">
      <Building2 className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2" aria-hidden />
      <select
        id={id}
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        disabled={disabled}
        className="min-h-12 w-full appearance-none rounded-xl border-2 border-neutral-950 bg-white py-2 pr-10 pl-10 text-base font-bold disabled:opacity-50"
      >
        {permitirTodas ? <option value="">Todas las obras</option> : <option value="" disabled>Elegí la obra…</option>}
        {proyectos.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2" aria-hidden />
    </div>
  )
}
