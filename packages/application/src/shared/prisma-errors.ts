import { Prisma } from "@builders/db"

export { isP2002 } from "@builders/db"

export function isP2025(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025"
  )
}

export function isP2003(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003"
  )
}
