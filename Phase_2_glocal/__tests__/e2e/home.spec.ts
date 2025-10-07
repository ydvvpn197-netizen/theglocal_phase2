import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  test('should load the home page successfully', async ({ page }) => {
    await page.goto('/')

    // Check that the page title is correct
    await expect(page).toHaveTitle(/Theglocal/)

    // Check that the main heading exists
    await expect(page.locator('h1')).toContainText('Theglocal')

    // Check that the description exists
    await expect(page.locator('text=Privacy-First')).toBeVisible()
  })

  test('should display coming soon message', async ({ page }) => {
    await page.goto('/')

    // Check for coming soon text
    await expect(page.locator('text=Coming soon')).toBeVisible()
  })
})
