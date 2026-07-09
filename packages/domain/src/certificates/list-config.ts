// Cross-layer config for the certificates list view. Declared in domain because
// these values are referenced by both server-side use cases / route validators
// (in @builders/application) and the client-side controller / data wrapper
// (in apps/web/modules/certificates/).

export const LIST_CERTIFICATES_PAGE_SIZE = 50
export const LIST_CERTIFICATES_MAX_PAGE_SIZE = 200
