export type JobType = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  createdBy: string | null
  updatedBy: string | null
}

export type JobTypeListRow = JobType

/** Read-only totals shown in the job-type record-view "Statistics" section. */
export type JobTypeStats = {
  templatesCount: number
  workOrdersCount: number
}

export type JobTypeOption = {
  id: string
  name: string
}

export type JobTypeForm = {
  name: string
}

export const EMPTY_JOB_TYPE_FORM: JobTypeForm = {
  name: "",
}

export function toJobTypeForm(jobType: JobType): JobTypeForm {
  return { name: jobType.name }
}
