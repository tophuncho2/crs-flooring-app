"use client"

import {
  CellAt,
  FieldSection,
  FormField,
  SelectCell,
  StaticFieldValue,
} from "@/engines/record-view"
import { formatEasternDateTime, type User, type UserForm, type UserRank } from "@builders/domain"
import { assignableRanks, RANK_LABELS } from "@/modules/users/rank-presentation"

export type UserPrimaryFieldsSectionProps = {
  record: User
  draft: UserForm
  actorRank: UserRank
  /** Whether the actor may change this user's rank (strictly-lower-rank rule). */
  rankEditable: boolean
  onRankChange: (rank: UserRank) => void
  saving: boolean
}

export function UserPrimaryFieldsSection({
  record,
  draft,
  actorRank,
  rankEditable,
  onRankChange,
  saving,
}: UserPrimaryFieldsSectionProps) {
  const rankOptions = assignableRanks(actorRank).map((rank) => ({
    value: rank,
    label: RANK_LABELS[rank],
  }))

  return (
    <FieldSection gap="0.75rem">
      <CellAt col={1} colSpan={4}>
        <FormField label="Email">
          <StaticFieldValue>{record.email}</StaticFieldValue>
        </FormField>
      </CellAt>

      <CellAt col={5} colSpan={4}>
        <FormField label="Rank">
          {rankEditable ? (
            <SelectCell
              editable={!saving}
              value={draft.rank}
              options={rankOptions}
              onChange={(next) => onRankChange(next as UserRank)}
              ariaLabel="User rank"
            />
          ) : (
            <StaticFieldValue>{RANK_LABELS[record.rank] ?? record.rank}</StaticFieldValue>
          )}
        </FormField>
      </CellAt>

      <CellAt col={1} colSpan={4}>
        <FormField label="Created">
          <StaticFieldValue>{formatEasternDateTime(record.createdAt) || "—"}</StaticFieldValue>
        </FormField>
      </CellAt>
    </FieldSection>
  )
}
