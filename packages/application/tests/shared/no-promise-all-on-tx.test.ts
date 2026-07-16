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
 * Two lexical checks, both DELIBERATELY COARSE (a multi-relation `include`
 * handed a tx client several calls down is the runtime tripwire's job — see
 * packages/db/tests-integration/tx-cage.integration.test.ts):
 *   1. any `Promise.all` whose arguments reference the transaction client `tx`;
 *   2. any `Promise.all` appearing anywhere inside a `withDatabaseTransaction(…)`
 *      body — a concurrent fan-out on the pinned connection even when the args
 *      don't literally name `tx`. (A `Promise.all` of pool `db` reads inside a tx
 *      body trips this too, which is itself a smell — why open a tx then fan out
 *      concurrently? — so flagging it is intended.)
 * Scans the two layers that issue tx work.
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

// Every occurrence of `Promise.all(` in `src`, with its 1-based line number and
// the index just after the token (the position of its open paren).
function findPromiseAllCalls(src: string): { line: number; openParenIdx: number }[] {
  const calls: { line: number; openParenIdx: number }[] = []
  let idx = src.indexOf("Promise.all(")
  while (idx !== -1) {
    const openParenIdx = src.indexOf("(", idx)
    calls.push({ line: src.slice(0, idx).split("\n").length, openParenIdx })
    idx = src.indexOf("Promise.all(", idx + 1)
  }
  return calls
}

describe("no Promise.all on a pinned transaction connection", () => {
  it("finds no Promise.all whose arguments reference the tx client", () => {
    const offenders: string[] = []
    for (const root of ROOTS) {
      for (const file of collectSourceFiles(root)) {
        const src = readFileSync(file, "utf8")
        for (const { line, openParenIdx } of findPromiseAllCalls(src)) {
          if (TX_REFERENCE.test(balancedArgs(src, openParenIdx))) {
            offenders.push(`${file}:${line}`)
          }
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it("finds no Promise.all inside a withDatabaseTransaction body", () => {
    const offenders: string[] = []
    for (const root of ROOTS) {
      for (const file of collectSourceFiles(root)) {
        const src = readFileSync(file, "utf8")
        // Collect the [start, end) span of every withDatabaseTransaction(…) call
        // body via balanced parens; a Promise.all whose token falls inside any
        // span is a concurrent fan-out on the pinned connection.
        const spans: { start: number; end: number }[] = []
        let idx = src.indexOf("withDatabaseTransaction(")
        while (idx !== -1) {
          const open = src.indexOf("(", idx)
          spans.push({ start: open, end: open + balancedArgs(src, open).length + 1 })
          idx = src.indexOf("withDatabaseTransaction(", idx + 1)
        }
        if (spans.length === 0) continue
        for (const { line, openParenIdx } of findPromiseAllCalls(src)) {
          if (spans.some((s) => openParenIdx > s.start && openParenIdx < s.end)) {
            offenders.push(`${file}:${line}`)
          }
        }
      }
    }
    expect(offenders).toEqual([])
  })
})
