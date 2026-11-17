import { Loader2 } from 'lucide-react'

const VARIANTES = {
  primario: 'bg-neutral-950 text-white active:bg-neutral-700 disabled:bg-neutral-400',
  acento: 'bg-yellow-400 text-neutral-950 active:bg-yellow-500 disabled:bg-yellow-200 disabled:text-neutral-500',
  secundario: 'border-2 border-neutral-950 bg-white text-neutral-950 active:bg-neutral-100 disabled:border-neutral-300 disabled:text-neutral-400',
  peligro: 'bg-red-700 text-white active:bg-red-800 disabled:bg-red-300',
  fantasma: 'text-neutral-950 active:bg-neutral-100 disabled:text-neutral-400',
}

const TAMANOS = {
  md: 'min-h-12 px-4 text-base',
  lg: 'min-h-14 px-5 text-lg',
}

export default function Boton({
  variante = 'primario',
  tamano = 'md',
  cargando = false,
  icono: Icono,
  bloque = false,
  className = '',
  children,
  disabled,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || cargando}
      className={`inline-flex select-none items-center justify-center gap-2 rounded-xl font-bold transition-colors disabled:cursor-not-allowed ${VARIANTES[variante]} ${TAMANOS[tamano]} ${bloque ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {cargando ? <Loader2 className="size-5 animate-spin" aria-hidden /> : Icono && <Icono className="size-5 shrink-0" aria-hidden />}
      {children}
    </button>
  )
}
