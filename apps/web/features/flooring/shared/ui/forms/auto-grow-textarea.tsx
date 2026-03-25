"use client"

import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react"

export function AutoGrowTextarea({
  className = "",
  value,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return

    element.style.height = "auto"
    element.style.height = `${element.scrollHeight}px`
  }, [value])

  return (
    <textarea
      {...props}
      ref={ref}
      rows={1}
      value={value}
      className={`min-h-11 resize-none overflow-hidden ${className}`.trim()}
    />
  )
}
