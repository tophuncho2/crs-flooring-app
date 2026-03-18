export type FlooringHotkeyDefinition = {
  id: string
  key: string
  combination: string
  action: string
  code: string
  path?: string
  toggleTheme?: boolean
}

export const FLOORING_HOTKEYS: FlooringHotkeyDefinition[] = [
  {
    id: "e6e89ab5-4bb4-4ad4-9f57-3b65fce00001",
    key: "Products",
    combination: "SHIFT + P",
    action: "Open Products",
    code: "KeyP",
    path: "/dashboard/flooring/products",
  },
  {
    id: "e6e89ab5-4bb4-4ad4-9f57-3b65fce00002",
    key: "Work Orders",
    combination: "SHIFT + W",
    action: "Open Work Orders",
    code: "KeyW",
    path: "/dashboard/flooring/work-orders",
  },
  {
    id: "e6e89ab5-4bb4-4ad4-9f57-3b65fce00003",
    key: "Inventory",
    combination: "SHIFT + I",
    action: "Open Inventory",
    code: "KeyI",
    path: "/dashboard/flooring/inventory",
  },
  {
    id: "e6e89ab5-4bb4-4ad4-9f57-3b65fce00012",
    key: "Calendar",
    combination: "SHIFT + C",
    action: "Open Calendar",
    code: "KeyC",
    path: "/dashboard/flooring/calendar",
  },
  {
    id: "e6e89ab5-4bb4-4ad4-9f57-3b65fce00004",
    key: "Management Companies",
    combination: "SHIFT + M",
    action: "Open Management Companies",
    code: "KeyM",
    path: "/dashboard/flooring/management-companies",
  },
  {
    id: "e6e89ab5-4bb4-4ad4-9f57-3b65fce00005",
    key: "Templates",
    combination: "SHIFT + T",
    action: "Open Templates",
    code: "KeyT",
    path: "/dashboard/flooring/templates",
  },
  {
    id: "e6e89ab5-4bb4-4ad4-9f57-3b65fce00006",
    key: "Warehouse",
    combination: "SHIFT + S",
    action: "Open Warehouse",
    code: "KeyS",
    path: "/dashboard/flooring/warehouse",
  },
  {
    id: "e6e89ab5-4bb4-4ad4-9f57-3b65fce00007",
    key: "Properties",
    combination: "SHIFT + R",
    action: "Open Properties",
    code: "KeyR",
    path: "/dashboard/flooring/properties",
  },
  {
    id: "e6e89ab5-4bb4-4ad4-9f57-3b65fce00008",
    key: "Manufacturers",
    combination: "SHIFT + V",
    action: "Open Manufacturers",
    code: "KeyV",
    path: "/dashboard/flooring/manufacturers",
  },
  {
    id: "e6e89ab5-4bb4-4ad4-9f57-3b65fce00009",
    key: "Imports",
    combination: "SHIFT + O",
    action: "Open Imports",
    code: "KeyO",
    path: "/dashboard/flooring/imports",
  },
  {
    id: "e6e89ab5-4bb4-4ad4-9f57-3b65fce00010",
    key: "Cut Logs",
    combination: "SHIFT + U",
    action: "Open Cut Logs",
    code: "KeyU",
    path: "/dashboard/flooring/cut-logs",
  },
  {
    id: "e6e89ab5-4bb4-4ad4-9f57-3b65fce00011",
    key: "Theme",
    combination: "SHIFT + /",
    action: "Toggle Theme",
    code: "Slash",
    toggleTheme: true,
  },
  {
    id: "e6e89ab5-4bb4-4ad4-9f57-3b65fce00013",
    key: "Builder Panel",
    combination: "SHIFT + Q",
    action: "Open Builder Panel",
    code: "KeyQ",
    path: "/dashboard/builder",
  },
]
