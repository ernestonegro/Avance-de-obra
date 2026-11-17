import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ClipboardList, Plus, FileText, Building2, LogOut, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'

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

const enlace = ({ isActive }) =>
  `flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-bold ${isActive ? 'text-neutral-950' : 'text-neutral-500'}`

export default function AppShell() {
  const { perfil, cerrarSesion } = useAuth()
  const online = useOnline()
  const { pathname } = useLocation()
  const enFormulario = pathname === '/nuevo'

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      <header className="pt-safe sticky top-0 z-30 border-b-2 border-neutral-950 bg-white">
        <div className="flex min-h-14 items-center justify-between gap-3 px-4">
          <div className="min-w-0">
            <p className="text-lg leading-tight font-black tracking-tight">Bitácora de Obra</p>
            {perfil && <p className="truncate text-sm text-neutral-600">{perfil.nombre}</p>}
          </div>
          <div className="flex items-center">
          <NavLink
            to="/obras"
            className={({ isActive }) => `flex size-12 items-center justify-center rounded-xl active:bg-neutral-100 ${isActive ? 'bg-neutral-950 text-white' : ''}`}
            aria-label="Obras y equipo"
          >
            <Building2 className="size-6" />
          </NavLink>
          <button
            onClick={cerrarSesion}
            className="flex size-12 items-center justify-center rounded-xl active:bg-neutral-100"
            aria-label="Cerrar sesión"
          >
            <LogOut className="size-6" />
          </button>
          </div>
        </div>
        {!online && (
          <div className="flex items-center gap-2 bg-red-700 px-4 py-2 text-sm font-bold text-white" role="status">
            <WifiOff className="size-4" aria-hidden /> Sin conexión — las subidas se reanudan solas al volver la señal
          </div>
        )}
      </header>

      <main className={`flex-1 px-4 pt-4 ${enFormulario ? 'pb-40' : 'pb-28'}`}>
        <Outlet />
      </main>

      {!enFormulario && (
        <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t-2 border-neutral-950 bg-white" aria-label="Principal">
          <div className="mx-auto flex max-w-2xl items-end px-2">
            <NavLink to="/" end className={enlace}>
              <ClipboardList className="size-6" aria-hidden /> Bitácora
            </NavLink>
            <NavLink
              to="/nuevo"
              className="-mt-6 flex size-18 shrink-0 flex-col items-center justify-center rounded-full border-4 border-white bg-yellow-400 text-neutral-950 shadow-lg active:bg-yellow-500"
              aria-label="Nuevo avance"
            >
              <Plus className="size-9" strokeWidth={3} aria-hidden />
            </NavLink>
            <NavLink to="/reportes" className={enlace}>
              <FileText className="size-6" aria-hidden /> Reportes
            </NavLink>
          </div>
        </nav>
      )}
    </div>
  )
}
