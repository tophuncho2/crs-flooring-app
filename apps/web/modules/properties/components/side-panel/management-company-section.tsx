"use client"

import { CellAt } from "@/components/layout-grid"
import { FieldSection, FormField } from "@/components/fields"
import { TextCell } from "@/components/cells"
import { ManagementCompanyPicker } from "@/modules/management-companies/components/picker/management-company-picker"
import type { PropertySidePanelController } from "@/modules/properties/controllers/property-side-panel"

const SECTION_HEADER_CLASS =
  "text-xs font-semibold uppercase tracking-wide text-[var(--panel-foreground-muted)]"

export function PropertySidePanelManagementCompanySection({
  controller,
}: {
  controller: PropertySidePanelController
}) {
  const {
    form,
    isSaving,
    managementCompanyLabel,
    managementCompanyDetail,
    isLoadingManagementCompany,
    isManagementCompanyError,
    setManagementCompany,
  } = controller

  const editable = !isSaving
  const hasLink = form.managementCompanyId.length > 0

  const showLoading = hasLink && isLoadingManagementCompany && !managementCompanyDetail
  const showError = hasLink && isManagementCompanyError && !managementCompanyDetail
  const showDetail = hasLink && managementCompanyDetail !== null

  return (
    <section className="flex flex-col gap-2">
      <div className={SECTION_HEADER_CLASS}>Management Company</div>
      <FieldSection gap="0.75rem">
        <CellAt col={1} colSpan={8}>
          <FormField label="Linked Company">
            <ManagementCompanyPicker
              value={form.managementCompanyId || null}
              onChange={(id) => setManagementCompany(id, id === null ? null : managementCompanyLabel)}
              selectedLabel={managementCompanyLabel}
              disabled={!editable}
              placeholder="No management company"
              ariaLabel="Management company"
            />
          </FormField>
        </CellAt>

        {showError ? (
          <CellAt col={1} colSpan={8}>
            <div className="rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)]/40 p-3 text-xs text-[var(--foreground)]/55">
              Could not load management company.
            </div>
          </CellAt>
        ) : null}

        {showLoading || showDetail ? (
          <>
            <CellAt col={1} colSpan={8}>
              <FormField label="Street Address">
                <TextCell
                  editable={false}
                  value={managementCompanyDetail?.streetAddress ?? ""}
                  onChange={() => {}}
                  placeholder={showLoading ? "—" : ""}
                  ariaLabel="Management company street address"
                />
              </FormField>
            </CellAt>
            <CellAt col={1} colSpan={4}>
              <FormField label="City">
                <TextCell
                  editable={false}
                  value={managementCompanyDetail?.city ?? ""}
                  onChange={() => {}}
                  placeholder={showLoading ? "—" : ""}
                  ariaLabel="Management company city"
                />
              </FormField>
            </CellAt>
            <CellAt col={5} colSpan={2}>
              <FormField label="State">
                <TextCell
                  editable={false}
                  value={managementCompanyDetail?.state ?? ""}
                  onChange={() => {}}
                  placeholder={showLoading ? "—" : ""}
                  ariaLabel="Management company state"
                />
              </FormField>
            </CellAt>
            <CellAt col={7} colSpan={2}>
              <FormField label="Zip">
                <TextCell
                  editable={false}
                  value={managementCompanyDetail?.zip ?? ""}
                  onChange={() => {}}
                  placeholder={showLoading ? "—" : ""}
                  ariaLabel="Management company zip"
                />
              </FormField>
            </CellAt>
            <CellAt col={1} colSpan={4}>
              <FormField label="Phone">
                <TextCell
                  editable={false}
                  value={managementCompanyDetail?.phone ?? ""}
                  onChange={() => {}}
                  placeholder={showLoading ? "—" : ""}
                  ariaLabel="Management company phone"
                />
              </FormField>
            </CellAt>
            <CellAt col={5} colSpan={4}>
              <FormField label="Email">
                <TextCell
                  editable={false}
                  value={managementCompanyDetail?.email ?? ""}
                  onChange={() => {}}
                  placeholder={showLoading ? "—" : ""}
                  ariaLabel="Management company email"
                />
              </FormField>
            </CellAt>
          </>
        ) : null}
      </FieldSection>
    </section>
  )
}
