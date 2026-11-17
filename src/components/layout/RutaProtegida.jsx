import { Navigate, Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

export default function RutaProtegida() {
  const { sesion, cargando } = useAuth()
  if (cargando) {
    return (
      <div className="flex min-h-dvh items-center justify-center" aria-busy="true">
        <Loader2 className="size-10 animate-spin" aria-label="Cargando" />
      </div>
    )
  }
  return sesion ? <Outlet /> : <Navigate to="/ingresar" replace />
}
