"use client"

export class RequestJsonError extends Error {
  status: number
  requestId: string | null
  payload: Record<string, unknown>

  constructor(message: string, options: { status: number; requestId: string | null; payload: Record<string, unknown> }) {
    super(message)
    this.name = "RequestJsonError"
    this.status = options.status
    this.requestId = options.requestId
    this.payload = options.payload
  }
}

export async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>

  if (!response.ok) {
    throw new RequestJsonError(typeof payload.error === "string" ? payload.error : "Request failed", {
      status: response.status,
      requestId: response.headers?.get?.("x-request-id") ?? null,
      payload,
    })
  }

  return payload as T
}
