import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import { normalizeJobType, type JobType } from "@builders/domain"

type JobTypesDbClient = PrismaClient | Prisma.TransactionClient

export type CreateJobTypeRecordInput = {
  name: string
}

export type UpdateJobTypeRecordInput = Partial<CreateJobTypeRecordInput>

export async function createJobTypeRecord(
  input: CreateJobTypeRecordInput,
  client: JobTypesDbClient = db,
): Promise<JobType> {
  const jobType = await client.flooringJobType.create({
    data: { name: input.name.trim() },
  })
  return normalizeJobType(jobType)
}

export async function updateJobTypeRecord(
  id: string,
  input: UpdateJobTypeRecordInput,
  client: JobTypesDbClient = db,
): Promise<JobType> {
  const data: Prisma.FlooringJobTypeUpdateInput = {}
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
