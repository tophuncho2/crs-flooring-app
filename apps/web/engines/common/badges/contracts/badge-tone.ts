// Badge tones share the cell tone vocabulary. Re-export so consumers that
// import from `badges/contracts` don't have to reach into `cells/contracts`
// just for the type name.

export type { CellTone as BadgeTone } from "../../cells/contracts/cell-tone"
export { CELL_TONE_VALUES as BADGE_TONE_VALUES } from "../../cells/contracts/cell-tone"
