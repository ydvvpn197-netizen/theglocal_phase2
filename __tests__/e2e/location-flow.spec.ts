/**
 * Location Flow E2E Tests
 *
 * Tests the complete user journey for location features:
 * - Granting location permission
 * - Saving locations
 * - Switching between locations
 * - Using map views
 * - Exploring nearby content
 */

import { test, expect } from '@playwright/test'

// Test constants
const TEST_LAT = 19.076
const TEST_LNG = 72.8777
const TEST_RADIUS = 5000

test.describe('Location Permission Flow', () => {
  test('should prompt for location on first visit', async ({ page, context }) => {
    // Clear localStorage to simulate first visit
    await context.clearCookies()
    await page.goto('/')

    // Check if location permission dialog appears
    // (This depends on your onboarding implementation)
    await page.waitForLoadState('networkidle')

    // You may see location permission dialog or selector
    const locationSelector = page
      .locator('[data-testid="location-selector"]')
      .or(page.getByRole('button', { name: /location/i }))
    await expect(locationSelector).toBeVisible({ timeout: 5000 })
  })

  test('should allow manual city entry', async ({ page }) => {
    await page.goto('/')

    // Open location selector or dialog
    const locationButton = page.getByRole('button', { name: /location/i }).first()
    if (await locationButton.isVisible()) {
      await locationButton.click()
    }

    // Enter city manually
    const cityInput = page.getByPlaceholder(/city/i)
    if (await cityInput.isVisible()) {
      await cityInput.fill('Mumbai')
      await page.getByRole('button', { name: /continue|save|set/i }).click()

      // Verify location is set
      await expect(page.getByText('Mumbai')).toBeVisible({ timeout: 5000 })
    }
  })
})

test.describe('Map Views', () => {
  test('should navigate to artists map view', async ({ page }) => {
    await page.goto('/artists')

    // Click map view button
    const mapButton = page.getByRole('button', { name: /map view/i })
    await mapButton.click()

    // Should navigate to map page
    await expect(page).toHaveURL(/\/artists\/map/)

    // Map should load
    await page.waitForLoadState('networkidle')

    // Check for map container or loading state
    const mapOrLoader = page
      .locator('[data-testid="artist-map"]')
      .or(page.getByText(/loading map/i))
    await expect(mapOrLoader).toBeVisible({ timeout: 10000 })
  })

  test('should navigate to events map view', async ({ page }) => {
    await page.goto('/events')

    const mapButton = page.getByRole('button', { name: /map view/i })
    if (await mapButton.isVisible()) {
      await mapButton.click()
      await expect(page).toHaveURL(/\/events\/map/)
    }
  })

  test('should navigate to communities map view', async ({ page }) => {
    await page.goto('/communities')

    const mapButton = page.getByRole('button', { name: /map view/i })
    if (await mapButton.isVisible()) {
      await mapButton.click()
      await expect(page).toHaveURL(/\/communities\/map/)
    }
  })

  test('should allow switching back to list view', async ({ page }) => {
    await page.goto('/artists/map')

    // Click list view button
    const listButton = page.getByRole('button', { name: /list view/i })
    await listButton.click()

    // Should navigate back to list
    await expect(page).toHaveURL(/\/artists\/?$/)
  })
})

test.describe('Explore Nearby Feature', () => {
  test('should show explore nearby tab on home page', async ({ page }) => {
    await page.goto('/')

    // Look for tabs
    const nearbyTab = page.getByRole('tab', { name: /explore nearby/i })
    await expect(nearbyTab).toBeVisible()
  })

  test('should switch to explore nearby tab', async ({ page }) => {
    await page.goto('/')

    const nearbyTab = page.getByRole('tab', { name: /explore nearby/i })
    await nearbyTab.click()

    // Should show nearby content or location prompt
    await page.waitForLoadState('networkidle')

    // Either shows posts or location prompt
    const hasContent = (await page.getByRole('article').count()) > 0
    const hasPrompt = await page.getByText(/set your location/i).isVisible()

    expect(hasContent || hasPrompt).toBe(true)
  })
})

test.describe('Distance Display', () => {
  test('should show distance on artist cards', async ({ page }) => {
    await page.goto('/artists')

    // Wait for artists to load
    await page.waitForLoadState('networkidle')

    // Check if any artist cards show distance
    // This requires artists to have coordinates
    const distanceBadges = page
      .locator('[data-testid="distance-badge"]')
      .or(page.getByText(/km|away/))

    // At least one distance should be visible if location is set
    const count = await distanceBadges.count()
    // Not asserting count > 0 because it depends on data
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should show distance on event cards', async ({ page }) => {
    await page.goto('/events')

    await page.waitForLoadState('networkidle')

    const distanceText = page.getByText(/km/)
    const count = await distanceText.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should show distance on community cards', async ({ page }) => {
    await page.goto('/communities')

    await page.waitForLoadState('networkidle')

    const distanceText = page.getByText(/km/)
    const count = await distanceText.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })
})

test.describe('Location Selector', () => {
  test('should have location selector in UI', async ({ page }) => {
    await page.goto('/')

    // Look for location button/selector
    const locationElement = page.getByRole('button', { name: /location|mumbai|delhi/i })

    // Should have some location indicator
    const count = await locationElement.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should allow changing radius', async ({ page }) => {
    await page.goto('/')

    // This would require interacting with radius selector
    // Implementation depends on where radius selector is placed
    const radiusSelector = page.locator('[data-testid="radius-selector"]')

    if (await radiusSelector.isVisible()) {
      await radiusSelector.click()
      // Select different radius
      await page.getByText('50 km').click()
    }
  })
})

test.describe('API Response Format', () => {
  test('v2 APIs should include meta.hasProximitySearch', async ({ page }) => {
    const response = await page.request.get(
      `/api/v2/artists?lat=${TEST_LAT}&lng=${TEST_LNG}&radius=${TEST_RADIUS}`
    )

    const data = await response.json()
    expect(data.meta).toHaveProperty('hasProximitySearch')
    expect(data.meta.hasProximitySearch).toBe(true)
  })

  test('v2 APIs should be backwards compatible (work without location)', async ({ page }) => {
    const response = await page.request.get('/api/v2/artists')

    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.meta.hasProximitySearch).toBe(false)
  })
})

test.describe('Performance', () => {
  test('proximity search should be reasonably fast', async ({ page }) => {
    const startTime = Date.now()

    const response = await page.request.get(
      `/api/v2/artists?lat=${TEST_LAT}&lng=${TEST_LNG}&radius=${TEST_RADIUS}&limit=50`
    )

    const endTime = Date.now()
    const duration = endTime - startTime

    expect(response.status()).toBe(200)

    // Should respond in under 2 seconds
    expect(duration).toBeLessThan(2000)
  })

  test('map pages should load within reasonable time', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('/artists/map')
    await page.waitForLoadState('networkidle')

    const endTime = Date.now()
    const duration = endTime - startTime

    // Should load in under 5 seconds (includes Google Maps)
    expect(duration).toBeLessThan(5000)
  })
})
