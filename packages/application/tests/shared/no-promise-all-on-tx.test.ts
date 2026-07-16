import { readdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

/**
 * Cage 2 — static backstop (the CI-failing half of the guardrail; the runtime
 * StrictPgClient in packages/db/src/client.ts is the high-fidelity dev half).
 *
 * A `Promise.all` of queries on a single pinned interactive-transaction
 * connection fires concurrent sub-queries that pg serializes; over the WAN dev
 * DB that blows the tx timeout. There is never a good reason to `Promise.all` on
 * a `tx` client — two statements on one pinned connection cannot run concurrently
 * anyway, so they must be sequenced (or moved to the pool).
 *
 * This is DELIBERATELY COARSE: it catches the lexical form (a `Promise.all` whose
 * arguments reference the transaction client named `tx`). It cannot catch a
 * multi-relation `include` handed a tx client several calls down — that dataflow
 * is the runtime tripwire's job. Scans the two layers that issue tx work.
 */
const HERE = dirname(fileURLToPath(import.meta.url))
const ROOTS = [
  join(HERE, "..", "..", "src"), // packages/application/src
  join(HERE, "..", "..", "..", "db", "src"), // packages/db/src
]

const IGNORED_DIRS = new Set(["generated", "node_modules", "dist"])

function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_DIRS.has(entry.name)) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      collectSourceFiles(full, acc)
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
      acc.push(full)
    }
  }
  return acc
}

// Returns the substring inside the balanced parens starting at `openParenIdx`.
function balancedArgs(text: string, openParenIdx: number): string {
  let depth = 0
  for (let i = openParenIdx; i < text.length; i++) {
    if (text[i] === "(") depth++
    else if (text[i] === ")") {
      depth--
      if (depth === 0) return text.slice(openParenIdx + 1, i)
    }
  }
  return text.slice(openParenIdx + 1)
}

// The transaction client is `tx` by convention (`withDatabaseTransaction(async (tx) => …)`
// and every diff-applier's `tx: Prisma.TransactionClient` param). Matches both
// `tx.model.update(…)` and `helper(tx)` forms.
const TX_REFERENCE = /\btx\b/

describe("no Promise.all on a pinned transaction connection", () => {
  it("finds no Promise.all whose arguments reference the tx client", () => {
    const offenders: string[] = []
    for (const root of ROOTS) {
      for (const file of collectSourceFiles(root)) {
        const src = readFileSync(file, "utf8")
        let idx = src.indexOf("Promise.all(")
        while (idx !== -1) {
          const open = src.indexOf("(", idx)
          if (TX_REFERENCE.test(balancedArgs(src, open))) {
            const line = src.slice(0, idx).split("\n").length
            offenders.push(`${file}:${line}`)
          }
          idx = src.indexOf("Promise.all(", idx + 1)
        }
      }
    }
    expect(offenders).toEqual([])
  })
})
