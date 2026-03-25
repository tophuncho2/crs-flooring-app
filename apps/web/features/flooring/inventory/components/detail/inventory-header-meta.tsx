"use client"

export function InventoryHeaderMeta({
  productName,
  warehouseName,
  importNumber,
}: {
  productName: string
  warehouseName: string
  importNumber: string
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/60">Product</p>
        <p className="mt-1 truncate text-base font-semibold">{productName || "-"}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/60">Warehouse</p>
        <p className="mt-1 truncate text-base font-semibold">{warehouseName || "-"}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/60">Import #</p>
        <p className="mt-1 truncate text-base font-semibold">
          {importNumber ? `IMP-${importNumber.padStart(4, "0")}` : "-"}
        </p>
      </div>
    </div>
  )
}
