import { CheckCircle2, PackageOpen, AlertTriangle, ClipboardCheck } from 'lucide-react'

// Deben coincidir con el enum public.etapa_obra
export const ETAPAS = [
  { valor: 'preliminares', etiqueta: 'Preliminares' },
  { valor: 'movimiento_suelos', etiqueta: 'Movimiento de suelos' },
  { valor: 'fundaciones', etiqueta: 'Fundaciones' },
  { valor: 'estructura', etiqueta: 'Estructura' },
  { valor: 'albanileria', etiqueta: 'Albañilería' },
  { valor: 'instalaciones_sanitarias', etiqueta: 'Inst. sanitarias' },
  { valor: 'instalaciones_electricas', etiqueta: 'Inst. eléctricas' },
  { valor: 'instalaciones_gas', etiqueta: 'Inst. de gas' },
  { valor: 'revoques', etiqueta: 'Revoques' },
  { valor: 'contrapisos', etiqueta: 'Contrapisos' },
  { valor: 'pisos_revestimientos', etiqueta: 'Pisos y revestimientos' },
  { valor: 'carpinterias', etiqueta: 'Carpinterías' },
  { valor: 'pintura', etiqueta: 'Pintura' },
  { valor: 'terminaciones', etiqueta: 'Terminaciones' },
  { valor: 'limpieza_entrega', etiqueta: 'Limpieza y entrega' },
  { valor: 'otros', etiqueta: 'Otros' },
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
  },
  {
    valor: 'requiere_material',
    etiqueta: 'Requiere material',
    icono: PackageOpen,
    badge: 'bg-orange-500 text-black',
    boton: 'border-orange-500 bg-orange-500 text-black',
    problema: true,
  },
  {
    valor: 'demora_imprevisto',
    etiqueta: 'Demora / Imprevisto',
    icono: AlertTriangle,
    badge: 'bg-red-700 text-white',
    boton: 'border-red-700 bg-red-700 text-white',
    problema: true,
  },
  {
    valor: 'listo_inspeccion',
    etiqueta: 'Listo para inspección',
    icono: ClipboardCheck,
    badge: 'bg-blue-700 text-white',
    boton: 'border-blue-700 bg-blue-700 text-white',
  },
]

export const etiquetaEtapa = (v) => ETAPAS.find((e) => e.valor === v)?.etiqueta ?? v
export const estadoPorValor = (v) => ESTADOS.find((e) => e.valor === v) ?? ESTADOS[0]

export const MAX_FOTOS_POR_AVANCE = 12
