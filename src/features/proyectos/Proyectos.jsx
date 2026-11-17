import { useState } from 'react'
import { Plus, MapPin, User, Building2, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase, mensajeError } from '../../lib/supabase'
import { useProyectos } from '../../hooks/useProyectos'
import Boton from '../../components/ui/Boton'
import Aviso from '../../components/ui/Aviso'
import { Skeleton } from '../../components/ui/Skeleton'

const campo = 'min-h-12 w-full rounded-xl border-2 border-neutral-950 bg-white px-3 text-base'

function FormNuevaObra({ onCreada }) {
  const [nombre, setNombre] = useState('')
  const [direccion, setDireccion] = useState('')
  const [cliente, setCliente] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const guardar = async (e) => {
    e.preventDefault()
    if (nombre.trim().length < 2) return setError('El nombre de la obra es obligatorio.')
    setGuardando(true)
    setError('')
    const { error } = await supabase.from('proyectos').insert({
      nombre: nombre.trim(),
      direccion: direccion.trim() || null,
      cliente_nombre: cliente.trim() || null,
    })
    setGuardando(false)
    if (error) return setError(mensajeError(error))
    setNombre('')
    setDireccion('')
    setCliente('')
    onCreada()
  }

  return (
    <form onSubmit={guardar} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200 lg:grid lg:grid-cols-3 lg:gap-3 lg:space-y-0 lg:p-6">
      <input required minLength={2} maxLength={120} placeholder="Nombre de la obra *" value={nombre} onChange={(e) => setNombre(e.target.value)} className={campo} />
      <input maxLength={200} placeholder="Dirección" value={direccion} onChange={(e) => setDireccion(e.target.value)} className={campo} />
      <input maxLength={120} placeholder="Cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} className={campo} />
      <p className="text-sm text-neutral-600 lg:col-span-2 lg:self-center">Una vez creada no se puede editar ni borrar desde la app.</p>
      {error && (
        <div className="lg:col-span-3">
          <Aviso tipo="error">{error}</Aviso>
        </div>
      )}
      <Boton type="submit" variante="acento" icono={Plus} cargando={guardando} bloque>
        Crear obra
      </Boton>
    </form>
  )
}

export default function Proyectos() {
  const { proyectos, cargando, error, recargar } = useProyectos({ incluirInactivos: true })
  const [creando, setCreando] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-sm font-bold tracking-widest text-neutral-500 uppercase">Gestión</p>
          <h1 className="text-2xl font-black lg:text-4xl">Obras</h1>
        </div>
        <Boton variante={creando ? 'secundario' : 'primario'} icono={Plus} onClick={() => setCreando((v) => !v)}>
          {creando ? 'Cerrar' : 'Nueva'}
        </Boton>
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
      {!cargando && !error && proyectos.length === 0 && <Aviso tipo="info">Todavía no hay obras. Creá la primera con “Nueva”.</Aviso>}

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {proyectos.map((p) => (
          <li
            key={p.id}
            className={`flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200 transition hover:shadow-md ${p.activo ? '' : 'text-neutral-500 opacity-70'}`}
          >
            <div className="franja-obra h-1.5" aria-hidden />
            <div className="flex flex-1 flex-col gap-1 p-4">
            <div className="mb-1 flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-yellow-400">
                <Building2 className="size-6" aria-hidden />
              </span>
              <p className="text-lg leading-tight font-black">
                {p.nombre}
                {!p.activo && <span className="ml-2 text-sm font-bold">(inactiva)</span>}
              </p>
            </div>
            {p.direccion && (
              <p className="flex items-center gap-1 text-sm text-neutral-600">
                <MapPin className="size-3.5 shrink-0" aria-hidden /> {p.direccion}
              </p>
            )}
            {p.cliente_nombre && (
              <p className="flex items-center gap-1 text-sm text-neutral-600">
                <User className="size-3.5 shrink-0" aria-hidden /> {p.cliente_nombre}
              </p>
            )}
            </div>
            {p.activo && (
              <Link
                to={`/?obra=${p.id}`}
                className="flex min-h-12 items-center justify-between border-t border-neutral-200 px-4 font-bold hover:bg-neutral-50 active:bg-neutral-100"
              >
                Ver bitácora <ArrowRight className="size-5" aria-hidden />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
