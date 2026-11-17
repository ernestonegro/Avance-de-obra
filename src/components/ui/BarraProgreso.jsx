export default function BarraProgreso({ valor = 0, etiqueta, color = 'bg-yellow-400', alto = 'h-3' }) {
  const v = Math.max(0, Math.min(100, Math.round(valor)))
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
      aria-label={etiqueta}
      className={`w-full overflow-hidden rounded-full bg-neutral-200 ${alto}`}
    >
      <div className={`h-full rounded-full transition-[width] duration-300 ease-out ${color}`} style={{ width: `${v}%` }} />
    </div>
  )
}
