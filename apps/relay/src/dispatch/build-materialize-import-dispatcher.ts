import {
  IMPORT_MATERIALIZE_JOB_NAME,
  IMPORT_MATERIALIZE_QUEUE,
  IMPORT_MATERIALIZE_TOPIC,
  parseImportMaterializeBatchPayload,
  type ImportMaterializeBatchPayload,
} from "@builders/domain"
import type { RedisConnectionConfig } from "@builders/lib"
import { Queue } from "bullmq"
import type { TopicDispatcher } from "./topic-dispatcher.js"

export function buildMaterializeImportDispatcher(
  connection: RedisConnectionConfig,
): TopicDispatcher<ImportMaterializeBatchPayload> {
  const queue = new Queue<ImportMaterializeBatchPayload>(IMPORT_MATERIALIZE_QUEUE, {
    connection,
  })

  return {
    topic: IMPORT_MATERIALIZE_TOPIC,
    jobName: IMPORT_MATERIALIZE_JOB_NAME,
    queue,
    parsePayload: parseImportMaterializeBatchPayload,
    buildJobId: (_payload, event) => event.idempotencyKey,
    close: () => queue.close(),
  }
}
