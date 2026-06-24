// Template deletion is never blocked at the domain level.
// Schema-level cascades handle cleanup:
//   - FlooringTemplateItem.onDelete: Cascade → material items are removed with the template.
//   - FlooringWorkOrder.templateId uses SetNull → work orders survive with templateId = null.
// No property / entity / job-type rows are touched by a template delete.
export function isTemplateDeleteBlocked(): false {
  return false
}
