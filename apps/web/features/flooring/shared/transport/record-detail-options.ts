import { loadSharedRecordOptionData, loadTemplateRecordOptionData } from "@/features/flooring/shared/data/record-detail-options"

export async function loadSharedRecordDetailOptions() {
  return loadSharedRecordOptionData()
}

export async function loadTemplateRecordDetailOptions() {
  return loadTemplateRecordOptionData()
}
