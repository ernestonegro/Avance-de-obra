import { SUPABASE_URL, SUPABASE_ANON_KEY, BUCKET_FOTOS } from './supabase'

/*
 * Subida directa al endpoint REST de Supabase Storage usando XMLHttpRequest.
 * supabase-js usa fetch, que no expone progreso de subida; con XHR podemos
 * mostrar una barra real, crítico con 4G inestable.
 */

class ErrorSubida extends Error {
  constructor(mensaje, { status = 0, reintentable = false } = {}) {
    super(mensaje)
    this.status = status
    this.reintentable = reintentable
  }
}

function esDuplicado(xhr) {
  if (xhr.status === 409) return true
  try {
    const c = JSON.parse(xhr.responseText)
    return String(c.statusCode) === '409' || /already exists|Duplicate/i.test(c.error || c.message || '')
  } catch {
    return false
  }
}

function subirUnaVez({ ruta, blob, onProgreso, signal }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const rutaCodificada = ruta.split('/').map(encodeURIComponent).join('/')
    xhr.open('POST', `${SUPABASE_URL}/storage/v1/object/${BUCKET_FOTOS}/${rutaCodificada}`)
    xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`)
    xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY)
    xhr.setRequestHeader('Content-Type', blob.type || 'image/jpeg')
    xhr.setRequestHeader('cache-control', 'max-age=31536000')
    // Sin x-upsert: desde la app nunca se sobrescribe una foto existente.
    xhr.timeout = 120_000

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgreso?.(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      // 409 = el archivo ya existe: un intento anterior llegó completo pero se perdió la
      // respuesta por mala señal (Storage no guarda subidas parciales).
      if ((xhr.status >= 200 && xhr.status < 300) || esDuplicado(xhr)) {
        onProgreso?.(100)
        resolve(ruta)
        return
      }
      let mensaje = `Error ${xhr.status} al subir la foto`
      try {
        const cuerpo = JSON.parse(xhr.responseText)
        mensaje = cuerpo.message || cuerpo.error || mensaje
      } catch {
        /* respuesta no JSON */
      }
      const reintentable = xhr.status >= 500 || xhr.status === 408 || xhr.status === 429
      reject(new ErrorSubida(mensaje, { status: xhr.status, reintentable }))
    }
    xhr.onerror = () => reject(new ErrorSubida('Se cortó la conexión durante la subida', { reintentable: true }))
    xhr.ontimeout = () => reject(new ErrorSubida('La subida tardó demasiado (señal débil)', { reintentable: true }))
    xhr.onabort = () => reject(new ErrorSubida('Subida cancelada'))

    if (signal) {
      if (signal.aborted) return xhr.abort()
      signal.addEventListener('abort', () => xhr.abort(), { once: true })
    }
    xhr.send(blob)
  })
}

function esperar(ms, signal) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(t)
      reject(new ErrorSubida('Subida cancelada'))
    }, { once: true })
  })
}

function esperarConexion(signal) {
  if (navigator.onLine) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const alVolver = () => resolve()
    window.addEventListener('online', alVolver, { once: true })
    signal?.addEventListener('abort', () => {
      window.removeEventListener('online', alVolver)
      reject(new ErrorSubida('Subida cancelada'))
    }, { once: true })
  })
}

/**
 * Sube un blob con reintentos y backoff exponencial (1s, 2s, 4s, 8s…).
 * Si el dispositivo está offline, espera a recuperar señal antes de reintentar.
 */
export async function subirArchivo({ ruta, blob, onProgreso, signal, intentos = 5 }) {
  let ultimoError
  for (let i = 0; i < intentos; i++) {
    await esperarConexion(signal)
    try {
      return await subirUnaVez({ ruta, blob, onProgreso, signal })
    } catch (e) {
      ultimoError = e
      if (!e.reintentable || signal?.aborted || i === intentos - 1) break
      onProgreso?.(0)
      await esperar(1000 * 2 ** i, signal)
    }
  }
  throw ultimoError
}
