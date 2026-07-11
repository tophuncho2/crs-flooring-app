import { Prisma, updateJobTypeRecord, withDatabaseTransaction } from "@builders/db"
import {
  JOB_TYPE_NAME_CONFLICT_MESSAGE,
  JOB_TYPE_NAME_REQUIRED_MESSAGE,
  JOB_TYPE_NOT_FOUND_MESSAGE,
} from "@builders/domain"
import { assertActorEmail } from "../shared/assert-actor-email.js"
import { isP2002, isP2025 } from "../shared/prisma-errors.js"
import { JobTypeExecutionError } from "./errors.js"
import type { JobTypeUseCaseResult, UpdateJobTypeUseCaseInput } from "./types.js"

export async function updateJobTypeUseCase(
  id: string,
  input: UpdateJobTypeUseCaseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<JobTypeUseCaseResult> {
  assertActorEmail(actorEmail, "updateJobTypeUseCase")

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    if (input.name !== undefined && !input.name.trim()) {
      throw new JobTypeExecutionError({
        code: "JOB_TYPE_VALIDATION_FAILED",
        message: JOB_TYPE_NAME_REQUIRED_MESSAGE,
        status: 400,
        field: "name",
      })
    }

    try {
      return await updateJobTypeRecord(id, { ...input, updatedBy: actorEmail }, c)
    } catch (error) {
      if (isP2002(error, "name")) {
        throw new JobTypeExecutionError({
          code: "JOB_TYPE_NAME_CONFLICT",
          message: JOB_TYPE_NAME_CONFLICT_MESSAGE,
          status: 409,
          field: "name",
        })
      }
      if (isP2025(error)) {
        throw new JobTypeExecutionError({
          code: "JOB_TYPE_NOT_FOUND",
          message: JOB_TYPE_NOT_FOUND_MESSAGE,
          status: 404,
        })
      }
      throw error
    }
  })
}
