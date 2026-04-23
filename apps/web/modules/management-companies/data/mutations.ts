import {
  createManagementCompanyRecord,
  deleteManagementCompanyRecordById,
  updateManagementCompanyRecord,
  type CreateManagementCompanyRecordInput,
  type UpdateManagementCompanyRecordInput,
} from "@builders/db"

export async function createManagementCompany(input: CreateManagementCompanyRecordInput) {
  return createManagementCompanyRecord(input)
}

export async function updateManagementCompany(id: string, input: UpdateManagementCompanyRecordInput) {
  return updateManagementCompanyRecord(id, input)
}

export async function deleteManagementCompany(id: string) {
  return deleteManagementCompanyRecordById(id)
}
