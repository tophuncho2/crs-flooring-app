export function buildInvoiceInvalidationFields(updatedAt: Date = new Date()) {
  return {
    invoiceSourceVersion: updatedAt,
  }
}
