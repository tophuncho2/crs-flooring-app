const TEN_MINUTES_MS = 10 * 60 * 1000

export const CRUD_CREATE = { limit: 100, windowMs: TEN_MINUTES_MS } as const
export const CRUD_DELETE = { limit: 100, windowMs: TEN_MINUTES_MS } as const
export const CRUD_UPDATE_SECTION = { limit: 240, windowMs: TEN_MINUTES_MS } as const
export const QUERY_DEFAULT = { limit: 12000, windowMs: TEN_MINUTES_MS } as const
