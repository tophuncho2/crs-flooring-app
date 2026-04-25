"use client"

import type { ReactNode } from "react"

export type GroupNode<TRow> = {
  key: string
  label: string
  rows: ReadonlyArray<TRow>
  children?: ReadonlyArray<GroupNode<TRow>>
}

export type GroupTreeProps<TRow> = {
  groups: ReadonlyArray<GroupNode<TRow>>
  renderRow: (row: TRow) => ReactNode
  /** Optional override for how a group header renders. */
  renderGroupHeader?: (group: GroupNode<TRow>, depth: number) => ReactNode
  className?: string
}

const DEFAULT_GROUP_HEADER_CLASS_NAME =
  "border-b border-[var(--panel-border)] bg-[var(--panel-border)]/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--foreground)]/65"

/**
 * Renders a tree of grouped rows. Recursive: nested groups render their own
 * header before their rows + children. Consumers pass a `renderRow` for the
 * leaf rendering; the grid's row component is the typical choice.
 *
 * No grouping logic lives here — the consumer (or a `groupBy` helper) builds
 * the `GroupNode` tree and hands it in.
 */
export function GroupTree<TRow>({
  groups,
  renderRow,
  renderGroupHeader,
  className,
}: GroupTreeProps<TRow>) {
  return (
    <div className={className}>
      {groups.map((group) => (
        <GroupBranch
          key={group.key}
          group={group}
          depth={0}
          renderRow={renderRow}
          renderGroupHeader={renderGroupHeader}
        />
      ))}
    </div>
  )
}

function GroupBranch<TRow>({
  group,
  depth,
  renderRow,
  renderGroupHeader,
}: {
  group: GroupNode<TRow>
  depth: number
  renderRow: (row: TRow) => ReactNode
  renderGroupHeader?: (group: GroupNode<TRow>, depth: number) => ReactNode
}) {
  return (
    <div>
      {renderGroupHeader ? (
        renderGroupHeader(group, depth)
      ) : (
        <div className={DEFAULT_GROUP_HEADER_CLASS_NAME} style={{ paddingLeft: `${0.75 + depth}rem` }}>
          {group.label}
        </div>
      )}
      {group.rows.map((row, index) => (
        <div key={index}>{renderRow(row)}</div>
      ))}
      {group.children?.map((child) => (
        <GroupBranch
          key={child.key}
          group={child}
          depth={depth + 1}
          renderRow={renderRow}
          renderGroupHeader={renderGroupHeader}
        />
      ))}
    </div>
  )
}
