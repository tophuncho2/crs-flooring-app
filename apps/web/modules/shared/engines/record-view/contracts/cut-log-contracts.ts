export type EditableCutLog = {
  id: string
  before: string
  cut: string
  after: string
  notes: string
  createdAt: string
}

export type CutLogDraft = {
  quantityTaken: string
  notes: string
}
