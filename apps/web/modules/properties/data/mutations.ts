import {
  createPropertyRecord,
  deletePropertyRecordById,
  updatePropertyRecord,
  type CreatePropertyRecordInput,
  type UpdatePropertyRecordInput,
} from "@builders/db"

export async function createProperty(input: CreatePropertyRecordInput) {
  return createPropertyRecord(input)
}

export async function updateProperty(id: string, input: UpdatePropertyRecordInput) {
  return updatePropertyRecord(id, input)
}

export async function deleteProperty(id: string) {
  return deletePropertyRecordById(id)
}
