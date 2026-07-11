import { toIsoTimestamp } from "../shared/date-format.js"
import type { JobType, JobTypeOption } from "./types.js"

type JobTypeInput = {
  id: string
  jobTypeNumber: string
  name: string
  createdAt: Date | string
  updatedAt: Date | string
  createdBy: string | null
  updatedBy: string | null
}

export function normalizeJobType(jobType: JobTypeInput): JobType {
  return {
    id: jobType.id,
    jobTypeNumber: jobType.jobTypeNumber,
    name: jobType.name,
    createdAt: toIsoTimestamp(jobType.createdAt),
    updatedAt: toIsoTimestamp(jobType.updatedAt),
    createdBy: jobType.createdBy,
    updatedBy: jobType.updatedBy,
  }
}

export function normalizeJobTypeOption(jobType: { id: string; name: string }): JobTypeOption {
  return { id: jobType.id, name: jobType.name }
}
