import type { RedisConnectionConfig } from "@builders/lib"
import { buildFinalizeCutLogDispatcher } from "./build-finalize-cut-log-dispatcher.js"
import { buildMaterializeImportDispatcher } from "./build-materialize-import-dispatcher.js"
import { buildPendingSaveCutLogDispatcher } from "./build-pending-save-cut-log-dispatcher.js"
import { buildVoidCutLogDispatcher } from "./build-void-cut-log-dispatcher.js"
import type { TopicDispatcher } from "./topic-dispatcher.js"

/**
 * Topic registry. To add a new outbox topic:
 * 1. Add the contract artifact under `packages/domain/src/queue/`.
 * 2. Add a `build<Thing>Dispatcher(connection)` next to this file.
 * 3. Append it to the list returned here.
 *
 * The relay's polling loop iterates this list per tick.
 */

// biome-ignore lint/suspicious/noExplicitAny: each dispatcher narrows internally via its closure
export type AnyTopicDispatcher = TopicDispatcher<any>

export function buildDispatchers(connection: RedisConnectionConfig): AnyTopicDispatcher[] {
  return [
    buildMaterializeImportDispatcher(connection),
    buildPendingSaveCutLogDispatcher(connection),
    buildFinalizeCutLogDispatcher(connection),
    buildVoidCutLogDispatcher(connection),
  ]
}
