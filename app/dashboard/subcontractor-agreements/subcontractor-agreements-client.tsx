"use client"

import { useMemo, useState } from "react"
import { Plus, Trash2 } from "lucide-react"

type InstallmentRow = {
  id: string
  price: string
  percent: string
}

type AgreementForm = {
  todaysDate: string
  propertyName: string
  propertyAddress: string
  units: string
  pmName: string
  pmPhone: string
  pmEmail: string
  contractorCompany: string
  contractorPhone: string
  contractorEmail: string
  contractorAddress: string
  fax: string
  startDate: string
  endDate: string
}

type Props = {
  templateHtml: string
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function createInstallment(): InstallmentRow {
  return {
    id: Math.random().toString(36).slice(2),
    price: "",
    percent: "",
  }
}

function parseNumber(value: string): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

export default function SubcontractorAgreementsClient({ templateHtml }: Props) {
  const [form, setForm] = useState<AgreementForm>({
    todaysDate: new Date().toISOString().slice(0, 10),
    propertyName: "",
    propertyAddress: "",
    units: "",
    pmName: "",
    pmPhone: "",
    pmEmail: "",
    contractorCompany: "",
    contractorPhone: "",
    contractorEmail: "",
    contractorAddress: "",
    fax: "",
    startDate: "",
    endDate: "",
  })
  const [installments, setInstallments] = useState<InstallmentRow[]>([createInstallment()])
  const [generated, setGenerated] = useState(false)
  const [creatorSignature, setCreatorSignature] = useState("")
  const [creatorSignDate, setCreatorSignDate] = useState("")
  const [contractorSignature, setContractorSignature] = useState("")
  const [contractorSignDate, setContractorSignDate] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const completeInstallments = useMemo(() => {
    return installments.filter((row) => {
      const hasPrice = row.price.trim() !== ""
      const hasPercent = row.percent.trim() !== ""
      if (!hasPrice || !hasPercent) {
        return false
      }

      const price = parseNumber(row.price)
      const percent = parseNumber(row.percent)
      return Number.isFinite(price) && Number.isFinite(percent) && price >= 0 && percent > 0
    })
  }, [installments])

  const percentTotal = useMemo(() => {
    return completeInstallments.reduce((sum, row) => sum + parseNumber(row.percent), 0)
  }, [completeInstallments])

  const contractTotal = useMemo(() => {
    return completeInstallments.reduce((sum, row) => sum + parseNumber(row.price), 0)
  }, [completeInstallments])

  const contractHtml = useMemo(() => {
    if (!generated) {
      return ""
    }

    const installmentsRows = completeInstallments
      .map((row, index) => {
        const price = parseNumber(row.price)
        const percent = parseNumber(row.percent)
        return `<li>${escapeHtml(percent.toString())}% upon installment ${index + 1} milestone - $${escapeHtml(formatCurrency(price))}</li>`
      })
      .join("\n")

    const replacements: Record<string, string> = {
      "{{TodaysDate}}": form.todaysDate,
      "{{PropertyName}}": form.propertyName,
      "{{PropertyAddress}}": form.propertyAddress,
      "{{Units}}": form.units,
      "{{PM}}": form.pmName,
      "{{PMPHONE}}": form.pmPhone,
      "{{PMEMAIL}}": form.pmEmail,
      "{{Contractor}}": form.contractorCompany,
      "{{ContractorPhone}}": form.contractorPhone,
      "{{ContractorEmail}}": form.contractorEmail,
      "{{ContractorAddress}}": form.contractorAddress,
      "{{FAX}}": form.fax,
      "{{StartDate}}": form.startDate,
      "{{EndDate}}": form.endDate,
      "{{Total$}}": formatCurrency(contractTotal),
      "{{CRSSignature}}": creatorSignature,
      "{{CRSSignDate}}": creatorSignDate,
      "{{ContractorSignature}}": contractorSignature,
      "{{ContractorSignDate}}": contractorSignDate,
    }

    let nextHtml = templateHtml

    for (const [token, value] of Object.entries(replacements)) {
      nextHtml = nextHtml.split(token).join(escapeHtml(value || ""))
    }

    nextHtml = nextHtml
      .split("{{InstallmentsRows}}")
      .join(installmentsRows || "<li>No installments defined.</li>")

    return nextHtml
  }, [completeInstallments, contractorSignDate, contractorSignature, contractTotal, creatorSignDate, creatorSignature, form, generated, templateHtml])

  function updateForm<K extends keyof AgreementForm>(key: K, value: AgreementForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function addInstallment() {
    setInstallments((prev) => [...prev, createInstallment()])
  }

  function removeInstallment(id: string) {
    setInstallments((prev) => prev.filter((row) => row.id !== id))
  }

  function updateInstallment(id: string, field: "price" | "percent", value: string) {
    setInstallments((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)))
  }

  function validateBeforeGeneration(): string | null {
    const requiredFields: Array<[keyof AgreementForm, string]> = [
      ["todaysDate", "Date"],
      ["propertyName", "Property Name"],
      ["propertyAddress", "Property Address"],
      ["pmName", "Project Manager Name"],
      ["pmPhone", "Project Manager Phone"],
      ["pmEmail", "Project Manager Email"],
      ["contractorCompany", "Contractor Company"],
      ["contractorPhone", "Contractor Phone"],
      ["contractorEmail", "Contractor Email"],
      ["startDate", "Start Date"],
    ]

    const missingField = requiredFields.find(([field]) => form[field].trim() === "")
    if (missingField) {
      return `${missingField[1]} is required.`
    }

    if (installments.length === 0) {
      return "Add at least one payment installment."
    }

    for (const row of installments) {
      const hasPrice = row.price.trim() !== ""
      const hasPercent = row.percent.trim() !== ""
      if (!hasPrice && !hasPercent) {
        continue
      }

      if (!hasPrice || !hasPercent) {
        return "Each installment row must include both price and percent."
      }

      const price = parseNumber(row.price)
      const percent = parseNumber(row.percent)

      if (!Number.isFinite(price) || price < 0) {
        return "Installment price must be a valid number greater than or equal to 0."
      }

      if (!Number.isFinite(percent) || percent <= 0) {
        return "Installment percent must be a valid number greater than 0."
      }
    }

    if (completeInstallments.length === 0) {
      return "Add at least one complete installment row."
    }

    if (Math.abs(percentTotal - 100) > 0.00001) {
      return `Total installment percent must equal 100%. Current total is ${percentTotal.toFixed(2)}%.`
    }

    return null
  }

  function generateContract() {
    const validationError = validateBeforeGeneration()

    if (validationError) {
      setGenerated(false)
      setError(validationError)
      setMessage("")
      return
    }

    setError("")
    setMessage("Contract generated. Add CRS signature to continue.")
    setGenerated(true)
    setCreatorSignature("")
    setCreatorSignDate("")
    setContractorSignature("")
    setContractorSignDate("")
  }

  function signAsCrs() {
    if (!generated) {
      setError("Generate the contract before signing.")
      return
    }

    if (creatorSignature.trim() === "") {
      setError("Enter the CRS signature name before signing.")
      return
    }

    setCreatorSignDate(new Date().toISOString().slice(0, 10))
    setError("")
    setMessage("CRS signed. Contractor signature is now available.")
  }

  function signAsContractor() {
    if (!creatorSignDate) {
      setError("CRS must sign before contractor signature is available.")
      return
    }

    if (contractorSignature.trim() === "") {
      setError("Enter the contractor signature name before signing.")
      return
    }

    setContractorSignDate(new Date().toISOString().slice(0, 10))
    setError("")
    setMessage("Contractor signature captured.")
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-20 sm:px-6 sm:pt-24 lg:px-8">
        <h1 className="text-3xl font-bold">Sub-Contractor Agreements</h1>
        <p className="mt-2 text-sm text-[var(--foreground)]/70">
          Fill the contract details, define payment installments, then generate and sign in sequence.
        </p>

        <div className="mt-6 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-5">
          <h2 className="text-lg font-semibold">Agreement Header</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm">
              Date
              <input
                type="date"
                value={form.todaysDate}
                onChange={(event) => updateForm("todaysDate", event.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
              />
            </label>

            <label className="text-sm">
              Property Name
              <input
                value={form.propertyName}
                onChange={(event) => updateForm("propertyName", event.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
                placeholder="Property Name"
              />
            </label>

            <label className="text-sm">
              Property Address
              <input
                value={form.propertyAddress}
                onChange={(event) => updateForm("propertyAddress", event.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
                placeholder="Property Address"
              />
            </label>

            <label className="text-sm">
              Units
              <input
                value={form.units}
                onChange={(event) => updateForm("units", event.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
                placeholder="Units"
              />
            </label>

            <label className="text-sm">
              Project Manager Name
              <input
                value={form.pmName}
                onChange={(event) => updateForm("pmName", event.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
                placeholder="Project Manager Name"
              />
            </label>

            <label className="text-sm">
              Project Manager Phone
              <input
                value={form.pmPhone}
                onChange={(event) => updateForm("pmPhone", event.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
                placeholder="Project Manager Phone"
              />
            </label>

            <label className="text-sm">
              Project Manager Email
              <input
                type="email"
                value={form.pmEmail}
                onChange={(event) => updateForm("pmEmail", event.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
                placeholder="Project Manager Email"
              />
            </label>

            <label className="text-sm">
              Contractor Company Name
              <input
                value={form.contractorCompany}
                onChange={(event) => updateForm("contractorCompany", event.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
                placeholder="Contractor Company"
              />
            </label>

            <label className="text-sm">
              Contractor Phone
              <input
                value={form.contractorPhone}
                onChange={(event) => updateForm("contractorPhone", event.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
                placeholder="Contractor Phone"
              />
            </label>

            <label className="text-sm">
              Contractor Email
              <input
                type="email"
                value={form.contractorEmail}
                onChange={(event) => updateForm("contractorEmail", event.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
                placeholder="Contractor Email"
              />
            </label>

            <label className="text-sm">
              Contractor Address
              <input
                value={form.contractorAddress}
                onChange={(event) => updateForm("contractorAddress", event.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
                placeholder="Contractor Address"
              />
            </label>

            <label className="text-sm">
              Contractor Fax
              <input
                value={form.fax}
                onChange={(event) => updateForm("fax", event.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
                placeholder="Contractor Fax"
              />
            </label>

            <label className="text-sm">
              Start Date
              <input
                type="date"
                value={form.startDate}
                onChange={(event) => updateForm("startDate", event.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
              />
            </label>

            <label className="text-sm">
              End Date
              <input
                type="date"
                value={form.endDate}
                onChange={(event) => updateForm("endDate", event.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
              />
            </label>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Payment Installments</h2>
            <button
              type="button"
              onClick={addInstallment}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-black transition hover:bg-blue-400"
            >
              <Plus size={16} />
              Add Installment
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--panel-border)] text-left">
                  <th className="px-3 py-2 font-semibold">#</th>
                  <th className="px-3 py-2 font-semibold">Price ($)</th>
                  <th className="px-3 py-2 font-semibold">% Complete Required</th>
                  <th className="px-3 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {installments.map((row, index) => (
                  <tr key={row.id} className="border-b border-[var(--panel-border)]/50">
                    <td className="px-3 py-2 align-middle">{index + 1}</td>
                    <td className="px-3 py-2 align-middle">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.price}
                        onChange={(event) => updateInstallment(row.id, "price", event.target.value)}
                        className="w-full rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={row.percent}
                        onChange={(event) => updateInstallment(row.id, "percent", event.target.value)}
                        className="w-full rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <button
                        type="button"
                        onClick={() => removeInstallment(row.id)}
                        className="rounded-lg border border-red-400/60 px-3 py-2 text-red-500 transition hover:bg-red-500/10"
                        disabled={installments.length === 1}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
            <p>
              <strong>Total %:</strong> {percentTotal.toFixed(2)}%
            </p>
            <p>
              <strong>Total Contract Price:</strong> ${formatCurrency(contractTotal)}
            </p>
            <button
              type="button"
              onClick={generateContract}
              className="inline-flex items-center rounded-lg bg-blue-500 px-4 py-2 font-semibold text-black transition hover:bg-blue-400"
            >
              Generate Contract
            </button>
          </div>

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
          {message && <p className="mt-3 text-sm text-green-600">{message}</p>}
        </div>

        {generated && (
          <div className="mt-6 space-y-6">
            <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-5">
              <h2 className="text-lg font-semibold">Signatures</h2>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-medium">CRS Signature (required first)</p>
                  <input
                    value={creatorSignature}
                    onChange={(event) => setCreatorSignature(event.target.value)}
                    placeholder="Type CRS signer name"
                    className="w-full rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
                  />
                  <button
                    type="button"
                    onClick={signAsCrs}
                    className="mt-2 rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-black transition hover:bg-blue-400"
                  >
                    Sign as CRS
                  </button>
                  {creatorSignDate && <p className="mt-2 text-xs text-[var(--foreground)]/75">Signed on {creatorSignDate}</p>}
                </div>

                {creatorSignDate && (
                  <div>
                    <p className="mb-2 text-sm font-medium">Contractor Signature</p>
                    <input
                      value={contractorSignature}
                      onChange={(event) => setContractorSignature(event.target.value)}
                      placeholder="Type contractor signer name"
                      className="w-full rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
                    />
                    <button
                      type="button"
                      onClick={signAsContractor}
                      className="mt-2 rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-black transition hover:bg-blue-400"
                    >
                      Sign as Contractor
                    </button>
                    {contractorSignDate && (
                      <p className="mt-2 text-xs text-[var(--foreground)]/75">Signed on {contractorSignDate}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4">
              <h2 className="mb-4 text-lg font-semibold">Generated Contract Preview</h2>
              <iframe
                title="Generated subcontractor agreement"
                className="h-[900px] w-full rounded-lg border border-[var(--panel-border)] bg-white"
                srcDoc={contractHtml}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
