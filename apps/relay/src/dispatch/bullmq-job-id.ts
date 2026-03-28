export function toBullMqJobId(idempotencyKey: string) {
  return Buffer.from(idempotencyKey, "utf8").toString("base64url")
}
