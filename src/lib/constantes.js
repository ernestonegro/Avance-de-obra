import {
  CheckCircle2,
  PackageOpen,
  AlertTriangle,
  ClipboardCheck,
  Ruler,
  Shovel,
  Blocks,
  Columns3,
  BrickWall,
  Droplets,
  Zap,
  Flame,
  Brush,
  Layers,
  Grid3x3,
  DoorOpen,
  PaintRoller,
  Hammer,
  Sparkles,
  CircleDot,
} from 'lucide-react'

// Deben coincidir con el enum public.etapa_obra
export const ETAPAS = [
  { valor: 'preliminares', etiqueta: 'Preliminares', icono: Ruler },
  { valor: 'movimiento_suelos', etiqueta: 'Movimiento de suelos', icono: Shovel },
  { valor: 'fundaciones', etiqueta: 'Fundaciones', icono: Blocks },
  { valor: 'estructura', etiqueta: 'Estructura', icono: Columns3 },
  { valor: 'albanileria', etiqueta: 'Albañilería', icono: BrickWall },
  { valor: 'instalaciones_sanitarias', etiqueta: 'Inst. sanitarias', icono: Droplets },
  { valor: 'instalaciones_electricas', etiqueta: 'Inst. eléctricas', icono: Zap },
  { valor: 'instalaciones_gas', etiqueta: 'Inst. de gas', icono: Flame },
  { valor: 'revoques', etiqueta: 'Revoques', icono: Brush },
  { valor: 'contrapisos', etiqueta: 'Contrapisos', icono: Layers },
  { valor: 'pisos_revestimientos', etiqueta: 'Pisos y revestimientos', icono: Grid3x3 },
  { valor: 'carpinterias', etiqueta: 'Carpinterías', icono: DoorOpen },
  { valor: 'pintura', etiqueta: 'Pintura', icono: PaintRoller },
  { valor: 'terminaciones', etiqueta: 'Terminaciones', icono: Hammer },
  { valor: 'limpieza_entrega', etiqueta: 'Limpieza y entrega', icono: Sparkles },
  { valor: 'otros', etiqueta: 'Otros', icono: CircleDot },
]

// Deben coincidir con el enum public.estado_avance.
// Siempre ícono + texto + color (nunca sólo color: se lee bajo el sol y con daltonismo).
export const ESTADOS = [
  {
    valor: 'avance_normal',
    etiqueta: 'Avance normal',
    icono: CheckCircle2,
    badge: 'bg-green-700 text-white',
    boton: 'border-green-700 bg-green-700 text-white',
    borde: 'border-l-green-700',
    punto: 'bg-green-700',
    suave: 'bg-green-50 text-green-900',
  },
  {
    valor: 'requiere_material',
    etiqueta: 'Requiere material',
    icono: PackageOpen,
    badge: 'bg-orange-500 text-black',
    boton: 'border-orange-500 bg-orange-500 text-black',
    borde: 'border-l-orange-500',
    punto: 'bg-orange-500',
    suave: 'bg-orange-50 text-orange-950',
    problema: true,
  },
  {
    valor: 'demora_imprevisto',
    etiqueta: 'Demora / Imprevisto',
    icono: AlertTriangle,
    badge: 'bg-red-700 text-white',
    boton: 'border-red-700 bg-red-700 text-white',
    borde: 'border-l-red-700',
    punto: 'bg-red-700',
    suave: 'bg-red-50 text-red-900',
    problema: true,
  },
  {
    valor: 'listo_inspeccion',
    etiqueta: 'Listo para inspección',
    icono: ClipboardCheck,
    badge: 'bg-blue-700 text-white',
    boton: 'border-blue-700 bg-blue-700 text-white',
    borde: 'border-l-blue-700',
    punto: 'bg-blue-700',
    suave: 'bg-blue-50 text-blue-900',
  },
]

export const etapaPorValor = (v) => ETAPAS.find((e) => e.valor === v) ?? ETAPAS[ETAPAS.length - 1]
export const etiquetaEtapa = (v) => ETAPAS.find((e) => e.valor === v)?.etiqueta ?? v
export const estadoPorValor = (v) => ESTADOS.find((e) => e.valor === v) ?? ESTADOS[0]

export const MAX_FOTOS_POR_AVANCE = 12
