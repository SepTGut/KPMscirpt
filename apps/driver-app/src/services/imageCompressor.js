/**
 * High-performance off-thread image compressor for mobile browsers
 */
export async function compressImage(file, maxWidth = 1000, quality = 0.72) {
  if (!file) throw new Error('File tidak ditemukan.')

  // Fast path: createImageBitmap decodes off main thread
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file)
      const scale = Math.min(1, maxWidth / bitmap.width)
      const w = Math.max(1, Math.round(bitmap.width * scale))
      const h = Math.max(1, Math.round(bitmap.height * scale))

      if (typeof OffscreenCanvas === 'function') {
        const oc = new OffscreenCanvas(w, h)
        const ctx = oc.getContext('2d')
        ctx.drawImage(bitmap, 0, 0, w, h)
        bitmap.close()
        const blob = await oc.convertToBlob({ type: 'image/jpeg', quality })
        return new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = () => reject(new Error('Gagal membaca data foto.'))
          reader.readAsDataURL(blob)
        })
      }

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(bitmap, 0, 0, w, h)
      bitmap.close()
      return canvas.toDataURL('image/jpeg', quality)
    } catch (e) {
      console.warn('createImageBitmap failed, falling back to DOM Image:', e)
    }
  }

  // Fallback: Standard DOM Image decode
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Gagal membaca file foto.'))
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = () => reject(new Error('File bukan gambar yang valid.'))
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width)
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Browser tidak mendukung canvas.'))
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}
