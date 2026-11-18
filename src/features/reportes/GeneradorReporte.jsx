import { useEffect, useState } from 'react'
import { Link2, Copy, Share2, ExternalLink, Ban, FileText, Check, Radio, CalendarRange, X } from 'lucide-react'
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
  // "vivo": sin fecha de fin ni vencimiento, hasta que se finaliza. "periodo": rango fijo.
  const [tipo, setTipo] = useState('vivo')
  const [desdeVivo, setDesdeVivo] = useState('') // vacío = desde el inicio de la obra
  const [titulo, setTitulo] = useState('Avance de obra')
  const [incluirNotas, setIncluirNotas] = useState(false)
  const [incluirProblemas, setIncluirProblemas] = useState(false)
  const [diasVigencia, setDiasVigencia] = useState('30')
  const [creando, setCreando] = useState(false)
  const [errorCrear, setErrorCrear] = useState('')
  const [nuevo, setNuevo] = useState(null)
  const [errorRevocar, setErrorRevocar] = useState('')

  const alRevocar = async (r) => {
    if (!window.confirm(`¿Finalizar "${r.titulo}"? El cliente deja de poder verlo y no se puede reactivar (podés generar uno nuevo).`)) return
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
    const enVivo = tipo === 'vivo'
    if (!enVivo && hasta < desde) return setErrorCrear('La fecha "hasta" debe ser posterior a "desde".')
    setCreando(true)
    try {
      const r = await crear({
        titulo: titulo.trim() || (enVivo ? 'Avance de obra' : 'Reporte de avance de obra'),
        fecha_desde: enVivo ? desdeVivo || null : desde,
        fecha_hasta: enVivo ? null : hasta,
        incluir_notas_internas: incluirNotas,
        incluir_problemas: incluirProblemas,
        expira_en: enVivo || !diasVigencia ? null : new Date(Date.now() + Number(diasVigencia) * 86_400_000).toISOString(),
      })
      setNuevo({ ...r, titulo, enVivo })
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
          Generá un enlace de solo lectura para el cliente: lo abre sin cuenta, ve el avance día a día y lo puede guardar como PDF.
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

        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de enlace">
          {[
            { valor: 'vivo', icono: Radio, titulo: 'En vivo', texto: 'Día a día, hasta que lo finalices' },
            { valor: 'periodo', icono: CalendarRange, titulo: 'Período fijo', texto: 'Entre dos fechas' },
          ].map(({ valor, icono: Icono, titulo: t, texto }) => (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={tipo === valor}
              onClick={() => {
                setTipo(valor)
                setTitulo(valor === 'vivo' ? 'Avance de obra' : 'Reporte de avance de obra')
              }}
              className={`flex flex-col items-start gap-1 rounded-xl border-2 p-3 text-left transition ${
                tipo === valor ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-200 hover:border-neutral-400'
              }`}
            >
              <Icono className={`size-5 ${tipo === valor ? 'text-yellow-400' : 'text-neutral-500'}`} aria-hidden />
              <span className="font-black">{t}</span>
              <span className={`text-sm leading-tight ${tipo === valor ? 'text-neutral-300' : 'text-neutral-600'}`}>{texto}</span>
            </button>
          ))}
        </div>

        {tipo === 'vivo' ? (
          <div className="space-y-1.5">
            <label className="block text-sm font-bold" htmlFor="desde-vivo">
              Mostrar desde
            </label>
            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
                <input id="desde-vivo" type="date" value={desdeVivo} max={hoy} onChange={(e) => setDesdeVivo(e.target.value)} className="campo-fecha" />
              </div>
              {desdeVivo && (
                <button type="button" onClick={() => setDesdeVivo('')} className="flex size-12 shrink-0 items-center justify-center rounded-xl border-2 border-neutral-300" aria-label="Quitar fecha: desde el inicio">
                  <X className="size-5" />
                </button>
              )}
            </div>
            <p className="text-sm text-neutral-600">
              {desdeVivo ? `Desde el ${fechaCortaDesdeDia(desdeVivo)} hasta hoy.` : 'Vacío = desde el inicio de la obra.'} Cada avance nuevo aparece solo; el enlace no vence.
            </p>
          </div>
        ) : (
        <>
        <div className="space-y-1.5">
        <p className="text-sm font-bold">Período (últimos…)</p>
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
          <span className="text-sm font-bold">Vigencia del enlace</span>
          <select value={diasVigencia} onChange={(e) => setDiasVigencia(e.target.value)} className="min-h-12 w-full rounded-xl border-2 border-neutral-950 bg-white px-3 font-bold">
            <option value="7">7 días</option>
            <option value="30">30 días</option>
            <option value="90">90 días</option>
            <option value="">Sin vencimiento</option>
          </select>
        </label>
        </>
        )}

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

        {errorCrear && <Aviso tipo="error">{errorCrear}</Aviso>}
        <Boton type="submit" tamano="lg" variante="acento" icono={Link2} cargando={creando} bloque>
          {tipo === 'vivo' ? 'Generar enlace en vivo' : 'Generar enlace del período'}
        </Boton>
      </form>

      <div className="space-y-6">
      {nuevo && (
        <div className="space-y-3 rounded-2xl border-2 border-green-700 bg-green-50 p-3">
          <p className="font-bold text-green-900">
            {nuevo.enVivo
              ? 'Enlace en vivo listo: el cliente va a ver cada avance nuevo hasta que lo finalices.'
              : 'Enlace listo (solo lectura). Desde “Ver / PDF” podés guardarlo como PDF.'}
          </p>
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
            {[...reportes]
              .sort((a, b) => Number(Boolean(a.revocado)) - Number(Boolean(b.revocado)))
              .map((r) => {
              const vencido = r.expira_en && new Date(r.expira_en) < new Date()
              const inactivo = r.revocado || vencido
              const enVivo = !r.fecha_hasta
              return (
                <li key={r.id} className={`space-y-2 rounded-xl border-2 p-3 ${inactivo ? 'border-neutral-300 text-neutral-500' : 'border-neutral-950'}`}>
                  <div className="flex items-start gap-2">
                    <FileText className="mt-0.5 size-5 shrink-0" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-bold">
                        {r.titulo}
                        {enVivo && !inactivo && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-xs font-black tracking-wide text-white uppercase">
                            <span className="size-1.5 animate-pulse rounded-full bg-white" aria-hidden /> En vivo
                          </span>
                        )}
                      </p>
                      <p className="text-sm">
                        {enVivo
                          ? r.fecha_desde
                            ? `Desde el ${fechaCortaDesdeDia(r.fecha_desde)} · día a día`
                            : 'Desde el inicio · día a día'
                          : `${fechaCortaDesdeDia(r.fecha_desde)} → ${fechaCortaDesdeDia(r.fecha_hasta)}`}
                        {r.revocado ? ' · Finalizado' : vencido ? ' · Vencido' : r.expira_en ? ` · vence ${fechaCorta(r.expira_en)}` : ''}
                      </p>
                    </div>
                  </div>
                  {!inactivo && (
                    <>
                      <AccionesEnlace token={r.token} titulo={r.titulo} />
                      <Boton variante="fantasma" icono={Ban} className="text-red-700" onClick={() => alRevocar(r)}>
                        Finalizar enlace
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
