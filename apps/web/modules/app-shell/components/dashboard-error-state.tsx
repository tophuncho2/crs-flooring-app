import Link from "next/link"

export default function DashboardErrorState({
  title,
  message,
  detail,
  errorCode,
}: {
  title: string
  message: string
  detail: string
  errorCode: string
}) {
  return (
    <div className="min-h-screen bg-[var(--background)] px-3 pb-12 pt-24 text-[var(--foreground)] sm:px-6">
      <section className="mx-auto max-w-3xl rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-6 shadow-sm">
        <div className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">
          Database Issue
        </div>
        <h1 className="mt-4 text-2xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--foreground)]/75">{message}</p>
        <div className="mt-6 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-hover)]/60 p-4 text-sm">
          <p className="font-medium">Error code: {errorCode}</p>
          <p className="mt-2 text-[var(--foreground)]/75">{detail}</p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard/inventory"
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            Retry Dashboard
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-[var(--panel-border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--panel-hover)]"
          >
            Return To Login
          </Link>
        </div>
      </section>
    </div>
  )
}
