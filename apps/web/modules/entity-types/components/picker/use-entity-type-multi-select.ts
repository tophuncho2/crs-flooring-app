"use client"

import { useCallback, useMemo, useState } from "react"
import type { EntityTypeOption, EntityTypeRef, PaletteColor } from "@builders/domain"
import {
  useAsyncRichDropdownController,
  type PickerListOption,
} from "@/engines/picker"
import {
  ENTITY_TYPE_OPTIONS_QUERY_KEY,
  searchEntityTypeOptionsRequest,
} from "@/modules/entity-types/data/entity-types-options-request"

export type EntityTypeChip = { id: string; label: string; color?: PaletteColor }

export function toEntityTypePickerOption(option: EntityTypeOption): PickerListOption {
  return { id: option.id, title: option.type }
}

/**
 * The shared multi-select-of-entity-types machinery: an id-driven `string[]`
 * selection with a small id→{type,color} ref-cache for chip labels, plus an
 * options controller whose list hides the already-selected ids (so the add-list
 * only ever offers additions). Composed by both the standalone
 * `EntityTypeMultiSelect` chip control and the combo picker's type side, so the
 * pick/remove/label logic lives in exactly one place.
 *
 * `enabled` gates the underlying options fetch (pass the panel's open state).
 */
export function useEntityTypeMultiSelect({
  selectedIds,
  seedRefs,
  onChange,
  enabled,
}: {
  selectedIds: string[]
  /** Refs known up front (current selection) for chip labels. */
  seedRefs: EntityTypeRef[]
  onChange?: (nextIds: string[]) => void
  enabled: boolean
}) {
  // id → ref cache for chip labels. Seeded once from the known refs and topped
  // up whenever the user picks an option (the option carries its ref).
  const [refCache, setRefCache] = useState<Map<string, EntityTypeRef>>(
    () => new Map(seedRefs.map((ref) => [ref.id, ref])),
  )

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])

  // Live id→ref map off the current `seedRefs` prop. The `refCache` above is
  // mount-seeded + topped up on user picks, so it can't track a re-seed (e.g. a
  // re-selected entity hands down a fresh `seedRefs`). Resolving chips against
  // this derived map keeps read-only consumers reactive without a set-in-effect.
  const seedMap = useMemo(
    () => new Map(seedRefs.map((ref) => [ref.id, ref])),
    [seedRefs],
  )

  const controller = useAsyncRichDropdownController<EntityTypeOption>({
    bucketKey: ENTITY_TYPE_OPTIONS_QUERY_KEY,
    pagedSearchFn: useCallback(
      (search: string, signal: AbortSignal | undefined, skip: number) =>
        searchEntityTypeOptionsRequest(search, signal, { skip }),
      [],
    ),
    enabled,
  })

  // Hide already-selected types from the add-list (sidesteps the single-select
  // `selectedId` highlight — this tracks a set, not one value).
  const addController = useMemo(
    () => ({
      ...controller,
      options: controller.options.filter((option) => !selectedIdSet.has(option.id)),
    }),
    [controller, selectedIdSet],
  )

  const rememberRef = useCallback((raw: EntityTypeOption) => {
    setRefCache((previous) => {
      if (previous.has(raw.id)) return previous
      const next = new Map(previous)
      next.set(raw.id, { id: raw.id, type: raw.type, color: raw.color })
      return next
    })
  }, [])

  const handleSelect = useCallback(
    (_option: PickerListOption, raw: EntityTypeOption) => {
      rememberRef(raw)
      if (!selectedIdSet.has(raw.id)) onChange?.([...selectedIds, raw.id])
    },
    [onChange, rememberRef, selectedIds, selectedIdSet],
  )

  // Toggle variant for the glow-rail UI (combo picker): selected types stay in
  // the list and glow; clicking a selected one removes it. Pair with the
  // unfiltered `controller` + `selectedIds` (below), not `addController`.
  const handleToggle = useCallback(
    (_option: PickerListOption, raw: EntityTypeOption) => {
      rememberRef(raw)
      if (selectedIdSet.has(raw.id)) {
        onChange?.(selectedIds.filter((entry) => entry !== raw.id))
      } else {
        onChange?.([...selectedIds, raw.id])
      }
    },
    [onChange, rememberRef, selectedIds, selectedIdSet],
  )

  const handleRemove = useCallback(
    (id: string) => onChange?.(selectedIds.filter((entry) => entry !== id)),
    [onChange, selectedIds],
  )

  const chips = useMemo<EntityTypeChip[]>(
    () =>
      selectedIds.map((id) => {
        const ref = refCache.get(id) ?? seedMap.get(id)
        return { id, label: ref?.type ?? "—", color: ref?.color }
      }),
    [selectedIds, refCache, seedMap],
  )

  return { controller, addController, handleSelect, handleToggle, handleRemove, chips }
}
