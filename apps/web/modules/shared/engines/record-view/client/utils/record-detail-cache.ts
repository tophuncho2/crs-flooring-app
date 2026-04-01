"use client"

const recordDetailCache = new Map<string, { updatedAt: string; value: unknown }>()

function buildCacheKey(scope: string, id: string) {
  return `${scope}:${id}`
}

export function getCachedRecordDetail<T>(scope: string, id: string, updatedAt: string) {
  const entry = recordDetailCache.get(buildCacheKey(scope, id))
  if (!entry || entry.updatedAt !== updatedAt) return null
  return entry.value as T
}

export function setCachedRecordDetail<T>(scope: string, id: string, updatedAt: string, value: T) {
  recordDetailCache.set(buildCacheKey(scope, id), { updatedAt, value })
}

export function clearCachedRecordDetail(scope: string, id: string) {
  recordDetailCache.delete(buildCacheKey(scope, id))
}
