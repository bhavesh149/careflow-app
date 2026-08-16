import type { ApiErrorBody } from './types'

export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly requestId: string | undefined
  readonly details: unknown
  readonly retryAfterSeconds: number | undefined

  constructor(
    code: string,
    message: string,
    status: number,
    requestId?: string,
    details?: unknown,
    retryAfterSeconds?: number,
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.requestId = requestId
    this.details = details
    this.retryAfterSeconds = retryAfterSeconds
  }
}

let accessToken: string | null = null
let refreshInFlight: Promise<boolean> | null = null
let refreshImpl: (() => Promise<boolean>) | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function registerRefresh(fn: () => Promise<boolean>): void {
  refreshImpl = fn
}

function apiBase(): string {
  const value = import.meta.env.VITE_API_BASE_URL
  return value === undefined ? '' : value.replace(/\/$/, '')
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined
  const seconds = Number(header)
  return Number.isFinite(seconds) ? seconds : undefined
}

async function readBody(res: Response): Promise<unknown> {
  if (res.status === 204) return undefined
  const text = await res.text()
  if (text.length === 0) return undefined
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function toApiError(res: Response, body: unknown): ApiError {
  const retryAfterSeconds = parseRetryAfter(res.headers.get('Retry-After'))
  if (body && typeof body === 'object' && 'error' in body) {
    const { error } = body as ApiErrorBody
    return new ApiError(
      error.code,
      error.message,
      res.status,
      error.requestId ?? res.headers.get('X-Request-Id') ?? undefined,
      error.details,
      retryAfterSeconds,
    )
  }
  return new ApiError(
    'INTERNAL_ERROR',
    res.statusText || 'Request failed',
    res.status,
    res.headers.get('X-Request-Id') ?? undefined,
    undefined,
    retryAfterSeconds,
  )
}

export type RequestOptions = {
  method?: string
  body?: unknown
  idempotencyKey?: string
  auth?: boolean
  skipRefresh?: boolean
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers()
  if (options.body !== undefined) headers.set('content-type', 'application/json')
  if (options.auth !== false && accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }
  if (options.idempotencyKey) headers.set('Idempotency-Key', options.idempotencyKey)

  const res = await fetch(`${apiBase()}${path}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (
    res.status === 401 &&
    options.auth !== false &&
    options.skipRefresh !== true &&
    refreshImpl &&
    path !== '/v1/auth/refresh' &&
    path !== '/v1/auth/login'
  ) {
    const ok = await refreshOnce()
    if (ok) return api<T>(path, { ...options, skipRefresh: true })
  }

  const body = await readBody(res)
  if (!res.ok) throw toApiError(res, body)
  return body as T
}

export async function refreshOnce(): Promise<boolean> {
  if (!refreshImpl) return false
  if (!refreshInFlight) {
    refreshInFlight = refreshImpl().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

export function newIdempotencyKey(): string {
  return crypto.randomUUID()
}

/** Retry a mutation that returned 409 IDEMPOTENCY_IN_PROGRESS, keeping the same key. */
export async function retryIdempotent<T>(run: () => Promise<T>, attempts = 4): Promise<T> {
  let last: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await run()
    } catch (err) {
      last = err
      if (!(err instanceof ApiError) || err.code !== 'IDEMPOTENCY_IN_PROGRESS') throw err
      const ms = Math.max(250, (err.retryAfterSeconds ?? 1) * 1000)
      await new Promise((resolve) => setTimeout(resolve, ms))
    }
  }
  throw last
}
