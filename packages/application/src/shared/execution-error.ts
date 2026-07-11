/**
 * Shared generic base for every module's `XExecutionError`.
 *
 * Each module keeps its own named subclass + `code` union so that per-module
 * `instanceof` checks (relied on in tests) stay intact. `this.name` resolves to
 * the concrete subclass name automatically via `new.target`, so a module file is
 * a one-liner: `export class XExecutionError extends BaseExecutionError<XCode> {}`.
 */
export class BaseExecutionError<TCode extends string> extends Error {
  readonly code: TCode
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: TCode
    message: string
    status: number
    field?: string
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = new.target.name
    this.code = input.code
    this.status = input.status
    this.field = input.field
    this.payload = input.payload
  }
}
