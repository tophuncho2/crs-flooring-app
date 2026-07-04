import { Prisma, createJobTypeRecord, withDatabaseTransaction } from "@builders/db"
import {
  JOB_TYPE_NAME_CONFLICT_MESSAGE,
  JOB_TYPE_NAME_REQUIRED_MESSAGE,
} from "@builders/domain"
import { isP2002 } from "../shared/prisma-errors.js"
import { JobTypeExecutionError } from "./errors.js"
import type { CreateJobTypeUseCaseInput, JobTypeUseCaseResult } from "./types.js"

export async function createJobTypeUseCase(
  input: CreateJobTypeUseCaseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<JobTypeUseCaseResult> {
  if (!actorEmail || !actorEmail.trim()) {
    throw new Error("createJobTypeUseCase requires a non-empty actorEmail")
  }

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    if (!input.name || !input.name.trim()) {
      throw new JobTypeExecutionError({
        code: "JOB_TYPE_VALIDATION_FAILED",
        message: JOB_TYPE_NAME_REQUIRED_MESSAGE,
        status: 400,
        field: "name",
      })
    }

    try {
      return await createJobTypeRecord(
        { ...input, createdBy: actorEmail, updatedBy: actorEmail },
        c,
      )
    } catch (error) {
      if (isP2002(error, "name")) {
        throw new JobTypeExecutionError({
          code: "JOB_TYPE_NAME_CONFLICT",
          message: JOB_TYPE_NAME_CONFLICT_MESSAGE,
          status: 409,
          field: "name",
        })
      }
      throw error
    }
  })
}
