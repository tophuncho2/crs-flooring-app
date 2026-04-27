import {
  PENDING_SAVE_CUT_LOG_JOB_NAME,
  PENDING_SAVE_CUT_LOG_QUEUE,
  PENDING_SAVE_CUT_LOG_TOPIC,
  parsePendingSaveCutLogBatchPayload,
  type PendingSaveCutLogBatchPayload,
} from "@builders/domain"
import type { RedisConnectionConfig } from "@builders/lib"
import { Queue } from "bullmq"
import type { TopicDispatcher } from "./topic-dispatcher.js"

export function buildPendingSaveCutLogDispatcher(
  connection: RedisConnectionConfig,
): TopicDispatcher<PendingSaveCutLogBatchPayload> {
  const queue = new Queue<PendingSaveCutLogBatchPayload>(
    PENDING_SAVE_CUT_LOG_QUEUE,
    { connection },
  )

  return {
    topic: PENDING_SAVE_CUT_LOG_TOPIC,
    jobName: PENDING_SAVE_CUT_LOG_JOB_NAME,
    queue,
    parsePayload: parsePendingSaveCutLogBatchPayload,
    buildJobId: (_payload, event) => event.idempotencyKey,
    close: () => queue.close(),
  }
}
