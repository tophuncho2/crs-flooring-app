// @vitest-environment jsdom

import { afterEach, beforeEach, describe, it, expect, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { RecordStepperPortal } from "@/engines/record-view"

const SLOT_ID = "record-stepper-slot"

describe("RecordStepperPortal", () => {
  // The stepper portals into a slot located by id with a no-op `subscribe`, so
  // the slot must exist in the DOM before the first render. Portaled output
  // lands in document.body — query it via `screen`, not the render container.
  beforeEach(() => {
    const slot = document.createElement("div")
    slot.id = SLOT_ID
    document.body.appendChild(slot)
  })

  afterEach(() => {
    cleanup()
    document.getElementById(SLOT_ID)?.remove()
  })

  it("renders the label and both arrows into the slot", () => {
    render(
      <RecordStepperPortal label="INV-1" isDirty={false} onPrevious={vi.fn()} onNext={vi.fn()} />,
    )

    expect(screen.getByText("INV-1")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Previous record" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Next record" })).toBeTruthy()
  })

  it("steps immediately when the record is clean", () => {
    const onNext = vi.fn()
    render(
      <RecordStepperPortal label="INV-1" isDirty={false} onPrevious={vi.fn()} onNext={onNext} />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Next record" }))

    expect(onNext).toHaveBeenCalledTimes(1)
    expect(screen.queryByText("Discard unsaved changes?")).toBeNull()
  })

  it("intercepts the step with a discard prompt when the record is dirty (no crossover)", () => {
    const onNext = vi.fn()
    render(
      <RecordStepperPortal label="INV-1" isDirty onPrevious={vi.fn()} onNext={onNext} />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Next record" }))

    expect(onNext).not.toHaveBeenCalled()
    expect(screen.getByText("Discard unsaved changes?")).toBeTruthy()
  })

  it("runs the step after the discard prompt is confirmed", () => {
    const onNext = vi.fn()
    render(
      <RecordStepperPortal label="INV-1" isDirty onPrevious={vi.fn()} onNext={onNext} />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Next record" }))
    fireEvent.click(screen.getByRole("button", { name: "Discard" }))

    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it("aborts the step when the discard prompt is dismissed with Keep editing", () => {
    const onNext = vi.fn()
    render(
      <RecordStepperPortal label="INV-1" isDirty onPrevious={vi.fn()} onNext={onNext} />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Next record" }))
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }))

    expect(onNext).not.toHaveBeenCalled()
    expect(screen.queryByText("Discard unsaved changes?")).toBeNull()
  })

  it("disables an arrow at the sequence edge", () => {
    const onPrevious = vi.fn()
    render(
      <RecordStepperPortal label="INV-1" isDirty={false} onPrevious={null} onNext={vi.fn()} />,
    )

    const prev = screen.getByRole("button", { name: "Previous record" }) as HTMLButtonElement
    expect(prev.disabled).toBe(true)

    fireEvent.click(prev)
    expect(onPrevious).not.toHaveBeenCalled()
  })

  it("retains the last label while a step is pending, then updates (flicker fix)", () => {
    const { rerender } = render(
      <RecordStepperPortal label="INV-1" isDirty={false} onPrevious={vi.fn()} onNext={vi.fn()} />,
    )
    expect(screen.getByText("INV-1")).toBeTruthy()

    // Pending step: the consumer passes an empty label + disabled arrows while
    // the neighbor's detail loads — the control holds the last number steady.
    rerender(
      <RecordStepperPortal label="" isDirty={false} onPrevious={null} onNext={null} />,
    )
    expect(screen.getByText("INV-1")).toBeTruthy()

    // Neighbor resolved: the new number takes over.
    rerender(
      <RecordStepperPortal label="INV-2" isDirty={false} onPrevious={vi.fn()} onNext={vi.fn()} />,
    )
    expect(screen.getByText("INV-2")).toBeTruthy()
    expect(screen.queryByText("INV-1")).toBeNull()
  })
})

describe("RecordStepperPortal without a slot", () => {
  afterEach(() => cleanup())

  it("renders nothing when the slot is absent", () => {
    render(
      <RecordStepperPortal label="INV-1" isDirty={false} onPrevious={vi.fn()} onNext={vi.fn()} />,
    )

    expect(screen.queryByRole("button", { name: "Next record" })).toBeNull()
  })
})
