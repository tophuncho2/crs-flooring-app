// Cross-layer config for the entities list view. Declared in domain
// because these values are referenced by both server-side use cases / route
// validators (in @builders/application) and the client-side controller / data
// wrapper (in apps/web/modules/entities/).

export const LIST_ENTITIES_PAGE_SIZE = 50
export const LIST_ENTITIES_MAX_PAGE_SIZE = 200
