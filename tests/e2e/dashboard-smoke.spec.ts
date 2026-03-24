import { test, expect } from "@playwright/test"

const e2eEmail = process.env.E2E_EMAIL
const e2ePassword = process.env.E2E_PASSWORD

test.describe("dashboard smoke", () => {
  test.skip(!e2eEmail || !e2ePassword, "Set E2E_EMAIL and E2E_PASSWORD to run the smoke suite.")

  test("logs in, navigates the dashboard, and creates then saves a warehouse", async ({ page }) => {
    const warehouseName = `Smoke Warehouse ${Date.now()}`

    await page.goto("/login")
    await page.getByPlaceholder("Email").fill(e2eEmail ?? "")
    await page.getByPlaceholder("Password").fill(e2ePassword ?? "")
    await page.getByRole("button", { name: "Sign In" }).click()

    await page.waitForURL("**/dashboard/flooring/inventory")
    await expect(page).toHaveURL(/\/dashboard\/flooring\/inventory/)

    await page.getByRole("link", { name: "Warehouse" }).click()
    await page.waitForURL("**/dashboard/flooring/warehouse")
    await expect(page.getByRole("heading", { name: "Warehouse" })).toBeVisible()

    await page.getByRole("button", { name: "Add Warehouse" }).click()
    await page.getByLabel("Warehouse Name").fill(warehouseName)
    await page.getByLabel("Address").fill("1 Smoke Test Way")
    await page.getByRole("button", { name: "Create Warehouse" }).click()

    await page.waitForURL(/\/dashboard\/flooring\/warehouse\/.+/)
    await expect(page.getByDisplayValue(warehouseName)).toBeVisible()

    await page.getByLabel("Store Phone").fill("555-0101")
    await page.getByRole("button", { name: "Save Warehouse" }).click()
    await expect(page.getByText("Warehouse saved")).toBeVisible()
  })
})
