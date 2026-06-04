"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react"
import { FLOORING_PRIMARY_ACTION_BUTTON_CLASS_NAME } from "@/components/theme/accent-styles"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

const RECORD_ACTION_GLOW_CLASS_NAME =
  "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"

const RECORD_NEUTRAL_ACTION_CLASS_NAME = joinClasses(
  "inline-flex items-center gap-2 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-background)] px-4 py-2 text-sm text-[var(--foreground)]/80",
  "hover:border-blue-500/40 hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)] hover:shadow-[0_0_18px_rgba(59,130,246,0.22)]",
  "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-[var(--panel-border)] disabled:hover:bg-[var(--panel-background)] disabled:hover:text-[var(--foreground)]/80 disabled:hover:shadow-none",
  RECORD_ACTION_GLOW_CLASS_NAME,
)

const RECORD_DESTRUCTIVE_ACTION_CLASS_NAME = joinClasses(
  "inline-flex items-center gap-2 rounded-lg border border-rose-500/40 bg-[var(--panel-background)] px-4 py-2 text-sm text-rose-500",
  "hover:border-rose-400/60 hover:bg-rose-500/10 hover:text-rose-400 hover:shadow-[0_0_18px_rgba(244,63,94,0.18)]",
  "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-rose-500/40 disabled:hover:bg-[var(--panel-background)] disabled:hover:text-rose-500 disabled:hover:shadow-none",
  RECORD_ACTION_GLOW_CLASS_NAME,
)

const RECORD_PRIMARY_ACTION_CLASS_NAME = joinClasses(
  FLOORING_PRIMARY_ACTION_BUTTON_CLASS_NAME,
  "rounded-lg hover:shadow-[0_0_18px_rgba(59,130,246,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
)

type RecordButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
}

type RecordLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode
  href: string
}

function RecordActionButton({
  className,
  children,
  type = "button",
  ...props
}: RecordButtonProps & { className: string }) {
  return (
    <button type={type} className={className} {...props}>
      {children}
    </button>
  )
}

function RecordActionLink({
  className,
  children,
  href,
  ...props
}: RecordLinkProps & { className: string }) {
  return (
    <Link href={href} className={className} {...props}>
      {children}
    </Link>
  )
}

export function RecordBackButton({
  label = "Back",
  href,
  onClick,
  className,
}: {
  label?: string
  href?: string
  onClick?: () => void
  className?: string
}) {
  const content = (
    <>
      <ArrowLeft size={16} />
      <span>{label}</span>
    </>
  )

  if (onClick) {
    return (
      <RecordActionButton onClick={onClick} className={joinClasses(RECORD_NEUTRAL_ACTION_CLASS_NAME, className)}>
        {content}
      </RecordActionButton>
    )
  }

  return (
    <RecordActionLink href={href ?? "#"} className={joinClasses(RECORD_NEUTRAL_ACTION_CLASS_NAME, className)}>
      {content}
    </RecordActionLink>
  )
}

export function RecordHeaderActionButton({ className, children, ...props }: RecordButtonProps) {
  return (
    <RecordActionButton className={joinClasses(RECORD_NEUTRAL_ACTION_CLASS_NAME, className)} {...props}>
      {children}
    </RecordActionButton>
  )
}

export function RecordHeaderActionLink({ className, children, href, ...props }: RecordLinkProps) {
  return (
    <RecordActionLink href={href} className={joinClasses(RECORD_NEUTRAL_ACTION_CLASS_NAME, className)} {...props}>
      {children}
    </RecordActionLink>
  )
}

export function RecordFooterNeutralButton({ className, children, ...props }: RecordButtonProps) {
  return (
    <RecordActionButton className={joinClasses(RECORD_NEUTRAL_ACTION_CLASS_NAME, className)} {...props}>
      {children}
    </RecordActionButton>
  )
}

export function RecordFooterDestructiveButton({ className, children, ...props }: RecordButtonProps) {
  return (
    <RecordActionButton className={joinClasses(RECORD_DESTRUCTIVE_ACTION_CLASS_NAME, className)} {...props}>
      {children}
    </RecordActionButton>
  )
}

export function RecordFooterPrimaryButton({ className, children, ...props }: RecordButtonProps) {
  return (
    <RecordActionButton className={joinClasses(RECORD_PRIMARY_ACTION_CLASS_NAME, className)} {...props}>
      {children}
    </RecordActionButton>
  )
}
