import imageCompression from 'browser-image-compression'
// Copia local del script del worker: por defecto la librería lo baja de jsdelivr antes
// de comprimir (lento con señal débil, imposible offline). Así queda en el precache del PWA.
import libURL from 'browser-image-compression/dist/browser-image-compression.js?url'

// Versión principal: suficiente para ver detalles técnicos (fisuras, niveles, cañerías).
const OPCIONES_FOTO = {
  maxWidthOrHeight: 1920,
  maxSizeMB: 0.45,
  initialQuality: 0.82,
  fileType: 'image/jpeg', // JPEG: Safari iOS no codifica WebP en canvas de forma confiable
  useWebWorker: true,
  libURL,
  preserveExif: false,
}

// Miniatura para el feed: carga rápida con 4G débil.
const OPCIONES_MINIATURA = {
  maxWidthOrHeight: 480,
  maxSizeMB: 0.06,
  initialQuality: 0.7,
  fileType: 'image/jpeg',
  useWebWorker: true,
  libURL,
}

async function dimensiones(blob) {
  if ('createImageBitmap' in window) {
    const bmp = await createImageBitmap(blob)
    const r = { ancho: bmp.width, alto: bmp.height }
    bmp.close?.()
    return r
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      resolve({ ancho: img.naturalWidth, alto: img.naturalHeight })
      URL.revokeObjectURL(url)
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
    img.src = url
  })
}

/**
 * Comprime una foto de cámara/galería en el navegador.
 * Corrige la orientación EXIF y devuelve versión principal + miniatura.
 * @param {File} archivo
 * @param {(pct:number)=>void} [onProgreso] 0–100
 */
export async function comprimirFoto(archivo, onProgreso) {
  let principal
  try {
    principal = await imageCompression(archivo, {
      ...OPCIONES_FOTO,
      onProgress: (p) => onProgreso?.(p * 0.75),
    })
  } catch {
    // Típico: HEIC/HEIF elegido desde Android (Chrome no puede decodificarlo).
    const heic = /hei[cf]/i.test(archivo.type) || /\.hei[cf]$/i.test(archivo.name)
    throw new Error(
      heic
        ? 'Formato HEIC no compatible con este navegador. Sacala con "Sacar foto" o configurá la cámara en JPG / "Más compatible".'
        : `No se pudo leer la imagen "${archivo.name}". Quitala y probá con otra.`,
    )
  }
  const miniatura = await imageCompression(principal, {
    ...OPCIONES_MINIATURA,
    onProgress: (p) => onProgreso?.(75 + p * 0.25),
  })
  const { ancho, alto } = await dimensiones(principal)
  onProgreso?.(100)
  return {
    principal,
    miniatura,
    ancho,
    alto,
    bytesOriginal: archivo.size,
    // En capturas de cámara lastModified = momento de la toma.
    tomadaEn: new Date(archivo.lastModified || Date.now()).toISOString(),
  }
}

export function formatearBytes(bytes) {
  if (!bytes && bytes !== 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
