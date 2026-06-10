"use client"

import { useState } from "react"

/**
 * Owns the delete-confirmation lifecycle shared by record views: the dialog's
 * open flag, an in-flight `isDeleting` guard, and the async confirm that runs
 * the caller's `deleteRecord` then closes on settle. Cancel is a no-op while a
 * delete is in flight. Pairs with `RecordDeleteDialog`, which renders the
 * prompt from this state.
 */
export function useRecordDeleteConfirmation(deleteRecord: () => Promise<unknown>) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function confirmDelete() {
    if (isDeleting) return
    setIsDeleting(true)
    try {
      await deleteRecord()
    } finally {
      setIsDeleting(false)
      setIsOpen(false)
    }
  }

  return {
    isOpen,
    isDeleting,
    requestDelete: () => setIsOpen(true),
    cancelDelete: () => {
      if (!isDeleting) setIsOpen(false)
    },
    confirmDelete,
  }
}
