import { Prisma, withDatabaseTransaction } from "@builders/db"

export interface WithTxThenEnrichOptions {
  /** Compose inside a caller's transaction instead of opening a new one. */
  client?: Prisma.TransactionClient
  /**
   * Interactive-transaction budget overrides. Prisma defaults: timeout 5000ms,
   * maxWait 2000ms. Bump only when the tx still holds a large write burst.
   */
  timeout?: number
  maxWait?: number
}

/**
 * Runs lean writes inside an interactive transaction, then enriches the full
 * (multi-relation) record on the POOL after commit.
 *
 * Why: a read whose select/include pulls 2+ relations — or a `Promise.all` of
 * queries — issued on the single pinned transaction connection fires concurrent
 * sub-queries on that one connection. pg serializes them; over the WAN dev DB the
 * serialized round-trips blow the 5s interactive-tx timeout (P2028). Transactions
 * must hold only locks + writes + lean relation-free reads; the fat record is
 * read on the pool here, after commit.
 *
 * `write` receives the tx client (`options.client ?? tx`) and returns whatever
 * `enrich` needs — commonly a lean `{ id }`. `enrich` runs on the pool (pass its
 * getter with no client arg) and returns the full record or null; `onMissing`
 * throws the module's not-found error when the just-written row can't be re-read.
 */
export async function withTxThenEnrich<W, R>(
  write: (client: Prisma.TransactionClient) => Promise<W>,
  enrich: (written: W) => Promise<R | null>,
  onMissing: (written: W) => never,
  options: WithTxThenEnrichOptions = {},
): Promise<R> {
  const { client, timeout, maxWait } = options
  const txOptions =
    timeout !== undefined || maxWait !== undefined ? { timeout, maxWait } : undefined

  const written = await withDatabaseTransaction(async (tx) => write(client ?? tx), txOptions)

  const record = await enrich(written)
  if (record === null) {
    onMissing(written)
  }
  return record
}
