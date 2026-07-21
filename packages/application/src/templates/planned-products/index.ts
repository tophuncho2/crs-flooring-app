// The planned-products save use case was superseded by the combined "products"
// section use case (packages/application/src/templates/products) — it saves
// planned products + service items in one atomic diff. Only the error class
// remains here (thrown by the combined use case + the API validators).
export * from "./errors.js"
