import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'

const TIPOS = {
  error: { clases: 'border-red-700 bg-red-50 text-red-900', icono: AlertTriangle },
  exito: { clases: 'border-green-700 bg-green-50 text-green-900', icono: CheckCircle2 },
  info: { clases: 'border-neutral-950 bg-neutral-50 text-neutral-900', icono: Info },
}

export default function Aviso({ tipo = 'info', children, accion }) {
  const { clases, icono: Icono } = TIPOS[tipo]
  return (
    <div role={tipo === 'error' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-xl border-2 p-3 font-medium ${clases}`}>
      <Icono className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
      {accion}
    </div>
  )
}
