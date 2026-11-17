import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Send, RotateCcw, Lock, ChevronDown, CheckCircle2, X } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useObraActiva, useProyectos } from '../../hooks/useProyectos'
import { useSubirAvance } from '../../hooks/useSubirAvance'
import { ETAPAS, ESTADOS } from '../../lib/constantes'
import SelectorObra from '../../components/ui/SelectorObra'
import SelectorFotos from './SelectorFotos'
import Boton from '../../components/ui/Boton'
import BarraProgreso from '../../components/ui/BarraProgreso'
import Aviso from '../../components/ui/Aviso'
import { Skeleton } from '../../components/ui/Skeleton'

const CLAVE_ULTIMA_ETAPA = 'bitacora:ultima-etapa'

function leerUltimaEtapa() {
  try {
    return localStorage.getItem(CLAVE_ULTIMA_ETAPA) || ''
  } catch {
    return ''
  }
}

function Seccion({ titulo, htmlFor, children, extra }) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-black tracking-wide uppercase">
          {htmlFor ? <label htmlFor={htmlFor}>{titulo}</label> : titulo}
        </h2>
        {extra}
      </div>
      {children}
    </section>
  )
}

export default function FormularioAvance() {
  const navigate = useNavigate()
  const { usuario, perfil } = useAuth()
  const { proyectos, cargando: cargandoObras, error: errorObras } = useProyectos()
  const [obraActiva, setObraActiva] = useObraActiva()
  const subida = useSubirAvance()

  const [etapa, setEtapa] = useState(leerUltimaEtapa)
  const [estado, setEstado] = useState('avance_normal')
  const [comentario, setComentario] = useState('')
  const [notaInterna, setNotaInterna] = useState('')
  const [mostrarNota, setMostrarNota] = useState(false)
  const [errorValidacion, setErrorValidacion] = useState('')

  // Sólo obras donde el usuario puede cargar (director/encargado) o todas si es admin.
  const obrasCargables = useMemo(
    () =>
      perfil?.rol === 'admin'
        ? proyectos
        : proyectos.filter((p) =>
            p.proyecto_miembros.some((m) => m.usuario_id === usuario?.id && m.rol !== 'cliente'),
          ),
    [proyectos, perfil, usuario],
  )

  // Si hay una sola obra, o la recordada ya no está disponible, seleccionar automáticamente.
  useEffect(() => {
    if (cargandoObras) return
    const existe = obrasCargables.some((p) => p.id === obraActiva)
    if (!existe) setObraActiva(obrasCargables.length === 1 ? obrasCargables[0].id : '')
  }, [cargandoObras, obrasCargables, obraActiva, setObraActiva])

  // Avisar si se intenta cerrar la pestaña con una subida en curso.
  useEffect(() => {
    if (!subida.enviando) return
    const h = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [subida.enviando])

  const bloqueado = subida.enviando

  const alEnviar = async (e) => {
    e.preventDefault()
    setErrorValidacion('')
    if (!obraActiva) return setErrorValidacion('Elegí la obra.')
    if (!etapa) return setErrorValidacion('Elegí la etapa / rubro.')
    if (subida.fotos.length === 0 && !comentario.trim()) {
      return setErrorValidacion('Agregá al menos una foto o un comentario.')
    }
    try {
      localStorage.setItem(CLAVE_ULTIMA_ETAPA, etapa)
    } catch {
      /* ignorar */
    }
    const ok = await subida.enviar({ proyectoId: obraActiva, etapa, estado, comentario, notaInterna })
    if (ok) window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cargarOtro = () => {
    subida.reiniciar()
    setComentario('')
    setNotaInterna('')
    setMostrarNota(false)
    setEstado('avance_normal')
  }

  if (subida.fase === 'listo') {
    return (
      <div className="space-y-4 pt-6 text-center">
        <CheckCircle2 className="mx-auto size-20 text-green-700" aria-hidden />
        <h1 className="text-2xl font-black">Avance registrado</h1>
        <p className="text-neutral-700">
          {subida.fotos.length > 0 ? `${subida.fotos.length} foto(s) subidas correctamente.` : 'Nota guardada correctamente.'}
        </p>
        <div className="space-y-3 pt-2">
          <Boton tamano="lg" variante="acento" bloque onClick={cargarOtro}>
            Cargar otro avance
          </Boton>
          <Boton tamano="lg" variante="secundario" bloque onClick={() => navigate('/')}>
            Ver bitácora
          </Boton>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={alEnviar} className="space-y-6" noValidate>
      <h1 className="text-2xl font-black">Nuevo avance</h1>

      <Seccion titulo="Obra" htmlFor="obra-form">
        {cargandoObras ? (
          <Skeleton className="h-12 w-full rounded-xl" />
        ) : errorObras ? (
          <Aviso tipo="error">{errorObras}</Aviso>
        ) : obrasCargables.length === 0 ? (
          <Aviso tipo="info">
            No tenés obras asignadas para cargar avances.{' '}
            <Link to="/obras" className="font-bold underline">
              Ver obras
            </Link>
          </Aviso>
        ) : (
          <SelectorObra
            id="obra-form"
            proyectos={obrasCargables}
            valor={obraActiva}
            onCambiar={setObraActiva}
            // Con fotos ya subidas (rutas bajo esta obra) no se puede cambiar de obra.
            disabled={bloqueado || subida.fotos.some((f) => f.subida)}
          />
        )}
      </Seccion>

      <Seccion titulo="Etapa / Rubro">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Etapa o rubro">
          {ETAPAS.map((e) => {
            const activa = etapa === e.valor
            return (
              <button
                key={e.valor}
                type="button"
                role="radio"
                aria-checked={activa}
                disabled={bloqueado}
                onClick={() => setEtapa(e.valor)}
                className={`min-h-12 rounded-xl border-2 px-3 text-left text-[0.95rem] leading-tight font-bold ${
                  activa ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-300 bg-white active:bg-neutral-100'
                }`}
              >
                {e.etiqueta}
              </button>
            )
          })}
        </div>
      </Seccion>

      <Seccion titulo="Fotos">
        <SelectorFotos fotos={subida.fotos} onAgregar={subida.agregarArchivos} onQuitar={subida.quitarFoto} bloqueado={bloqueado} />
      </Seccion>

      <Seccion titulo="Estado">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Estado del avance">
          {ESTADOS.map((e) => {
            const activo = estado === e.valor
            const Icono = e.icono
            return (
              <button
                key={e.valor}
                type="button"
                role="radio"
                aria-checked={activo}
                disabled={bloqueado}
                onClick={() => setEstado(e.valor)}
                className={`flex min-h-16 items-center gap-2 rounded-xl border-2 px-3 text-left leading-tight font-bold ${
                  activo ? e.boton : 'border-neutral-300 bg-white active:bg-neutral-100'
                }`}
              >
                <Icono className="size-6 shrink-0" aria-hidden />
                {e.etiqueta}
              </button>
            )
          })}
        </div>
      </Seccion>

      <Seccion titulo="Comentario técnico" htmlFor="comentario" extra={<span className="text-sm text-neutral-500">{comentario.length}/4000</span>}>
        <textarea
          id="comentario"
          value={comentario}
          onChange={(e) => setComentario(e.target.value.slice(0, 4000))}
          disabled={bloqueado}
          rows={4}
          placeholder="Ej.: Se completó revoque grueso en muros del dormitorio 2. Faltan mochetas."
          className="w-full rounded-xl border-2 border-neutral-950 p-3 text-base placeholder:text-neutral-500 disabled:opacity-60"
        />
        <p className="text-sm text-neutral-600">Visible para el cliente en los reportes.</p>
      </Seccion>

      <section className="rounded-xl border-2 border-dashed border-amber-600 bg-amber-50">
        <button
          type="button"
          onClick={() => setMostrarNota((v) => !v)}
          aria-expanded={mostrarNota}
          className="flex min-h-12 w-full items-center gap-2 px-3 font-bold text-amber-900"
        >
          <Lock className="size-5" aria-hidden />
          <span className="flex-1 text-left">Nota interna {notaInterna && '(con texto)'}</span>
          <ChevronDown className={`size-5 transition-transform ${mostrarNota ? 'rotate-180' : ''}`} aria-hidden />
        </button>
        {mostrarNota && (
          <div className="space-y-1 px-3 pb-3">
            <textarea
              value={notaInterna}
              onChange={(e) => setNotaInterna(e.target.value.slice(0, 4000))}
              disabled={bloqueado}
              rows={3}
              aria-label="Nota interna"
              placeholder="Sólo para el equipo: costos, proveedores, problemas con subcontratos…"
              className="w-full rounded-xl border-2 border-amber-700 bg-white p-3 text-base placeholder:text-neutral-500"
            />
            <p className="text-sm text-amber-900">No aparece en reportes al cliente salvo que se incluya explícitamente.</p>
          </div>
        )}
      </section>

      {/* Barra de acción fija: alcanzable con el pulgar */}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t-2 border-neutral-950 bg-white">
        <div className="mx-auto max-w-2xl space-y-2 px-4 pt-3">
          {(errorValidacion || subida.error) && <Aviso tipo="error">{errorValidacion || subida.error}</Aviso>}

          {bloqueado && (
            <div className="space-y-1">
              <div className="flex justify-between text-sm font-bold">
                <span>{subida.fase === 'guardando' ? 'Guardando registro…' : 'Subiendo fotos…'}</span>
                <span>{subida.progresoTotal}%</span>
              </div>
              <BarraProgreso valor={subida.progresoTotal} etiqueta="Progreso total de la subida" />
            </div>
          )}

          <div className="flex gap-2">
            {bloqueado ? (
              <Boton tamano="lg" variante="secundario" icono={X} onClick={subida.cancelar} disabled={subida.fase === 'guardando'} bloque>
                Cancelar
              </Boton>
            ) : (
              <Boton
                type="submit"
                tamano="lg"
                variante="acento"
                icono={subida.fase === 'error' ? RotateCcw : Send}
                bloque
                disabled={obrasCargables.length === 0}
              >
                {subida.fase === 'error' ? 'Reintentar' : 'Registrar avance'}
              </Boton>
            )}
          </div>
        </div>
      </div>
    </form>
  )
}
