// Cross-layer config for the read-only users list view. Declared in domain
// because these values are referenced by both the server-side use case / route
// validator (in @builders/application) and the client-side data wrapper
// (in apps/web/modules/users/).

export const LIST_USERS_PAGE_SIZE = 50
export const LIST_USERS_MAX_PAGE_SIZE = 200
