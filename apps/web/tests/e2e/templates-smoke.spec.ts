import { test, expect } from "@playwright/test"
import { e2eCredentialsMissing } from "./helpers/login"

test.describe("templates smoke", () => {
  test.skip(e2eCredentialsMissing, "Set E2E_EMAIL and E2E_PASSWORD to run the smoke suite.")

  test("creates a template with an inline-new property and lands on the template hub", async ({ page }) => {
    const stamp = Date.now()
    const entityName = `Smoke Tmpl Entity ${stamp}`
    const propertyName = `Smoke Tmpl Property ${stamp}`
    const description = `Smoke Template ${stamp}`

    await page.goto("/dashboard/templates")
    await expect(page.getByText("Templates", { exact: true })).toBeVisible()

    await page.getByRole("button", { name: "+ Template" }).click()
    await page.waitForURL("**/dashboard/templates/new**")

    await page.getByRole("button", { name: "New property" }).click()

    await page.getByLabel("Entity name").fill(entityName)
    await page.getByLabel("Phone", { exact: true }).fill("555-0300")
    await page.getByLabel("Email", { exact: true }).fill(`tmpl-entity-${stamp}@smoke.test`)
    await page.getByLabel("Street address", { exact: true }).fill("5 Smoke Entity Way")
    await page.getByLabel("City", { exact: true }).fill("Smoketown")
    await page.getByLabel("State", { exact: true }).fill("CA")
    await page.getByLabel("Zip", { exact: true }).fill("90001")

    await page.getByLabel("Property name").fill(propertyName)
    await page.getByLabel("Property street address").fill("6 Smoke Property Ln")
    await page.getByLabel("Property city").fill("Smoketown")
    await page.getByLabel("Property state").fill("CA")
    await page.getByLabel("Property zip").fill("90001")

    // The hub panel's Create lives alongside the page's "Create Template" —
    // both are <button>s; match exactly to disambiguate.
    await page.getByRole("button", { name: "Create", exact: true }).click()

    // After hub-create the panel closes and the Property picker on the form
    // is auto-populated with the new property. The Entity picker is too.
    await expect(page.getByRole("button", { name: "Property", exact: true })).toContainText(
      propertyName,
    )
    await expect(page.getByRole("button", { name: "Entity" })).toContainText(
      entityName,
    )

    await page.getByLabel("Description").fill(description)

    await page.getByRole("button", { name: "Create Template" }).click()

    // Create now lands on the template hub with the new template selected.
    await page.waitForURL(/\/dashboard\/templates\/edit\?.*templateId=/)
    await expect(page).toHaveURL(/\/dashboard\/templates\/edit\?.*templateId=/)
  })
})
