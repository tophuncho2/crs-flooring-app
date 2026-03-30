import type { KeyboardEvent, ReactNode } from "react"
import { useRecordScrollSync } from "./record-scroll-sync"
import {
  joinRecordSectionClasses,
  RECORD_SECTION_BORDER_CLASS_NAME,
  RECORD_SECTION_BODY_SURFACE_CLASS_NAME,
  RECORD_SECTION_ITEM_SURFACE_CLASS_NAME,
} from "./record-section-tokens"

export function RecordSectionItem({
  children,
  status,
  actions,
  nestedContent,
  onOpen,
  openAriaLabel,
  className,
  bodyClassName,
  nestedContentClassName,
}: {
  children: ReactNode
  status?: ReactNode
  actions?: ReactNode
  nestedContent?: ReactNode
  onOpen?: () => void
  openAriaLabel?: string
  className?: string
  bodyClassName?: string
  nestedContentClassName?: string
}) {
  const { scrollRef, onScroll } = useRecordScrollSync("parent")

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!onOpen) {
      return
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onOpen()
    }
  }

  return (
    <section
      className={joinRecordSectionClasses(
        "w-full overflow-hidden rounded-2xl border shadow-[0_8px_18px_rgba(0,0,0,0.08)]",
        RECORD_SECTION_BORDER_CLASS_NAME,
        RECORD_SECTION_ITEM_SURFACE_CLASS_NAME,
        className,
      )}
    >
      <div
        role={onOpen ? "button" : undefined}
        tabIndex={onOpen ? 0 : undefined}
        aria-label={onOpen ? openAriaLabel : undefined}
        onClick={onOpen}
        onKeyDown={handleKeyDown}
        className={joinRecordSectionClasses(
          onOpen ? "cursor-pointer transition hover:bg-[var(--panel-hover)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/20" : undefined,
        )}
      >
        {(status || actions) ? (
          <div
            className={joinRecordSectionClasses(
              "flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-start lg:justify-between",
              RECORD_SECTION_BORDER_CLASS_NAME,
              RECORD_SECTION_BODY_SURFACE_CLASS_NAME,
            )}
          >
            {status ? <div className="flex flex-wrap items-center gap-2">{status}</div> : <div />}
            {actions ? <div className="flex flex-wrap items-center gap-2 lg:justify-end">{actions}</div> : null}
          </div>
        ) : null}
        <div ref={scrollRef} onScroll={onScroll} className="overflow-x-auto overscroll-x-contain">
          <div className={joinRecordSectionClasses("w-max min-w-full", bodyClassName)}>{children}</div>
        </div>
      </div>
      {nestedContent ? (
        <div className={joinRecordSectionClasses("border-t", RECORD_SECTION_BORDER_CLASS_NAME, nestedContentClassName)}>
          {nestedContent}
        </div>
      ) : null}
    </section>
  )
}
