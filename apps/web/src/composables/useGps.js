import {
  getCurrentCoordinates,
  startLiveTracking,
  removeActiveTrip
} from '../services/trackingService'

/**
 * Image compression utility to convert camera uploads into lean Web/JPEG Base64 (~200KB).
 */
export async function compressImage(file) {
  const MAX_WIDTH = 1000
  const JPEG_QUALITY = 0.72

  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_WIDTH / bitmap.width)
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    if (typeof OffscreenCanvas === 'function') {
      const oc = new OffscreenCanvas(w, h)
      const ctx = oc.getContext('2d')
      ctx.drawImage(bitmap, 0, 0, w, h)
      bitmap.close()
      const blob = await oc.convertToBlob({ type: 'image/jpeg', quality: JPEG_QUALITY })
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error('Foto tidak dapat dibaca.'))
        reader.readAsDataURL(blob)
      })
    }
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close()
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Foto tidak dapat dibaca.'))
    reader.onload = event => {
      const image = new Image()
      image.onerror = () => reject(new Error('File bukan gambar yang valid.'))
      image.onload = () => {
        const scale = Math.min(1, MAX_WIDTH / image.width)
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.width * scale))
        canvas.height = Math.max(1, Math.round(image.height * scale))
        const context = canvas.getContext('2d')
        if (!context) return reject(new Error('Browser tidak mendukung pemrosesan foto.'))
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
      }
      image.src = event.target.result
    }
    reader.readAsDataURL(file)
  })
}

export function useGps() {
  return {
    getCurrentCoordinates,
    startLiveTracking,
    removeActiveTrip,
    compressImage
  }
}
