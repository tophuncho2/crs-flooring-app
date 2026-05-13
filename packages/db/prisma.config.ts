import { createRequire } from "node:module"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig, env } from "prisma/config"

const require = createRequire(import.meta.url)
const currentDirectory = dirname(fileURLToPath(import.meta.url))

process.env.DOTENV_CONFIG_PATH ??= resolve(currentDirectory, "../../.env")
require("dotenv/config")

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node -r dotenv/config scripts/seed.js",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
})
