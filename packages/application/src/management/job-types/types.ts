import type { CreateJobTypeRecordInput, UpdateJobTypeRecordInput } from "@builders/db"
import type { JobType } from "@builders/domain"

// The actor email (createdBy/updatedBy) is server-derived, threaded as an explicit
// `actorEmail` param — NOT part of the user-supplied input envelope. Strip the actor
// fields off the db input types here so the use-case inputs stay the validated subset.
export type CreateJobTypeUseCaseInput = Omit<CreateJobTypeRecordInput, "createdBy" | "updatedBy">
export type UpdateJobTypeUseCaseInput = Omit<UpdateJobTypeRecordInput, "updatedBy">
export type JobTypeUseCaseResult = JobType
