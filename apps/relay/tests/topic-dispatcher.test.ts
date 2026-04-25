import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  dispatchBatchForTopic,
  type TopicDispatcher,
  type TopicDispatcherDependencies,
} from "../src/dispatch/topic-dispatcher.js"

const env = {
  queueRedisUrl: "redis://localhost:6379",
  batchSize: 20,
  pollIntervalMs: 2000,
  claimTtlMs: 30000,
  maxAttempts: 3,
  bullBoard: {
    enabled: false,
    host: "0.0.0.0",
    port: 3011,
    basePath: "/admin/queues",
    username: null,
    password: null,
  },
  environmentName: "test",
  serviceName: "builders-relay",
}

const TOPIC = "test.topic"
const JOB_NAME = "test-job"

const samplePayload = { version: "v1", id: "abc" }

function buildEvent(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "event-1",
    topic: TOPIC,
    aggregateType: "TestAggregate",
    aggregateId: "agg-1",
    idempotencyKey: "test:agg-1",
    payloadJson: samplePayload,
    status: "PENDING",
    availableAt: "2026-04-25T00:00:00.000Z",
    lockedAt: null,
    lockedBy: null,
    dispatchedAt: null,
    attemptCount: 0,
    lastError: null,
    createdAt: "2026-04-25T00:00:00.000Z",
    updatedAt: "2026-04-25T00:00:00.000Z",
    ...overrides,
  }
}

function buildQueue(overrides: Partial<{ add: ReturnType<typeof vi.fn>; getJob: ReturnType<typeof vi.fn> }> = {}) {
  return {
    add: overrides.add ?? vi.fn().mockResolvedValue({ id: "job-1" }),
    getJob: overrides.getJob ?? vi.fn().mockResolvedValue(null),
  }
}

function buildDispatcher(queueOverrides?: Parameters<typeof buildQueue>[0]): TopicDispatcher<typeof samplePayload> {
  const queue = buildQueue(queueOverrides)
  return {
    topic: TOPIC,
    jobName: JOB_NAME,
    // biome-ignore lint/suspicious/noExplicitAny: minimal queue stub for tests
    queue: queue as any,
    parsePayload: (raw) => raw as typeof samplePayload,
    buildJobId: (_payload, event) => event.idempotencyKey,
    close: vi.fn().mockResolvedValue(undefined),
  }
}

function buildDeps(overrides: Partial<TopicDispatcherDependencies> = {}): TopicDispatcherDependencies {
  return {
    listClaimableEvents: overrides.listClaimableEvents ?? vi.fn().mockResolvedValue([]),
    claimEvent: overrides.claimEvent ?? vi.fn().mockResolvedValue(null),
    markEventDispatched: overrides.markEventDispatched ?? vi.fn().mockResolvedValue(undefined),
    retryEvent: overrides.retryEvent ?? vi.fn().mockResolvedValue(undefined),
    exhaustEvent: overrides.exhaustEvent ?? vi.fn().mockResolvedValue(undefined),
  }
}

describe("dispatchBatchForTopic", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("claims, enqueues, and marks dispatched on the happy path", async () => {
    const event = buildEvent()
    const dispatcher = buildDispatcher()
    const deps = buildDeps({
      listClaimableEvents: vi.fn().mockResolvedValue([event]),
      claimEvent: vi.fn().mockResolvedValue(event),
    })

    const result = await dispatchBatchForTopic(env, dispatcher, deps)

    expect(result).toEqual({ scannedCount: 1, dispatchedCount: 1 })
    expect(dispatcher.queue.add).toHaveBeenCalledWith(
      JOB_NAME,
      samplePayload,
      expect.objectContaining({ jobId: event.idempotencyKey }),
    )
    expect(deps.markEventDispatched).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: event.id }),
    )
    expect(deps.retryEvent).not.toHaveBeenCalled()
    expect(deps.exhaustEvent).not.toHaveBeenCalled()
  })

  it("treats a duplicate BullMQ job as an idempotent dispatch", async () => {
    const event = buildEvent()
    const dispatcher = buildDispatcher({
      add: vi.fn().mockRejectedValue(new Error("job exists")),
      getJob: vi.fn().mockResolvedValue({ id: "job-1" }),
    })
    const deps = buildDeps({
      listClaimableEvents: vi.fn().mockResolvedValue([event]),
      claimEvent: vi.fn().mockResolvedValue(event),
    })

    const result = await dispatchBatchForTopic(env, dispatcher, deps)

    expect(result).toEqual({ scannedCount: 1, dispatchedCount: 1 })
    expect(deps.markEventDispatched).toHaveBeenCalled()
    expect(deps.retryEvent).not.toHaveBeenCalled()
    expect(deps.exhaustEvent).not.toHaveBeenCalled()
  })

  it("retries when enqueue fails and attempts remain", async () => {
    const event = buildEvent({ attemptCount: 0 })
    const dispatcher = buildDispatcher({
      add: vi.fn().mockRejectedValue(new Error("redis down")),
      getJob: vi.fn().mockResolvedValue(null),
    })
    const deps = buildDeps({
      listClaimableEvents: vi.fn().mockResolvedValue([event]),
      claimEvent: vi.fn().mockResolvedValue(event),
    })

    const result = await dispatchBatchForTopic(env, dispatcher, deps)

    expect(result).toEqual({ scannedCount: 1, dispatchedCount: 0 })
    expect(deps.retryEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: event.id, lastError: "redis down" }),
    )
    expect(deps.exhaustEvent).not.toHaveBeenCalled()
    expect(deps.markEventDispatched).not.toHaveBeenCalled()
  })

  it("exhausts when enqueue fails and attempts are exceeded", async () => {
    const event = buildEvent({ attemptCount: env.maxAttempts - 1 })
    const dispatcher = buildDispatcher({
      add: vi.fn().mockRejectedValue(new Error("redis down")),
      getJob: vi.fn().mockResolvedValue(null),
    })
    const deps = buildDeps({
      listClaimableEvents: vi.fn().mockResolvedValue([event]),
      claimEvent: vi.fn().mockResolvedValue(event),
    })

    const result = await dispatchBatchForTopic(env, dispatcher, deps)

    expect(result).toEqual({ scannedCount: 1, dispatchedCount: 0 })
    expect(deps.exhaustEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: event.id, lastError: "redis down" }),
    )
    expect(deps.retryEvent).not.toHaveBeenCalled()
  })

  it("exhausts immediately on payload parse failure (poison message)", async () => {
    const event = buildEvent()
    const dispatcher: TopicDispatcher<typeof samplePayload> = {
      ...buildDispatcher(),
      parsePayload: () => {
        throw new Error("schema mismatch")
      },
    }
    const deps = buildDeps({
      listClaimableEvents: vi.fn().mockResolvedValue([event]),
      claimEvent: vi.fn().mockResolvedValue(event),
    })

    const result = await dispatchBatchForTopic(env, dispatcher, deps)

    expect(result).toEqual({ scannedCount: 1, dispatchedCount: 0 })
    expect(deps.exhaustEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: event.id, lastError: "schema mismatch" }),
    )
    expect(dispatcher.queue.add).not.toHaveBeenCalled()
    expect(deps.retryEvent).not.toHaveBeenCalled()
  })

  it("skips events that fail to claim (raced)", async () => {
    const event = buildEvent()
    const dispatcher = buildDispatcher()
    const deps = buildDeps({
      listClaimableEvents: vi.fn().mockResolvedValue([event]),
      claimEvent: vi.fn().mockResolvedValue(null),
    })

    const result = await dispatchBatchForTopic(env, dispatcher, deps)

    expect(result).toEqual({ scannedCount: 1, dispatchedCount: 0 })
    expect(dispatcher.queue.add).not.toHaveBeenCalled()
    expect(deps.markEventDispatched).not.toHaveBeenCalled()
    expect(deps.retryEvent).not.toHaveBeenCalled()
    expect(deps.exhaustEvent).not.toHaveBeenCalled()
  })
})
