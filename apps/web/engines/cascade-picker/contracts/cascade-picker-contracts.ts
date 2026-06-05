import type { HubSidePanelPickerOption } from "@/components/hub-side-panel"

/**
 * The three cascading steps, root → leaf. Selecting an upstream step clears
 * every downstream step; the leaf (template) clears nothing.
 */
export type CascadeStep = "managementCompany" | "property" | "template"

/** A resolved picker selection: the id plus a pre-resolved display label. */
export type CascadeSelection = {
  id: string
  label: string | null
}

/** One fetched page of options, matching the dropdown engine's paged shape. */
export type CascadeOptionsPage<TOption> = {
  items: TOption[]
  hasMore: boolean
}

/**
 * Per-step data wiring supplied by the consumer. The engine owns the picker
 * chrome + cascade state; the consumer owns *what* each step searches and how
 * an option maps to a display row. Keeping the requests injected is what makes
 * the engine self-contained (no imports from `modules/*`) and reusable across
 * template-sync and, later, work-orders.
 */
export type CascadePickerStepConfig<TOption> = {
  /** Stable react-query cache-key prefix (bucket parent filters into it). */
  bucketKey: ReadonlyArray<unknown>
  /** Paginated search for this step, already curried with its parent filter. */
  pagedSearchFn: (
    search: string,
    signal: AbortSignal | undefined,
    skip: number,
  ) => Promise<CascadeOptionsPage<TOption>>
  /** Map a raw option to the picker's display row. */
  toOption: (option: TOption) => HubSidePanelPickerOption
  searchPlaceholder?: string
}
