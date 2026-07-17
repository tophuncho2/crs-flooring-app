import { buildAddressLine } from "../../shared/address/index.js"
import { formatPhoneNumber } from "../../shared/phone.js"
import type { WorkOrderFileGenerationInput, WorkOrderTopFieldKey } from "./types.js"

/**
 * Plain-text value resolvers shared by the work-order print builders (which wrap
 * them in HTML) and the CSV builder (which emits them raw). Keeping the value
 * logic here — one source — is what stops the printed document and the exported
 * CSV from ever disagreeing on how a field is composed.
 *
 * These return the MACHINE-FRIENDLY form: `""` for a blank value (the CSV cell).
 * The print renderers apply their own UI empty-placeholder (`—`) on top.
 */

/** Vacancy label. `""` when unset. */
export function formatVacancy(vacancy: "VACANT" | "OCCUPIED" | null): string {
  if (vacancy === "VACANT") return "Vacant"
  if (vacancy === "OCCUPIED") return "Occupied"
  return ""
}

/** Time-of-day label. `"-"` when unset (mirrors the print date cell). */
export function formatTimeOfDay(timeOfDay: "AM" | "PM" | null): string {
  return timeOfDay ?? "-"
}

/** Plain `"{value} {unit}"`. `""` when the value is blank; bare value when no unit. */
export function formatUnitValue(value: string, unitAbbrev: string): string {
  if (value === "") return ""
  if (unitAbbrev === "") return value
  return `${value} ${unitAbbrev}`
}

/** Plain before→after transition (arrow U+2192). `""` until both sides exist. */
export function formatTransition(before: string, after: string, unitAbbrev: string): string {
  if (before === "" || after === "") return ""
  return `${formatUnitValue(before, unitAbbrev)} → ${formatUnitValue(after, unitAbbrev)}`
}

/**
 * The plain value for one top-section field — the machine-friendly counterpart
 * to the HTML cell in `renderWorkOrderInfo`. Composed from the same sub-helpers
 * (vacancy, time, address, phone) the print stack uses.
 */
export function resolveWorkOrderTopFieldValue(
  input: WorkOrderFileGenerationInput,
  key: WorkOrderTopFieldKey,
): string {
  switch (key) {
    case "date":
      return `${input.scheduledFor} - ${formatTimeOfDay(input.timeOfDay)}`
    case "warehouse":
      return [
        input.warehouse.name,
        buildAddressLine(input.warehouse),
        formatPhoneNumber(input.warehouse.phone),
      ]
        .filter(Boolean)
        .join(" - ")
    case "jobType":
      return input.jobTypeName
    case "description":
      return input.description
    case "entity":
      return input.entityName
    case "property":
      return input.property.name
    case "customerName":
      return input.customerName
    case "propertyAddress":
      return buildAddressLine({
        streetAddress: input.streetAddress,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
      })
    case "propertyInstructions":
      return input.property.instructions
    case "installer":
      return input.installer
    case "installerInstructions":
      return input.installerInstructions
    case "unitType":
      return input.unitType
    case "unitNumber":
      return input.unitNumber
    case "vacancy":
      return formatVacancy(input.vacancy)
    case "return":
      return input.return
  }
}
