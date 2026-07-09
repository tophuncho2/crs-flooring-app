"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  buildCurrentRecordEntryPath,
  buildRecordCreateHref,
  buildRecordDetailHref,
} from "@/hooks/navigation/routes"

/**
 * Shared entity-picker navigation for the certificate record flows (detail +
 * create). Both surfaces expose the same two affordances on the Entity cell — open
 * the linked entity's record view (↗) and start a new entity (+) — so the routing
 * lives here once rather than duplicated per flow. `returnTo` is the current
 * record-entry path so "back" lands on the certificate the user came from.
 */
export function useCertificateEntityNav() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const openEntity = (entityId: string | null) => {
    if (!entityId) return
    router.push(
      buildRecordDetailHref(
        "/dashboard/entities",
        entityId,
        buildCurrentRecordEntryPath(pathname, searchParams),
      ),
    )
  }

  const createEntity = () =>
    router.push(
      buildRecordCreateHref("/dashboard/entities", {
        returnTo: buildCurrentRecordEntryPath(pathname, searchParams),
      }),
    )

  return { openEntity, createEntity }
}
