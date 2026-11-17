import { useState } from 'react'
import { Plus, UserPlus, MapPin, ChevronDown } from 'lucide-react'
import { supabase, mensajeError } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useProyectos } from '../../hooks/useProyectos'
import { ROLES_PROYECTO } from '../../lib/constantes'
import Boton from '../../components/ui/Boton'
import Aviso from '../../components/ui/Aviso'
import { Skeleton } from '../../components/ui/Skeleton'

const campo = 'min-h-12 w-full rounded-xl border-2 border-neutral-950 bg-white px-3 text-base'

function FormNuevaObra({ onCreada }) {
  const { usuario } = useAuth()
  const [nombre, setNombre] = useState('')
  const [direccion, setDireccion] = useState('')
  const [cliente, setCliente] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setError('')
    const { error } = await supabase.from('proyectos').insert({
      nombre: nombre.trim(),
      direccion: direccion.trim() || null,
      cliente_nombre: cliente.trim() || null,
      creado_por: usuario.id,
    })
    setGuardando(false)
    if (error) return setError(mensajeError(error))
    setNombre('')
    setDireccion('')
    setCliente('')
    onCreada()
  }

  return (
    <form onSubmit={guardar} className="space-y-3 rounded-2xl border-2 border-neutral-950 p-3">
      <input required minLength={2} placeholder="Nombre de la obra *" value={nombre} onChange={(e) => setNombre(e.target.value)} className={campo} />
      <input placeholder="Dirección" value={direccion} onChange={(e) => setDireccion(e.target.value)} className={campo} />
      <input placeholder="Cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} className={campo} />
      {error && <Aviso tipo="error">{error}</Aviso>}
      <Boton type="submit" variante="acento" icono={Plus} cargando={guardando} bloque>
        Crear obra
      </Boton>
    </form>
  )
}

function FormMiembro({ proyectoId }) {
  const [email, setEmail] = useState('')
  const [rol, setRol] = useState('encargado')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  const agregar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setMensaje(null)
    const { error } = await supabase.rpc('agregar_miembro_por_email', { p_proyecto_id: proyectoId, p_email: email, p_rol: rol })
    setGuardando(false)
    if (error) setMensaje({ tipo: 'error', texto: mensajeError(error) })
    else {
      setMensaje({ tipo: 'exito', texto: `${email} agregado a la obra.` })
      setEmail('')
    }
  }

  return (
    <form onSubmit={agregar} className="space-y-2">
      <input type="email" required placeholder="email@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} className={campo} autoComplete="off" />
      <select value={rol} onChange={(e) => setRol(e.target.value)} className={`${campo} font-bold`}>
        {ROLES_PROYECTO.map((r) => (
          <option key={r.valor} value={r.valor}>
            {r.etiqueta}
          </option>
        ))}
      </select>
      {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}
      <Boton type="submit" variante="secundario" icono={UserPlus} cargando={guardando} bloque>
        Agregar al equipo
      </Boton>
    </form>
  )
}

export default function Proyectos() {
  const { usuario, perfil } = useAuth()
  const { proyectos, cargando, error, recargar } = useProyectos({ incluirInactivos: true })
  const [creando, setCreando] = useState(false)
  const [abierta, setAbierta] = useState(null)
  const puedeCrear = perfil?.rol === 'admin' || perfil?.rol === 'director'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-black">Obras</h1>
        {puedeCrear && (
          <Boton variante={creando ? 'secundario' : 'primario'} icono={Plus} onClick={() => setCreando((v) => !v)}>
            {creando ? 'Cerrar' : 'Nueva'}
          </Boton>
        )}
      </div>

      {creando && (
        <FormNuevaObra
          onCreada={() => {
            setCreando(false)
            recargar()
          }}
        />
      )}

      {error && <Aviso tipo="error">{error}</Aviso>}
      {cargando && (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}
      {!cargando && proyectos.length === 0 && (
        <Aviso tipo="info">
          No tenés obras asignadas. {puedeCrear ? 'Creá la primera.' : 'Pedile a un director que te agregue con tu email.'}
        </Aviso>
      )}

      <ul className="space-y-3">
        {proyectos.map((p) => {
          const miRol = p.proyecto_miembros.find((m) => m.usuario_id === usuario?.id)?.rol
          const esDirector = perfil?.rol === 'admin' || miRol === 'director'
          const expandida = abierta === p.id
          return (
            <li key={p.id} className={`rounded-2xl border-2 ${p.activo ? 'border-neutral-950' : 'border-neutral-300 text-neutral-500'}`}>
              <button
                onClick={() => setAbierta(expandida ? null : p.id)}
                aria-expanded={expandida}
                className="flex min-h-16 w-full items-center gap-3 p-3 text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-lg leading-tight font-black">{p.nombre}</p>
                  {p.direccion && (
                    <p className="flex items-center gap-1 truncate text-sm text-neutral-600">
                      <MapPin className="size-3.5 shrink-0" aria-hidden /> {p.direccion}
                    </p>
                  )}
                  <p className="text-sm text-neutral-600">
                    {p.proyecto_miembros.length} en el equipo
                    {miRol && ` · Sos ${ROLES_PROYECTO.find((r) => r.valor === miRol)?.etiqueta.toLowerCase()}`}
                    {!p.activo && ' · Inactiva'}
                  </p>
                </div>
                <ChevronDown className={`size-6 shrink-0 transition-transform ${expandida ? 'rotate-180' : ''}`} aria-hidden />
              </button>
              {expandida && (
                <div className="border-t-2 border-neutral-200 p-3">
                  {esDirector ? <FormMiembro proyectoId={p.id} /> : <p className="text-sm text-neutral-600">Sólo un director puede gestionar el equipo.</p>}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
