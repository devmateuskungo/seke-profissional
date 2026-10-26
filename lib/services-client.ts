import type { ApiErrorResponse } from "@/types/auth"
import type {
  CreateServiceRequest,
  CreateServiceResponse,
  DeleteServiceResponse,
  ToggleServiceResponse,
  UpdateServiceRequest,
  UpdateServiceResponse,
} from "@/types/service"

const EXTERNAL_API_BASE = process.env.NEXT_PUBLIC_URL_API?.trim()
const SERVICES_API = EXTERNAL_API_BASE
  ? `${EXTERNAL_API_BASE}/marketplace/services`
  : "/api/marketplace/services"

export type CreateServiceOutcome =
  | { success: true; data: CreateServiceResponse }
  | { success: false; error: string; statusCode?: number }

export async function createService(
  payload: CreateServiceRequest,
  token: string
): Promise<CreateServiceOutcome> {
  const res = await fetch(SERVICES_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  const data = (await res.json().catch(() => ({}))) as
    | CreateServiceResponse
    | ApiErrorResponse

  if (!res.ok) {
    const message =
      "message" in data && typeof data.message === "string"
        ? data.message
        : "Não foi possível cadastrar o serviço."
    return {
      success: false,
      error: message,
      statusCode: res.status,
    }
  }

  return { success: true, data: data as CreateServiceResponse }
}

function buildServiceUrl(serviceId: string): string {
  const encoded = encodeURIComponent(serviceId)
  return EXTERNAL_API_BASE
    ? `${EXTERNAL_API_BASE}/marketplace/services/${encoded}`
    : `/api/marketplace/services/${encoded}`
}

function buildToggleServiceUrl(serviceId: string): string {
  return `${buildServiceUrl(serviceId)}/toggle`
}

export type ToggleServiceOutcome =
  | { success: true; data: ToggleServiceResponse }
  | { success: false; error: string; statusCode?: number }

export async function toggleService(
  serviceId: string,
  token: string
): Promise<ToggleServiceOutcome> {
  const trimmedId = serviceId.trim()
  if (!trimmedId) {
    return { success: false, error: "ID do serviço inválido." }
  }

  const res = await fetch(buildToggleServiceUrl(trimmedId), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  })

  const data = (await res.json().catch(() => ({}))) as
    | ToggleServiceResponse
    | ApiErrorResponse

  if (!res.ok) {
    const message =
      "message" in data && typeof data.message === "string"
        ? data.message
        : "Não foi possível alterar o estado do serviço."
    return {
      success: false,
      error: message,
      statusCode: res.status,
    }
  }

  return { success: true, data: data as ToggleServiceResponse }
}

export type UpdateServiceOutcome =
  | { success: true; data: UpdateServiceResponse }
  | { success: false; error: string; statusCode?: number }

export async function updateService(
  serviceId: string,
  payload: UpdateServiceRequest,
  token: string
): Promise<UpdateServiceOutcome> {
  const trimmedId = serviceId.trim()
  if (!trimmedId) {
    return { success: false, error: "ID do serviço inválido." }
  }

  const res = await fetch(buildServiceUrl(trimmedId), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  const data = (await res.json().catch(() => ({}))) as
    | UpdateServiceResponse
    | ApiErrorResponse

  if (!res.ok) {
    const message =
      "message" in data && typeof data.message === "string"
        ? data.message
        : "Não foi possível atualizar o serviço."
    return {
      success: false,
      error: message,
      statusCode: res.status,
    }
  }

  return { success: true, data: data as UpdateServiceResponse }
}

export type DeleteServiceOutcome =
  | { success: true; data: DeleteServiceResponse }
  | { success: false; error: string; statusCode?: number }

export async function deleteService(
  serviceId: string,
  token: string
): Promise<DeleteServiceOutcome> {
  const trimmedId = serviceId.trim()
  if (!trimmedId) {
    return { success: false, error: "ID do serviço inválido." }
  }

  const res = await fetch(buildServiceUrl(trimmedId), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  })

  const data = (await res.json().catch(() => ({}))) as
    | DeleteServiceResponse
    | ApiErrorResponse

  if (!res.ok) {
    const message =
      "message" in data && typeof data.message === "string"
        ? data.message
        : "Não foi possível eliminar o serviço."
    return {
      success: false,
      error: message,
      statusCode: res.status,
    }
  }

  return { success: true, data: data as DeleteServiceResponse }
}
