// @vitest-environment jsdom

/**
 * Pins the shared payment row ⋮ menu (`renderPaymentRowActions`): the "Delete
 * payment" item appears ONLY when `onDelete` is wired (the work-order record-view
 * Payments section), never on the standalone `/dashboard/payments` list (no
 * handler). That context-gating is the security-relevant invariant — a hard delete
 * must not be reachable from the plain list — so it's asserted directly here.
 */

import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { PaymentListRow } from "@builders/domain"
import { renderPaymentRowActions } from "@/modules/payments/components/list/table/payment-row-actions"

function row(overrides: Partial<PaymentListRow> = {}): PaymentListRow {
  return {
    id: "pay-1",
    paymentNumber: "PAY-1",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as PaymentListRow
}

/** Render the menu node and open it (items live behind the kebab trigger). */
async function openMenu(node: ReturnType<typeof renderPaymentRowActions>) {
  const user = userEvent.setup()
  render(<>{node}</>)
  await user.click(screen.getByRole("button", { name: /options for payment/i }))
  return user
}

describe("renderPaymentRowActions — delete item visibility", () => {
  afterEach(cleanup)

  it("standalone list host (no handlers): renders no menu at all", () => {
    expect(renderPaymentRowActions(row(), {})).toBeNull()
  })

  it("record-view host (onDelete wired): shows an enabled delete that fires with the row", async () => {
    const onDelete = vi.fn()
    const target = row()
    const user = await openMenu(renderPaymentRowActions(target, { onDelete }))

    const item = screen.getByRole("menuitem", { name: "Delete payment" })
    expect((item as HTMLButtonElement).disabled).toBe(false)

    await user.click(item)
    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledWith(target)
  })

  it("delete is disabled while the host is busy", async () => {
    await openMenu(renderPaymentRowActions(row(), { onDelete: vi.fn() }, true))

    const item = screen.getByRole("menuitem", { name: "Delete payment" })
    expect((item as HTMLButtonElement).disabled).toBe(true)
  })
})
