"use client"

import { useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import type { ChoiceDialogProps } from "./choice-dialog"

/** A place the operator can land after a create — a label + the record href. */
export type RecordCreateDestination = { label: string; href: string }

export type PresentRecordCreateChoice = (config: {
  /** Dialog title. Defaults to `"Created"`. */
  title?: ReactNode
  /** Dialog body. Defaults to a generic prompt matching the destination shape. */
  message?: ReactNode
  /**
   * Where the operator can go. One destination (re-homed child create — paired
   * with `stay`) or two (the hub's property/entity fork — force-choice, no stay).
   */
  destinations: RecordCreateDestination[]
  /**
   * The "stay where I am" choice — only for single-destination (re-homed) flows.
   * When present, the secondary button (and backdrop/Escape) stays put and runs
   * `onStay`; the dialog is dismissable. Omit for the force-choice fork.
   */
  stay?: { label: string; onStay?: () => void }
}) => void

type Pending = {
  title: ReactNode
  message: ReactNode
  destinations: RecordCreateDestination[]
  stay?: { label: string; onStay?: () => void }
}

const SINGLE_MESSAGE = "Created. Go to the new record, or stay here?"
const FORK_MESSAGE = "Where would you like to go?"

/**
 * The shared "go to the new record / stay here" choice controller. After a create
 * that yields one or more sensible destinations, call `present(...)`; spread the
 * returned `choiceDialogProps` into a `<ChoiceDialog>`. Navigation uses
 * `router.push(href, { scroll: false })`.
 *
 * Two shapes funnel through one dialog:
 * - **Re-homed child create** (Entity→Property, Entity→Template, Property→Template):
 *   one `destination` + a `stay` action. Primary = go to the new child, secondary
 *   (and backdrop/Escape) = stay in the current record.
 * - **Hub fork** (both an entity and a property created): two `destinations`, no
 *   `stay` → force-choice, exactly the old `choiceDialog` behavior.
 */
export function useRecordCreateChoice(): {
  present: PresentRecordCreateChoice
  choiceDialogProps: ChoiceDialogProps | null
} {
  const router = useRouter()
  const [pending, setPending] = useState<Pending | null>(null)

  const present: PresentRecordCreateChoice = (config) => {
    setPending({
      title: config.title ?? "Created",
      message:
        config.message ?? (config.stay ? SINGLE_MESSAGE : FORK_MESSAGE),
      destinations: config.destinations,
      stay: config.stay,
    })
  }

  let choiceDialogProps: ChoiceDialogProps | null = null
  if (pending) {
    const close = () => setPending(null)
    const goTo = (href: string) => {
      close()
      router.push(href, { scroll: false })
    }
    const [primary, secondary] = pending.destinations
    const base = {
      open: true as const,
      title: pending.title,
      message: pending.message,
      primaryLabel: primary.label,
      onPrimary: () => goTo(primary.href),
    }

    if (pending.stay) {
      const stay = () => {
        close()
        pending.stay?.onStay?.()
      }
      choiceDialogProps = {
        ...base,
        secondaryLabel: pending.stay.label,
        onSecondary: stay,
        onCancel: stay, // backdrop / Escape = stay here
      }
    } else {
      choiceDialogProps = {
        ...base,
        secondaryLabel: secondary.label,
        onSecondary: () => goTo(secondary.href),
        // no onCancel → force a choice (both records exist; there is no "neither")
      }
    }
  }

  return { present, choiceDialogProps }
}
