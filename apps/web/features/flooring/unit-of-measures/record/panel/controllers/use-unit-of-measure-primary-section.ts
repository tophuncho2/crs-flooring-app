"use client"

import { requestJson } from "@/features/flooring/shared/transport/http"
import { withMutationMeta } from "@/features/flooring/shared/transport/mutation"
import { useSingleSectionRecordController, type RecordDetailClientScaffoldContext } from "@/features/shared/engines/record-view"
import { deleteUnitOfMeasure } from "../../../data/mutations"
import { toUnitOfMeasureForm, type UnitOfMeasureForm, type UnitOfMeasureRow } from "../../../domain/types"

export function useUnitOfMeasurePrimarySection({
  page,
  unitOfMeasure,
}: {
  page: RecordDetailClientScaffoldContext
  unitOfMeasure: UnitOfMeasureRow
}) {
  return useSingleSectionRecordController<UnitOfMeasureRow, UnitOfMeasureForm>({
    page,
    scope: "unit-of-measure",
    id: unitOfMeasure.id,
    initialRecord: unitOfMeasure,
    detailUrl: `/api/builder/unit-of-measures/${unitOfMeasure.id}`,
    payloadKey: "unitOfMeasure",
    createLocalValue: toUnitOfMeasureForm,
    saveSection: async ({ localValue, record, revisionKey }) => {
      const payload = await requestJson<{ unitOfMeasure: UnitOfMeasureRow }>(
        `/api/builder/unit-of-measures/${record.id}/primary/section`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(withMutationMeta(localValue, revisionKey)),
        },
      )

      return {
        serverValue: payload.unitOfMeasure,
        noticeMessage: "Unit of measure saved",
      }
    },
    deleteRecord: async (record) => {
      await deleteUnitOfMeasure(record.id, record.updatedAt)
    },
    deleteErrorMessage: "Failed to delete unit of measure",
  })
}
