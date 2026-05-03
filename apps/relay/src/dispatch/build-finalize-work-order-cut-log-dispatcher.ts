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
    buildJobId: (_payload, event) => event.idempotencyKey,
    close: () => queue.close(),
  }
}
