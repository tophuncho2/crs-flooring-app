import { spawn } from "node:child_process"
import { resolve } from "node:path"
import dotenv from "dotenv"

const [command, ...args] = process.argv.slice(2)

if (!command) {
  console.error("Usage: node run-with-root-env.mjs <command> [...args]")
  process.exit(1)
}

dotenv.config({
  path: process.env.DOTENV_CONFIG_PATH ?? resolve(process.cwd(), "../../.env"),
})

const shouldUseNode = /\.(?:[cm]?js)$/i.test(command)
const child = spawn(shouldUseNode ? process.execPath : command, shouldUseNode ? [command, ...args] : args, {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
})

child.on("error", (error) => {
  console.error(error)
  process.exit(1)
})

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 1)
})
