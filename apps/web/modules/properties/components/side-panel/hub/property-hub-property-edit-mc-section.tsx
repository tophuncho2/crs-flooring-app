"use client"

import { useQuery } from "@tanstack/react-query"
import type { ManagementCompanyDetail } from "@builders/domain"
import { CellAt } from "@/components/layout-grid"
import { FieldSection, FormField } from "@/components/fields"
import { TextCell } from "@/components/cells"
import { HubSidePanelPickerTrigger } from "@/components/hub-side-panel"
import {
  MANAGEMENT_COMPANY_DETAIL_QUERY_KEY,
  getManagementCompanyDetailRequest,
} from "@/modules/management-companies/data/management-company-detail-request"
import type { PropertyHubSidePanelController } from "@/modules/properties/controllers/property-hub-side-panel"

const SECTION_HEADER_CLASS =
  "text-xs font-semibold uppercase tracking-wide text-[var(--panel-foreground-muted,_var(--foreground))]/65"

/**
 * Management Company half of the property-edit body. Picker trigger to
 * re/un-link the property's MC, plus the linked MC's readonly fields
 * underneath (mirrors the legacy property side panel's behavior).
 *
 * The picker trigger opens the inline-in-body MC link picker via the
 * controller's `openPicker("mc-link")`; the picker writes back into the
 * property edit form through the controller's mc-link dispatch.
 */
export function PropertyHubPropertyEditMcSection({
  controller,
}: {
  controller: PropertyHubSidePanelController
}) {
  const { propertyEditForm, propertyEditMcLabel, isSaving, openPicker } = controller

  const linkedMcId =
    propertyEditForm.managementCompanyId.length > 0
      ? propertyEditForm.managementCompanyId
      : null

  const detailQuery = useQuery<ManagementCompanyDetail>({
    queryKey: [...MANAGEMENT_COMPANY_DETAIL_QUERY_KEY, linkedMcId],
    queryFn: () => getManagementCompanyDetailRequest(linkedMcId as string),
    enabled: linkedMcId !== null,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  })

  const detail = detailQuery.data
  const showLoading = linkedMcId !== null && detailQuery.isFetching && !detail
  const showError = linkedMcId !== null && detailQuery.isError && !detail
  const showDetail = linkedMcId !== null && detail !== undefined

  return (
    <section className="flex flex-col gap-2">
      <div className={SECTION_HEADER_CLASS}>Management Company</div>
      <FieldSection gap="0.75rem">
        <CellAt col={1} colSpan={8}>
          <FormField label="Linked Company">
            <HubSidePanelPickerTrigger
              expanded={false}
              onToggle={() => openPicker("mc-link")}
              selectedLabel={propertyEditMcLabel}
              placeholder="No management company"
              disabled={isSaving}
              ariaLabel="Link management company"
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
                  value={detail?.streetAddress ?? ""}
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
                  value={detail?.city ?? ""}
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
                  value={detail?.state ?? ""}
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
                  value={detail?.zip ?? ""}
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
                  value={detail?.phone ?? ""}
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
                  value={detail?.email ?? ""}
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
