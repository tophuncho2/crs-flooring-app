import { z } from "zod"

const workerEnvironmentSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().url("REDIS_URL must be a valid URL").optional(),
})

export type WorkerEnvironment = z.infer<typeof workerEnvironmentSchema>

export function getWorkerEnvironment(source: NodeJS.ProcessEnv = process.env): WorkerEnvironment {
  return workerEnvironmentSchema.parse({
    DATABASE_URL: source.DATABASE_URL,
    REDIS_URL: source.REDIS_URL,
  })
}
