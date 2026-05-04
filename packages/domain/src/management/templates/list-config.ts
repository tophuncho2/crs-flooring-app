// Cross-layer config for the templates list view. Declared in domain because
// these values are referenced by both server-side use cases / route validators
// (in @builders/application) and the client-side controller / data wrapper
// (in apps/web/modules/templates/). Domain is the only package safely
// importable from both sides.

export const LIST_TEMPLATES_PAGE_SIZE = 50
export const LIST_TEMPLATES_MAX_PAGE_SIZE = 200
