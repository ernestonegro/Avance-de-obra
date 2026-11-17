import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { configuracionValida } from './lib/supabase'
import App from './App'

function FaltaConfiguracion() {
  return (
    <div className="mx-auto max-w-lg space-y-3 p-6">
      <h1 className="text-2xl font-black">Falta configurar Supabase</h1>
      <p>
        Definí <code className="font-bold">VITE_SUPABASE_URL</code> y <code className="font-bold">VITE_SUPABASE_ANON_KEY</code> en
        <code className="font-bold"> .env</code> (local) o en las variables de entorno del sitio en Netlify, y volvé a compilar.
      </p>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>{configuracionValida ? <App /> : <FaltaConfiguracion />}</StrictMode>,
)
