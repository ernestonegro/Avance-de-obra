import { useEffect, useState } from 'react'
import { Link2, Copy, Share2, ExternalLink, Ban, FileText, Check } from 'lucide-react'
import { useObraActiva, useProyectos } from '../../hooks/useProyectos'
import { useReportes, urlReportePublico } from '../../hooks/useReportes'
import { hoyISO, restarDias, fechaCortaDesdeDia, fechaCorta } from '../../lib/fechas'
import SelectorObra from '../../components/ui/SelectorObra'
import Boton from '../../components/ui/Boton'
import Aviso from '../../components/ui/Aviso'
import { Skeleton } from '../../components/ui/Skeleton'

const RANGOS = [
  { dias: 7, etiqueta: '7 días' },
  { dias: 15, etiqueta: '15 días' },
  { dias: 30, etiqueta: '30 días' },
]

function Interruptor({ marcado, onCambiar, titulo, descripcion }) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 border-neutral-300 p-3 has-checked:border-neutral-950">
      <input type="checkbox" checked={marcado} onChange={(e) => onCambiar(e.target.checked)} className="size-6 shrink-0 accent-neutral-950" />
      <span>
        <span className="block font-bold">{titulo}</span>
        <span className="block text-sm text-neutral-600">{descripcion}</span>
      </span>
    </label>
  )
}

function AccionesEnlace({ token, titulo }) {
  const [copiado, setCopiado] = useState(false)
  const url = urlReportePublico(token)
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Portapapeles bloqueado (permisos / navegador viejo): se muestra para copiar a mano.
      window.prompt('Copiá el enlace:', url)
    }
  }
  const compartir = () => navigator.share?.({ title: titulo, url }).catch(() => {})
  return (
    <div className="grid grid-cols-3 gap-2">
      <Boton variante="secundario" icono={copiado ? Check : Copy} onClick={copiar} className="px-2 text-sm">
        {copiado ? 'Copiado' : 'Copiar'}
      </Boton>
      {'share' in navigator ? (
        <Boton variante="secundario" icono={Share2} onClick={compartir} className="px-2 text-sm">
          Enviar
        </Boton>
      ) : (
        <span />
      )}
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-2 text-sm font-bold text-white"
      >
        <ExternalLink className="size-5" aria-hidden /> Ver / PDF
      </a>
    </div>
  )
}

export default function GeneradorReporte() {
  const { proyectos, cargando: cargandoObras } = useProyectos()
  const [obra, setObra] = useObraActiva()
  const { reportes, cargando, error, crear, revocar } = useReportes(obra)

  const hoy = hoyISO()
  const [desde, setDesde] = useState(restarDias(hoy, 6))
  const [hasta, setHasta] = useState(hoy)
  const [titulo, setTitulo] = useState('Reporte de avance de obra')
  const [incluirNotas, setIncluirNotas] = useState(false)
  const [incluirProblemas, setIncluirProblemas] = useState(false)
  const [diasVigencia, setDiasVigencia] = useState('30')
  const [creando, setCreando] = useState(false)
  const [errorCrear, setErrorCrear] = useState('')
  const [nuevo, setNuevo] = useState(null)
  const [errorRevocar, setErrorRevocar] = useState('')

  const alRevocar = async (r) => {
    if (!window.confirm(`¿Revocar "${r.titulo}"? El enlace deja de funcionar para siempre (no se puede reactivar).`)) return
    setErrorRevocar('')
    try {
      await revocar(r.id)
      if (nuevo?.id === r.id) setNuevo(null)
    } catch (e) {
      setErrorRevocar(e.message)
    }
  }

  useEffect(() => setNuevo(null), [obra])

  const generar = async (e) => {
    e.preventDefault()
    setErrorCrear('')
    if (!obra) return setErrorCrear('Elegí la obra.')
    if (hasta < desde) return setErrorCrear('La fecha "hasta" debe ser posterior a "desde".')
    setCreando(true)
    try {
      const r = await crear({
        titulo: titulo.trim() || 'Reporte de avance de obra',
        fecha_desde: desde,
        fecha_hasta: hasta,
        incluir_notas_internas: incluirNotas,
        incluir_problemas: incluirProblemas,
        expira_en: diasVigencia ? new Date(Date.now() + Number(diasVigencia) * 86_400_000).toISOString() : null,
      })
      setNuevo({ ...r, titulo })
    } catch (err) {
      setErrorCrear(err.message)
    } finally {
      setCreando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold tracking-widest text-neutral-500 uppercase">Reportes</p>
        <h1 className="text-2xl font-black lg:text-4xl">Reporte para cliente</h1>
        <p className="mt-1 max-w-2xl text-neutral-600">
          Generá un enlace de solo lectura con el avance de un período. El cliente lo abre sin cuenta y lo puede guardar como PDF.
        </p>
      </div>

      <div className="space-y-6 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start lg:gap-6 lg:space-y-0">
      <form onSubmit={generar} className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200 lg:p-6">
        <h2 className="flex items-center gap-2 text-base font-black uppercase">
          <span className="flex size-7 items-center justify-center rounded-full bg-yellow-400">
            <Link2 className="size-4" aria-hidden />
          </span>
          Nuevo enlace
        </h2>
        {cargandoObras ? <Skeleton className="h-12 w-full" /> : <SelectorObra proyectos={proyectos} valor={obra} onCambiar={setObra} />}

        <p className="-mb-2 text-sm font-bold">Período (últimos…)</p>
        <div className="grid grid-cols-3 gap-2">
          {RANGOS.map((r) => {
            const activo = desde === restarDias(hoy, r.dias - 1) && hasta === hoy
            return (
              <button
                key={r.dias}
                type="button"
                onClick={() => {
                  setDesde(restarDias(hoy, r.dias - 1))
                  setHasta(hoy)
                }}
                className={`min-h-11 rounded-full border-2 px-2 text-sm leading-tight font-bold ${activo ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-300 hover:border-neutral-500'}`}
              >
                {r.etiqueta}
              </button>
            )
          })}
        </div>

        {/* min-w-0 + campo-fecha: en Safari de iPhone el input date tiene un ancho mínimo
            propio y se salía de la columna. */}
        <div className="grid grid-cols-2 gap-3">
          <label className="min-w-0 space-y-1">
            <span className="text-sm font-bold">Desde</span>
            <input type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} className="campo-fecha" />
          </label>
          <label className="min-w-0 space-y-1">
            <span className="text-sm font-bold">Hasta</span>
            <input type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} className="campo-fecha" />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-bold">Título</span>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} className="min-h-12 w-full rounded-xl border-2 border-neutral-950 px-3" />
        </label>

        <Interruptor
          marcado={incluirProblemas}
          onCambiar={setIncluirProblemas}
          titulo="Incluir registros con problemas"
          descripcion='"Requiere material" y "Demora / Imprevisto"'
        />
        <Interruptor marcado={incluirNotas} onCambiar={setIncluirNotas} titulo="Incluir notas internas" descripcion="Por defecto el cliente sólo ve el comentario técnico" />

        <label className="block space-y-1">
          <span className="text-sm font-bold">Vigencia del enlace</span>
          <select value={diasVigencia} onChange={(e) => setDiasVigencia(e.target.value)} className="min-h-12 w-full rounded-xl border-2 border-neutral-950 bg-white px-3 font-bold">
            <option value="7">7 días</option>
            <option value="30">30 días</option>
            <option value="90">90 días</option>
            <option value="">Sin vencimiento</option>
          </select>
        </label>

        {errorCrear && <Aviso tipo="error">{errorCrear}</Aviso>}
        <Boton type="submit" tamano="lg" variante="acento" icono={Link2} cargando={creando} bloque>
          Generar enlace de reporte
        </Boton>
      </form>

      <div className="space-y-6">
      {nuevo && (
        <div className="space-y-3 rounded-2xl border-2 border-green-700 bg-green-50 p-3">
          <p className="font-bold text-green-900">Enlace listo (solo lectura). Desde “Ver / PDF” podés guardarlo como PDF.</p>
          <p className="rounded-lg bg-white p-2 font-mono text-xs break-all">{urlReportePublico(nuevo.token)}</p>
          <AccionesEnlace token={nuevo.token} titulo={nuevo.titulo} />
        </div>
      )}

      {obra && (
        <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200 lg:p-6">
          <h2 className="text-base font-black uppercase">Enlaces generados</h2>
          {(error || errorRevocar) && <Aviso tipo="error">{error || errorRevocar}</Aviso>}
          {cargando && reportes.length === 0 && <Skeleton className="h-24 w-full" />}
          {!cargando && reportes.length === 0 && <p className="text-neutral-600">Todavía no hay reportes para esta obra.</p>}
          <ul className="space-y-3">
            {reportes.map((r) => {
              const vencido = r.expira_en && new Date(r.expira_en) < new Date()
              const inactivo = r.revocado || vencido
              return (
                <li key={r.id} className={`space-y-2 rounded-xl border-2 p-3 ${inactivo ? 'border-neutral-300 text-neutral-500' : 'border-neutral-950'}`}>
                  <div className="flex items-start gap-2">
                    <FileText className="mt-0.5 size-5 shrink-0" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{r.titulo}</p>
                      <p className="text-sm">
                        {fechaCortaDesdeDia(r.fecha_desde)} → {fechaCortaDesdeDia(r.fecha_hasta)}
                        {r.revocado ? ' · Revocado' : vencido ? ' · Vencido' : r.expira_en ? ` · vence ${fechaCorta(r.expira_en)}` : ''}
                      </p>
                    </div>
                  </div>
                  {!inactivo && (
                    <>
                      <AccionesEnlace token={r.token} titulo={r.titulo} />
                      <Boton variante="fantasma" icono={Ban} className="text-red-700" onClick={() => alRevocar(r)}>
                        Revocar enlace
                      </Boton>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}
      </div>
      </div>
    </div>
  )
}
