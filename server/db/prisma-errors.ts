import { Prisma } from "@prisma/client"

export type PrismaConnectivityIssue = {
  code: "P1001" | "P1017" | "INIT"
  title: string
  message: string
  detail: string
}

export type PrismaPageDataResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: PrismaConnectivityIssue }

export function getPrismaConnectivityIssue(error: unknown): PrismaConnectivityIssue | null {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    const detail = error.message.includes("Can't reach database server")
      ? "Prisma could not establish a connection to the database server."
      : "Prisma could not initialize a database connection for this request."

    return {
      code: error.message.includes("Can't reach database server") ? "P1001" : "INIT",
      title: "Database Unavailable",
      message: "The app could not reach the database while loading this page.",
      detail,
    }
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P1001") {
      return {
        code: "P1001",
        title: "Database Unavailable",
        message: "The app could not reach the database server.",
        detail: "Prisma reported that the database host or proxy could not be reached.",
      }
    }

    if (error.code === "P1017" || error.message.includes("Server has closed the connection")) {
      return {
        code: "P1017",
        title: "Database Connection Dropped",
        message: "The database connection was closed while this request was running.",
        detail: "Prisma lost its Postgres connection during the page load and the request should be retried.",
      }
    }
  }

  return null
}

export async function withPrismaConnectivityHandling<T>(loader: () => Promise<T>): Promise<PrismaPageDataResult<T>> {
  try {
    const data = await loader()
    return { ok: true, data }
  } catch (error) {
    const connectivityIssue = getPrismaConnectivityIssue(error)
    if (connectivityIssue) {
      return { ok: false, error: connectivityIssue }
    }

    throw error
  }
}
