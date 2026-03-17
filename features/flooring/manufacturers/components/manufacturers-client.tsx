"use client"

import { type ReactNode, useState } from "react"
import { Pencil, Plus, Trash2, X } from "lucide-react"
import { TableActionsSummary } from "../../shared/table-shell"

type ManufacturerRow = {
  id: string
  name: string
  companyName: string
  website: string
  phone: string
  email: string
  productsCount: number
  createdAt: string
  updatedAt: string
}

type ManufacturerForm = {
  name: string
  companyName: string
  website: string
  phone: string
  email: string
}

const emptyForm: ManufacturerForm = {
  name: "",
  companyName: "",
  website: "",
  phone: "",
  email: "",
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-black/50 p-4 pt-24 sm:p-6 sm:pt-28">
      <div className="flex min-h-full items-start justify-center">
        <div className="flex max-h-[calc(100vh-7rem)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] shadow-xl sm:max-h-[calc(100vh-8rem)]">
          <div className="flex items-center justify-between border-b border-[var(--panel-border)] px-5 py-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-[var(--foreground)]/70 transition hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)]"
            >
              <X size={18} />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
        </div>
      </div>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-[var(--foreground)]/80">{label}</span>
      {children}
    </label>
  )
}

export default function ManufacturersClient({ initialManufacturers }: { initialManufacturers: ManufacturerRow[] }) {
  const [manufacturers, setManufacturers] = useState(initialManufacturers)
  const [editingManufacturer, setEditingManufacturer] = useState<ManufacturerRow | null>(null)
  const [manufacturerForm, setManufacturerForm] = useState<ManufacturerForm>(emptyForm)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  function clearNotices() {
    setMessage("")
    setError("")
  }

  function openCreate() {
    clearNotices()
    setEditingManufacturer(null)
    setManufacturerForm(emptyForm)
    setIsModalOpen(true)
  }

  function openEdit(manufacturer: ManufacturerRow) {
    clearNotices()
    setEditingManufacturer(manufacturer)
    setManufacturerForm({
      name: manufacturer.name,
      companyName: manufacturer.companyName,
      website: manufacturer.website,
      phone: manufacturer.phone,
      email: manufacturer.email,
    })
    setIsModalOpen(true)
  }

  async function saveManufacturer() {
    clearNotices()
    setIsSaving(true)

    try {
      const response = await fetch(
        editingManufacturer ? `/api/flooring/manufacturers/${editingManufacturer.id}` : "/api/flooring/manufacturers",
        {
          method: editingManufacturer ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(manufacturerForm),
        },
      )

      const payload = (await response.json().catch(() => ({}))) as {
        manufacturer?: ManufacturerRow
        error?: string
      }

      if (!response.ok || !payload.manufacturer) {
        throw new Error(payload.error ?? "Failed to save manufacturer")
      }

      setManufacturers((prev) => {
        const next = editingManufacturer
          ? prev.map((manufacturer) => (manufacturer.id === payload.manufacturer!.id ? payload.manufacturer! : manufacturer))
          : [payload.manufacturer!, ...prev]
        return next.sort((a, b) => a.companyName.localeCompare(b.companyName))
      })
      setIsModalOpen(false)
      setMessage(editingManufacturer ? "Manufacturer updated" : "Manufacturer created")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save manufacturer")
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteManufacturer(manufacturer: ManufacturerRow) {
    if (!window.confirm(`Delete ${manufacturer.companyName || manufacturer.name || "this manufacturer"}?`)) return

    clearNotices()
    setDeletingId(manufacturer.id)

    try {
      const response = await fetch(`/api/flooring/manufacturers/${manufacturer.id}`, { method: "DELETE" })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete manufacturer")
      }

      setManufacturers((prev) => prev.filter((item) => item.id !== manufacturer.id))
      setMessage("Manufacturer deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete manufacturer")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-1 pb-12 pt-20 text-[var(--foreground)] sm:px-2 sm:pt-24 lg:px-3">
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-500">Manufacturers</h1>
            <p className="text-sm text-[var(--foreground)]/70">Manage manufacturer agents and their contact details for product linking.</p>
          </div>
          <TableActionsSummary count={manufacturers.length}>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-black hover:bg-blue-400"
            >
              <Plus size={16} />
              Manufacturer
            </button>
          </TableActionsSummary>
        </div>

        {message ? <p className="mt-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">{message}</p> : null}
        {error ? <p className="mt-4 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">{error}</p> : null}

        <section className="mt-6">
          <div className="overflow-x-auto rounded-lg border border-[var(--panel-border)]">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="bg-[var(--panel-hover)] text-left">
                <tr>
                  <th className="h-10 px-3 py-2">Company Name</th>
                  <th className="h-10 px-3 py-2">Agent Name</th>
                  <th className="h-10 px-3 py-2">Website URL</th>
                  <th className="h-10 px-3 py-2">Agent Phone</th>
                  <th className="h-10 px-3 py-2">Agent Email</th>
                  <th className="h-10 px-3 py-2">Products</th>
                  <th className="h-10 px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {manufacturers.map((manufacturer) => (
                  <tr key={manufacturer.id} className="border-t border-[var(--panel-border)]">
                    <td className="px-3 py-2">{manufacturer.companyName || "-"}</td>
                    <td className="px-3 py-2 font-medium">{manufacturer.name}</td>
                    <td className="px-3 py-2">{manufacturer.website || "-"}</td>
                    <td className="px-3 py-2">{manufacturer.phone || "-"}</td>
                    <td className="px-3 py-2">{manufacturer.email || "-"}</td>
                    <td className="px-3 py-2">{manufacturer.productsCount}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => openEdit(manufacturer)} className="rounded-md p-2 hover:bg-[var(--panel-hover)]">
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteManufacturer(manufacturer)}
                          disabled={deletingId === manufacturer.id}
                          className="rounded-md p-2 text-rose-500 hover:bg-rose-500/10 disabled:opacity-60"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {manufacturers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-[var(--foreground)]/60">
                      No manufacturers yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {isModalOpen ? (
        <ModalShell title={editingManufacturer ? "Edit Manufacturer" : "Add Manufacturer"} onClose={() => setIsModalOpen(false)}>
          <div className="space-y-5">
          {message ? <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">{message}</p> : null}
          {error ? <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">{error}</p> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Company Name">
              <input
                value={manufacturerForm.companyName}
                onChange={(event) => setManufacturerForm((prev) => ({ ...prev, companyName: event.target.value }))}
                className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
              />
            </FormField>
            <FormField label="Agent Name">
              <input
                value={manufacturerForm.name}
                onChange={(event) => setManufacturerForm((prev) => ({ ...prev, name: event.target.value }))}
                className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
              />
            </FormField>
            <FormField label="Website URL">
              <input
                value={manufacturerForm.website}
                onChange={(event) => setManufacturerForm((prev) => ({ ...prev, website: event.target.value }))}
                className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
              />
            </FormField>
            <FormField label="Agent Phone">
              <input
                value={manufacturerForm.phone}
                onChange={(event) => setManufacturerForm((prev) => ({ ...prev, phone: event.target.value }))}
                className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
              />
            </FormField>
            <FormField label="Agent Email">
              <input
                value={manufacturerForm.email}
                onChange={(event) => setManufacturerForm((prev) => ({ ...prev, email: event.target.value }))}
                className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
              />
            </FormField>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void saveManufacturer()}
              disabled={isSaving}
              className="rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-black disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save Manufacturer"}
            </button>
          </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  )
}
