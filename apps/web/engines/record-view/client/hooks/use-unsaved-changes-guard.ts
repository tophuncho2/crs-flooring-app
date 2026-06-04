"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

const DEFAULT_UNSAVED_CHANGES_MESSAGE = "You have unsaved changes. Leave this record without saving?"

/**
 * Shape consumed by the `<ConfirmDialog>` that the record-view scaffold
 * mounts. Title + button labels are owned by the scaffold (uniform
 * across modules); body comes from the per-scaffold `dirtyMessage`.
 */
export type UnsavedChangesDialogProps = {
  open: boolean
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export function useUnsavedChangesGuard({
  isDirty,
  message = DEFAULT_UNSAVED_CHANGES_MESSAGE,
}: {
  isDirty: boolean
  message?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentUrlRef = useRef(pathname)
  const restoringRef = useRef(false)
  const pendingActionRef = useRef<(() => void) | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    const query = searchParams.toString()
    currentUrlRef.current = query ? `${pathname}?${query}` : pathname
  }, [pathname, searchParams])

  const openDialog = useCallback((action: () => void) => {
    pendingActionRef.current = action
    setDialogOpen(true)
  }, [])

  const closeDialog = useCallback(() => {
    pendingActionRef.current = null
    setDialogOpen(false)
  }, [])

  const confirmNavigation = useCallback(
    (onProceed: () => void) => {
      if (!isDirty) {
        onProceed()
        return
      }
      openDialog(onProceed)
    },
    [isDirty, openDialog],
  )

  // Tab close / page refresh. Browsers ignore custom UI here; the
  // native prompt is the only option, so this stays as-is.
  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!isDirty) {
        return
      }

      event.preventDefault()
      event.returnValue = message
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [isDirty, message])

  // Browser back / forward. `popstate` fires after the browser has
  // already navigated, so we revert first (restore the dirty URL),
  // then open the dialog. On confirm we redo the back via
  // `router.back()`; on cancel we've already restored and there's
  // nothing more to do.
  useEffect(() => {
    function handlePopState() {
      if (restoringRef.current) {
        restoringRef.current = false
        return
      }

      if (!isDirty) {
        return
      }

      restoringRef.current = true
      router.replace(currentUrlRef.current, { scroll: false })
      openDialog(() => router.back())
    }

    window.addEventListener("popstate", handlePopState)
    return () => {
      window.removeEventListener("popstate", handlePopState)
    }
  }, [isDirty, openDialog, router])

  const handleConfirm = useCallback(() => {
    const action = pendingActionRef.current
    pendingActionRef.current = null
    setDialogOpen(false)
    action?.()
  }, [])

  const dialogProps: UnsavedChangesDialogProps = {
    open: dialogOpen,
    message,
    onConfirm: handleConfirm,
    onCancel: closeDialog,
  }

  return {
    confirmNavigation,
    isDirty,
    message,
    dialogProps,
  }
}
