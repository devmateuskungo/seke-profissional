/**
 * Reduz imagens para JPEG antes de enviar em JSON (base64).
 * Evita 413 Payload Too Large no Next e na API.
 */

const MAX_SIDE_PX = 1600
/** Limite aproximado do payload base64 (caracteres) — ~850 KB binário em JPEG */
const MAX_DATA_URL_LENGTH = 1_150_000

/**
 * Converte ficheiro de imagem para data URL JPEG, com redimensionamento e qualidade ajustáveis.
 */
export async function compressImageToJpegDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  try {
    let w = bitmap.width
    let h = bitmap.height
    const scale = Math.min(1, MAX_SIDE_PX / Math.max(w, h))
    w = Math.round(w * scale)
    h = Math.round(h * scale)

    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      throw new Error("Canvas 2D não disponível.")
    }
    ctx.drawImage(bitmap, 0, 0, w, h)

    let quality = 0.82
    let dataUrl = canvas.toDataURL("image/jpeg", quality)

    for (let i = 0; i < 10 && dataUrl.length > MAX_DATA_URL_LENGTH && quality > 0.42; i++) {
      quality -= 0.07
      dataUrl = canvas.toDataURL("image/jpeg", quality)
    }

    let factor = 0.88
    while (dataUrl.length > MAX_DATA_URL_LENGTH && factor > 0.38) {
      const nw = Math.max(320, Math.round(w * factor))
      const nh = Math.max(320, Math.round(h * factor))
      canvas.width = nw
      canvas.height = nh
      ctx.drawImage(bitmap, 0, 0, nw, nh)
      dataUrl = canvas.toDataURL("image/jpeg", 0.75)
      w = nw
      h = nh
      factor -= 0.1
    }

    if (dataUrl.length > MAX_DATA_URL_LENGTH) {
      throw new Error(
        "A imagem continua grande demais após compressão. Tente outra foto ou imagem mais pequena."
      )
    }

    return dataUrl
  } finally {
    bitmap.close()
  }
}
