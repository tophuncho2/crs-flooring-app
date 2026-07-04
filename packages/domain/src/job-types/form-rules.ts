import type { JobTypeForm } from "./types.js"

export function validateJobTypeForm(input: JobTypeForm) {
  if (!input.name.trim()) return "Job type name is required"
  return ""
}
