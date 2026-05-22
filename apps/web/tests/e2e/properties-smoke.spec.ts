import { test, expect } from "@playwright/test"
import { e2eCredentialsMissing } from "./helpers/login"

test.describe("properties smoke", () => {
  test.skip(e2eCredentialsMissing, "Set E2E_EMAIL and E2E_PASSWORD to run the smoke suite.")

  test("creates a hub (MC + property) from the properties list", async ({ page }) => {
    const stamp = Date.now()
    const companyName = `Smoke Prop MC ${stamp}`
    const propertyName = `Smoke Property ${stamp}`

    await page.goto("/dashboard/properties")
    await expect(page.getByText("Properties", { exact: true })).toBeVisible()

    await page.getByRole("button", { name: "+ Hub" }).click()

    await page.getByLabel("New company name").fill(companyName)
    await page.getByLabel("New company phone").fill("555-0200")
    await page.getByLabel("New company email").fill(`prop-mc-${stamp}@smoke.test`)
    await page.getByLabel("New company street address").fill("3 Smoke MC Way")
    await page.getByLabel("New company city").fill("Smoketown")
    await page.getByLabel("New company state").fill("CA")
    await page.getByLabel("New company zip").fill("90001")

    await page.getByLabel("Property name").fill(propertyName)
    await page.getByLabel("Property phone").fill("555-0201")
    await page.getByLabel("Property email").fill(`prop-${stamp}@smoke.test`)
    await page.getByLabel("Property street address").fill("4 Smoke Property Ln")
    await page.getByLabel("Property city").fill("Smoketown")
    await page.getByLabel("Property state").fill("CA")
    await page.getByLabel("Property zip").fill("90001")

    await page.getByRole("button", { name: "Create" }).click()

    // Properties list is paginated; filter by name to scope the assertion.
    await page.getByRole("searchbox", { name: "Search property" }).fill(propertyName)
    await expect(
      page.getByRole("button", { name: `Open property ${propertyName}` }),
    ).toBeVisible()
  })
})
