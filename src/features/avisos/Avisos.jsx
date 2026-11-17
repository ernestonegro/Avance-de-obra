import { useCallback, useEffect, useState } from 'react'
import { Bell, BellOff, BellRing, Share, PlusSquare, Smartphone, Send, Check } from 'lucide-react'
import { useProyectos } from '../../hooks/useProyectos'
import { soportePush, suscripcionActual, estadoEnServidor, activarAvisos, guardarPreferencias, desactivarAvisos, enviarPrueba } from '../../lib/push'
import { mensajeError } from '../../lib/supabase'
import Boton from '../../components/ui/Boton'
import Aviso from '../../components/ui/Aviso'
import { Skeleton } from '../../components/ui/Skeleton'

const tarjeta = 'rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200 lg:p-6'

function InstruccionesIOS() {
  return (
    <section className={`${tarjeta} space-y-4`}>
      <h2 className="flex items-center gap-2 text-lg font-black">
        <Smartphone className="size-6" aria-hidden /> En iPhone, primero instalá la app
      </h2>
      <p className="text-neutral-700">Apple sólo permite avisos de apps web agregadas a la pantalla de inicio (iOS 16.4 o más nuevo).</p>
      <ol className="space-y-3">
        <li className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-yellow-400 font-black">1</span>
          <span className="pt-1">
            En <b>Safari</b>, tocá el botón <b>Compartir</b> <Share className="inline size-5 align-text-bottom" aria-label="(ícono compartir)" />
          </span>
        </li>
        <li className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-yellow-400 font-black">2</span>
          <span className="pt-1">
            Elegí <b>Agregar a inicio</b> <PlusSquare className="inline size-5 align-text-bottom" aria-label="(ícono agregar)" />
          </span>
        </li>
        <li className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-yellow-400 font-black">3</span>
          <span className="pt-1">
            Abrí la app desde el ícono nuevo y volvé a <b>Avisos</b> para activarlos.
          </span>
        </li>
      </ol>
    </section>
  )
}

function SelectorObras({ proyectos, todas, setTodas, elegidas, setElegidas, disabled }) {
  const alternar = (id) => setElegidas((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="mb-2 text-sm font-black tracking-wide uppercase">¿De qué obras?</legend>
      <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 border-neutral-200 px-3 has-checked:border-neutral-950">
        <input type="radio" name="alcance" checked={todas} onChange={() => setTodas(true)} className="size-5 accent-neutral-950" />
        <span className="font-bold">Todas las obras</span>
      </label>
      <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 border-neutral-200 px-3 has-checked:border-neutral-950">
        <input type="radio" name="alcance" checked={!todas} onChange={() => setTodas(false)} className="size-5 accent-neutral-950" />
        <span className="font-bold">Sólo algunas</span>
      </label>
      {!todas && (
        <div className="grid gap-2 pl-2 sm:grid-cols-2">
          {proyectos.map((p) => (
            <label key={p.id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl bg-neutral-50 px-3">
              <input type="checkbox" checked={elegidas.includes(p.id)} onChange={() => alternar(p.id)} className="size-5 accent-neutral-950" />
              <span className="font-medium">{p.nombre}</span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  )
}

export default function Avisos() {
  const soporte = soportePush()
  const { proyectos } = useProyectos()
  const [cargando, setCargando] = useState(soporte === 'ok')
  const [sub, setSub] = useState(null)
  const [todas, setTodas] = useState(true)
  const [elegidas, setElegidas] = useState([])
  const [ocupado, setOcupado] = useState('')
  const [mensaje, setMensaje] = useState(null)

  const cargar = useCallback(async () => {
    if (soporte !== 'ok') return
    setCargando(true)
    try {
      const s = await suscripcionActual()
      const estado = await estadoEnServidor(s)
      // Suscripción local sin registro en el servidor (p. ej. se borró): se trata como inactiva.
      setSub(estado ? s : null)
      if (estado?.proyectos?.length) {
        setTodas(false)
        setElegidas(estado.proyectos)
      }
    } catch (e) {
      setMensaje({ tipo: 'error', texto: mensajeError(e) })
    } finally {
      setCargando(false)
    }
  }, [soporte])

  useEffect(() => {
    cargar()
  }, [cargar])

  const proyectosElegidos = todas ? null : elegidas

  const ejecutar = async (accion, fn) => {
    setOcupado(accion)
    setMensaje(null)
    try {
      await fn()
    } catch (e) {
      setMensaje({
        tipo: 'error',
        texto: e.codigo === 'config' ? `Falta terminar la configuración del servidor: ${e.message}` : mensajeError(e),
      })
    } finally {
      setOcupado('')
    }
  }

  const activar = () =>
    ejecutar('activar', async () => {
      if (!todas && elegidas.length === 0) throw new Error('Elegí al menos una obra.')
      setSub(await activarAvisos(proyectosElegidos))
      setMensaje({ tipo: 'exito', texto: 'Avisos activados en este celular.' })
    })

  const guardar = () =>
    ejecutar('guardar', async () => {
      if (!todas && elegidas.length === 0) throw new Error('Elegí al menos una obra.')
      await guardarPreferencias(sub, proyectosElegidos)
      setMensaje({ tipo: 'exito', texto: 'Preferencias guardadas.' })
    })

  const desactivar = () =>
    ejecutar('desactivar', async () => {
      await desactivarAvisos()
      setSub(null)
      setMensaje({ tipo: 'info', texto: 'Avisos desactivados en este celular.' })
    })

  const probar = () =>
    ejecutar('probar', async () => {
      const r = await enviarPrueba(sub)
      setMensaje(r.enviados ? { tipo: 'exito', texto: 'Aviso de prueba enviado: debería llegarte en unos segundos.' } : { tipo: 'error', texto: 'No se pudo entregar el aviso. Desactivá y volvé a activar.' })
    })

  const bloqueado = typeof Notification !== 'undefined' && Notification.permission === 'denied'

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <p className="text-sm font-bold tracking-widest text-neutral-500 uppercase">Configuración</p>
        <h1 className="text-2xl font-black lg:text-4xl">Avisos</h1>
        <p className="mt-1 text-neutral-600">Recibí una notificación en este celular cada vez que alguien carga un avance.</p>
      </div>

      {soporte === 'ios-sin-instalar' && <InstruccionesIOS />}
      {soporte === 'no-soportado' && <Aviso tipo="error">Este navegador no admite notificaciones. Probá con Chrome (Android) o con la app instalada en iPhone.</Aviso>}

      {soporte === 'ok' &&
        (cargando ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : (
          <section className={`${tarjeta} space-y-5`}>
            <div className="flex items-center gap-3">
              <span className={`flex size-12 items-center justify-center rounded-xl ${sub ? 'bg-green-700 text-white' : 'bg-neutral-100 text-neutral-700'}`}>
                {sub ? <BellRing className="size-6" aria-hidden /> : <BellOff className="size-6" aria-hidden />}
              </span>
              <div>
                <p className="text-lg font-black">{sub ? 'Avisos activados' : 'Avisos desactivados'}</p>
                <p className="text-sm text-neutral-600">{sub ? 'En este celular / navegador' : 'Activalos para enterarte de cada avance'}</p>
              </div>
            </div>

            {bloqueado && !sub && (
              <Aviso tipo="error">
                Los avisos están bloqueados para esta app. Habilitalos en los ajustes del navegador (o en Ajustes → Notificaciones del teléfono) y recargá la página.
              </Aviso>
            )}

            <SelectorObras proyectos={proyectos} todas={todas} setTodas={setTodas} elegidas={elegidas} setElegidas={setElegidas} disabled={Boolean(ocupado)} />

            {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}

            {sub ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <Boton variante="acento" icono={Check} cargando={ocupado === 'guardar'} disabled={Boolean(ocupado)} onClick={guardar}>
                  Guardar obras
                </Boton>
                <Boton variante="secundario" icono={Send} cargando={ocupado === 'probar'} disabled={Boolean(ocupado)} onClick={probar}>
                  Enviar prueba
                </Boton>
                <Boton variante="fantasma" icono={BellOff} cargando={ocupado === 'desactivar'} disabled={Boolean(ocupado)} onClick={desactivar} className="text-red-700 sm:col-span-2">
                  Desactivar avisos
                </Boton>
              </div>
            ) : (
              <Boton tamano="lg" variante="acento" icono={Bell} bloque cargando={ocupado === 'activar'} disabled={Boolean(ocupado)} onClick={activar}>
                Activar avisos
              </Boton>
            )}
          </section>
        ))}

      <p className="text-sm text-neutral-500">
        Cada persona activa los avisos en su propio celular. No te llegan avisos de los avances que cargás vos.
      </p>
    </div>
  )
}
