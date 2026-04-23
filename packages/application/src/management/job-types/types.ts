import type { CreateJobTypeRecordInput, UpdateJobTypeRecordInput } from "@builders/db"
import type { JobType } from "@builders/domain"

export type CreateJobTypeUseCaseInput = CreateJobTypeRecordInput
export type UpdateJobTypeUseCaseInput = UpdateJobTypeRecordInput
export type JobTypeUseCaseResult = JobType
