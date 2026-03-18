"use client"

import { type ReactNode, useState } from "react"
import { Plus, Trash2, X } from "lucide-react"
import { TableActionsSummary } from "../../shared/table-shell"

type ServiceRow = {
  id: string
  name: string
  unitId: string
  unitName: string
  baseCost: string
  notes: string
  usageCount: number
  createdAt: string
  updatedAt: string
}

type UnitOption = {
  id: string
  name: string
}

type ServiceForm = {
  name: string
  unitId: string
  baseCost: string
  notes: string
}

const emptyForm: ServiceForm = {
  name: "",
  unitId: "",
  baseCost: "",
  notes: "",
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-black/50 p-4 pt-24 sm:p-6 sm:pt-28">
      <div className="flex min-h-full items-start justify-center">
        <div className="flex max-h-[calc(100vh-7rem)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] shadow-xl sm:max-h-[calc(100vh-8rem)]">
          <div className="flex items-center justify-between border-b border-[var(--panel-border)] px-5 py-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button type="button" onClick={onClose} className="rounded-md p-1 text-[var(--foreground)]/70 transition hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)]">
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

export default function ServicesClient({
  initialServices,
  unitOptions,
}: {
  initialServices: ServiceRow[]
  unitOptions: UnitOption[]
}) {
  const [services, setServices] = useState(initialServices)
  const [editingService, setEditingService] = useState<ServiceRow | null>(null)
  const [serviceForm, setServiceForm] = useState<ServiceForm>(emptyForm)
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
    setEditingService(null)
    setServiceForm(emptyForm)
    setIsModalOpen(true)
  }

  function openEdit(service: ServiceRow) {
    clearNotices()
    setEditingService(service)
    setServiceForm({
      name: service.name,
      unitId: service.unitId,
      baseCost: service.baseCost,
      notes: service.notes,
    })
    setIsModalOpen(true)
  }

  async function saveService() {
    clearNotices()
    setIsSaving(true)

    try {
      const response = await fetch(editingService ? `/api/flooring/services/${editingService.id}` : "/api/flooring/services", {
        method: editingService ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serviceForm),
      })

      const payload = (await response.json().catch(() => ({}))) as { service?: ServiceRow; error?: string }
      if (!response.ok || !payload.service) {
        throw new Error(payload.error ?? "Failed to save service")
      }

      setServices((prev) => {
        const next = editingService
          ? prev.map((row) => (row.id === payload.service!.id ? payload.service! : row))
          : [payload.service!, ...prev]
        return next.sort((a, b) => a.name.localeCompare(b.name))
      })
      setIsModalOpen(false)
      setMessage(editingService ? "Service updated" : "Service created")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save service")
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteService(service: ServiceRow) {
    if (!window.confirm(`Delete ${service.name}?`)) return

    clearNotices()
    setDeletingId(service.id)

    try {
      const response = await fetch(`/api/flooring/services/${service.id}`, { method: "DELETE" })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete service")
      }

      setServices((prev) => prev.filter((row) => row.id !== service.id))
      setMessage("Service deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete service")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-1 pb-12 pt-20 text-[var(--foreground)] sm:px-2 sm:pt-24 lg:px-3">
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-500">Services</h1>
            <p className="text-sm text-[var(--foreground)]/70">Manage reusable labor and service definitions for templates and work orders.</p>
          </div>
          <TableActionsSummary count={services.length}>
            <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-black hover:bg-blue-400">
              <Plus size={16} />
              Service
            </button>
          </TableActionsSummary>
        </div>

        {message ? <p className="mt-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">{message}</p> : null}
        {error ? <p className="mt-4 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">{error}</p> : null}

        <section className="mt-6">
          <div className="overflow-x-auto rounded-lg border border-[var(--panel-border)]">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-[var(--panel-hover)] text-left">
                <tr>
                  <th className="h-10 px-3 py-2">Service Name</th>
                  <th className="h-10 px-3 py-2">Unit</th>
                  <th className="h-10 px-3 py-2">Cost</th>
                  <th className="h-10 px-3 py-2">Notes</th>
                  <th className="h-10 px-3 py-2">Usage</th>
                  <th className="h-10 px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id} className="border-t border-[var(--panel-border)]">
                    <td className="px-3 py-2 font-medium">{service.name}</td>
                    <td className="px-3 py-2">{service.unitName}</td>
                    <td className="px-3 py-2">{service.baseCost}</td>
                    <td className="px-3 py-2">{service.notes || "-"}</td>
                    <td className="px-3 py-2">{service.usageCount}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => openEdit(service)} className="rounded-md border border-[var(--panel-border)] px-3 py-1 text-xs hover:bg-[var(--panel-hover)]">
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteService(service)}
                          disabled={deletingId === service.id}
                          className="rounded-md p-2 text-rose-500 hover:bg-rose-500/10 disabled:opacity-60"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {services.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-[var(--foreground)]/60">
                      No services yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {isModalOpen ? (
        <ModalShell title={editingService ? "Edit Service" : "Add Service"} onClose={() => setIsModalOpen(false)}>
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Service Name">
                <input value={serviceForm.name} onChange={(event) => setServiceForm((prev) => ({ ...prev, name: event.target.value }))} className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Service Unit">
                <select value={serviceForm.unitId} onChange={(event) => setServiceForm((prev) => ({ ...prev, unitId: event.target.value }))} className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2">
                  <option value="">Select unit</option>
                  {unitOptions.map((unit) => (
                    <option key={unit.id} value={unit.id}>{unit.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Cost">
                <input value={serviceForm.baseCost} onChange={(event) => setServiceForm((prev) => ({ ...prev, baseCost: event.target.value }))} className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Notes">
                <input value={serviceForm.notes} onChange={(event) => setServiceForm((prev) => ({ ...prev, notes: event.target.value }))} className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm">
                Cancel
              </button>
              <button type="button" onClick={() => void saveService()} disabled={isSaving} className="rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-black disabled:opacity-60">
                {isSaving ? "Saving..." : "Save Service"}
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  )
}
