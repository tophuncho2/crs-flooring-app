import { createRequire } from "node:module"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "prisma/config"

const require = createRequire(import.meta.url)
const currentDirectory = dirname(fileURLToPath(import.meta.url))

process.env.DOTENV_CONFIG_PATH ??= resolve(currentDirectory, "../../.env")
require("dotenv/config")

export default defineConfig({
  earlyAccess: true,
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
})
