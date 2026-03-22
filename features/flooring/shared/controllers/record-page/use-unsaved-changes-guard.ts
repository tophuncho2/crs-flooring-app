"use client"

import { useCallback, useEffect, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

const DEFAULT_UNSAVED_CHANGES_MESSAGE = "You have unsaved changes. Leave this record without saving?"

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

  useEffect(() => {
    const query = searchParams.toString()
    currentUrlRef.current = query ? `${pathname}?${query}` : pathname
  }, [pathname, searchParams])

  const confirmNavigation = useCallback(
    (onProceed?: () => void) => {
      if (isDirty && typeof window !== "undefined" && !window.confirm(message)) {
        return false
      }

      onProceed?.()
      return true
    },
    [isDirty, message],
  )

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

  useEffect(() => {
    function handlePopState() {
      if (restoringRef.current) {
        restoringRef.current = false
        return
      }

      if (!isDirty) {
        return
      }

      if (typeof window === "undefined") {
        return
      }

      const shouldLeave = window.confirm(message)
      if (shouldLeave) {
        return
      }

      restoringRef.current = true
      router.replace(currentUrlRef.current, { scroll: false })
    }

    window.addEventListener("popstate", handlePopState)
    return () => {
      window.removeEventListener("popstate", handlePopState)
    }
  }, [isDirty, message, router])

  return {
    confirmNavigation,
    isDirty,
    message,
  }
}
