import bcrypt from "bcrypt"
import { findUserByEmail, setUserPassword, withDatabaseTransaction } from "@builders/db"
import { GovernanceExecutionError } from "./errors.js"

const BCRYPT_ROUNDS = 10

export async function setUserPasswordUseCase(input: {
  email: string
  password: string
}): Promise<{ ok: true }> {
  const email = input.email.trim().toLowerCase()

  const user = await findUserByEmail(email)

  if (!user) {
    throw new GovernanceExecutionError({
      code: "GOVERNANCE_USER_NOT_FOUND",
      message: "Unable to set password for this account",
      status: 404,
    })
  }

  if (user.password !== null) {
    throw new GovernanceExecutionError({
      code: "GOVERNANCE_PASSWORD_ALREADY_SET",
      message: "Password has already been set for this account",
      status: 409,
    })
  }

  const hashedPassword = await bcrypt.hash(input.password, BCRYPT_ROUNDS)

  await withDatabaseTransaction(async (tx) => {
    await setUserPassword(user.id, hashedPassword, tx)
  })

  return { ok: true }
}
