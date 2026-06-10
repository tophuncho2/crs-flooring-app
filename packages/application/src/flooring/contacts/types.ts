import type { CreateContactRecordInput, UpdateContactRecordInput } from "@builders/db"
import type { Contact } from "@builders/domain"

export type CreateContactUseCaseInput = CreateContactRecordInput
export type UpdateContactUseCaseInput = UpdateContactRecordInput
export type ContactUseCaseResult = Contact
