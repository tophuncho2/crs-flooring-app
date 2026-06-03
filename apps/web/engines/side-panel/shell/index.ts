// The engine's view surface. Re-exports the shared hub-side-panel primitives
// (which physically still live under @/components/hub-side-panel for now) plus
// engine-owned chrome, so consumers import the whole panel toolkit from one
// place: `@/engines/side-panel`.
export * from "@/components/hub-side-panel"
export {
  SidePanelRefreshButton,
  type SidePanelRefreshButtonProps,
} from "./side-panel-refresh-button"
