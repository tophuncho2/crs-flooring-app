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
import type { TableColumnDefinition } from "./use-table-columns"

type TableColumnSettingsProps<TColumn extends TableColumnDefinition> = {
  columns: TColumn[]
  hiddenColumnKeys: string[]
  onToggleColumn: (columnKey: string, isVisible: boolean) => void
  onMoveColumn: (columnKey: string, direction: "up" | "down") => void
  onSetColumnOrder?: (columnKeys: string[]) => void
}

function SortableColumnRow<TColumn extends TableColumnDefinition>({
  column,
  isVisible,
  onToggleColumn,
}: {
  column: TColumn
  isVisible: boolean
  onToggleColumn: (columnKey: string, isVisible: boolean) => void
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
    </div>
  )
}

export function TableColumnSettings<TColumn extends TableColumnDefinition>({
  columns,
  hiddenColumnKeys,
  onToggleColumn,
  onMoveColumn,
  onSetColumnOrder,
}: TableColumnSettingsProps<TColumn>) {
  const [isOpen, setIsOpen] = useState(false)
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
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex items-center gap-2 rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm font-semibold transition hover:bg-[var(--panel-hover)]"
      >
        <Columns3 size={16} />
        Columns
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-3 shadow-xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/60">Columns</p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={columns.map((column) => column.key)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {columns.map((column) => (
                  <SortableColumnRow
                    key={column.key}
                    column={column}
                    isVisible={!hiddenColumnKeys.includes(column.key)}
                    onToggleColumn={onToggleColumn}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      ) : null}
    </div>
  )
}
