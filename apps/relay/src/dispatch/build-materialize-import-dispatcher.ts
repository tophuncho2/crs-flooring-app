import {
  IMPORT_MATERIALIZE_JOB_NAME,
  IMPORT_MATERIALIZE_QUEUE,
  IMPORT_MATERIALIZE_TOPIC,
  parseImportMaterializeBatchPayload,
  type ImportMaterializeBatchPayload,
} from "@builders/domain"
import type { RedisConnectionConfig } from "@builders/lib"
import { Queue } from "bullmq"
import type { RelayEnvironment } from "../env.js"
import type { TopicDispatcher } from "./topic-dispatcher.js"

export function buildMaterializeImportDispatcher(
  connection: RedisConnectionConfig,
  env: RelayEnvironment,
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
    // Turn worker retries ON: transient failures (DB blip, Redis hiccup) the
    // handler rethrows now retry with exponential backoff instead of
    // dead-lettering on the first miss. Safe atop subset-materialize idempotency.
    jobOptions: {
      attempts: env.materializeJob.attempts,
      backoff: { type: "exponential", delay: env.materializeJob.backoffMs },
      removeOnComplete: env.materializeJob.removeOnComplete,
      removeOnFail: env.materializeJob.removeOnFail,
    },
    close: () => queue.close(),
  }
}
