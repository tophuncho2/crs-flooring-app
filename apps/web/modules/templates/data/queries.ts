import {
  createPrismaPageLoadIssue,
  getTemplateById,
  isPrismaNotFoundError,
  type PrismaDetailPageResult,
} from "@builders/db"

export { getTemplateById }

// All form-option fields are powered by async pickers
// (PropertyPicker / EntityPicker / JobTypePicker /
// WarehousePicker / CategoryPicker / ProductPicker) which call
// /api/{...}/options on demand; read-only labels come from joined fields
// on TemplateDetail and TemplateMaterialItemRow. No SSR pre-fetch of
// options is required.

export async function getTemplateDetailPageData(id: string): Promise<PrismaDetailPageResult<{
  template: Awaited<ReturnType<typeof getTemplateById>>
}>> {
  try {
    const template = await getTemplateById(id)

    return {
      ok: true,
      data: { template },
    }
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      return { ok: false, notFound: true }
    }

    return {
      ok: false,
      error: createPrismaPageLoadIssue(error, {
        code: "TEMPLATE_DETAIL_LOAD_FAILED",
        title: "Template Unavailable",
        message: "The app could not load this template.",
        detail: "The template record could not be loaded.",
      }),
    }
  }
}
