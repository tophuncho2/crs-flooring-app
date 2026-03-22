import type { ToolSlug } from "@/server/platform/tool-subscriptions"
import { TEMPLATES_TOOL_SLUG, WORK_ORDERS_TOOL_SLUG } from "@/features/flooring/shared/access/domain-tools"

export type FlooringHotkeyDefinition = {
  id: string
  key: string
  combination: string
  action: string
  code: string
  path?: string
  requiredTool?: ToolSlug
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
    requiredTool: "products",
  },
  {
    id: "e6e89ab5-4bb4-4ad4-9f57-3b65fce00013",
    key: "Categories",
    combination: "SHIFT + Q",
    action: "Open Categories",
    code: "KeyQ",
    path: "/dashboard/flooring/categories",
    requiredTool: "products",
  },
  {
    id: "e6e89ab5-4bb4-4ad4-9f57-3b65fce00002",
    key: "Unit Of Measures",
    combination: "SHIFT + W",
    action: "Open Unit Of Measures",
    code: "KeyW",
    path: "/dashboard/flooring/unit-of-measures",
    requiredTool: "products",
  },
  {
    id: "e6e89ab5-4bb4-4ad4-9f57-3b65fce00003",
    key: "Inventory",
    combination: "SHIFT + I",
    action: "Open Inventory",
    code: "KeyI",
    path: "/dashboard/flooring/inventory",
    requiredTool: TEMPLATES_TOOL_SLUG,
  },
  {
    id: "e6e89ab5-4bb4-4ad4-9f57-3b65fce00012",
    key: "Calendar",
    combination: "SHIFT + C",
    action: "Open Calendar",
    code: "KeyC",
    path: "/dashboard/flooring/calendar",
    requiredTool: WORK_ORDERS_TOOL_SLUG,
  },
  {
    id: "e6e89ab5-4bb4-4ad4-9f57-3b65fce00004",
    key: "Management Companies",
    combination: "SHIFT + M",
    action: "Open Management Companies",
    code: "KeyM",
    path: "/dashboard/flooring/management-companies",
    requiredTool: "warehouse",
  },
  {
    id: "e6e89ab5-4bb4-4ad4-9f57-3b65fce00005",
    key: "Templates",
    combination: "SHIFT + T",
    action: "Open Templates",
    code: "KeyT",
    path: "/dashboard/flooring/templates",
    requiredTool: "warehouse",
  },
  {
    id: "e6e89ab5-4bb4-4ad4-9f57-3b65fce00006",
    key: "Services",
    combination: "SHIFT + S",
    action: "Open Services",
    code: "KeyS",
    path: "/dashboard/flooring/services",
    requiredTool: "warehouse",
  },
  {
    id: "e6e89ab5-4bb4-4ad4-9f57-3b65fce00014",
    key: "Work Orders",
    combination: "SHIFT + D",
    action: "Open Work Orders",
    code: "KeyD",
    path: "/dashboard/flooring/work-orders",
    requiredTool: "warehouse",
  },
  {
    id: "e6e89ab5-4bb4-4ad4-9f57-3b65fce00007",
    key: "Properties",
    combination: "SHIFT + R",
    action: "Open Properties",
    code: "KeyR",
    path: "/dashboard/flooring/properties",
    requiredTool: "warehouse",
  },
  {
    id: "e6e89ab5-4bb4-4ad4-9f57-3b65fce00008",
    key: "Manufacturers",
    combination: "SHIFT + V",
    action: "Open Manufacturers",
    code: "KeyV",
    path: "/dashboard/flooring/manufacturers",
    requiredTool: "products",
  },
  {
    id: "e6e89ab5-4bb4-4ad4-9f57-3b65fce00009",
    key: "Imports",
    combination: "SHIFT + O",
    action: "Open Imports",
    code: "KeyO",
    path: "/dashboard/flooring/imports",
    requiredTool: "warehouse",
  },
  {
    id: "e6e89ab5-4bb4-4ad4-9f57-3b65fce00010",
    key: "Cut Logs",
    combination: "SHIFT + U",
    action: "Open Cut Logs",
    code: "KeyU",
    path: "/dashboard/flooring/cut-logs",
    requiredTool: "warehouse",
  },
  {
    id: "e6e89ab5-4bb4-4ad4-9f57-3b65fce00011",
    key: "Theme",
    combination: "SHIFT + /",
    action: "Toggle Theme",
    code: "Slash",
    toggleTheme: true,
  },
]
