import {
  GENERATE_WORK_ORDER_FILE_JOB_NAME,
  GENERATE_WORK_ORDER_FILE_QUEUE,
  GENERATE_WORK_ORDER_FILE_TOPIC,
  parseGenerateWorkOrderFilePayload,
  type GenerateWorkOrderFilePayload,
} from "@builders/domain"
import type { RedisConnectionConfig } from "@builders/lib"
import { Queue } from "bullmq"
import type { TopicDispatcher } from "./topic-dispatcher.js"

export function buildWorkOrderFileGenerationDispatcher(
  connection: RedisConnectionConfig,
): TopicDispatcher<GenerateWorkOrderFilePayload> {
  const queue = new Queue<GenerateWorkOrderFilePayload>(
    GENERATE_WORK_ORDER_FILE_QUEUE,
    { connection },
  )

  return {
    topic: GENERATE_WORK_ORDER_FILE_TOPIC,
    jobName: GENERATE_WORK_ORDER_FILE_JOB_NAME,
    queue,
    parsePayload: parseGenerateWorkOrderFilePayload,
    buildJobId: (_payload, event) => event.idempotencyKey,
    close: () => queue.close(),
  }
}
