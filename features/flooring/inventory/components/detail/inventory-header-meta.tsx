"use client"

export function InventoryHeaderMeta({
  productName,
}: {
  productName: string
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/60">Product</p>
      <p className="mt-1 truncate text-base font-semibold">{productName || "-"}</p>
    </div>
  )
}
