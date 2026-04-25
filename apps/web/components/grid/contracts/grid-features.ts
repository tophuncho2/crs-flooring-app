// GridFeatures is the opt-in feature flag bag. The Grid component reads which
// keys are present and exposes their controls through its header slot — but
// does not import any feature itself. Consumers compose feature controls
// alongside the grid and pass the contract bags through here so the Grid can
// render in a feature-aware way (e.g. group rows when `group` is present).
//
// Each feature contract is defined in its own bucket under `features/`.

import type { SearchContract } from "../../features/search/contracts/search-contract"
import type { SortContract } from "../../features/sort/contracts/sort-contract"
import type { GroupContract } from "../../features/group/contracts/group-contract"
import type { PaginateContract } from "../../features/paginate/contracts/paginate-contract"

export type GridFeatures = {
  search?: SearchContract
  sort?: SortContract
  group?: GroupContract
  paginate?: PaginateContract
}
