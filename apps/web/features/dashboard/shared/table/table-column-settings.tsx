"use client"

import { useEffect, useRef, useState } from "react"
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Columns3, GripVertical } from "lucide-react"
import { FLOORING_PRIMARY_ACCENT_INTERACTIVE_CLASS_NAME } from "@/features/dashboard/shared/display/accent-styles"
import type { TableColumnDefinition } from "@/features/dashboard/shared/table/table-column-definition"

type TableColumnSettingsProps<TColumn extends TableColumnDefinition> = {
  panelKey?: string
  columns: TColumn[]
  hiddenColumnKeys: string[]
  onToggleColumn: (columnKey: string, isVisible: boolean) => void
  onMoveColumn: (columnKey: string, direction: "up" | "down") => void
  onSetColumnOrder?: (columnKeys: string[]) => void
  groupedColumnKeys?: string[]
  maxGroupFields?: number
  onToggleGroupedColumn?: (columnKey: string) => void
}

const openPanelState = new Map<string, boolean>()

function SortableColumnRow<TColumn extends TableColumnDefinition>({
  column,
  isVisible,
  onToggleColumn,
  groupOrder,
  isGroupToggleDisabled,
  onToggleGroupedColumn,
}: {
  column: TColumn
  isVisible: boolean
  onToggleColumn: (columnKey: string, isVisible: boolean) => void
  groupOrder: number | null
  isGroupToggleDisabled: boolean
  onToggleGroupedColumn?: (columnKey: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: column.key })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-lg border border-[var(--panel-border)] px-2 py-2 ${isDragging ? "bg-[var(--panel-hover)] shadow-md" : ""}`}
    >
      <button
        type="button"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[var(--panel-border)] text-[var(--foreground)]/65 hover:bg-[var(--panel-hover)]"
        aria-label={`Drag ${column.label}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </button>
      <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isVisible}
          onChange={(event) => onToggleColumn(column.key, event.target.checked)}
        />
        <span className="truncate">{column.label}</span>
      </label>
      {column.groupable && onToggleGroupedColumn ? (
        <button
          type="button"
          onClick={() => onToggleGroupedColumn(column.key)}
          disabled={isGroupToggleDisabled}
          aria-label={groupOrder === null ? `Group by ${column.label}` : `Remove grouping for ${column.label}`}
          aria-pressed={groupOrder !== null}
          title={groupOrder === null ? "Group by this column" : `Grouping order ${groupOrder + 1}`}
          className={[
            "inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded border text-[11px] font-semibold transition",
            groupOrder !== null
              ? `border-blue-500 ${FLOORING_PRIMARY_ACCENT_INTERACTIVE_CLASS_NAME}`
              : isGroupToggleDisabled
                ? "cursor-not-allowed border-[var(--panel-border)] text-[var(--foreground)]/35"
                : "border-[var(--panel-border)] text-[var(--foreground)]/70 hover:bg-[var(--panel-hover)]",
          ].join(" ")}
        >
          {groupOrder === null ? "G" : String(groupOrder + 1)}
        </button>
      ) : null}
    </div>
  )
}

export function TableColumnSettings<TColumn extends TableColumnDefinition>({
  panelKey,
  columns,
  hiddenColumnKeys,
  onToggleColumn,
  onMoveColumn,
  onSetColumnOrder,
  groupedColumnKeys = [],
  maxGroupFields = 3,
  onToggleGroupedColumn,
}: TableColumnSettingsProps<TColumn>) {
  const resolvedPanelKey = panelKey ?? columns.map((column) => column.key).join("|")
  const [isOpen, setIsOpen] = useState(() => openPanelState.get(resolvedPanelKey) ?? false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  useEffect(() => {
    openPanelState.set(resolvedPanelKey, isOpen)
  }, [isOpen, resolvedPanelKey])

  useEffect(() => {
    if (!isOpen) return

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [isOpen])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = columns.findIndex((column) => column.key === active.id)
    const newIndex = columns.findIndex((column) => column.key === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reorderedKeys = arrayMove(
      columns.map((column) => column.key),
      oldIndex,
      newIndex,
    )

    if (onSetColumnOrder) {
      onSetColumnOrder(reorderedKeys)
      return
    }

    const movedKey = String(active.id)
    const direction = newIndex < oldIndex ? "up" : "down"
    onMoveColumn(movedKey, direction)
  }

  return (
    <div ref={rootRef} className="relative z-30">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex items-center gap-2 rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm font-semibold transition hover:bg-[var(--panel-hover)]"
      >
        <Columns3 size={16} />
        Columns
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-full z-[70] mt-2 w-[min(92vw,28rem)] overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-3 shadow-xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/60">Columns</p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={columns.map((column) => column.key)} strategy={verticalListSortingStrategy}>
              <div className="max-h-[min(70vh,32rem)] space-y-2 overflow-y-auto pr-1">
                {columns.map((column) => {
                  const groupOrder = groupedColumnKeys.indexOf(column.key)
                  return (
                    <SortableColumnRow
                      key={column.key}
                      column={column}
                      isVisible={!hiddenColumnKeys.includes(column.key)}
                      onToggleColumn={onToggleColumn}
                      groupOrder={groupOrder === -1 ? null : groupOrder}
                      isGroupToggleDisabled={groupOrder === -1 && groupedColumnKeys.length >= maxGroupFields}
                      onToggleGroupedColumn={onToggleGroupedColumn}
                    />
                  )
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      ) : null}
    </div>
  )
}
