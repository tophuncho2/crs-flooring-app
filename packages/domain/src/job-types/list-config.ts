// Cross-layer config for the job-types list view. Declared in domain because
// these values are referenced by both server-side use cases / route validators
// (in @builders/application) and the client-side controller / data wrapper
// (in apps/web/modules/job-types/).

export const LIST_JOB_TYPES_PAGE_SIZE = 50
export const LIST_JOB_TYPES_MAX_PAGE_SIZE = 200
