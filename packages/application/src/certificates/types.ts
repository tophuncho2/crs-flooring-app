import type { CreateCertificateRecordInput, UpdateCertificateRecordInput } from "@builders/db"
import type { CertificateDetailRecord } from "@builders/domain"

// The actor email (createdBy/updatedBy) is server-derived, threaded as an explicit
// `actorEmail` param — NOT part of the user-supplied input envelope. Strip the actor
// fields off the db input types here so the use-case inputs stay the validated subset.
export type CreateCertificateUseCaseInput = Omit<
  CreateCertificateRecordInput,
  "createdBy" | "updatedBy"
>
export type UpdateCertificateUseCaseInput = Omit<UpdateCertificateRecordInput, "updatedBy">
export type CertificateUseCaseResult = CertificateDetailRecord
