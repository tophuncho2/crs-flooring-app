import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import { normalizeJobType, type JobType } from "@builders/domain"

type JobTypesDbClient = PrismaClient | Prisma.TransactionClient

export type CreateJobTypeRecordInput = {
  name: string
  createdBy: string
  updatedBy: string
}

export type UpdateJobTypeRecordInput = {
  name?: string
  updatedBy: string
}

export async function createJobTypeRecord(
  input: CreateJobTypeRecordInput,
  client: JobTypesDbClient = db,
): Promise<JobType> {
  const jobType = await client.flooringJobType.create({
    data: {
      name: input.name.trim(),
      createdBy: input.createdBy,
      updatedBy: input.updatedBy,
    },
  })
  return normalizeJobType(jobType)
}

export async function updateJobTypeRecord(
  id: string,
  input: UpdateJobTypeRecordInput,
  client: JobTypesDbClient = db,
): Promise<JobType> {
  const data: Prisma.FlooringJobTypeUpdateInput = { updatedBy: input.updatedBy }
  if (input.name !== undefined) data.name = input.name.trim()

  const jobType = await client.flooringJobType.update({
    where: { id },
    data,
  })
  return normalizeJobType(jobType)
}

export async function deleteJobTypeRecordById(
  id: string,
  client: JobTypesDbClient = db,
): Promise<void> {
  await client.flooringJobType.delete({ where: { id } })
}
