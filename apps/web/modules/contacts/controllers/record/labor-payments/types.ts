import type { LaborPayment, LaborPaymentForm } from "@builders/domain"

/** Create seed: the parent contact, pre-filled into the editable picker. */
export type LaborPaymentCreateSeed = {
  contactId: string
  contactName: string
}

/** What the section opens the edit/create face with. */
export type LaborPaymentEditOpenSpec =
  | { mode: "create"; seed: LaborPaymentCreateSeed }
  | { mode: "edit"; laborPayment: LaborPayment }

export type LaborPaymentEditForm = LaborPaymentForm

/** UI-only state: the picked contact label for the picker trigger. */
export type LaborPaymentEditLocal = {
  contactLabel: string
}
