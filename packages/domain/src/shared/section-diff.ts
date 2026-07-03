/**
 * The canonical shape of an editable record section's save diff: the partition
 * of a local editable list against its server snapshot into rows to create
 * (`added`), rows to update (`modified`), and rows to delete (`deleted`).
 *
 * `TCreate` is the create-form payload carried by a newly added row; `TUpdate`
 * defaults to `TCreate` for sections that use one form for both (templates).
 * Added rows carry a client `tempId` (the app-layer `assignDraftIds` stamps a
 * real id before persisting); modified/deleted rows carry the server `id`.
 *
 * Shared across the editable second-section stacks. The client util that builds
 * a value of this shape is `buildRowDiff` (record-view engine); the app-layer
 * save use cases consume it. Sections whose added row carries extra fields
 * beyond `{ tempId; form }` (imports staged rows carry a `productId`) keep their
 * own local diff type rather than forcing a generic parameter here.
 */
export type SectionDiff<TCreate, TUpdate = TCreate> = {
  added: { tempId: string; form: TCreate }[]
  modified: { id: string; form: TUpdate }[]
  deleted: { id: string }[]
}
