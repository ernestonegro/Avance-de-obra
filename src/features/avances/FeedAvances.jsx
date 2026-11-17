import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, SearchX } from 'lucide-react'
import { useFeedAvances } from '../../hooks/useFeedAvances'
import { useObraActiva, useProyectos } from '../../hooks/useProyectos'
import { claveDia, tituloDia } from '../../lib/fechas'
import FiltrosFeed from './FiltrosFeed'
import TarjetaAvance from './TarjetaAvance'
import Lightbox from './Lightbox'
import Aviso from '../../components/ui/Aviso'
import Boton from '../../components/ui/Boton'
import { SkeletonTarjetaAvance } from '../../components/ui/Skeleton'

export default function FeedAvances() {
  const [params, setParams] = useSearchParams()
  const [obraActiva, setObraActiva] = useObraActiva()
  const { proyectos } = useProyectos()

  // Filtros en la URL: el botón "atrás" y los enlaces compartidos los respetan.
  const filtros = {
    obra: params.get('obra') ?? obraActiva,
    etapa: params.get('etapa') ?? '',
    estado: params.get('estado') ?? '',
  }

  const cambiarFiltros = (nuevos) => {
    const p = new URLSearchParams()
    p.set('obra', nuevos.obra)
    if (nuevos.etapa) p.set('etapa', nuevos.etapa)
    if (nuevos.estado) p.set('estado', nuevos.estado)
    setParams(p, { replace: true })
    if (nuevos.obra !== filtros.obra && nuevos.obra) setObraActiva(nuevos.obra)
  }

  const { avances, cargando, cargandoMas, hayMas, error, recargar, cargarMas } = useFeedAvances({
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
    if (!el || !hayMas) return
    const obs = new IntersectionObserver((entradas) => entradas[0].isIntersecting && cargarMas(), { rootMargin: '600px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [cargarMas, hayMas])

  const [visor, setVisor] = useState(null)
  const abrirFoto = useCallback((avance, indice) => setVisor({ avance, indice }), [])
  const cerrarVisor = useCallback(() => setVisor(null), [])

  const hayFiltros = filtros.etapa || filtros.estado

  return (
    <div className="space-y-4">
      <FiltrosFeed proyectos={proyectos} filtros={filtros} onCambiar={cambiarFiltros} onRecargar={recargar} recargando={cargando} />

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
        <div className="space-y-4" aria-busy="true" aria-label="Cargando bitácora">
          <SkeletonTarjetaAvance />
          <SkeletonTarjetaAvance />
          <SkeletonTarjetaAvance />
        </div>
      ) : !error && avances.length === 0 ? (
        <div className="space-y-4 py-10 text-center">
          <SearchX className="mx-auto size-14 text-neutral-400" aria-hidden />
          <p className="text-lg font-bold">{hayFiltros ? 'No hay avances con estos filtros.' : 'Todavía no hay avances registrados.'}</p>
          {hayFiltros ? (
            <Boton variante="secundario" onClick={() => cambiarFiltros({ obra: filtros.obra, etapa: '', estado: '' })}>
              Quitar filtros
            </Boton>
          ) : (
            <Link
              to="/nuevo"
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-yellow-400 px-5 font-bold text-neutral-950 active:bg-yellow-500"
            >
              <Plus className="size-5" aria-hidden /> Cargar el primero
            </Link>
          )}
        </div>
      ) : (
        <div className={`space-y-6 transition-opacity ${cargando ? 'opacity-50' : ''}`}>
          {grupos.map(([dia, items]) => (
            <section key={dia} aria-labelledby={`dia-${dia}`}>
              <h2
                id={`dia-${dia}`}
                className="-mx-4 mb-2 bg-neutral-950 px-4 py-1.5 text-sm font-black tracking-wide text-white uppercase"
              >
                {tituloDia(dia)} <span className="font-medium text-neutral-300">· {items.length} registro{items.length !== 1 && 's'}</span>
              </h2>
              <div className="space-y-3">
                {items.map((a) => (
                  <TarjetaAvance key={a.id} avance={a} mostrarObra={!filtros.obra} onAbrirFoto={abrirFoto} />
                ))}
              </div>
            </section>
          ))}

          <div ref={centinela} />
          {cargandoMas && <SkeletonTarjetaAvance />}
          {hayMas && !cargandoMas && (
            <Boton variante="secundario" bloque onClick={cargarMas}>
              Cargar más
            </Boton>
          )}
          {!hayMas && avances.length > 0 && <p className="py-4 text-center text-sm text-neutral-500">— Fin de la bitácora —</p>}
        </div>
      )}

      {visor && <Lightbox fotos={visor.avance.fotos} indice={visor.indice} avance={visor.avance} onCerrar={cerrarVisor} />}
    </div>
  )
}
