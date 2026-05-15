"use client"

import type { ReactNode } from "react"

export type SidePanelPreviewSectionProps = {
  /** Section heading rendered above the content. Omit for unlabelled sections. */
  title?: ReactNode
  /** Optional inline suffix beside the title (e.g. row count). */
  titleAside?: ReactNode
  children: ReactNode
}

/**
 * Consistent section container for content inside a {@link SidePanelPreview}.
 * Provides the standardized vertical rhythm + section title treatment shared
 * by header / items / future toggle regions. Pure layout — no data, no
 * primitives below the cell layer.
 */
export function SidePanelPreviewSection({
  title,
  titleAside,
  children,
}: SidePanelPreviewSectionProps) {
  return (
    <section className="flex flex-col gap-2">
      {title ? (
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/65">
          {title}
          {titleAside ? (
            <span className="ml-2 font-normal text-[var(--foreground)]/45">{titleAside}</span>
          ) : null}
        </h3>
      ) : null}
      {children}
    </section>
  )
}
