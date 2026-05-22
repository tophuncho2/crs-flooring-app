import { expect, type Page } from "@playwright/test"

export const e2eEmail = process.env.E2E_EMAIL
export const e2ePassword = process.env.E2E_PASSWORD

export const e2eCredentialsMissing = !e2eEmail || !e2ePassword

export async function loginAsE2EUser(page: Page) {
  await page.goto("/login", { waitUntil: "networkidle" })
  await page.getByPlaceholder("Email").fill(e2eEmail ?? "")
  await page.getByRole("button", { name: "Continue" }).click()
  await expect(page.getByPlaceholder("Password")).toBeVisible({ timeout: 30_000 })
  await page.getByPlaceholder("Password").fill(e2ePassword ?? "")
  await page.getByRole("button", { name: "Sign In" }).click()
  await page.waitForURL("**/dashboard/**", { timeout: 30_000 })
  await expect(page).toHaveURL(/\/dashboard\//)
}
