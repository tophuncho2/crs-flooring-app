"use client"

import { useState } from "react"
import type { CertificateFileRecord } from "@builders/domain"
import { getClientErrorMessage } from "@/transport/client-errors"
import {
  deleteCertificateFileRequest,
  fetchCertificateFileDownloadUrl,
  uploadCertificateFileRequest,
} from "@/modules/certificates/data/mutations"

/**
 * The certificate Files section — an immediate per-row-sync collection (each
 * upload/delete persists on its own request; no batch Save/Discard). Owns its
 * own local list, seeded from the detail load, and reconciles in place from each
 * mutation response — independent of the primary section so a primary save never
 * clobbers it. Re-seeds when the record id changes (render-time reset).
 */
export function useCertificateFilesSection({
  certificateId,
  initialFiles,
}: {
  certificateId: string
  initialFiles: CertificateFileRecord[]
}) {
  const [files, setFiles] = useState<CertificateFileRecord[]>(initialFiles)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null)

  const [seenCertificateId, setSeenCertificateId] = useState(certificateId)
  if (seenCertificateId !== certificateId) {
    setSeenCertificateId(certificateId)
    setFiles(initialFiles)
    setError(null)
    setNoticeMessage(null)
  }

  async function uploadFile(file: File) {
    setIsBusy(true)
    setError(null)
    setNoticeMessage(null)
    try {
      const { file: created } = await uploadCertificateFileRequest(certificateId, file)
      setFiles((previous) => [...previous, created])
      setNoticeMessage("File uploaded")
    } catch (caught) {
      setError(getClientErrorMessage(caught, "Upload failed"))
    } finally {
      setIsBusy(false)
    }
  }

  async function deleteFile(fileId: string) {
    setIsBusy(true)
    setError(null)
    setNoticeMessage(null)
    try {
      await deleteCertificateFileRequest(certificateId, fileId)
      setFiles((previous) => previous.filter((row) => row.id !== fileId))
      setNoticeMessage("File deleted")
    } catch (caught) {
      setError(getClientErrorMessage(caught, "Delete failed"))
    } finally {
      setIsBusy(false)
    }
  }

  async function downloadFile(fileId: string) {
    setError(null)
    try {
      const { url } = await fetchCertificateFileDownloadUrl(certificateId, fileId)
      if (typeof window !== "undefined") {
        window.open(url, "_blank", "noopener,noreferrer")
      }
    } catch (caught) {
      setError(getClientErrorMessage(caught, "Could not open file"))
    }
  }

  return { files, isBusy, error, noticeMessage, uploadFile, deleteFile, downloadFile }
}
