export type GroupedRowTree<T> = {
  depth: number
  key: string
  fieldKey: string
  fieldLabel: string
  label: string
  rows: T[]
  children: GroupedRowTree<T>[]
}
