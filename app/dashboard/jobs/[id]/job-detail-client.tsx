"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Plus, Trash2 } from "lucide-react"

type UserOption = {
  id: string
  email: string
}

type VendorOption = {
  id: string
  companyName: string
}

type JobDetail = {
  id: string
  name: string
  address: string
  propertyName: string
  contactName: string
  contactNumber: string
  budget: string
  assignedUserIds: string[]
  pendingExpenses: string
}

type PendingPaymentRow = {
  id: string
  jobId: string
  vendorId: string
  price: string
  notes: string
  status: "PENDING" | "PAID"
  createdAt: string
  updatedAt: string
  vendorName: string
}

type ExpenseRow = {
  id: string
  jobId: string
  vendorId: string | null
  price: string
  notes: string
  expenseType: "LABOR" | "MATERIAL"
  createdAt: string
  updatedAt: string
  vendorName: string
}

type PendingPaymentDraft = {
  price: string
  vendorId: string
  notes: string
  status: "PENDING" | "PAID"
}

type ExpenseDraft = {
  price: string
  vendorId: string
  notes: string
  expenseType: "LABOR" | "MATERIAL"
}

const defaultPendingDraft: PendingPaymentDraft = {
  price: "",
  vendorId: "",
  notes: "",
  status: "PENDING",
}

const defaultExpenseDraft: ExpenseDraft = {
  price: "",
  vendorId: "",
  notes: "",
  expenseType: "LABOR",
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString()
}

function parseMoney(value: string): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export default function JobDetailClient({
  job,
  users,
  vendors,
  initialPendingPayments,
  initialExpenses,
}: {
  job: JobDetail
  users: UserOption[]
  vendors: VendorOption[]
  initialPendingPayments: PendingPaymentRow[]
  initialExpenses: ExpenseRow[]
}) {
  const [pendingPayments, setPendingPayments] = useState<PendingPaymentRow[]>(initialPendingPayments)
  const [pendingDrafts, setPendingDrafts] = useState<Record<string, PendingPaymentDraft>>({})
  const [newPendingDraft, setNewPendingDraft] = useState<PendingPaymentDraft>(defaultPendingDraft)
  const [savingPendingId, setSavingPendingId] = useState<string | null>(null)
  const [isSavingPendingNew, setIsSavingPendingNew] = useState(false)
  const [showNewPendingRow, setShowNewPendingRow] = useState(false)

  const [expenses, setExpenses] = useState<ExpenseRow[]>(initialExpenses)
  const [expenseDrafts, setExpenseDrafts] = useState<Record<string, ExpenseDraft>>({})
  const [newExpenseDraft, setNewExpenseDraft] = useState<ExpenseDraft>(defaultExpenseDraft)
  const [savingExpenseId, setSavingExpenseId] = useState<string | null>(null)
  const [isSavingExpenseNew, setIsSavingExpenseNew] = useState(false)
  const [showNewExpenseRow, setShowNewExpenseRow] = useState(false)

  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const assignedUsers = useMemo(
    () => users.filter((user) => job.assignedUserIds.includes(user.id)).map((user) => user.email),
    [job.assignedUserIds, users],
  )

  const totalPendingExpenses = useMemo(
    () => pendingPayments.filter((payment) => payment.status === "PENDING").reduce((sum, row) => sum + Number(row.price), 0),
    [pendingPayments],
  )
  const totalExpenses = useMemo(() => expenses.reduce((sum, row) => sum + parseMoney(row.price), 0), [expenses])
  const budgetValue = useMemo(() => parseMoney(job.budget), [job.budget])
  const profit = useMemo(() => budgetValue - totalExpenses, [budgetValue, totalExpenses])

  function getPendingDraft(payment: PendingPaymentRow): PendingPaymentDraft {
    return pendingDrafts[payment.id] ?? {
      price: payment.price,
      vendorId: payment.vendorId,
      notes: payment.notes,
      status: payment.status,
    }
  }

  function updatePendingDraft(id: string, field: keyof PendingPaymentDraft, value: string) {
    setPendingDrafts((prev) => {
      const current = pendingPayments.find((payment) => payment.id === id)
      const fallback: PendingPaymentDraft = current
        ? {
            price: current.price,
            vendorId: current.vendorId,
            notes: current.notes,
            status: current.status,
          }
        : defaultPendingDraft

      return {
        ...prev,
        [id]: {
          ...(prev[id] ?? fallback),
          [field]: value,
        } as PendingPaymentDraft,
      }
    })
  }

  async function createPendingPayment() {
    setIsSavingPendingNew(true)
    setMessage("")
    setError("")

    try {
      const response = await fetch(`/api/jobs/${job.id}/pending-labor-payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPendingDraft),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        payment?: PendingPaymentRow & { vendor: { id: string; companyName: string } }
        error?: string
      }

      if (!response.ok || !payload.payment) {
        throw new Error(payload.error ?? "Failed to create pending labor payment")
      }
      const createdPayment = payload.payment

      setPendingPayments((prev) => [
        {
          id: createdPayment.id,
          jobId: createdPayment.jobId,
          vendorId: createdPayment.vendorId,
          price: String(createdPayment.price),
          notes: createdPayment.notes ?? "",
          status: createdPayment.status,
          createdAt: createdPayment.createdAt,
          updatedAt: createdPayment.updatedAt,
          vendorName: createdPayment.vendor.companyName,
        },
        ...prev,
      ])

      setNewPendingDraft(defaultPendingDraft)
      setShowNewPendingRow(false)
      setMessage("Pending labor payment created")
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create pending labor payment")
    } finally {
      setIsSavingPendingNew(false)
    }
  }

  async function savePendingPayment(payment: PendingPaymentRow) {
    setSavingPendingId(payment.id)
    setMessage("")
    setError("")

    try {
      const draft = getPendingDraft(payment)
      const response = await fetch(`/api/jobs/${job.id}/pending-labor-payments/${payment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        payment?: PendingPaymentRow & { vendor: { id: string; companyName: string } }
        error?: string
      }

      if (!response.ok || !payload.payment) {
        throw new Error(payload.error ?? "Failed to save pending labor payment")
      }

      setPendingPayments((prev) =>
        prev.map((row) =>
          row.id === payment.id
            ? {
                id: payload.payment!.id,
                jobId: payload.payment!.jobId,
                vendorId: payload.payment!.vendorId,
                price: String(payload.payment!.price),
                notes: payload.payment!.notes ?? "",
                status: payload.payment!.status,
                createdAt: payload.payment!.createdAt,
                updatedAt: payload.payment!.updatedAt,
                vendorName: payload.payment!.vendor.companyName,
              }
            : row,
        ),
      )

      setPendingDrafts((prev) => {
        const next = { ...prev }
        delete next[payment.id]
        return next
      })
      setMessage("Pending labor payment saved")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save pending labor payment")
    } finally {
      setSavingPendingId(null)
    }
  }

  async function deletePendingPayment(paymentId: string) {
    setMessage("")
    setError("")

    try {
      const response = await fetch(`/api/jobs/${job.id}/pending-labor-payments/${paymentId}`, { method: "DELETE" })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete pending labor payment")
      }

      setPendingPayments((prev) => prev.filter((payment) => payment.id !== paymentId))
      setMessage("Pending labor payment deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete pending labor payment")
    }
  }

  function getExpenseDraft(expense: ExpenseRow): ExpenseDraft {
    return expenseDrafts[expense.id] ?? {
      price: expense.price,
      vendorId: expense.vendorId ?? "",
      notes: expense.notes,
      expenseType: expense.expenseType,
    }
  }

  function updateExpenseDraft(id: string, field: keyof ExpenseDraft, value: string) {
    setExpenseDrafts((prev) => {
      const current = expenses.find((expense) => expense.id === id)
      const fallback: ExpenseDraft = current
        ? {
            price: current.price,
            vendorId: current.vendorId ?? "",
            notes: current.notes,
            expenseType: current.expenseType,
          }
        : defaultExpenseDraft

      return {
        ...prev,
        [id]: {
          ...(prev[id] ?? fallback),
          [field]: value,
        } as ExpenseDraft,
      }
    })
  }

  async function createExpense() {
    setIsSavingExpenseNew(true)
    setMessage("")
    setError("")

    try {
      const response = await fetch(`/api/jobs/${job.id}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newExpenseDraft),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        expense?: ExpenseRow & { vendor: { id: string; companyName: string } | null }
        error?: string
      }

      if (!response.ok || !payload.expense) {
        throw new Error(payload.error ?? "Failed to create expense")
      }
      const createdExpense = payload.expense

      setExpenses((prev) => [
        {
          id: createdExpense.id,
          jobId: createdExpense.jobId,
          vendorId: createdExpense.vendorId,
          price: String(createdExpense.price),
          notes: createdExpense.notes ?? "",
          expenseType: createdExpense.expenseType,
          createdAt: createdExpense.createdAt,
          updatedAt: createdExpense.updatedAt,
          vendorName: createdExpense.vendor?.companyName ?? "",
        },
        ...prev,
      ])

      setNewExpenseDraft(defaultExpenseDraft)
      setShowNewExpenseRow(false)
      setMessage("Expense created")
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create expense")
    } finally {
      setIsSavingExpenseNew(false)
    }
  }

  async function saveExpense(expense: ExpenseRow) {
    setSavingExpenseId(expense.id)
    setMessage("")
    setError("")

    try {
      const draft = getExpenseDraft(expense)
      const response = await fetch(`/api/jobs/${job.id}/expenses/${expense.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        expense?: ExpenseRow & { vendor: { id: string; companyName: string } | null }
        error?: string
      }

      if (!response.ok || !payload.expense) {
        throw new Error(payload.error ?? "Failed to save expense")
      }

      setExpenses((prev) =>
        prev.map((row) =>
          row.id === expense.id
            ? {
                id: payload.expense!.id,
                jobId: payload.expense!.jobId,
                vendorId: payload.expense!.vendorId,
                price: String(payload.expense!.price),
                notes: payload.expense!.notes ?? "",
                expenseType: payload.expense!.expenseType,
                createdAt: payload.expense!.createdAt,
                updatedAt: payload.expense!.updatedAt,
                vendorName: payload.expense!.vendor?.companyName ?? "",
              }
            : row,
        ),
      )

      setExpenseDrafts((prev) => {
        const next = { ...prev }
        delete next[expense.id]
        return next
      })
      setMessage("Expense saved")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save expense")
    } finally {
      setSavingExpenseId(null)
    }
  }

  async function deleteExpense(expenseId: string) {
    setMessage("")
    setError("")

    try {
      const response = await fetch(`/api/jobs/${job.id}/expenses/${expenseId}`, { method: "DELETE" })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete expense")
      }

      setExpenses((prev) => prev.filter((expense) => expense.id !== expenseId))
      setMessage("Expense deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete expense")
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-1 pb-12 pt-20 text-[var(--foreground)] sm:px-2 sm:pt-24 lg:px-3">
      <div className="w-full space-y-6">
        <div>
          <Link href="/dashboard/jobs" className="text-sm text-blue-500 hover:underline">
            Back to Jobs
          </Link>
        </div>

        <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
          <h1 className="text-2xl font-bold text-blue-500">{job.name || "Untitled Job"}</h1>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <p><span className="font-semibold">Address:</span> {job.address || "-"}</p>
            <p><span className="font-semibold">Property:</span> {job.propertyName || "-"}</p>
            <p><span className="font-semibold">Contact:</span> {job.contactName || "-"}</p>
            <p><span className="font-semibold">Phone:</span> {job.contactNumber || "-"}</p>
            <p><span className="font-semibold">Budget:</span> ${job.budget}</p>
            <p><span className="font-semibold">Total Expenses:</span> ${totalExpenses.toFixed(2)}</p>
            <p><span className="font-semibold">Profit:</span> ${profit.toFixed(2)}</p>
            <p><span className="font-semibold">Total Pending Expenses:</span> ${totalPendingExpenses.toFixed(2)}</p>
          </div>
          <p className="mt-2 text-sm text-[var(--foreground)]/75">
            <span className="font-semibold">Assigned Users:</span> {assignedUsers.length > 0 ? assignedUsers.join(", ") : "None"}
          </p>
          {job.pendingExpenses !== totalPendingExpenses.toFixed(2) && (
            <p className="mt-1 text-xs text-amber-600">
              Loaded job pending total was ${job.pendingExpenses}; current table total is ${totalPendingExpenses.toFixed(2)}.
            </p>
          )}

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
        </section>

        <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
          <h2 className="text-xl font-semibold text-blue-500">Pending Labor Payments</h2>
          <div className="mt-4 rounded-lg border border-[var(--panel-border)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-[var(--panel-hover)] text-left">
                <tr>
                  <th className="px-3 py-2">$</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Vendor</th>
                  <th className="px-3 py-2">Job</th>
                  <th className="px-3 py-2">Notes</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Save</th>
                  <th className="px-3 py-2">Delete</th>
                </tr>
              </thead>
              <tbody>
                {showNewPendingRow && (
                  <tr className="border-t border-[var(--panel-border)] bg-[var(--panel-hover)]/30">
                    <td className="px-3 py-2 font-semibold text-[var(--foreground)]/70">$</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.01"
                      value={newPendingDraft.price}
                      onChange={(event) => setNewPendingDraft((prev) => ({ ...prev, price: event.target.value }))}
                      className="w-28 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={newPendingDraft.vendorId}
                      onChange={(event) => setNewPendingDraft((prev) => ({ ...prev, vendorId: event.target.value }))}
                      className="w-56 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                    >
                      <option value="">Select vendor</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>{vendor.companyName}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">{job.name || "Untitled Job"}</td>
                  <td className="px-3 py-2">
                    <input
                      value={newPendingDraft.notes}
                      onChange={(event) => setNewPendingDraft((prev) => ({ ...prev, notes: event.target.value }))}
                      className="w-56 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={newPendingDraft.status}
                      onChange={(event) =>
                        setNewPendingDraft((prev) => ({ ...prev, status: event.target.value as "PENDING" | "PAID" }))
                      }
                      className="w-32 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="PAID">Paid</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => void createPendingPayment()}
                      disabled={isSavingPendingNew}
                      className="inline-flex items-center gap-1 rounded border border-[var(--panel-border)] px-3 py-1 hover:bg-[var(--panel-hover)] disabled:opacity-60"
                    >
                      <Plus size={13} /> {isSavingPendingNew ? "Saving..." : "Add"}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-[var(--foreground)]/60">-</td>
                  </tr>
                )}

                {pendingPayments.map((payment) => {
                  const draft = getPendingDraft(payment)
                  const isSaving = savingPendingId === payment.id

                  return (
                    <tr key={payment.id} className="border-t border-[var(--panel-border)]">
                      <td className="px-3 py-2 font-semibold text-[var(--foreground)]/70">$</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={draft.price}
                          onChange={(event) => updatePendingDraft(payment.id, "price", event.target.value)}
                          className="w-28 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={draft.vendorId}
                          onChange={(event) => updatePendingDraft(payment.id, "vendorId", event.target.value)}
                          className="w-56 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                        >
                          <option value="">Select vendor</option>
                          {vendors.map((vendor) => (
                            <option key={vendor.id} value={vendor.id}>{vendor.companyName}</option>
                          ))}
                        </select>
                        <p className="mt-1 text-xs text-[var(--foreground)]/65">Current: {payment.vendorName}</p>
                      </td>
                      <td className="px-3 py-2">{job.name || "Untitled Job"}</td>
                      <td className="px-3 py-2">
                        <input
                          value={draft.notes}
                          onChange={(event) => updatePendingDraft(payment.id, "notes", event.target.value)}
                          className="w-56 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={draft.status}
                          onChange={(event) => updatePendingDraft(payment.id, "status", event.target.value)}
                          className="w-32 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="PAID">Paid</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => void savePendingPayment(payment)}
                          disabled={isSaving}
                          className="rounded border border-[var(--panel-border)] px-3 py-1 hover:bg-[var(--panel-hover)] disabled:opacity-60"
                        >
                          {isSaving ? "Saving..." : "Save"}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => void deletePendingPayment(payment.id)}
                          className="rounded p-2 text-rose-600 transition hover:bg-rose-500/10"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}

                {pendingPayments.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-[var(--foreground)]/70">
                      No pending labor payments yet.
                    </td>
                  </tr>
                )}
              </tbody>
              </table>
            </div>
            <div className="flex justify-end border-t border-[var(--panel-border)] px-3 py-2">
              <button
                type="button"
                onClick={() => setShowNewPendingRow(true)}
                disabled={showNewPendingRow}
                className="inline-flex items-center gap-1 rounded border border-[var(--panel-border)] px-3 py-1 text-sm hover:bg-[var(--panel-hover)] disabled:opacity-60"
              >
                <Plus size={13} /> Add Row
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
          <h2 className="text-xl font-semibold text-blue-500">Expenses</h2>
          <div className="mt-4 rounded-lg border border-[var(--panel-border)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-sm">
              <thead className="bg-[var(--panel-hover)] text-left">
                <tr>
                  <th className="px-3 py-2">$</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Vendor</th>
                  <th className="px-3 py-2">Job</th>
                  <th className="px-3 py-2">Notes</th>
                  <th className="px-3 py-2">Expense Type</th>
                  <th className="px-3 py-2">Created Time</th>
                  <th className="px-3 py-2">Save</th>
                  <th className="px-3 py-2">Delete</th>
                </tr>
              </thead>
              <tbody>
                {showNewExpenseRow && (
                  <tr className="border-t border-[var(--panel-border)] bg-[var(--panel-hover)]/30">
                    <td className="px-3 py-2 font-semibold text-[var(--foreground)]/70">$</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.01"
                      value={newExpenseDraft.price}
                      onChange={(event) => setNewExpenseDraft((prev) => ({ ...prev, price: event.target.value }))}
                      className="w-28 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={newExpenseDraft.vendorId}
                      onChange={(event) => setNewExpenseDraft((prev) => ({ ...prev, vendorId: event.target.value }))}
                      className="w-56 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                    >
                      <option value="">No vendor</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>{vendor.companyName}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">{job.name || "Untitled Job"}</td>
                  <td className="px-3 py-2">
                    <input
                      value={newExpenseDraft.notes}
                      onChange={(event) => setNewExpenseDraft((prev) => ({ ...prev, notes: event.target.value }))}
                      className="w-56 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={newExpenseDraft.expenseType}
                      onChange={(event) =>
                        setNewExpenseDraft((prev) => ({ ...prev, expenseType: event.target.value as "LABOR" | "MATERIAL" }))
                      }
                      className="w-32 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                    >
                      <option value="LABOR">Labor</option>
                      <option value="MATERIAL">Material</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">On create</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => void createExpense()}
                      disabled={isSavingExpenseNew}
                      className="inline-flex items-center gap-1 rounded border border-[var(--panel-border)] px-3 py-1 hover:bg-[var(--panel-hover)] disabled:opacity-60"
                    >
                      <Plus size={13} /> {isSavingExpenseNew ? "Saving..." : "Add"}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-[var(--foreground)]/60">-</td>
                  </tr>
                )}

                {expenses.map((expense) => {
                  const draft = getExpenseDraft(expense)
                  const isSaving = savingExpenseId === expense.id

                  return (
                    <tr key={expense.id} className="border-t border-[var(--panel-border)]">
                      <td className="px-3 py-2 font-semibold text-[var(--foreground)]/70">$</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={draft.price}
                          onChange={(event) => updateExpenseDraft(expense.id, "price", event.target.value)}
                          className="w-28 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={draft.vendorId}
                          onChange={(event) => updateExpenseDraft(expense.id, "vendorId", event.target.value)}
                          className="w-56 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                        >
                          <option value="">No vendor</option>
                          {vendors.map((vendor) => (
                            <option key={vendor.id} value={vendor.id}>{vendor.companyName}</option>
                          ))}
                        </select>
                        {expense.vendorName && (
                          <p className="mt-1 text-xs text-[var(--foreground)]/65">Current: {expense.vendorName}</p>
                        )}
                      </td>
                      <td className="px-3 py-2">{job.name || "Untitled Job"}</td>
                      <td className="px-3 py-2">
                        <input
                          value={draft.notes}
                          onChange={(event) => updateExpenseDraft(expense.id, "notes", event.target.value)}
                          className="w-56 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={draft.expenseType}
                          onChange={(event) => updateExpenseDraft(expense.id, "expenseType", event.target.value)}
                          className="w-32 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                        >
                          <option value="LABOR">Labor</option>
                          <option value="MATERIAL">Material</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">{formatDate(expense.createdAt)}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => void saveExpense(expense)}
                          disabled={isSaving}
                          className="rounded border border-[var(--panel-border)] px-3 py-1 hover:bg-[var(--panel-hover)] disabled:opacity-60"
                        >
                          {isSaving ? "Saving..." : "Save"}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => void deleteExpense(expense.id)}
                          className="rounded p-2 text-rose-600 transition hover:bg-rose-500/10"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}

                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-[var(--foreground)]/70">
                      No expenses yet.
                    </td>
                  </tr>
                )}
              </tbody>
              </table>
            </div>
            <div className="flex justify-end border-t border-[var(--panel-border)] px-3 py-2">
              <button
                type="button"
                onClick={() => setShowNewExpenseRow(true)}
                disabled={showNewExpenseRow}
                className="inline-flex items-center gap-1 rounded border border-[var(--panel-border)] px-3 py-1 text-sm hover:bg-[var(--panel-hover)] disabled:opacity-60"
              >
                <Plus size={13} /> Add Row
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
