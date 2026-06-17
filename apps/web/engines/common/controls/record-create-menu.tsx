"use client"

import { useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { buildRecordCreateHref } from "@/hooks/navigation/routes"
import { RecordOptionsMenu } from "./record-options-menu"

/**
 * The shared "create record" (⋮) affordance for a record-view picker cell — the
 * create-flow shell wrapped around {@link RecordOptionsMenu}. It owns the one
 * piece every module's create menu repeats verbatim: the quick-modal open-state,
 * the two menu items (**Quick form** → open the inline modal · **Proper form** →
 * navigate to the full `{basePath}/new` create page with `returnTo`), and the
 * `buildRecordCreateHref` push.
 *
 * The genuinely module-specific halves are data-injected: `renderModal` returns
 * the module's own quick-create modal (wired to the supplied `open`/`onClose`),
 * which on success maps its created record to the cell's option type and calls
 * `onClose` to dismiss. Drops straight into a `FormField` `actions` slot beside the
 * cell's `RecordOpenButton`.
 */
export function RecordCreateMenu({
  heading,
  basePath,
  returnTo,
  quickLabel = "Quick form",
  properLabel = "Proper form",
  ariaLabel,
  renderModal,
}: {
  /** Sticky header + default aria label, e.g. "New management company". */
  heading: string
  /** Create-page base, e.g. "/dashboard/management-companies" → `{base}/new`. */
  basePath: string
  /** Record-entry path the proper-form route returns to after create. */
  returnTo: string
  quickLabel?: string
  properLabel?: string
  /** Override the default aria label (defaults to `heading`). */
  ariaLabel?: string
  /** The module's quick-create modal, wired to the shell's open-state. */
  renderModal: (args: { open: boolean; onClose: () => void }) => ReactNode
}) {
  const router = useRouter()
  const [quickOpen, setQuickOpen] = useState(false)

  return (
    <>
      <RecordOptionsMenu
        ariaLabel={ariaLabel ?? heading}
        heading={heading}
        items={[
          {
            key: "quick",
            label: quickLabel,
            onClick: () => setQuickOpen(true),
          },
          {
            key: "proper",
            label: properLabel,
            onClick: () => router.push(buildRecordCreateHref(basePath, { returnTo })),
          },
        ]}
      />
      {renderModal({ open: quickOpen, onClose: () => setQuickOpen(false) })}
    </>
  )
}
