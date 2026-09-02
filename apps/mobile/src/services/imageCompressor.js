/**
 * Universal Image Compressor
 * 100% Compatible across all Android versions (Android 5.0 to Android 15+)
 */
export function compressImage(file, maxWidth = 960, quality = 0.7) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('Pilih foto terlebih dahulu.'))

    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Gagal membaca file foto.'))
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = () => reject(new Error('File foto tidak valid.'))
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Perangkat tidak mendukung canvas.'))

        ctx.drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        resolve(dataUrl)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}
