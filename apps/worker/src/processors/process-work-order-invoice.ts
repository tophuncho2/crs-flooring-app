import {
  createProcessWorkOrderInvoiceUseCase,
  type WorkOrderInvoiceApplicationDependencies as WorkOrderInvoiceProcessorDependencies,
} from "../application/process-work-order-invoice.js"

export { type WorkOrderInvoiceProcessorDependencies }

export function createWorkOrderInvoiceProcessor(
  dependencies?: WorkOrderInvoiceProcessorDependencies,
) {
  return createProcessWorkOrderInvoiceUseCase(dependencies)
}
