// Controlled-component contract for grouping. `groupKeys` is the active set
// (in priority order); `allowedKeys` enumerates which column keys consumers
// declared as groupable. The group feature renders nested groups; the grid
// surfaces them through its body slot when the contract is present.

export type GroupContract = {
  groupKeys: ReadonlyArray<string>
  allowedKeys: ReadonlyArray<string>
  onChange: (groupKeys: ReadonlyArray<string>) => void
}
