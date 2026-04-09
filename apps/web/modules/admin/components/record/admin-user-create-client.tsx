"use client"

import { requestJson } from "@/modules/shared/engines/common/transport/http"
import { withMutationMeta } from "@/modules/shared/engines/common/transport/mutation"
import {
  RecordCreateClientScaffold,
  RecordSingleSectionPanel,
  useSingleSectionCreateController,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import { buildRecordDetailHref } from "@/modules/shared/engines/common/record-entry"
import {
  RECORD_FIELD_CONTROL_CLASS_NAME,
  RecordFormField,
  RecordPrimaryFieldCell,
  RecordPrimaryFieldsGrid,
  RecordPrimaryPane,
  RecordPrimarySection,
} from "@/modules/shared/engines/record-view"
import type { ManagedUserWithPermissions } from "../../controller/types"

type AdminUserCreateForm = {
  email: string
  role: string
}

const ROLE_OPTIONS = [
  { value: "BUILDER", label: "Builder" },
  { value: "ADMIN", label: "Admin" },
]

function AdminUserCreatePanel({
  page,
  backHref,
}: {
  page: RecordDetailClientScaffoldContext
  backHref: string
}) {
  const controller = useSingleSectionCreateController<AdminUserCreateForm>({
    page,
    createInitialValue: () => ({ email: "", role: "BUILDER" }),
    createRecord: async (localValue) => {
      const payload = await requestJson<{ user: ManagedUserWithPermissions }>("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withMutationMeta(localValue)),
      })

      return {
        redirectTo: buildRecordDetailHref("/dashboard/admin/users", payload.user.id, backHref),
      }
    },
  })

  return (
    <RecordSingleSectionPanel
      title="User Details"
      controller={controller}
      showHeader={false}
      saveLabel="Create User"
      savingLabel="Creating User..."
      footer={{ onClose: page.closePage }}
    >
      <RecordPrimarySection>
        <RecordPrimaryPane variant="main">
          <RecordPrimaryFieldsGrid>
            <RecordPrimaryFieldCell size="md">
              <RecordFormField label="Email">
                <input
                  type="email"
                  value={controller.primarySection.localValue.email}
                  onChange={(e) =>
                    controller.primarySection.setLocalValue((previous) => ({
                      ...previous,
                      email: e.target.value,
                    }))
                  }
                  disabled={controller.primarySection.isSaving}
                  placeholder="user@example.com"
                  className={RECORD_FIELD_CONTROL_CLASS_NAME}
                />
              </RecordFormField>
            </RecordPrimaryFieldCell>

            <RecordPrimaryFieldCell size="sm">
              <RecordFormField label="Role">
                <select
                  value={controller.primarySection.localValue.role}
                  onChange={(e) =>
                    controller.primarySection.setLocalValue((previous) => ({
                      ...previous,
                      role: e.target.value,
                    }))
                  }
                  disabled={controller.primarySection.isSaving}
                  className={RECORD_FIELD_CONTROL_CLASS_NAME}
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </RecordFormField>
            </RecordPrimaryFieldCell>
          </RecordPrimaryFieldsGrid>
        </RecordPrimaryPane>
      </RecordPrimarySection>
    </RecordSingleSectionPanel>
  )
}

export function AdminUserCreateClient({
  backHref,
}: {
  backHref: string
}) {
  return (
    <RecordCreateClientScaffold
      title="New User"
      backHref={backHref}
      dirtyMessage="You have unsaved user changes. Leave this form without saving?"
    >
      {(page) => (
        <AdminUserCreatePanel page={page} backHref={backHref} />
      )}
    </RecordCreateClientScaffold>
  )
}
