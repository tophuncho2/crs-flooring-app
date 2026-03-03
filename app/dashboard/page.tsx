import Link from "next/link"

const modules = [
  {
    name: "Products",
    description: "Manage product catalog details, pricing, and category units.",
    href: "/dashboard/products",
    cta: "Open Products",
  },
  {
    name: "Estimator",
    description: "Build customer estimates with room-level line items and totals.",
    href: "/dashboard/estimator",
    cta: "Open Estimator",
  },
  {
    name: "Invoices",
    description: "Create labor invoices, save them, and generate downloadable PDFs.",
    href: "/dashboard/invoices",
    cta: "Open Invoices",
  },
  {
    name: "Jobs",
    description: "Track job name, address, property contact details, and budget.",
    href: "/dashboard/jobs",
    cta: "Open Jobs",
  },
  {
    name: "Vendors",
    description: "Manage vendor contact details used for labor payments and expenses.",
    href: "/dashboard/vendors",
    cta: "Open Vendors",
  },
  {
    name: "Daily Scope",
    description: "Create room-grouped daily scope line items and generate invoice PDFs.",
    href: "/dashboard/daily-scope",
    cta: "Open Daily Scope",
  },
]

export default async function Dashboard() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-12 pt-20 sm:px-6 sm:pt-24 lg:px-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-2 text-sm text-[var(--foreground)]/70">Choose a module to continue.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <article
              key={module.href}
              className="flex flex-col rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-5"
            >
              <h2 className="text-xl font-semibold text-blue-500">{module.name}</h2>
              <p className="mt-2 flex-1 text-sm text-[var(--foreground)]/75">{module.description}</p>
              <Link
                href={module.href}
                className="mt-4 inline-flex w-fit rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-black transition hover:bg-blue-400"
              >
                {module.cta}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
