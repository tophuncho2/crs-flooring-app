"use client"

import type { ReactNode } from "react"

/**
 * Guidance pane rendered inside an `<ExpandableRow>` when the parent row
 * has not yet been saved server-side — i.e. its id is still a local-only
 * `temp:*` client ID (per `isLocalOnlyRecordRow`). Replaces the children
 * area so child-creation affordances ("+ Add Row", "+ Add Adjustment") are
 * not reachable until the parent exists on the server.
 *
 * Consumers gate via:
 *
 *   {parentSaved ? (
 *     <SubGrid … />
 *   ) : (
 *     <UnsavedParentMessage>Save this … to add …</UnsavedParentMessage>
 *   )}
 *
 * Pure presentation — owns the pane styling that was duplicated inline in
 * the staged-inv filter-rows section. No knowledge of which section the
 * parent belongs to; consumer supplies the wording so each section can
 * speak in its own nouns.
 */
export function UnsavedParentMessage({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 py-3 text-xs text-[var(--foreground)]/55">
      {children}
    </div>
  )
}
