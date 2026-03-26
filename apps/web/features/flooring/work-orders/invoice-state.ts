export function buildInvoiceInvalidationFields(updatedAt: Date = new Date()) {
  return {
    invoiceSourceUpdatedAt: updatedAt,
    invoiceStatus: "IDLE" as const,
    invoiceFileKey: null,
    invoiceRequestedAt: null,
    invoiceGeneratedAt: null,
    invoiceFailedAt: null,
    invoiceError: null,
    invoiceIdempotencyKey: null,
  }
}
