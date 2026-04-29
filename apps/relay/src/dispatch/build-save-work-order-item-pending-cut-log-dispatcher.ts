import {
  SAVE_WORK_ORDER_ITEM_PENDING_CUT_LOG_DIFF_JOB_NAME,
  SAVE_WORK_ORDER_ITEM_PENDING_CUT_LOG_DIFF_QUEUE,
  SAVE_WORK_ORDER_ITEM_PENDING_CUT_LOG_DIFF_TOPIC,
  parseSaveWorkOrderItemPendingCutLogDiffPayload,
  type SaveWorkOrderItemPendingCutLogDiffPayload,
} from "@builders/domain"
import type { RedisConnectionConfig } from "@builders/lib"
import { Queue } from "bullmq"
import type { TopicDispatcher } from "./topic-dispatcher.js"

export function buildSaveWorkOrderItemPendingCutLogDispatcher(
  connection: RedisConnectionConfig,
): TopicDispatcher<SaveWorkOrderItemPendingCutLogDiffPayload> {
  const queue = new Queue<SaveWorkOrderItemPendingCutLogDiffPayload>(
    SAVE_WORK_ORDER_ITEM_PENDING_CUT_LOG_DIFF_QUEUE,
    { connection },
  )

  return {
    topic: SAVE_WORK_ORDER_ITEM_PENDING_CUT_LOG_DIFF_TOPIC,
    jobName: SAVE_WORK_ORDER_ITEM_PENDING_CUT_LOG_DIFF_JOB_NAME,
    queue,
    parsePayload: parseSaveWorkOrderItemPendingCutLogDiffPayload,
    buildJobId: (_payload, event) => event.idempotencyKey,
    close: () => queue.close(),
  }
}
