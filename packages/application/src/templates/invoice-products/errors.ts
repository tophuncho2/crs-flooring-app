export type TemplateInvoiceProductErrorCode =
  "TEMPLATE_INVOICE_PRODUCT_VALIDATION_FAILED"

export class TemplateInvoiceProductExecutionError extends Error {
  readonly code: TemplateInvoiceProductErrorCode
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: TemplateInvoiceProductErrorCode
    message: string
    status: number
    field?: string
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = "TemplateInvoiceProductExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
    this.payload = input.payload
  }
}
