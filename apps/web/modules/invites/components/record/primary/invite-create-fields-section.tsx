"use client"

import { CellAt, FieldSection, FormField, SelectCell, TextCell } from "@/engines/record-view"
import type { InviteCreateForm, UserRank } from "@builders/domain"
import { assignableRanks, RANK_LABELS } from "@/modules/users/rank-presentation"

export type InviteCreateFieldsSectionProps = {
  draft: InviteCreateForm
  editable: boolean
  actorRank: UserRank
  onFieldChange: <K extends keyof InviteCreateForm>(field: K, value: InviteCreateForm[K]) => void
}

export function InviteCreateFieldsSection({
  draft,
  editable,
  actorRank,
  onFieldChange,
}: InviteCreateFieldsSectionProps) {
  const rankOptions = assignableRanks(actorRank).map((rank) => ({
    value: rank,
    label: RANK_LABELS[rank],
  }))

  return (
    <FieldSection gap="0.75rem">
      <CellAt col={1} colSpan={5}>
        <FormField label="Email" required>
          <TextCell
            editable={editable}
            value={draft.email}
            onChange={(next) => onFieldChange("email", next)}
            placeholder="name@crsfloorcovering.com"
            ariaLabel="Invite email"
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={5}>
        <FormField label="Rank" required>
          <SelectCell
            editable={editable}
            value={draft.rank}
            options={rankOptions}
            onChange={(next) => onFieldChange("rank", next as UserRank)}
            ariaLabel="Invite rank"
          />
        </FormField>
      </CellAt>
    </FieldSection>
  )
}
