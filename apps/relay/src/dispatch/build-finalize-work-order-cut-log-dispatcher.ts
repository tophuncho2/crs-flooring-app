import {
  FINALIZE_WORK_ORDER_CUT_LOG_JOB_NAME,
  FINALIZE_WORK_ORDER_CUT_LOG_QUEUE,
  FINALIZE_WORK_ORDER_CUT_LOG_TOPIC,
  parseFinalizeWorkOrderCutLogPayload,
  type FinalizeWorkOrderCutLogPayload,
} from "@builders/domain"
import type { RedisConnectionConfig } from "@builders/lib"
import { Queue } from "bullmq"
import type { TopicDispatcher } from "./topic-dispatcher.js"

export function buildFinalizeWorkOrderCutLogDispatcher(
  connection: RedisConnectionConfig,
): TopicDispatcher<FinalizeWorkOrderCutLogPayload> {
  const queue = new Queue<FinalizeWorkOrderCutLogPayload>(
    FINALIZE_WORK_ORDER_CUT_LOG_QUEUE,
    { connection },
  )

  return {
    topic: FINALIZE_WORK_ORDER_CUT_LOG_TOPIC,
    jobName: FINALIZE_WORK_ORDER_CUT_LOG_JOB_NAME,
    queue,
    parsePayload: parseFinalizeWorkOrderCutLogPayload,
    // BullMQ rejects job ids containing `:` ("Custom Id cannot contain :").
    // The outbox row's UUID is deterministic per idempotencyKey (duplicate
    // writes return the existing row), so using `event.id` preserves
    // BullMQ-level deduplication of replayed enqueues without needing
    // colon sanitization. The human-readable key still lives on the outbox
    // row for dashboard / log correlation.
    buildJobId: (_payload, event) => event.id,
    close: () => queue.close(),
  }
}
