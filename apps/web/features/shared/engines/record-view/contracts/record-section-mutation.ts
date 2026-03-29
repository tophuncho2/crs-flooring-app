import type { MutationRequest } from "@/server/http/route-policy"
import type { RecordSectionErrorKind } from "./record-section-error"

export type RecordMutationEnvelope<TInput> = MutationRequest<TInput>

export type RecordConflictPayload<TSnapshot extends Record<string, unknown>> = {
  error: string
  field?: string
  snapshot: TSnapshot
}

export type RecordSectionErrorPayload = {
  error: string
  field?: string
  detail?: string
  sectionErrorKind?: RecordSectionErrorKind
}

export type RecordAllocationSectionItemInput<TAllocationInput, TItemInput> = {
  id: string | null
  expectedUpdatedAt: string | null
  item: TItemInput
  allocations: Array<{
    id: string | null
    expectedUpdatedAt: string | null
    input: TAllocationInput
  }>
}
