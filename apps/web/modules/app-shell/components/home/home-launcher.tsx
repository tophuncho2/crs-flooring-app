import Link from "next/link"
import { Circle } from "lucide-react"
import type { UserRank } from "@builders/domain"
import {
  FLOORING_NAV_GROUPS,
  FLOORING_NAV_ITEMS,
  isNavItemVisible,
} from "@/modules/app-shell/navigation/definitions"
import { NAV_ICONS } from "@/modules/app-shell/navigation/nav-icons"

type HomeLauncherProps = {
  name: string
  rank: string
}

/**
 * The post-login landing — a branded launcher of module shortcut tiles. Reuses
 * the nav rail's source of truth (groups + items + icon map) and its exact
 * rank-aware filter (`isNavItemVisible`), so the tiles and the rail always agree
 * and every per-item `minRank` gate carries over identically.
 */
export default function HomeLauncher({ name, rank }: HomeLauncherProps) {
  const viewerRank = rank as UserRank

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 sm:py-16">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">
          Welcome back, {name}
        </h1>
        <p className="mt-1 text-sm uppercase tracking-[0.2em] text-[var(--foreground)]/50">
          CRS Operations Portal
        </p>
      </header>

      <div className="flex flex-col gap-10">
        {FLOORING_NAV_GROUPS.map((group) => {
          const groupItems = FLOORING_NAV_ITEMS.filter(
            (item) => item.group === group.id && isNavItemVisible(item, viewerRank),
          )
          if (groupItems.length === 0) return null

          return (
            <section key={group.id}>
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--foreground)]/40">
                {group.label}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {groupItems.map((item) => {
                  const Icon = NAV_ICONS[item.slug] ?? Circle

                  return (
                    <Link
                      key={item.slug}
                      href={item.href}
                      className="group flex items-center gap-3 rounded-2xl border border-[var(--panel-border)] px-4 py-4 text-[var(--foreground)] transition hover:border-blue-500/60 hover:bg-[var(--panel-hover)]"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--panel-hover)] text-[var(--foreground)]/70 transition group-hover:bg-blue-500 group-hover:text-black">
                        <Icon size={20} />
                      </span>
                      <span className="text-sm font-medium">{item.name}</span>
                    </Link>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
