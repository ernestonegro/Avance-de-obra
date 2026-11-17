import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Printer, Lock, MapPin, User } from 'lucide-react'
import { supabase, mensajeError, urlFoto } from '../../lib/supabase'
import { etiquetaEtapa } from '../../lib/constantes'
import { claveDia, fechaCortaDesdeDia, fechaLarga, hora, tituloDia } from '../../lib/fechas'
import BadgeEstado from '../../components/ui/BadgeEstado'
import Lightbox from '../avances/Lightbox'
import { Skeleton, SkeletonTarjetaAvance } from '../../components/ui/Skeleton'
import Aviso from '../../components/ui/Aviso'

/** Vista pública de solo lectura (sin login) — /r/:token. Optimizada para imprimir/guardar PDF. */
export default function ReportePublico() {
  const { token } = useParams()
  const [datos, setDatos] = useState(null)
  const [estado, setEstado] = useState('cargando') // cargando | ok | no-encontrado | error
  const [error, setError] = useState('')
  const [visor, setVisor] = useState(null)

  useEffect(() => {
    let activo = true
    supabase.rpc('obtener_reporte_publico', { p_token: token }).then(({ data, error }) => {
      if (!activo) return
      if (error) {
        setError(mensajeError(error))
        setEstado('error')
      } else if (!data) setEstado('no-encontrado')
      else {
        setDatos(data)
        setEstado('ok')
        document.title = `${data.reporte.titulo} — ${data.proyecto.nombre}`
      }
    })
    return () => {
      activo = false
    }
  }, [token])

  const grupos = useMemo(() => {
    const mapa = new Map()
    for (const a of datos?.avances ?? []) {
      const k = claveDia(a.registrado_en)
      if (!mapa.has(k)) mapa.set(k, [])
      mapa.get(k).push(a)
    }
    return [...mapa.entries()]
  }, [datos])

  if (estado === 'cargando') {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
        <SkeletonTarjetaAvance />
      </div>
    )
  }
  if (estado !== 'ok') {
    return (
      <div className="mx-auto max-w-xl p-4 pt-16">
        <Aviso tipo="error">{estado === 'error' ? error : 'Este reporte no existe, fue revocado o venció.'}</Aviso>
      </div>
    )
  }

  const { reporte, proyecto, avances } = datos
  const totalFotos = avances.reduce((s, a) => s + a.fotos.length, 0)

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-16 print:max-w-none print:p-0">
      <header className="space-y-2 border-b-4 border-neutral-950 pb-4">
        <p className="text-sm font-bold tracking-wide text-neutral-600 uppercase">{reporte.titulo}</p>
        <h1 className="text-3xl leading-tight font-black">{proyecto.nombre}</h1>
        {proyecto.direccion && (
          <p className="flex items-center gap-1.5 text-neutral-700">
            <MapPin className="size-4" aria-hidden /> {proyecto.direccion}
          </p>
        )}
        {proyecto.cliente_nombre && <p className="text-neutral-700">Cliente: {proyecto.cliente_nombre}</p>}
        <p className="font-bold">
          Período: {fechaCortaDesdeDia(reporte.fecha_desde)} al {fechaCortaDesdeDia(reporte.fecha_hasta)} · {avances.length} registros · {totalFotos} fotos
        </p>
        <button
          onClick={() => window.print()}
          className="no-imprimir mt-2 inline-flex min-h-12 items-center gap-2 rounded-xl bg-neutral-950 px-5 font-bold text-white active:bg-neutral-700"
        >
          <Printer className="size-5" aria-hidden /> Imprimir / Guardar PDF
        </button>
      </header>

      {avances.length === 0 && <p className="py-10 text-center text-lg">No hay registros en este período.</p>}

      {grupos.map(([dia, items]) => (
        <section key={dia} className="mt-6">
          <h2 className="mb-3 bg-neutral-950 px-3 py-1.5 text-sm font-black tracking-wide text-white uppercase print:bg-neutral-200 print:text-neutral-950">
            {tituloDia(dia) === 'Hoy' || tituloDia(dia) === 'Ayer' ? fechaLarga(items[0].registrado_en) : tituloDia(dia)}
          </h2>
          <div className="space-y-4">
            {items.map((a) => (
              <article key={a.id} className="evitar-corte space-y-2 border-b-2 border-neutral-200 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-black">{etiquetaEtapa(a.etapa)}</h3>
                  <BadgeEstado estado={a.estado} />
                </div>
                <p className="flex items-center gap-1.5 text-sm text-neutral-700">
                  <span className="font-bold text-neutral-950">{hora(a.registrado_en)} h</span>
                  <User className="size-3.5" aria-hidden /> {a.autor_nombre}
                </p>
                {a.comentario && <p className="leading-snug whitespace-pre-line">{a.comentario}</p>}
                {a.nota_interna && (
                  <p className="flex gap-2 rounded-lg border-2 border-dashed border-amber-600 bg-amber-50 p-2 text-sm">
                    <Lock className="mt-0.5 size-4 shrink-0" aria-label="Nota interna" />
                    <span className="whitespace-pre-line">{a.nota_interna}</span>
                  </p>
                )}
                {a.fotos.length > 0 && (
                  <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 print:grid-cols-3">
                    {a.fotos.map((f, i) => (
                      <li key={f.id} className="evitar-corte">
                        <button
                          onClick={() => setVisor({ avance: a, indice: i })}
                          className="block w-full overflow-hidden rounded-lg bg-neutral-200"
                          aria-label={`Ampliar foto ${i + 1}`}
                        >
                          {/* En pantalla, miniatura; al imprimir se usa la misma (suficiente para A4 a 3 columnas). */}
                          <img src={urlFoto(f.thumb_path)} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}

      <footer className="mt-10 text-sm text-neutral-500">
        Generado el {fechaLarga(reporte.generado_en)} · Documento de solo lectura
      </footer>

      {visor && <Lightbox fotos={visor.avance.fotos} indice={visor.indice} avance={visor.avance} onCerrar={() => setVisor(null)} />}
    </div>
  )
}
