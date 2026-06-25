"use client"

export default function HeaderControls() {
  return (
    <div className="flex w-full max-w-full items-center justify-between gap-2 sm:gap-4">
      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <div id="record-back-button-slot" className="contents" />
        <div id="record-stepper-slot" className="contents" />
        <div id="list-meta-slot" className="contents" />
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <div id="list-tools-slot" className="contents" />
        <div id="page-action-slot" className="contents" />
      </div>
    </div>
  )
}
