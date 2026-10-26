export type GeoCoords = {
  latitude: number
  longitude: number
}

export type GeolocationErrorCode =
  | "unsupported"
  | "denied"
  | "unavailable"
  | "timeout"
  | "unknown"

type GeolocationFailure = {
  success: false
  code: GeolocationErrorCode
  message: string
}

type GeolocationSuccess = {
  success: true
  coords: GeoCoords
}

export type GeolocationOutcome = GeolocationSuccess | GeolocationFailure

function roundCoord(value: number): number {
  return Number(value.toFixed(5))
}

/** Cache de cidade por coordenadas (evita pedidos repetidos na mesma sessão). */
const cityCache = new Map<string, string | null>()

/**
 * Cidade correspondente às coordenadas (geocodificação inversa).
 *
 * Usa o endpoint público da BigDataCloud (sem chave, com CORS) e devolve
 * `null` quando não é possível determinar — o chamador decide o fallback.
 */
export async function getCityFromCoords(
  coords: GeoCoords
): Promise<string | null> {
  const key = `${coords.latitude},${coords.longitude}`
  if (cityCache.has(key)) return cityCache.get(key) ?? null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 4_000)

  try {
    const url = new URL(
      "https://api.bigdatacloud.net/data/reverse-geocode-client"
    )
    url.searchParams.set("latitude", String(coords.latitude))
    url.searchParams.set("longitude", String(coords.longitude))
    url.searchParams.set("localityLanguage", "pt")

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
    if (!res.ok) return null

    const data = (await res.json()) as {
      city?: unknown
      locality?: unknown
      principalSubdivision?: unknown
    }

    // Do mais específico para o mais genérico.
    for (const value of [
      data.city,
      data.locality,
      data.principalSubdivision,
    ]) {
      if (typeof value === "string" && value.trim()) {
        const city = value.trim()
        cityCache.set(key, city)
        return city
      }
    }

    cityCache.set(key, null)
    return null
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

let pendingDeviceLocation: Promise<GeolocationOutcome> | null = null

/**
 * Obtém a localização do dispositivo em segundo plano (sem reutilizar
 * coordenadas antigas) e aquece a cidade em cache.
 *
 * Chamado ao abrir o chat apenas para pedir a permissão e reduzir a espera;
 * o envio faz sempre um novo pedido ao GPS. Pedidos concorrentes partilham a
 * mesma promessa.
 */
export function prefetchDeviceLocation(): Promise<GeolocationOutcome> {
  if (pendingDeviceLocation) return pendingDeviceLocation

  pendingDeviceLocation = getClientGeolocation({ maximumAgeMs: 0 }).then(
    (outcome) => {
      pendingDeviceLocation = null

      if (outcome.success) {
        // Aquece a cidade para o envio não esperar pela geocodificação.
        void getCityFromCoords(outcome.coords)
      }

      return outcome
    }
  )

  return pendingDeviceLocation
}

function mapGeolocationError(error: GeolocationPositionError): GeolocationFailure {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return {
        success: false,
        code: "denied",
        message:
          "Permita o acesso à localização no navegador para continuar.",
      }
    case error.POSITION_UNAVAILABLE:
      return {
        success: false,
        code: "unavailable",
        message: "Não foi possível obter a sua localização. Tente novamente.",
      }
    case error.TIMEOUT:
      return {
        success: false,
        code: "timeout",
        message: "A obtenção da localização demorou demasiado. Tente novamente.",
      }
    default:
      return {
        success: false,
        code: "unknown",
        message: "Não foi possível obter a sua localização.",
      }
  }
}

export function getClientGeolocation(options?: {
  timeoutMs?: number
  maximumAgeMs?: number
}): Promise<GeolocationOutcome> {
  if (typeof window === "undefined" || !navigator.geolocation) {
    return Promise.resolve({
      success: false,
      code: "unsupported",
      message: "O seu navegador não suporta geolocalização.",
    })
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          success: true,
          coords: {
            latitude: roundCoord(position.coords.latitude),
            longitude: roundCoord(position.coords.longitude),
          },
        })
      },
      (error) => resolve(mapGeolocationError(error)),
      {
        enableHighAccuracy: true,
        timeout: options?.timeoutMs ?? 15_000,
        // 0 = nunca reutilizar uma posição antiga do navegador.
        maximumAge: options?.maximumAgeMs ?? 0,
      }
    )
  })
}
