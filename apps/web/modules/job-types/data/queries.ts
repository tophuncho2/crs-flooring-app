import {
  createPrismaPageLoadIssue,
  getJobTypeDetailById,
  getJobTypeStats,
  type PrismaDetailPageResult,
} from "@builders/db"
import type { JobType, JobTypeStats } from "@builders/domain"

export type JobTypeDetailPageData = {
  jobType: JobType
  previousJobTypeId: string | null
  nextJobTypeId: string | null
  stats: JobTypeStats
}

export async function getJobTypeDetailPageData(
  id: string,
): Promise<PrismaDetailPageResult<JobTypeDetailPageData>> {
  try {
    const detail = await getJobTypeDetailById(id, { withNeighbors: true })
    if (!detail) {
      return { ok: false, notFound: true }
    }
    const { previousJobType, nextJobType, ...jobType } = detail
    const stats = (await getJobTypeStats(id)) ?? {
      templatesCount: 0,
      workOrdersCount: 0,
    }
    return {
      ok: true,
      data: {
        jobType,
        previousJobTypeId: previousJobType?.id ?? null,
        nextJobTypeId: nextJobType?.id ?? null,
        stats,
      },
    }
  } catch (error) {
    return {
      ok: false,
      error: createPrismaPageLoadIssue(error, {
        code: "JOB_TYPE_DETAIL_LOAD_FAILED",
        title: "Job Type Unavailable",
        message: "The app could not load this job type.",
        detail: "The job type record could not be loaded.",
      }),
    }
  }
}
