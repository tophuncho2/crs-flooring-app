import {
  Prisma,
  createEntityRecord,
  createPropertyRecord,
  getEntityById,
  updatePropertyRecord,
  withDatabaseTransaction,
  type CreateEntityRecordInput,
} from "@builders/db"
import {
  ENTITY_NOT_FOUND_MESSAGE,
  validateCreatePropertyHubForm,
  type CreatePropertyHubForm,
  type EntityDetail,
  type PropertyDetailRecord,
} from "@builders/domain"
import { EntityExecutionError } from "../entities/errors.js"
import { PropertyExecutionError } from "./errors.js"

export type CreatePropertyHubUseCaseInput = {
  entity:
    | { mode: "none" }
    | { mode: "link"; id: string }
    | { mode: "create"; fields: CreateEntityRecordInput }
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
  entity: EntityDetail | null
}

function toDomainForm(input: CreatePropertyHubUseCaseInput): CreatePropertyHubForm {
  const entity: CreatePropertyHubForm["entity"] =
    input.entity.mode === "create"
      ? {
          mode: "create",
          fields: {
            entity: input.entity.fields.entity,
            streetAddress: input.entity.fields.streetAddress ?? "",
            city: input.entity.fields.city ?? "",
            state: input.entity.fields.state ?? "",
            zip: input.entity.fields.postalCode ?? "",
            phone: input.entity.fields.phone ?? "",
            email: input.entity.fields.email ?? "",
            typeIds: input.entity.fields.typeIds ?? [],
          },
        }
      : input.entity

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

  return { entity, property }
}

export async function createPropertyHubUseCase(
  input: CreatePropertyHubUseCaseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<CreatePropertyHubUseCaseResult> {
  if (!actorEmail || !actorEmail.trim()) {
    throw new Error("createPropertyHubUseCase requires a non-empty actorEmail")
  }

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

    let entity: EntityDetail | null = null
    if (input.entity.mode === "link") {
      try {
        entity = await getEntityById(input.entity.id, c)
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          throw new EntityExecutionError({
            code: "ENTITY_NOT_FOUND",
            message: ENTITY_NOT_FOUND_MESSAGE,
            status: 404,
          })
        }
        throw error
      }
    } else if (input.entity.mode === "create") {
      entity = await createEntityRecord(
        input.entity.fields,
        c,
      )
    }

    let property: PropertyDetailRecord | null = null
    if (input.property.mode === "create") {
      property = await createPropertyRecord(
        {
          entityId: entity?.id ?? null,
          name: input.property.fields.name,
          streetAddress: input.property.fields.streetAddress,
          city: input.property.fields.city,
          state: input.property.fields.state,
          postalCode: input.property.fields.postalCode,
          phone: input.property.fields.phone,
          email: input.property.fields.email,
          instructions: input.property.fields.instructions,
          createdBy: actorEmail,
          updatedBy: actorEmail,
        },
        c,
      )
    } else if (input.property.mode === "link") {
      // Link an existing property to the resolved (created or linked) entity. The
      // domain rule guarantees an entity action accompanies a property link.
      property = await updatePropertyRecord(
        input.property.id,
        { entityId: entity?.id ?? null, updatedBy: actorEmail },
        c,
      )
    }

    return { property, entity }
  })
}
