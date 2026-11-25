import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, SearchX, MapPin } from 'lucide-react'
import { useFeedAvances } from '../../hooks/useFeedAvances'
import { useResumenObra } from '../../hooks/useResumenObra'
import ResumenObra from './ResumenObra'
import { useObraActiva, useProyectos } from '../../hooks/useProyectos'
import { claveDia, tituloDia, partesDia } from '../../lib/fechas'
import { ETAPAS, ESTADOS } from '../../lib/constantes'
import FiltrosFeed from './FiltrosFeed'
import TarjetaAvance from './TarjetaAvance'
import Lightbox from './Lightbox'
import Aviso from '../../components/ui/Aviso'
import Boton from '../../components/ui/Boton'
import { SkeletonTarjetaAvance } from '../../components/ui/Skeleton'

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// Valores inválidos en la URL (enlace viejo o editado a mano) romperían la consulta.
const obraValida = (v) => (v && RE_UUID.test(v) ? v : '')
const etapaValida = (v) => (ETAPAS.some((e) => e.valor === v) ? v : '')
const estadoValido = (v) => (ESTADOS.some((e) => e.valor === v) ? v : '')

export default function FeedAvances() {
  const [params, setParams] = useSearchParams()
  const [obraActiva, setObraActiva] = useObraActiva()
  const { proyectos } = useProyectos()

  // Filtros en la URL: sobreviven a recargar la página y se pueden compartir.
  // Sin parámetro "obra" se usa la obra activa; "obra=" vacío significa "todas".
  const filtros = {
    obra: params.has('obra') ? obraValida(params.get('obra')) : obraValida(obraActiva),
    etapa: etapaValida(params.get('etapa')),
    estado: estadoValido(params.get('estado')),
  }

  const cambiarFiltros = (nuevos) => {
    const p = new URLSearchParams()
    p.set('obra', nuevos.obra)
    if (nuevos.etapa) p.set('etapa', nuevos.etapa)
    if (nuevos.estado) p.set('estado', nuevos.estado)
    setParams(p, { replace: true })
    if (nuevos.obra !== filtros.obra && nuevos.obra) setObraActiva(nuevos.obra)
  }

  const { avances, cargando, cargandoMas, hayMas, error, recargar, cargarMas, quitar } = useFeedAvances({
    proyectoId: filtros.obra,
    etapa: filtros.etapa,
    estado: filtros.estado,
  })

  const grupos = useMemo(() => {
    const mapa = new Map()
    for (const a of avances) {
      const k = claveDia(a.registrado_en)
      if (!mapa.has(k)) mapa.set(k, [])
      mapa.get(k).push(a)
    }
    return [...mapa.entries()]
  }, [avances])

  // Scroll infinito con fallback de botón.
  const centinela = useRef(null)
  useEffect(() => {
    const el = centinela.current
    // Con error no se auto-reintenta: evita un bucle de pedidos sin señal (queda el botón).
    if (!el || !hayMas || error) return
    const obs = new IntersectionObserver((entradas) => entradas[0].isIntersecting && cargarMas(), { rootMargin: '600px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [cargarMas, hayMas, error])

  const [visor, setVisor] = useState(null)
  const abrirFoto = useCallback((avance, indice) => setVisor({ avance, indice }), [])
  const cerrarVisor = useCallback(() => setVisor(null), [])

  const hayFiltros = filtros.etapa || filtros.estado
  const obraSeleccionada = proyectos.find((p) => p.id === filtros.obra)
  const { resumen, cargando: cargandoResumen, recargar: recargarResumen } = useResumenObra(filtros.obra)
  const actualizar = () => {
    recargar()
    recargarResumen()
  }

  return (
    <div className="space-y-5 lg:space-y-6">
      {/* Encabezado de página */}
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold tracking-widest text-neutral-500 uppercase">Bitácora</p>
          <h1 className="truncate text-2xl font-black lg:text-4xl">{obraSeleccionada?.nombre ?? 'Todas las obras'}</h1>
          {obraSeleccionada?.direccion && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-neutral-600">
              <MapPin className="size-4 shrink-0" aria-hidden /> {obraSeleccionada.direccion}
            </p>
          )}
        </div>
        <Link
          to="/nuevo"
          className="hidden min-h-12 shrink-0 items-center gap-2 rounded-xl bg-yellow-400 px-5 font-black text-neutral-950 shadow-sm transition hover:bg-yellow-300 lg:inline-flex"
        >
          <Plus className="size-5" strokeWidth={3} aria-hidden /> Nuevo avance
        </Link>
      </div>

      <ResumenObra resumen={resumen} cargando={cargandoResumen} />

      <FiltrosFeed proyectos={proyectos} filtros={filtros} onCambiar={cambiarFiltros} onRecargar={actualizar} recargando={cargando} />

      {error && (
        <Aviso
          tipo="error"
          accion={
            <button onClick={recargar} className="min-h-11 px-2 font-bold underline">
              Reintentar
            </button>
          }
        >
          {error}
        </Aviso>
      )}

      {cargando && avances.length === 0 ? (
        <div className="grid gap-4 xl:grid-cols-2 lg:pl-[11.5rem]" aria-busy="true" aria-label="Cargando bitácora">
          <SkeletonTarjetaAvance />
          <SkeletonTarjetaAvance />
          <SkeletonTarjetaAvance />
        </div>
      ) : !error && avances.length === 0 ? (
        <div className="space-y-4 rounded-2xl bg-white px-4 py-12 text-center shadow-sm ring-1 ring-neutral-200">
          <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-neutral-100">
            <SearchX className="size-9 text-neutral-500" aria-hidden />
          </span>
          <p className="text-lg font-bold">{hayFiltros ? 'No hay avances con estos filtros.' : 'Todavía no hay avances registrados.'}</p>
          {hayFiltros ? (
            <Boton variante="secundario" onClick={() => cambiarFiltros({ obra: filtros.obra, etapa: '', estado: '' })}>
              Quitar filtros
            </Boton>
          ) : (
            <Link
              to="/nuevo"
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-yellow-400 px-5 font-bold text-neutral-950 hover:bg-yellow-300 active:bg-yellow-500"
            >
              <Plus className="size-5" aria-hidden /> Cargar el primero
            </Link>
          )}
        </div>
      ) : (
        <div className={`space-y-8 transition-opacity ${cargando ? 'opacity-50' : ''}`}>
          {grupos.map(([dia, items]) => {
            const partes = partesDia(dia)
            const titulo = tituloDia(dia)
            const fotos = items.reduce((s, a) => s + a.fotos.length, 0)
            return (
              <section key={dia} aria-labelledby={`dia-${dia}`} className="lg:grid lg:grid-cols-[10rem_minmax(0,1fr)] lg:gap-6">
                {/* Fecha: barra en celular, bloque fijo a la izquierda en escritorio */}
                <h2 id={`dia-${dia}`} className="mb-3 lg:mb-0">
                  <span className="flex items-center gap-3 lg:sticky lg:top-6 lg:flex-col lg:items-stretch lg:gap-0 lg:overflow-hidden lg:rounded-2xl lg:bg-neutral-950 lg:text-white lg:shadow-sm">
                    <span className="franja-obra hidden h-1.5 lg:block" aria-hidden />
                    <span className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl bg-neutral-950 text-white lg:size-auto lg:rounded-none lg:bg-transparent lg:pt-4 lg:pb-1">
                      <span className="text-2xl leading-none font-black lg:text-5xl">{partes.numero}</span>
                      <span className="text-xs font-bold tracking-wider text-yellow-400 uppercase lg:mt-1 lg:text-sm">{partes.mes}</span>
                    </span>
                    <span className="min-w-0 lg:px-3 lg:pb-4 lg:text-center">
                      <span className="block text-lg leading-tight font-black lg:text-base lg:text-neutral-200">
                        {titulo === 'Hoy' || titulo === 'Ayer' ? titulo : partes.semana.charAt(0).toUpperCase() + partes.semana.slice(1)}
                      </span>
                      <span className="block text-sm font-medium text-neutral-600 lg:text-neutral-400">
                        {items.length} registro{items.length !== 1 && 's'} · {fotos} foto{fotos !== 1 && 's'}
                      </span>
                    </span>
                  </span>
                </h2>
                {/* Línea de tiempo */}
                <div className="relative lg:border-l-4 lg:border-neutral-300 lg:pl-6">
                  {/* Punto del día sobre la línea de tiempo */}
                  <span className="absolute top-5 -left-[0.7rem] hidden size-4 rounded-full bg-yellow-400 ring-4 ring-neutral-100 lg:block" aria-hidden />
                  <div className="grid gap-4 xl:grid-cols-2">
                    {items.map((a) => (
                      <TarjetaAvance
                        key={a.id}
                        avance={a}
                        mostrarObra={!filtros.obra}
                        onAbrirFoto={abrirFoto}
                        onBorrado={() => {
                          quitar(a.id)
                          recargarResumen()
                        }}
                      />
                    ))}
                  </div>
                </div>
              </section>
            )
          })}

          <div ref={centinela} />
          {cargandoMas && (
            <div className="lg:pl-[11.5rem]">
              <SkeletonTarjetaAvance />
            </div>
          )}
          {hayMas && !cargandoMas && (
            <div className="lg:pl-[11.5rem]">
              <Boton variante="secundario" bloque onClick={cargarMas}>
                Cargar más
              </Boton>
            </div>
          )}
          {!hayMas && avances.length > 0 && <p className="py-4 text-center text-sm font-bold text-neutral-500">— Fin de la bitácora —</p>}
        </div>
      )}

      {visor && <Lightbox fotos={visor.avance.fotos} indice={visor.indice} avance={visor.avance} onCerrar={cerrarVisor} />}
    </div>
  )
}
