import { test as setup } from "@playwright/test"
import { loginAsE2EUser } from "./helpers/login"

export const STORAGE_STATE_PATH = "playwright/.auth/user.json"

setup("authenticate", async ({ page }) => {
  await loginAsE2EUser(page)
  await page.context().storageState({ path: STORAGE_STATE_PATH })
})
