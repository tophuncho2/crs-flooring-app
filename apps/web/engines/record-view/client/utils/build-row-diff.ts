/**
 * Partitions a local editable list against its server snapshot into the
 * `{ added, modified, deleted }` diff every editable record section submits on
 * save. Replaces the hand-rolled partition loops in the work-orders / templates
 * material-items and imports staged-inventory controllers.
 *
 * Structural on purpose — the caller supplies the element mappers (`toAdded` /
 * `toModified`), so this util stays domain-free and each site names its own
 * diff type (see `SectionDiff` in `@builders/domain`). `isLocalOnly` is injected
 * (pass `isLocalOnlyRecordRow`) rather than hard-depended.
 *
 * Divergences it absorbs, all as options:
 * - `getLocalId` — the local id accessor differs (`item.id` vs `draft.clientId`).
 * - `reverseAdded` — top-add sections reverse so the server stamps createdAt
 *   oldest→newest in submission order; bottom-add sections do not.
 * - `onMissingServerRow` — a non-local row whose server row vanished is either
 *   skipped (material items) or treated as added to force a reconcile (imports).
 * - `isServerRowEligible` — a per-server-row gate applied to BOTH modify
 *   detection and deletion (imports staged rows: only DRAFT rows are editable,
 *   so non-DRAFT rows never appear in `modified` or `deleted`).
 *
 * Added rows carry whatever `toAdded` returns, so a section whose added element
 * has extra fields (imports staged rows carry `productId`) builds it there.
 */
export function buildRowDiff<L, S extends { id: string }, TAdded, TModified>(opts: {
  locals: L[]
  serverRows: S[]
  getLocalId: (local: L) => string
  isLocalOnly: (id: string) => boolean
  differs: (local: L, server: S) => boolean
  toAdded: (local: L) => TAdded
  toModified: (local: L, server: S) => TModified
  reverseAdded?: boolean
  onMissingServerRow?: "skip" | "add"
  isServerRowEligible?: (server: S) => boolean
}): { added: TAdded[]; modified: TModified[]; deleted: { id: string }[] } {
  const {
    reverseAdded = false,
    onMissingServerRow = "skip",
    isServerRowEligible = () => true,
  } = opts

  const serverById = new Map(opts.serverRows.map((row) => [row.id, row]))
  const liveIds = new Set(
    opts.locals.map(opts.getLocalId).filter((id) => !opts.isLocalOnly(id)),
  )

  const added: TAdded[] = []
  const modified: TModified[] = []

  for (const local of opts.locals) {
    const id = opts.getLocalId(local)
    if (opts.isLocalOnly(id)) {
      added.push(opts.toAdded(local))
      continue
    }
    const server = serverById.get(id)
    if (!server) {
      if (onMissingServerRow === "add") added.push(opts.toAdded(local))
      continue
    }
    if (!isServerRowEligible(server)) continue
    if (opts.differs(local, server)) modified.push(opts.toModified(local, server))
  }

  if (reverseAdded) added.reverse()

  const deleted = opts.serverRows
    .filter((row) => isServerRowEligible(row) && !liveIds.has(row.id))
    .map((row) => ({ id: row.id }))

  return { added, modified, deleted }
}
