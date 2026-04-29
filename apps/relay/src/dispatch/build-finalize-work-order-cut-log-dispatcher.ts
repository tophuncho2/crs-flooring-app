import {
  FINALIZE_WORK_ORDER_CUT_LOG_BATCH_JOB_NAME,
  FINALIZE_WORK_ORDER_CUT_LOG_BATCH_QUEUE,
  FINALIZE_WORK_ORDER_CUT_LOG_BATCH_TOPIC,
  parseFinalizeWorkOrderCutLogBatchPayload,
  type FinalizeWorkOrderCutLogBatchPayload,
} from "@builders/domain"
import type { RedisConnectionConfig } from "@builders/lib"
import { Queue } from "bullmq"
import type { TopicDispatcher } from "./topic-dispatcher.js"

export function buildFinalizeWorkOrderCutLogDispatcher(
  connection: RedisConnectionConfig,
): TopicDispatcher<FinalizeWorkOrderCutLogBatchPayload> {
  const queue = new Queue<FinalizeWorkOrderCutLogBatchPayload>(
    FINALIZE_WORK_ORDER_CUT_LOG_BATCH_QUEUE,
    { connection },
  )

  return {
    topic: FINALIZE_WORK_ORDER_CUT_LOG_BATCH_TOPIC,
    jobName: FINALIZE_WORK_ORDER_CUT_LOG_BATCH_JOB_NAME,
    queue,
    parsePayload: parseFinalizeWorkOrderCutLogBatchPayload,
    buildJobId: (_payload, event) => event.idempotencyKey,
    close: () => queue.close(),
  }
}
