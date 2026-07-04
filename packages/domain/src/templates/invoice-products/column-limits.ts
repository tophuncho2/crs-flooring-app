/**
 * Length limits for short free-text columns on TemplateInvoiceProduct.
 * Mirrors the `@db.VarChar(N)` constraints in `schema.prisma`. Imported
 * by the API validators and UI cells so the cap lives in one TS source.
 */

export const TEMPLATE_INVOICE_PRODUCT_NOTES_MAX = 30
