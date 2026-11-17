import { estadoPorValor } from '../../lib/constantes'

export default function BadgeEstado({ estado, compacto = false }) {
  const e = estadoPorValor(estado)
  const Icono = e.icono
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold whitespace-nowrap ${e.badge}`}>
      <Icono className="size-4" aria-hidden />
      {!compacto && e.etiqueta}
      {compacto && <span className="sr-only">{e.etiqueta}</span>}
    </span>
  )
}
