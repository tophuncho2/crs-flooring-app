import {
  EMPTY_JOB_TYPE_FORM,
  type JobTypeForm,
  type JobTypeListRow,
} from "@builders/domain"

export { EMPTY_JOB_TYPE_FORM }

export function jobTypeFormIsDirty(
  form: JobTypeForm,
  baseline: JobTypeForm,
): boolean {
  return form.name !== baseline.name
}

export function buildJobTypeFormFromRow(row: JobTypeListRow): JobTypeForm {
  return { name: row.name }
}
