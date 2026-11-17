import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import FeedAvances from './features/avances/FeedAvances'
import FormularioAvance from './features/avances/FormularioAvance'
import GeneradorReporte from './features/reportes/GeneradorReporte'
import ReportePublico from './features/reportes/ReportePublico'
import Proyectos from './features/proyectos/Proyectos'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Reporte para el cliente: vista acotada e imprimible, sin la navegación de la app */}
        <Route path="/r/:token" element={<ReportePublico />} />
        <Route element={<AppShell />}>
          <Route index element={<FeedAvances />} />
          <Route path="nuevo" element={<FormularioAvance />} />
          <Route path="reportes" element={<GeneradorReporte />} />
          <Route path="obras" element={<Proyectos />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
