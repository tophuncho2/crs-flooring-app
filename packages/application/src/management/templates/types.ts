import type { CreateTemplateRecordInput, UpdateTemplateRecordInput } from "@builders/db"
import type { TemplateDetail } from "@builders/domain"

export type CreateTemplateUseCaseInput = CreateTemplateRecordInput
export type UpdateTemplateUseCaseInput = UpdateTemplateRecordInput
export type TemplateUseCaseResult = TemplateDetail
