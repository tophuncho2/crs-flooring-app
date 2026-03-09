"use client"

import type { ReactNode } from "react"
import { useMemo, useState } from "react"
import { Plus, Trash2, X } from "lucide-react"

type JobInfo = {
  propertyAddress: string
  propertyContact: string
  unitNumber: string
  jobName: string
  jobAddress: string
  notes: string
}

type InvoiceRow = {
  description: string
  price: number
}

type SavedInvoiceItem = {
  description: string
  price: string
}

type SavedInvoice = {
  id: string
  propertyAddress: string
  propertyContact: string
  unitNumber: string
  jobName: string
  jobAddress: string
  notes: string | null
  totalCost: string
  createdAt: string
  customerFileName: string | null
  customerFileAt: string | null
  items: SavedInvoiceItem[]
}

const defaultJobInfo: JobInfo = {
  propertyAddress: "",
  propertyContact: "",
  unitNumber: "",
  jobName: "",
  jobAddress: "",
  notes: "",
}

const defaultRow: InvoiceRow = {
  description: "",
  price: 0,
}

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-6xl rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[var(--foreground)]/70 transition hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)]"
            type="button"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function InvoicesClient() {
  const [jobInfo, setJobInfo] = useState<JobInfo>(defaultJobInfo)
  const [rows, setRows] = useState<InvoiceRow[]>([defaultRow])
  const [totalCost, setTotalCost] = useState<string>("")
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null)
  const [activeInvoiceFileName, setActiveInvoiceFileName] = useState<string | null>(null)
  const [savedInvoices, setSavedInvoices] = useState<SavedInvoice[]>([])
  const [isSavedModalOpen, setIsSavedModalOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isDownloadingFile, setIsDownloadingFile] = useState(false)

  const computedTotal = useMemo(() => rows.reduce((sum, row) => sum + (Number.isFinite(row.price) ? row.price : 0), 0), [rows])
  const resolvedTotal = (() => {
    const parsed = Number(totalCost)
    if (Number.isFinite(parsed)) {
      return parsed
    }
    return computedTotal
  })()

  function updateJobInfo(field: keyof JobInfo, value: string) {
    setJobInfo((prev) => ({ ...prev, [field]: value }))
  }

  function updateRow(index: number, next: Partial<InvoiceRow>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...next } : row)))
  }

  function handlePriceChange(index: number, value: string) {
    const parsed = Number(value)
    if (Number.isNaN(parsed)) {
      updateRow(index, { price: 0 })
      return
    }
    updateRow(index, { price: parsed })
  }

  function addRow() {
    setRows((prev) => [...prev, { ...defaultRow }])
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  async function loadSavedInvoices() {
    setError("")

    try {
      const response = await fetch("/api/invoices", { cache: "no-store" })
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        invoices?: Array<{
          id: string
          propertyAddress: string
          propertyContact: string
          unitNumber: string
          jobName: string
          jobAddress: string
          notes: string | null
          totalCost: string | number
          createdAt: string
          customerFileName: string | null
          customerFileAt: string | null
          items: Array<{
            description: string
            price: string | number
          }>
        }>
      }

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load saved invoices")
      }

      const mapped: SavedInvoice[] = (payload.invoices ?? []).map((invoice) => ({
        id: invoice.id,
        propertyAddress: invoice.propertyAddress,
        propertyContact: invoice.propertyContact,
        unitNumber: invoice.unitNumber,
        jobName: invoice.jobName,
        jobAddress: invoice.jobAddress,
        notes: invoice.notes,
        totalCost: String(invoice.totalCost ?? "0"),
        createdAt: invoice.createdAt,
        customerFileName: invoice.customerFileName,
        customerFileAt: invoice.customerFileAt,
        items: invoice.items.map((item) => ({
          description: item.description,
          price: String(item.price),
        })),
      }))

      setSavedInvoices(mapped)
      setIsSavedModalOpen(true)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load saved invoices")
    }
  }

  function openSavedInvoice(invoice: SavedInvoice) {
    setJobInfo({
      propertyAddress: invoice.propertyAddress,
      propertyContact: invoice.propertyContact,
      unitNumber: invoice.unitNumber,
      jobName: invoice.jobName,
      jobAddress: invoice.jobAddress,
      notes: invoice.notes ?? "",
    })
    setRows(
      invoice.items.length > 0
        ? invoice.items.map((item) => ({
            description: item.description,
            price: Number.isFinite(Number(item.price)) ? Number(item.price) : 0,
          }))
        : [defaultRow],
    )
    setTotalCost(invoice.totalCost)
    setActiveInvoiceId(invoice.id)
    setActiveInvoiceFileName(invoice.customerFileName)
    setIsSavedModalOpen(false)
    setMessage("Saved invoice loaded")
    setError("")
  }

  async function downloadInvoiceFile(invoiceId: string, fileName?: string | null) {
    setIsDownloadingFile(true)
    setError("")

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/customer-file`, {
        method: "GET",
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error ?? "Failed to download customer invoice file")
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = fileName ?? `invoice-${invoiceId}-invoice.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Failed to download customer invoice file")
    } finally {
      setIsDownloadingFile(false)
    }
  }

  async function saveInvoice() {
    setIsSaving(true)
    setError("")
    setMessage("")

    try {
      const body = {
        ...jobInfo,
        totalCost: totalCost.trim() === "" ? resolvedTotal.toFixed(2) : totalCost,
        rows,
      }
      const endpoint = activeInvoiceId ? `/api/invoices/${activeInvoiceId}` : "/api/invoices"
      const method = activeInvoiceId ? "PATCH" : "POST"

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        invoice?: { id: string; customerFileName?: string | null }
      }

      if (!response.ok || !payload.invoice) {
        throw new Error(payload.error ?? "Failed to save invoice")
      }

      setActiveInvoiceId(payload.invoice.id)
      setActiveInvoiceFileName(payload.invoice.customerFileName ?? null)
      setMessage(activeInvoiceId ? "Invoice updated" : "Invoice saved")
      await downloadInvoiceFile(payload.invoice.id, payload.invoice.customerFileName)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save invoice")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-1 pb-28 pt-20 text-[var(--foreground)] sm:px-2 sm:pt-24 lg:px-3">
      <div className="w-full space-y-6">
        <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold text-blue-500">Invoices</h1>
              <p className="mt-1 text-sm text-[var(--foreground)]/70">Create and save customer invoices with downloadable PDFs.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {activeInvoiceId && activeInvoiceFileName && (
                <button
                  type="button"
                  onClick={() => void downloadInvoiceFile(activeInvoiceId, activeInvoiceFileName)}
                  className="rounded-lg border border-blue-500/40 px-3 py-2 text-sm text-blue-500 transition hover:bg-blue-500/10 disabled:opacity-60"
                  disabled={isDownloadingFile}
                >
                  {isDownloadingFile ? "Downloading..." : "Download Invoice PDF"}
                </button>
              )}
              <button
                type="button"
                onClick={() => void loadSavedInvoices()}
                className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm transition hover:bg-[var(--panel-hover)]"
              >
                View Saved Invoices
              </button>
            </div>
          </div>

          {message && (
            <p className="mt-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
              {message}
            </p>
          )}
          {error && (
            <p className="mt-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">
              {error}
            </p>
          )}

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Property Address">
              <input
                value={jobInfo.propertyAddress}
                onChange={(event) => updateJobInfo("propertyAddress", event.target.value)}
                className="w-full rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-3 text-base"
              />
            </Field>
            <Field label="Property Contact">
              <input
                value={jobInfo.propertyContact}
                onChange={(event) => updateJobInfo("propertyContact", event.target.value)}
                className="w-full rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-3 text-base"
              />
            </Field>
            <Field label="Unit Number">
              <input
                value={jobInfo.unitNumber}
                onChange={(event) => updateJobInfo("unitNumber", event.target.value)}
                className="w-full rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-3 text-base"
              />
            </Field>
            <Field label="Job Name">
              <input
                value={jobInfo.jobName}
                onChange={(event) => updateJobInfo("jobName", event.target.value)}
                className="w-full rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-3 text-base"
              />
            </Field>
            <Field label="Job Address">
              <input
                value={jobInfo.jobAddress}
                onChange={(event) => updateJobInfo("jobAddress", event.target.value)}
                className="w-full rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-3 text-base"
              />
            </Field>
            <Field label="Notes">
              <textarea
                value={jobInfo.notes}
                onChange={(event) => updateJobInfo("notes", event.target.value)}
                className="min-h-24 w-full rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-3 text-base md:col-span-2"
              />
            </Field>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Labor Line Items</h2>
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-black transition hover:bg-blue-400"
            >
              <Plus size={14} /> Add Line
            </button>
          </div>

          <div className="hidden md:block overflow-hidden rounded-lg border border-[var(--panel-border)]">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--panel-hover)]/60 text-left">
                <tr>
                  <th className="px-3 py-2">Labor Item</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Remove</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`invoice-row-${index}`} className="border-t border-[var(--panel-border)]">
                    <td className="px-3 py-2">
                      <input
                        value={row.description}
                        onChange={(event) => updateRow(index, { description: event.target.value })}
                        className="w-full rounded-md border border-[var(--panel-border)] bg-transparent px-2 py-2"
                        placeholder="Labor description"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={Number.isFinite(row.price) ? row.price : 0}
                        onChange={(event) => handlePriceChange(index, event.target.value)}
                        className="w-full rounded-md border border-[var(--panel-border)] bg-transparent px-2 py-2"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        className="rounded-md p-2 text-rose-600 transition hover:bg-rose-500/10"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-4 md:hidden">
            {rows.map((row, index) => (
              <div key={`invoice-mobile-row-${index}`} className="space-y-3 rounded-lg border border-[var(--panel-border)] p-3">
                <Field label="Labor Item">
                  <input
                    value={row.description}
                    onChange={(event) => updateRow(index, { description: event.target.value })}
                    className="w-full rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-3 text-base"
                    placeholder="Labor description"
                  />
                </Field>
                <Field label="Price">
                  <input
                    type="number"
                    step="0.01"
                    value={Number.isFinite(row.price) ? row.price : 0}
                    onChange={(event) => handlePriceChange(index, event.target.value)}
                    className="w-full rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-3 text-base"
                  />
                </Field>
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="inline-flex items-center gap-2 rounded-lg border border-rose-500/40 px-3 py-2 text-sm text-rose-600"
                >
                  <Trash2 size={14} /> Remove Line
                </button>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-hover)]/30 p-3">
            <div className="flex flex-wrap items-end justify-end gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-[var(--foreground)]/80">Line Total</span>
                <input
                  readOnly
                  value={formatCurrency(computedTotal)}
                  className="w-40 rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-2 text-right"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-[var(--foreground)]/80">Total Cost</span>
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={totalCost}
                  onChange={(event) => setTotalCost(event.target.value)}
                  className="w-44 rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-2 text-right font-semibold"
                  placeholder={computedTotal.toFixed(2)}
                />
              </label>
            </div>
          </div>
        </section>
      </div>

      {isSavedModalOpen && (
        <ModalShell title="Saved Invoices" onClose={() => setIsSavedModalOpen(false)}>
          <div className="max-h-[65vh] overflow-auto rounded-lg border border-[var(--panel-border)]">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--panel-hover)] text-left">
                <tr>
                  <th className="px-3 py-2">Job</th>
                  <th className="px-3 py-2">Property</th>
                  <th className="px-3 py-2">Lines</th>
                  <th className="px-3 py-2">Total</th>
                  <th className="px-3 py-2">File</th>
                  <th className="px-3 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {savedInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    onClick={() => openSavedInvoice(invoice)}
                    className="cursor-pointer border-t border-[var(--panel-border)] transition hover:bg-[var(--panel-hover)]"
                  >
                    <td className="px-3 py-2">{invoice.jobName || "Untitled Job"}</td>
                    <td className="px-3 py-2">{invoice.propertyAddress || "-"}</td>
                    <td className="px-3 py-2">{invoice.items.length}</td>
                    <td className="px-3 py-2">{formatCurrency(Number(invoice.totalCost) || 0)}</td>
                    <td className="px-3 py-2">
                      {invoice.customerFileName ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            void downloadInvoiceFile(invoice.id, invoice.customerFileName)
                          }}
                          className="rounded-md border border-blue-500/40 px-2 py-1 text-xs text-blue-500 hover:bg-blue-500/10"
                        >
                          Download
                        </button>
                      ) : (
                        <span className="text-[var(--foreground)]/60">No file</span>
                      )}
                    </td>
                    <td className="px-3 py-2">{new Date(invoice.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
                {savedInvoices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-[var(--foreground)]/70">
                      No saved invoices.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </ModalShell>
      )}

      <div className="fixed bottom-0 left-0 right-0 border-t border-[var(--panel-border)] bg-[var(--panel-background)] p-3">
        <div className="w-full px-1 sm:px-2 lg:px-3">
          <button
            type="button"
            className="w-full rounded-lg bg-blue-500 px-4 py-3 text-base font-semibold text-black transition hover:bg-blue-400"
            onClick={() => void saveInvoice()}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : activeInvoiceId ? "Update and Generate Invoice" : "Save and Generate Invoice"}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-[var(--foreground)]/80">{label}</span>
      {children}
    </label>
  )
}
