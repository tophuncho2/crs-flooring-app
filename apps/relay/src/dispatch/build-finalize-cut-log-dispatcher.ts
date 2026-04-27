import {
  FINALIZE_CUT_LOG_JOB_NAME,
  FINALIZE_CUT_LOG_QUEUE,
  FINALIZE_CUT_LOG_TOPIC,
  parseFinalizeCutLogBatchPayload,
  type FinalizeCutLogBatchPayload,
} from "@builders/domain"
import type { RedisConnectionConfig } from "@builders/lib"
import { Queue } from "bullmq"
import type { TopicDispatcher } from "./topic-dispatcher.js"

export function buildFinalizeCutLogDispatcher(
  connection: RedisConnectionConfig,
): TopicDispatcher<FinalizeCutLogBatchPayload> {
  const queue = new Queue<FinalizeCutLogBatchPayload>(
    FINALIZE_CUT_LOG_QUEUE,
    { connection },
  )

  return {
    topic: FINALIZE_CUT_LOG_TOPIC,
    jobName: FINALIZE_CUT_LOG_JOB_NAME,
    queue,
    parsePayload: parseFinalizeCutLogBatchPayload,
    buildJobId: (_payload, event) => event.idempotencyKey,
    close: () => queue.close(),
  }
}
