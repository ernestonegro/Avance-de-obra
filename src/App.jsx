import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import AppShell from './components/layout/AppShell'
import RutaProtegida from './components/layout/RutaProtegida'
import Login from './features/auth/Login'
import FeedAvances from './features/avances/FeedAvances'
import FormularioAvance from './features/avances/FormularioAvance'
import GeneradorReporte from './features/reportes/GeneradorReporte'
import ReportePublico from './features/reportes/ReportePublico'
import Proyectos from './features/proyectos/Proyectos'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Público, sin AuthProvider: el cliente no necesita cuenta */}
        <Route path="/r/:token" element={<ReportePublico />} />
        <Route
          path="/*"
          element={
            <AuthProvider>
              <Routes>
                <Route path="/ingresar" element={<Login />} />
                <Route element={<RutaProtegida />}>
                  <Route element={<AppShell />}>
                    <Route index element={<FeedAvances />} />
                    <Route path="nuevo" element={<FormularioAvance />} />
                    <Route path="reportes" element={<GeneradorReporte />} />
                    <Route path="obras" element={<Proyectos />} />
                  </Route>
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AuthProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
