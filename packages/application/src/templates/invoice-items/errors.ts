// Invoice items have no foreign key beyond the parent template, so — unlike the
// planned side — there is no LINK_INVALID code; validation is the only failure mode.
export type TemplateInvoiceItemErrorCode = "TEMPLATE_INVOICE_ITEM_VALIDATION_FAILED"

export class TemplateInvoiceItemExecutionError extends Error {
  readonly code: TemplateInvoiceItemErrorCode
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: TemplateInvoiceItemErrorCode
    message: string
    status: number
    field?: string
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = "TemplateInvoiceItemExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
    this.payload = input.payload
  }
}
