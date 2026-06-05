import {
  Prisma,
  createManagementCompanyRecord,
  createPropertyRecord,
  getManagementCompanyById,
  updatePropertyRecord,
  withDatabaseTransaction,
  type CreateManagementCompanyRecordInput,
} from "@builders/db"
import {
  MANAGEMENT_COMPANY_NOT_FOUND_MESSAGE,
  validateCreatePropertyHubForm,
  type CreatePropertyHubForm,
  type ManagementCompanyDetail,
  type PropertyDetailRecord,
} from "@builders/domain"
import { ManagementCompanyExecutionError } from "../management-companies/errors.js"
import { PropertyExecutionError } from "./errors.js"

export type CreatePropertyHubUseCaseInput = {
  managementCompany:
    | { mode: "none" }
    | { mode: "link"; id: string }
    | { mode: "create"; fields: CreateManagementCompanyRecordInput }
  property:
    | { mode: "none" }
    | { mode: "link"; id: string }
    | {
        mode: "create"
        fields: {
          name: string
          streetAddress: string | null
          city: string | null
          state: string | null
          postalCode: string | null
          phone: string | null
          email: string | null
          instructions: string | null
        }
      }
}

export type CreatePropertyHubUseCaseResult = {
  property: PropertyDetailRecord | null
  managementCompany: ManagementCompanyDetail | null
}

function toDomainForm(input: CreatePropertyHubUseCaseInput): CreatePropertyHubForm {
  const managementCompany: CreatePropertyHubForm["managementCompany"] =
    input.managementCompany.mode === "create"
      ? {
          mode: "create",
          fields: {
            name: input.managementCompany.fields.name,
            streetAddress: input.managementCompany.fields.streetAddress ?? "",
            city: input.managementCompany.fields.city ?? "",
            state: input.managementCompany.fields.state ?? "",
            zip: input.managementCompany.fields.postalCode ?? "",
            phone: input.managementCompany.fields.phone ?? "",
            email: input.managementCompany.fields.email ?? "",
          },
        }
      : input.managementCompany

  const property: CreatePropertyHubForm["property"] =
    input.property.mode === "create"
      ? {
          mode: "create",
          fields: {
            name: input.property.fields.name,
            streetAddress: input.property.fields.streetAddress ?? "",
            city: input.property.fields.city ?? "",
            state: input.property.fields.state ?? "",
            zip: input.property.fields.postalCode ?? "",
            phone: input.property.fields.phone ?? "",
            email: input.property.fields.email ?? "",
            instructions: input.property.fields.instructions ?? "",
          },
        }
      : input.property

  return { managementCompany, property }
}

export async function createPropertyHubUseCase(
  input: CreatePropertyHubUseCaseInput,
  client?: Prisma.TransactionClient,
): Promise<CreatePropertyHubUseCaseResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const validationError = validateCreatePropertyHubForm(toDomainForm(input))
    if (validationError) {
      throw new PropertyExecutionError({
        code: "PROPERTY_VALIDATION_FAILED",
        message: validationError,
        status: 400,
      })
    }

    let managementCompany: ManagementCompanyDetail | null = null
    if (input.managementCompany.mode === "link") {
      try {
        managementCompany = await getManagementCompanyById(input.managementCompany.id, c)
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          throw new ManagementCompanyExecutionError({
            code: "MANAGEMENT_COMPANY_NOT_FOUND",
            message: MANAGEMENT_COMPANY_NOT_FOUND_MESSAGE,
            status: 404,
          })
        }
        throw error
      }
    } else if (input.managementCompany.mode === "create") {
      managementCompany = await createManagementCompanyRecord(
        input.managementCompany.fields,
        c,
      )
    }

    let property: PropertyDetailRecord | null = null
    if (input.property.mode === "create") {
      property = await createPropertyRecord(
        {
          managementCompanyId: managementCompany?.id ?? null,
          name: input.property.fields.name,
          streetAddress: input.property.fields.streetAddress,
          city: input.property.fields.city,
          state: input.property.fields.state,
          postalCode: input.property.fields.postalCode,
          phone: input.property.fields.phone,
          email: input.property.fields.email,
          instructions: input.property.fields.instructions,
        },
        c,
      )
    } else if (input.property.mode === "link") {
      // Link an existing property to the resolved (created or linked) MC. The
      // domain rule guarantees an MC action accompanies a property link.
      property = await updatePropertyRecord(
        input.property.id,
        { managementCompanyId: managementCompany?.id ?? null },
        c,
      )
    }

    return { property, managementCompany }
  })
}
