export type RedisConnectionConfig = {
  host: string
  port: number
  username?: string
  password?: string
  db?: number
  tls?: Record<string, never>
}

export function parseRedisConnectionUrl(redisUrl: string): RedisConnectionConfig {
  const parsed = new URL(redisUrl)
  const pathname = parsed.pathname.startsWith("/") ? parsed.pathname.slice(1) : parsed.pathname
  const db = pathname ? Number(pathname) : undefined

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : parsed.protocol === "rediss:" ? 6380 : 6379,
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    db: Number.isFinite(db) ? db : undefined,
    tls: parsed.protocol === "rediss:" ? {} : undefined,
  }
}
