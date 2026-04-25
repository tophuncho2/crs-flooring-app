// Optional feature flags every dropdown primitive can opt into. Reserved for
// the next sweep; current implementations honour `searchable` (basic substring
// filter) and `allowClear` (renders a "— Clear —" sentinel that emits null).
// `multi` is reserved.

export type DropdownFeatures = {
  searchable?: boolean
  allowClear?: boolean
  multi?: boolean
}
