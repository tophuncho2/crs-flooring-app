import type { Server } from "node:http"
import { createBullBoard } from "@bull-board/api"
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter"
import { ExpressAdapter } from "@bull-board/express"
import type { AutoAllocateWorkOrderJobV1, GenerateWorkOrderInvoiceJobV1 } from "@builders/domain"
import { logStructuredEvent } from "@builders/lib"
import type { Queue } from "bullmq"
import express, { type Request, type Response, type NextFunction } from "express"
import type { RelayEnvironment } from "./env.js"

function unauthorized(response: Response) {
  response.setHeader("WWW-Authenticate", 'Basic realm="Bull Board"')
  response.status(401).send("Authentication required")
}

function createBasicAuthMiddleware(username: string, password: string) {
  return function basicAuth(request: Request, response: Response, next: NextFunction) {
    const authorization = request.headers.authorization
    if (!authorization?.startsWith("Basic ")) {
      unauthorized(response)
      return
    }

    const credentials = Buffer.from(authorization.slice("Basic ".length), "base64").toString("utf8")
    const separatorIndex = credentials.indexOf(":")
    const actualUsername = separatorIndex >= 0 ? credentials.slice(0, separatorIndex) : credentials
    const actualPassword = separatorIndex >= 0 ? credentials.slice(separatorIndex + 1) : ""

    if (actualUsername !== username || actualPassword !== password) {
      unauthorized(response)
      return
    }

    next()
  }
}

export async function startBullBoardServer({
  env,
  invoiceQueue,
  autoAllocationQueue,
}: {
  env: RelayEnvironment
  invoiceQueue: Queue<GenerateWorkOrderInvoiceJobV1>
  autoAllocationQueue: Queue<AutoAllocateWorkOrderJobV1>
}) {
  if (!env.bullBoard.enabled) {
    return null
  }

  const app = express()
  const serverAdapter = new ExpressAdapter()
  serverAdapter.setBasePath(env.bullBoard.basePath)

  createBullBoard({
    queues: [
      new BullMQAdapter(invoiceQueue, { readOnlyMode: true }),
      new BullMQAdapter(autoAllocationQueue, { readOnlyMode: true }),
    ],
    serverAdapter,
  })

  app.get("/healthz", (_request: any, response: any) => {
    response.status(200).json({ ok: true })
  })

  if (env.bullBoard.username && env.bullBoard.password) {
    app.use(env.bullBoard.basePath, createBasicAuthMiddleware(env.bullBoard.username, env.bullBoard.password), serverAdapter.getRouter())
  } else {
    app.use(env.bullBoard.basePath, serverAdapter.getRouter())
  }

  const server = await new Promise<Server>((resolve) => {
    const instance = app.listen(env.bullBoard.port, env.bullBoard.host, () => resolve(instance))
  })

  logStructuredEvent({
    service: env.serviceName,
    environment: env.environmentName,
    message: "Bull Board ready",
    action: "relay.bull_board.ready",
    status: "ready",
    details: {
      host: env.bullBoard.host,
      port: env.bullBoard.port,
      basePath: env.bullBoard.basePath,
      readOnlyMode: true,
      authEnabled: Boolean(env.bullBoard.username && env.bullBoard.password),
      localUrl: `http://localhost:${env.bullBoard.port}${env.bullBoard.basePath}`,
    },
  })

  return {
    async close() {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error)
            return
          }
          resolve()
        })
      })
    },
  }
}
