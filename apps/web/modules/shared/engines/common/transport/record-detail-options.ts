import { loadSharedRecordOptionData, loadTemplateRecordOptionData } from "./record-detail-options-loader"

export async function loadSharedRecordDetailOptions() {
  return loadSharedRecordOptionData()
}

export async function loadTemplateRecordDetailOptions() {
  return loadTemplateRecordOptionData()
}
