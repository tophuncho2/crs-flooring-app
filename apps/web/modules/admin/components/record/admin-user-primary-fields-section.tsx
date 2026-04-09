"use client"

import {
  RECORD_FIELD_CONTROL_CLASS_NAME,
  RecordFormField,
  RecordPrimaryFieldCell,
  RecordPrimaryFieldsGrid,
  RecordPrimaryPane,
  RecordPrimarySection,
  RecordStaticFieldValue,
} from "@/modules/shared/engines/record-view"
import { formatStableDateTime } from "@builders/domain"
import type { ManagedUserForm, ManagedUserWithPermissions } from "../../controller/types"

const ROLE_OPTIONS = [
  { value: "BUILDER", label: "Builder" },
  { value: "ADMIN", label: "Admin" },
]

export function AdminUserPrimaryFieldsSection({
  user,
  draft,
  disabled = false,
  onChange,
}: {
  user: ManagedUserWithPermissions
  draft: ManagedUserForm
  disabled?: boolean
  onChange: (value: ManagedUserForm) => void
}) {
  const createdLabel = user.createdAt ? formatStableDateTime(user.createdAt) : "Not saved yet"

  return (
    <RecordPrimarySection>
      <RecordPrimaryPane variant="main">
        <RecordPrimaryFieldsGrid>
          <RecordPrimaryFieldCell size="md">
            <RecordFormField label="Email">
              <RecordStaticFieldValue>{user.email}</RecordStaticFieldValue>
            </RecordFormField>
          </RecordPrimaryFieldCell>

          <RecordPrimaryFieldCell size="sm">
            <RecordFormField label="Role">
              {user.canChangeRole ? (
                <select
                  value={draft.role}
                  onChange={(event) => onChange({ ...draft, role: event.target.value })}
                  disabled={disabled}
                  className={RECORD_FIELD_CONTROL_CLASS_NAME}
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <RecordStaticFieldValue>{user.role}</RecordStaticFieldValue>
              )}
            </RecordFormField>
          </RecordPrimaryFieldCell>

          <RecordPrimaryFieldCell size="sm">
            <RecordFormField label="Status">
              <RecordStaticFieldValue>{user.isVerified ? "Verified" : "Pending"}</RecordStaticFieldValue>
            </RecordFormField>
          </RecordPrimaryFieldCell>
        </RecordPrimaryFieldsGrid>
      </RecordPrimaryPane>

      <RecordPrimaryPane variant="side">
        <RecordPrimaryFieldsGrid variant="side">
          <RecordFormField label="Created">
            <RecordStaticFieldValue>{createdLabel}</RecordStaticFieldValue>
          </RecordFormField>
        </RecordPrimaryFieldsGrid>
      </RecordPrimaryPane>
    </RecordPrimarySection>
  )
}
