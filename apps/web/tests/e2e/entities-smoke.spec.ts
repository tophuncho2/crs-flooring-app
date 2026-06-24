import { test, expect } from "@playwright/test"
import { e2eCredentialsMissing } from "./helpers/login"

test.describe("management-companies smoke", () => {
  test.skip(e2eCredentialsMissing, "Set E2E_EMAIL and E2E_PASSWORD to run the smoke suite.")

  test("creates a hub (MC + property) from the management-companies list", async ({ page }) => {
    const stamp = Date.now()
    const companyName = `Smoke MC ${stamp}`
    const propertyName = `Smoke MC Property ${stamp}`

    await page.goto("/dashboard/management-companies")
    await expect(page.getByText("Management Companies", { exact: true })).toBeVisible()

    await page.getByRole("button", { name: "+ Hub" }).click()

    await page.getByLabel("New company name").fill(companyName)
    await page.getByLabel("New company phone").fill("555-0100")
    await page.getByLabel("New company email").fill(`mc-${stamp}@smoke.test`)
    await page.getByLabel("New company street address").fill("1 Smoke MC Way")
    await page.getByLabel("New company city").fill("Smoketown")
    await page.getByLabel("New company state").fill("CA")
    await page.getByLabel("New company zip").fill("90001")

    await page.getByLabel("Property name").fill(propertyName)
    await page.getByLabel("Property street address").fill("2 Smoke Property Ln")
    await page.getByLabel("Property city").fill("Smoketown")
    await page.getByLabel("Property state").fill("CA")
    await page.getByLabel("Property zip").fill("90001")

    await page.getByRole("button", { name: "Create" }).click()

    await expect(
      page.getByRole("button", { name: `Open management company ${companyName}` }),
    ).toBeVisible()
  })
})
