import {
  VOID_CUT_LOG_JOB_NAME,
  VOID_CUT_LOG_QUEUE,
  VOID_CUT_LOG_TOPIC,
  parseVoidCutLogPayload,
  type VoidCutLogPayload,
} from "@builders/domain"
import type { RedisConnectionConfig } from "@builders/lib"
import { Queue } from "bullmq"
import type { TopicDispatcher } from "./topic-dispatcher.js"

export function buildVoidCutLogDispatcher(
  connection: RedisConnectionConfig,
): TopicDispatcher<VoidCutLogPayload> {
  const queue = new Queue<VoidCutLogPayload>(VOID_CUT_LOG_QUEUE, {
    connection,
  })

  return {
    topic: VOID_CUT_LOG_TOPIC,
    jobName: VOID_CUT_LOG_JOB_NAME,
    queue,
    parsePayload: parseVoidCutLogPayload,
    buildJobId: (_payload, event) => event.idempotencyKey,
    close: () => queue.close(),
  }
}
