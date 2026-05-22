import { test, expect } from "@playwright/test"
import { e2eCredentialsMissing } from "./helpers/login"

test.describe("job-types smoke", () => {
  test.skip(e2eCredentialsMissing, "Set E2E_EMAIL and E2E_PASSWORD to run the smoke suite.")

  test("creates a job type via the side panel and renames it", async ({ page }) => {
    const baseName = `Smoke Job Type ${Date.now()}`
    const renamed = `${baseName} (edited)`

    await page.goto("/dashboard/job-types")
    await expect(page.getByText("Job Types", { exact: true })).toBeVisible()

    await page.getByRole("button", { name: "+ Job Type" }).click()
    await page.getByLabel("Job type name").fill(baseName)
    await page.getByRole("button", { name: "Create" }).click()

    // After Create the side panel stays open in edit mode for the new row.
    // Confirm the row appears in the list and the panel is in edit mode.
    await expect(
      page.getByRole("button", { name: `Open job type ${baseName}` }),
    ).toBeVisible()

    const nameInput = page.getByLabel("Job type name")
    await expect(nameInput).toHaveValue(baseName)
    await nameInput.fill(renamed)
    await page.getByRole("button", { name: "Save" }).click()

    await expect(
      page.getByRole("button", { name: `Open job type ${renamed}` }),
    ).toBeVisible()
  })
})
