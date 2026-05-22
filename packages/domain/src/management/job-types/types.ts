export type JobType = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export type JobTypeListRow = JobType

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
