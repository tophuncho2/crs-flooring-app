// Work order deletion is never blocked at the domain level.
// Schema cascade handles cleanup of items + cut logs; no upstream rows are touched.
export function isWorkOrderDeleteBlocked(): false {
  return false
}
