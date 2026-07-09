"use client"

import { useRef } from "react"
import { RecordItemSection } from "@/engines/record-view"
import { RecordDeleteButton } from "@/engines/common"
import type { useCertificateFilesSection } from "@/modules/certificates/controllers/record/files/use-certificate-files-section"

type FilesController = ReturnType<typeof useCertificateFilesSection>

const ACCEPTED_FILE_TYPES = "application/pdf,image/png,image/jpeg,image/webp"

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * The certificate Files section — an immediate per-row list (no batch save). Add
 * triggers a hidden file input; each row downloads (presigned GET, new tab) or
 * deletes on its own request. `accept` is UX only; the server is the real gate.
 */
export function CertificateFilesSection({ section }: { section: FilesController }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const count = section.files.length

  return (
    <RecordItemSection
      title="Files"
      capabilities={{ editable: true, supportsSaveDiscard: false, supportsAddRow: true }}
      noticeMessage={section.noticeMessage ?? undefined}
      noticeError={section.error ?? undefined}
      isEmpty={count === 0}
      emptyState={
        <div className="rounded-xl border border-[rgba(58,58,58,0.72)] px-4 py-8 text-center text-sm text-[var(--foreground)]/60">
          No files attached yet.
        </div>
      }
      subHeader={{
        // No batch save — files persist per-row on upload/delete.
        isDirty: false,
        isSaving: false,
        hasConflict: false,
        statusLeading: (
          <span className="inline-flex items-center rounded-xl border border-[rgba(58,58,58,0.72)] bg-[var(--panel-hover)] px-3 py-2 text-sm text-[var(--foreground)]/75">
            {count} file{count === 1 ? "" : "s"}
          </span>
        ),
        actions: [
          {
            key: "add-file",
            label: section.isBusy ? "Uploading..." : "+ Add File",
            kind: "add-row",
            onClick: () => inputRef.current?.click(),
            disabled: section.isBusy,
          },
        ],
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void section.uploadFile(file)
          // Reset so re-selecting the same file fires change again.
          event.target.value = ""
        }}
      />
      {count > 0 ? (
        <ul className="divide-y divide-[rgba(58,58,58,0.5)] rounded-xl border border-[rgba(58,58,58,0.72)]">
          {section.files.map((file) => (
            <li key={file.id} className="flex items-center gap-3 px-4 py-3">
              <button
                type="button"
                onClick={() => void section.downloadFile(file.id)}
                className="flex-1 truncate text-left text-sm text-[var(--foreground)] underline-offset-2 hover:underline"
                title={file.fileName}
              >
                {file.fileName}
              </button>
              <span className="shrink-0 text-xs text-[var(--foreground)]/50">
                {formatBytes(file.sizeBytes)}
              </span>
              <RecordDeleteButton
                onClick={() => void section.deleteFile(file.id)}
                disabled={section.isBusy}
                ariaLabel={`Delete ${file.fileName}`}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </RecordItemSection>
  )
}
