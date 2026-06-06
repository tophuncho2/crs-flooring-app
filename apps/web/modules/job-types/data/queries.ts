import {
  createPrismaPageLoadIssue,
  getJobTypeById,
  isPrismaNotFoundError,
  type PrismaDetailPageResult,
} from "@builders/db"
import type { JobType } from "@builders/domain"

export type JobTypeDetailPageData = {
  jobType: JobType
}

export async function getJobTypeDetailPageData(
  id: string,
): Promise<PrismaDetailPageResult<JobTypeDetailPageData>> {
  try {
    const jobType = await getJobTypeById(id)
    return { ok: true, data: { jobType } }
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      return { ok: false, notFound: true }
    }
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
