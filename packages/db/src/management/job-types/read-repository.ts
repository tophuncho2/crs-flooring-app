import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "@prisma/client"
import {
  normalizeJobType,
  normalizeJobTypeOption,
  type JobType,
  type JobTypeOption,
} from "@builders/domain"

type JobTypesDbClient = PrismaClient | Prisma.TransactionClient

export async function listJobTypes(client: JobTypesDbClient = db): Promise<JobType[]> {
  const jobTypes = await client.flooringJobType.findMany({
    orderBy: { name: "asc" },
  })
  return jobTypes.map(normalizeJobType)
}

export async function listJobTypeOptions(client: JobTypesDbClient = db): Promise<JobTypeOption[]> {
  const jobTypes = await client.flooringJobType.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })
  return jobTypes.map(normalizeJobTypeOption)
}

export async function getJobTypeById(
  id: string,
  client: JobTypesDbClient = db,
): Promise<JobType> {
  const jobType = await client.flooringJobType.findUniqueOrThrow({
    where: { id },
  })
  return normalizeJobType(jobType)
}

export async function countJobTypes(client: JobTypesDbClient = db): Promise<number> {
  return client.flooringJobType.count()
}

export async function countWorkOrdersByJobTypeId(
  jobTypeId: string,
  client: JobTypesDbClient = db,
): Promise<number> {
  return client.flooringWorkOrder.count({ where: { jobTypeId } })
}

export async function countTemplatesByJobTypeId(
  jobTypeId: string,
  client: JobTypesDbClient = db,
): Promise<number> {
  return client.flooringTemplate.count({ where: { jobTypeId } })
}
