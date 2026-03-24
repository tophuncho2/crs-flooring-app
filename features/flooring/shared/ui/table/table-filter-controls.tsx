"use client"

type TabFilterOption = {
  value: string
  label: string
}

type SelectFilterOption = {
  value: string
  label: string
}

type TabFilterGroup = {
  key: string
  type: "tabs"
  label?: string
  value: string
  options: TabFilterOption[]
  onChange: (value: string) => void
}

type SelectFilterGroup = {
  key: string
  type: "select"
  label: string
  value: string
  options: SelectFilterOption[]
  onChange: (value: string) => void
}

type TableFilterGroup = TabFilterGroup | SelectFilterGroup

export type { SelectFilterOption, TabFilterOption, TableFilterGroup }

export function TableFilterControls({
  groups,
  className = "",
}: {
  groups: TableFilterGroup[]
  className?: string
}) {
  if (groups.length === 0) {
    return null
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>
      {groups.map((group) => (
        group.type === "tabs" ? (
          <div key={group.key} className="flex items-center gap-2">
            {group.label ? <span className="text-xs font-medium text-[var(--foreground)]/65">{group.label}</span> : null}
            <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-[var(--panel-border)] p-1">
              {group.options.map((option) => {
                const isActive = option.value === group.value

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => group.onChange(option.value)}
                    aria-pressed={isActive}
                    className={[
                      "rounded-md px-3 py-1.5 text-xs font-semibold transition",
                      isActive
                        ? "bg-blue-500 text-white"
                        : "text-[var(--foreground)]/75 hover:bg-[var(--panel-hover)]",
                    ].join(" ")}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <label key={group.key} className="flex items-center gap-2 rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm">
            <span className="text-xs font-medium text-[var(--foreground)]/65">{group.label}</span>
            <select
              value={group.value}
              onChange={(event) => group.onChange(event.target.value)}
              className="bg-transparent text-sm outline-none"
            >
              {group.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )
      ))}
    </div>
  )
}
