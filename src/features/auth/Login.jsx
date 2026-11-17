import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { HardHat } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { mensajeError } from '../../lib/supabase'
import Boton from '../../components/ui/Boton'
import Aviso from '../../components/ui/Aviso'

const campo = 'min-h-14 w-full rounded-xl border-2 border-neutral-950 px-4 text-lg'

export default function Login() {
  const { sesion, iniciarSesion, registrarse } = useAuth()
  const [modo, setModo] = useState('ingresar')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  if (sesion) return <Navigate to="/" replace />

  const enviar = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setMensaje(null)
    const { data, error } =
      modo === 'ingresar' ? await iniciarSesion(email, password) : await registrarse(email, password, nombre.trim())
    setEnviando(false)
    if (error) {
      const texto = /Invalid login/i.test(error.message) ? 'Email o contraseña incorrectos.' : mensajeError(error)
      return setMensaje({ tipo: 'error', texto })
    }
    if (modo === 'registrarse' && !data.session) {
      setMensaje({ tipo: 'exito', texto: 'Cuenta creada. Revisá tu email para confirmarla y después ingresá.' })
      setModo('ingresar')
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="space-y-2 text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-yellow-400">
          <HardHat className="size-9" aria-hidden />
        </span>
        <h1 className="text-3xl font-black">Bitácora de Obra</h1>
        <p className="text-neutral-700">{modo === 'ingresar' ? 'Ingresá para registrar avances' : 'Creá tu cuenta'}</p>
      </div>

      <form onSubmit={enviar} className="space-y-3">
        {modo === 'registrarse' && (
          <input required placeholder="Nombre y apellido" value={nombre} onChange={(e) => setNombre(e.target.value)} className={campo} autoComplete="name" />
        )}
        <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={campo} autoComplete="email" inputMode="email" />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={campo}
          autoComplete={modo === 'ingresar' ? 'current-password' : 'new-password'}
        />
        {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}
        <Boton type="submit" tamano="lg" variante="primario" cargando={enviando} bloque>
          {modo === 'ingresar' ? 'Ingresar' : 'Crear cuenta'}
        </Boton>
      </form>

      <Boton variante="fantasma" onClick={() => setModo(modo === 'ingresar' ? 'registrarse' : 'ingresar')}>
        {modo === 'ingresar' ? '¿No tenés cuenta? Registrate' : 'Ya tengo cuenta'}
      </Boton>
    </div>
  )
}
