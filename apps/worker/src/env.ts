import { z } from "zod"

const workerEnvironmentSchema = z.object({
  REDIS_URL: z.string().url("REDIS_URL must be a valid URL").optional(),
})

export type WorkerEnvironment = z.infer<typeof workerEnvironmentSchema>

export function getWorkerEnvironment(source: NodeJS.ProcessEnv = process.env): WorkerEnvironment {
  return workerEnvironmentSchema.parse({
    REDIS_URL: source.REDIS_URL,
  })
}
