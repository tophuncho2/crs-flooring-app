import type { JobsOptions } from "bullmq"

type JobLike = { id?: string }

type QueueLike<TData> = {
  add: (name: string, data: TData, opts?: JobsOptions) => Promise<JobLike>
  getJob: (jobId: string) => Promise<JobLike | undefined | null>
}

export async function addBullMqJobIdempotently<TData>(
  queue: QueueLike<TData>,
  name: string,
  data: TData,
  options: JobsOptions & { jobId: string },
): Promise<{ job: JobLike; wasDuplicate: boolean }> {
  try {
    const job = await queue.add(name, data, options)
    return {
      job,
      wasDuplicate: false,
    }
  } catch (error) {
    const existingJob = await queue.getJob(options.jobId)
    if (existingJob) {
      return {
        job: existingJob,
        wasDuplicate: true,
      }
    }

    throw error
  }
}
