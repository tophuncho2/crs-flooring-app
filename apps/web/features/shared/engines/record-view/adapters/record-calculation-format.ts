export type RecordCalculationValueFormat =
  | "currency"
  | "percentage"
  | "unitized"
  | "unitized-total"

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const numberFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export function formatRecordCalculationValue(input: {
  value: number
  format: RecordCalculationValueFormat
  unitLabel?: string | null
}) {
  if (input.format === "percentage") {
    return `${(input.value * 100).toFixed(2)}%`
  }

  if (input.format === "unitized") {
    return [numberFormatter.format(input.value), input.unitLabel].filter(Boolean).join(" ")
  }

  if (input.format === "unitized-total") {
    return input.unitLabel
      ? `${currencyFormatter.format(input.value)} / ${input.unitLabel}`
      : currencyFormatter.format(input.value)
  }

  return currencyFormatter.format(input.value)
}
