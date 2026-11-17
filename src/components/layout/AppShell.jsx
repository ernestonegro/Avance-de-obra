import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ClipboardList, Plus, FileText, Building2, WifiOff, HardHat, User, Wifi } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAutor } from '../../hooks/useAutor'

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

const NAV = [
  { to: '/', etiqueta: 'Bitácora', icono: ClipboardList, end: true },
  { to: '/reportes', etiqueta: 'Reportes', icono: FileText },
  { to: '/obras', etiqueta: 'Obras', icono: Building2 },
]

function Logo({ claro = false }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-yellow-400 text-neutral-950 shadow-inner">
        <HardHat className="size-6" aria-hidden />
      </span>
      <div className="leading-tight">
        <p className={`text-lg font-black tracking-tight ${claro ? 'text-white' : ''}`}>Bitácora de Obra</p>
        <p className="text-xs font-bold tracking-widest text-yellow-400 uppercase">Avance diario</p>
      </div>
    </div>
  )
}

/** Barra lateral de escritorio (≥1024px). */
function Lateral({ autor, online }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-neutral-950 text-white lg:flex">
      <div className="franja-obra h-2 shrink-0" aria-hidden />
      <div className="px-5 pt-6 pb-8">
        <Logo claro />
      </div>

      <div className="px-4">
        <NavLink
          to="/nuevo"
          className={({ isActive }) =>
            `flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 font-black text-neutral-950 shadow-lg transition ${
              isActive ? 'bg-yellow-300 ring-4 ring-yellow-400/40' : 'bg-yellow-400 hover:bg-yellow-300'
            }`
          }
        >
          <Plus className="size-5" strokeWidth={3} aria-hidden /> Nuevo avance
        </NavLink>
      </div>

      <nav className="mt-6 flex-1 space-y-1 px-3" aria-label="Principal">
        {NAV.map(({ to, etiqueta, icono: Icono, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex min-h-12 items-center gap-3 rounded-xl px-3 font-bold transition ${
                isActive ? 'bg-white/10 text-white' : 'text-neutral-400 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`h-6 w-1 rounded-full ${isActive ? 'bg-yellow-400' : 'bg-transparent'}`} aria-hidden />
                <Icono className="size-5" aria-hidden />
                {etiqueta}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-3 border-t border-white/10 p-4 text-sm">
        <div className="flex items-center gap-2 text-neutral-300">
          <User className="size-4" aria-hidden />
          <span className="truncate">{autor ? `Registra: ${autor}` : 'Sin nombre cargado'}</span>
        </div>
        <div className={`flex items-center gap-2 font-bold ${online ? 'text-green-400' : 'text-red-400'}`}>
          {online ? <Wifi className="size-4" aria-hidden /> : <WifiOff className="size-4" aria-hidden />}
          {online ? 'Conectado' : 'Sin conexión'}
        </div>
      </div>
    </aside>
  )
}

const enlaceMovil = ({ isActive }) =>
  `flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-bold ${isActive ? 'text-neutral-950' : 'text-neutral-500'}`

export default function AppShell() {
  const [autor] = useAutor()
  const online = useOnline()
  const { pathname } = useLocation()
  const enFormulario = pathname === '/nuevo'

  // Altura real del encabezado (varía con el notch, el aviso "sin conexión" y vale 0 en
  // escritorio) como variable CSS: la usan los elementos sticky de debajo.
  const headerRef = useRef(null)
  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const publicar = () => document.documentElement.style.setProperty('--alto-header', `${el.offsetHeight}px`)
    publicar()
    const ro = new ResizeObserver(publicar)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    // overflow-x-clip (no "hidden"): evita scroll horizontal sin romper los elementos sticky.
    <div className="min-h-dvh overflow-x-clip bg-neutral-100">
      <Lateral autor={autor} online={online} />

      <div className="flex min-h-dvh flex-col lg:pl-64">
        <header ref={headerRef} className="sticky top-0 z-30">
          {/* Encabezado móvil */}
          <div className="pt-safe bg-neutral-950 text-white lg:hidden">
            <div className="flex min-h-16 items-center justify-between gap-3 px-4">
              <div className="min-w-0">
                <Logo claro />
              </div>
              <NavLink
                to="/obras"
                className={({ isActive }) =>
                  `flex size-12 shrink-0 items-center justify-center rounded-xl ${isActive ? 'bg-yellow-400 text-neutral-950' : 'active:bg-white/10'}`
                }
                aria-label="Obras"
              >
                <Building2 className="size-6" />
              </NavLink>
            </div>
            <div className="franja-obra h-1.5" aria-hidden />
          </div>
          {!online && (
            <div className="flex items-center gap-2 bg-red-700 px-4 py-2 text-sm font-bold text-white" role="status">
              <WifiOff className="size-4" aria-hidden /> Sin conexión — las subidas se reanudan solas al volver la señal
            </div>
          )}
        </header>

        <main className={`mx-auto w-full max-w-2xl flex-1 px-4 pt-4 lg:max-w-6xl lg:px-8 lg:pt-8 lg:pb-12 ${enFormulario ? '' : 'pb-28'}`}>
          <Outlet />
        </main>
      </div>

      {/* Navegación inferior: sólo celular */}
      {!enFormulario && (
        <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t-2 border-neutral-950 bg-white lg:hidden" aria-label="Principal">
          <div className="mx-auto flex max-w-2xl items-end px-2">
            <NavLink to="/" end className={enlaceMovil}>
              <ClipboardList className="size-6" aria-hidden /> Bitácora
            </NavLink>
            <NavLink
              to="/nuevo"
              className="-mt-6 flex size-18 shrink-0 flex-col items-center justify-center rounded-full border-4 border-white bg-yellow-400 text-neutral-950 shadow-lg active:bg-yellow-500"
              aria-label="Nuevo avance"
            >
              <Plus className="size-9" strokeWidth={3} aria-hidden />
            </NavLink>
            <NavLink to="/reportes" className={enlaceMovil}>
              <FileText className="size-6" aria-hidden /> Reportes
            </NavLink>
          </div>
        </nav>
      )}
    </div>
  )
}
