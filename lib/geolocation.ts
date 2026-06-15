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
  return Number(value.toFixed(4))
}

function mapGeolocationError(error: GeolocationPositionError): GeolocationFailure {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return {
        success: false,
        code: "denied",
        message:
          "Permita o acesso à localização no navegador para publicar a solicitação.",
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
        maximumAge: options?.maximumAgeMs ?? 60_000,
      }
    )
  })
}
