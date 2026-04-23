import type { JobType, JobTypeOption } from "./types.js"

type JobTypeInput = {
  id: string
  name: string
  createdAt: Date | string
  updatedAt: Date | string
}

export function normalizeJobType(jobType: JobTypeInput): JobType {
  return {
    id: jobType.id,
    name: jobType.name,
    createdAt: jobType.createdAt instanceof Date ? jobType.createdAt.toISOString() : jobType.createdAt,
    updatedAt: jobType.updatedAt instanceof Date ? jobType.updatedAt.toISOString() : jobType.updatedAt,
  }
}

export function normalizeJobTypeOption(jobType: { id: string; name: string }): JobTypeOption {
  return { id: jobType.id, name: jobType.name }
}
