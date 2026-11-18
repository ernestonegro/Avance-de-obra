import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Printer, Lock, MapPin, User, Loader2, HardHat, CalendarDays, ClipboardList, Images, Layers, Clock } from 'lucide-react'
import { supabase, mensajeError, urlFoto } from '../../lib/supabase'
import { etiquetaEtapa, etapaPorValor, estadoPorValor } from '../../lib/constantes'
import { claveDia, fechaCortaDesdeDia, fechaLarga, hora, tituloDiaCompleto } from '../../lib/fechas'
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
  const [preparando, setPreparando] = useState(false)
  const [actualizado, setActualizado] = useState(null)

  // silencioso = refresco en segundo plano: si falla (sin señal) se conserva lo que ya se ve.
  const cargar = useCallback(
    async (silencioso = false) => {
      const { data, error } = await supabase.rpc('obtener_reporte_publico', { p_token: token })
      if (error) {
        if (silencioso) return
        setError(mensajeError(error))
        setEstado('error')
      } else if (!data) setEstado('no-encontrado') // finalizado o vencido (también a mitad de la visita)
      else {
        setDatos(data)
        setEstado('ok')
        setActualizado(new Date())
        document.title = `${data.reporte.titulo} — ${data.proyecto.nombre}`
      }
    },
    [token],
  )

  useEffect(() => {
    cargar()
  }, [cargar])

  // Enlace en vivo: se actualiza solo al volver a la pestaña y cada 5 minutos mientras está visible.
  const enVivo = Boolean(datos?.reporte.en_vivo)
  useEffect(() => {
    if (!enVivo) return
    const alVolver = () => document.visibilityState === 'visible' && cargar(true)
    document.addEventListener('visibilitychange', alVolver)
    const t = setInterval(() => document.visibilityState === 'visible' && cargar(true), 5 * 60 * 1000)
    return () => {
      document.removeEventListener('visibilitychange', alVolver)
      clearInterval(t)
    }
  }, [enVivo, cargar])

  // Agrupado en la zona horaria de la obra: coincide con el rango que filtra el servidor,
  // aunque el cliente abra el enlace desde otro país.
  const tz = datos?.proyecto.zona_horaria
  const grupos = useMemo(() => {
    const mapa = new Map()
    for (const a of datos?.avances ?? []) {
      const k = claveDia(a.registrado_en, tz)
      if (!mapa.has(k)) mapa.set(k, [])
      mapa.get(k).push(a)
    }
    return [...mapa.entries()]
  }, [datos, tz])

  // Antes de imprimir, esperar a que todas las fotos estén cargadas: si no, salen en blanco en el PDF.
  const imprimir = async () => {
    setPreparando(true)
    const imgs = [...document.querySelectorAll('img[data-foto-reporte]')]
    // En pantalla las fotos cargan al hacer scroll (un enlace en vivo puede tener cientos);
    // para imprimir se fuerzan todas.
    imgs.forEach((img) => (img.loading = 'eager'))
    await Promise.race([
      Promise.all(imgs.map((img) => (img.complete ? null : img.decode().catch(() => {})))),
      new Promise((r) => setTimeout(r, 20_000)), // con señal mala, no bloquear para siempre
    ])
    setPreparando(false)
    window.print()
  }

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
        <Aviso tipo="error">{estado === 'error' ? error : 'Este enlace fue finalizado o venció. Pedile uno nuevo a la empresa constructora.'}</Aviso>
      </div>
    )
  }

  const { reporte, proyecto, avances } = datos
  const totalFotos = avances.reduce((s, a) => s + a.fotos.length, 0)
  const totalEtapas = new Set(avances.map((a) => a.etapa)).size
  const indicadores = [
    { icono: ClipboardList, valor: avances.length, etiqueta: 'Registros' },
    { icono: Images, valor: totalFotos, etiqueta: 'Fotos' },
    { icono: Layers, valor: totalEtapas, etiqueta: totalEtapas === 1 ? 'Etapa' : 'Etapas' },
    { icono: CalendarDays, valor: grupos.length, etiqueta: grupos.length === 1 ? 'Día con avance' : 'Días con avance' },
  ]

  return (
    <div className="min-h-dvh bg-neutral-100 print:bg-white">
      {/* Portada */}
      <header className="bg-neutral-950 text-white print:bg-white print:text-neutral-950">
        <div className="franja-obra h-2" aria-hidden />
        <div className="mx-auto max-w-5xl px-4 pt-8 pb-10 lg:px-8 lg:pt-12 lg:pb-14 print:px-0 print:pt-0 print:pb-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="inline-flex items-center gap-2 rounded-full bg-yellow-400 px-3 py-1 text-sm font-black tracking-wide text-neutral-950 uppercase">
                <HardHat className="size-4" aria-hidden /> {reporte.titulo}
              </p>
              {reporte.en_vivo && (
                <p className="inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-sm font-black tracking-wide text-white uppercase print:hidden">
                  <span className="size-2 animate-pulse rounded-full bg-white" aria-hidden /> En vivo
                </p>
              )}
              {reporte.en_vivo && actualizado && (
                <p className="text-sm text-neutral-400 print:text-neutral-600">
                  Actualizado {actualizado.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })} h
                </p>
              )}
            </div>
            <button
              onClick={imprimir}
              disabled={preparando}
              className="no-imprimir inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 font-bold text-neutral-950 transition hover:bg-yellow-400 disabled:opacity-60"
            >
              {preparando ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Printer className="size-5" aria-hidden />}
              {preparando ? 'Cargando fotos…' : 'Imprimir / Guardar PDF'}
            </button>
          </div>
          <h1 className="mt-5 text-4xl leading-tight font-black lg:text-6xl">{proyecto.nombre}</h1>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-neutral-300 print:text-neutral-700">
            {proyecto.direccion && (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" aria-hidden /> {proyecto.direccion}
              </span>
            )}
            {proyecto.cliente_nombre && (
              <span className="flex items-center gap-1.5">
                <User className="size-4" aria-hidden /> Cliente: {proyecto.cliente_nombre}
              </span>
            )}
            <span className="flex items-center gap-1.5 font-bold text-white print:text-neutral-950">
              <CalendarDays className="size-4" aria-hidden />{' '}
              {reporte.en_vivo
                ? reporte.fecha_desde
                  ? `Desde el ${fechaCortaDesdeDia(reporte.fecha_desde)} hasta hoy`
                  : 'Desde el inicio de la obra hasta hoy'
                : `${fechaCortaDesdeDia(reporte.fecha_desde)} al ${fechaCortaDesdeDia(reporte.fecha_hasta)}`}
            </span>
          </div>

          <ul className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4 print:mt-4 print:grid-cols-4">
            {indicadores.map(({ icono: Icono, valor, etiqueta }) => (
              <li key={etiqueta} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10 print:bg-white print:ring-neutral-300">
                <Icono className="size-5 text-yellow-400 print:text-neutral-700" aria-hidden />
                <p className="mt-2 text-3xl font-black tabular-nums">{valor}</p>
                <p className="text-sm font-bold text-neutral-300 print:text-neutral-600">{etiqueta}</p>
              </li>
            ))}
          </ul>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-8 pb-16 lg:px-8 print:max-w-none print:p-0 print:pt-4">
      {avances.length === 0 && (
        <p className="rounded-2xl bg-white py-12 text-center text-lg font-bold shadow-sm ring-1 ring-neutral-200">No hay registros en este período.</p>
      )}

      {grupos.map(([dia, items]) => (
        <section key={dia} className="mt-8 first:mt-0">
          <h2 className="mb-4 flex items-center gap-3 text-lg font-black">
            <span className="h-7 w-1.5 rounded-full bg-yellow-400 print:bg-neutral-950" aria-hidden />
            {tituloDiaCompleto(dia)}
            <span className="text-sm font-bold text-neutral-500">
              · {items.length} registro{items.length !== 1 && 's'}
            </span>
          </h2>
          <div className="space-y-4">
            {items.map((a) => {
              const IconoEtapa = etapaPorValor(a.etapa).icono
              return (
              <article
                key={a.id}
                className={`evitar-corte space-y-3 rounded-2xl border-l-[6px] bg-white p-4 shadow-sm ring-1 ring-neutral-200 lg:p-6 print:shadow-none ${estadoPorValor(a.estado).borde}`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-yellow-400">
                    <IconoEtapa className="size-6" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg leading-tight font-black lg:text-xl">{etiquetaEtapa(a.etapa)}</h3>
                    <p className="flex items-center gap-3 text-sm text-neutral-700">
                      <span className="inline-flex items-center gap-1 font-bold text-neutral-950">
                        <Clock className="size-3.5" aria-hidden /> {hora(a.registrado_en, tz)} h
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <User className="size-3.5" aria-hidden /> {a.autor_nombre}
                      </span>
                    </p>
                  </div>
                  <BadgeEstado estado={a.estado} />
                </div>
                {a.comentario && <p className="leading-snug whitespace-pre-line">{a.comentario}</p>}
                {a.nota_interna && (
                  <p className="flex gap-2 rounded-lg border-2 border-dashed border-amber-600 bg-amber-50 p-2 text-sm">
                    <Lock className="mt-0.5 size-4 shrink-0" aria-label="Nota interna" />
                    <span className="whitespace-pre-line">{a.nota_interna}</span>
                  </p>
                )}
                {a.fotos.length > 0 && (
                  <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-3">
                    {a.fotos.map((f, i) => (
                      <li key={f.id} className="evitar-corte">
                        <button
                          onClick={() => setVisor({ avance: a, indice: i })}
                          className="group block w-full overflow-hidden rounded-xl bg-neutral-200"
                          aria-label={`Ampliar foto ${i + 1}`}
                        >
                          {/* Miniatura (≈480px): suficiente para A4 a 3 columnas. Carga diferida en
                              pantalla; imprimir() fuerza la carga de todas antes del diálogo. */}
                          <img
                            data-foto-reporte
                            loading="lazy"
                            src={urlFoto(f.thumb_path)}
                            crossOrigin="anonymous"
                            alt=""
                            className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
              )
            })}
          </div>
        </section>
      ))}

      <footer className="mt-12 flex items-center gap-2 border-t border-neutral-300 pt-4 text-sm text-neutral-500">
        <HardHat className="size-4" aria-hidden />
        Generado el {fechaLarga(reporte.generado_en, tz).toLowerCase()} · Documento de solo lectura
      </footer>
      </main>

      {visor && (
        <Lightbox fotos={visor.avance.fotos} indice={visor.indice} avance={visor.avance} zonaHoraria={tz} onCerrar={() => setVisor(null)} />
      )}
    </div>
  )
}
