import type { Job, JobsOptions } from "bullmq"

type QueueLike<TData, TName extends string = string> = {
  add: (name: TName, data: TData, opts?: JobsOptions) => Promise<Job<TData, unknown, TName>>
  getJob: (jobId: string) => Promise<Job<TData, unknown, TName> | undefined | null>
}

export async function addBullMqJobIdempotently<TData, TName extends string>(
  queue: QueueLike<TData, TName>,
  name: TName,
  data: TData,
  options: JobsOptions & { jobId: string },
): Promise<{ job: Job<TData, unknown, TName>; wasDuplicate: boolean }> {
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
