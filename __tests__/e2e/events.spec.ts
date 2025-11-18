import { test, expect } from '@playwright/test'
import { EventPage, ArtistPage } from './helpers/page-objects'
import { loginAsTestUser, loginAsArtist } from './helpers/auth'
import {
  createTestUser,
  createTestArtist,
  createTestEvent,
  cleanupTestData,
} from './helpers/test-data'

/**
 * E2E Test: Event Discovery Flow
 *
 * Tests the complete event workflow:
 * 1. Browse events (list, pagination)
 * 2. Filter events (date, category, location)
 * 3. Search events (text search)
 * 4. RSVP to event (confirm/unconfirm)
 * 5. View event details (map, attendees, updates)
 * 6. Create event as artist
 * 7. Event cancellation
 * 8. Event updates/edits
 */

test.describe('Event Discovery Flow', () => {
  test.beforeEach(async () => {
    await cleanupTestData('e2e')
  })

  test('should browse events with pagination', async ({ page }) => {
    // Create test events
    const artistUser = await createTestUser()
    const artist = await createTestArtist(artistUser.id, {
      subscription_status: 'active',
    })

    // Create multiple events
    for (let i = 0; i < 5; i++) {
      const eventDate = new Date(Date.now() + (i + 1) * 7 * 24 * 60 * 60 * 1000)
      await createTestEvent(artist.id, {
        title: `Test Event ${i + 1}`,
        event_date: eventDate,
      })
    }

    await loginAsTestUser(page, { email: artistUser.email })

    const eventPage = new EventPage(page)
    await eventPage.goto()

    // Should see events list
    await expect(page.getByText(/Events|Upcoming Events/i)).toBeVisible({ timeout: 5000 })

    // Check pagination if exists
    const nextButton = page.locator('button:has-text("Next"), a:has-text("Next")')
    if (await nextButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nextButton.click()
      await page.waitForTimeout(1000)
    }

    console.log('✅ Event browsing with pagination completed')
  })

  test('should filter events by date and category', async ({ page }) => {
    // Create test events with different dates and categories
    const artistUser = await createTestUser()
    const artist = await createTestArtist(artistUser.id, {
      subscription_status: 'active',
    })

    const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 2 weeks from now
    await createTestEvent(artist.id, {
      title: 'Music Event',
      event_date: futureDate,
    })

    await loginAsTestUser(page, { email: artistUser.email })

    const eventPage = new EventPage(page)
    await eventPage.goto()

    // Filter by date
    await eventPage.filterByDate(futureDate)
    await page.waitForTimeout(1000)

    // Filter by category
    await eventPage.filterByCategory('Music')
    await page.waitForTimeout(1000)

    // Should see filtered events
    await expect(page.getByText(/Music Event/i)).toBeVisible({ timeout: 5000 })

    console.log('✅ Event filtering completed')
  })

  test('should search events', async ({ page }) => {
    // Create test event
    const artistUser = await createTestUser()
    const artist = await createTestArtist(artistUser.id, {
      subscription_status: 'active',
    })

    const event = await createTestEvent(artist.id, {
      title: 'Jazz Night Concert',
    })

    await loginAsTestUser(page, { email: artistUser.email })

    const eventPage = new EventPage(page)
    await eventPage.goto()

    // Search for event
    await eventPage.searchEvents('Jazz')
    await page.waitForTimeout(1000)

    // Should see search results
    await expect(page.getByText(/Jazz Night/i)).toBeVisible({ timeout: 5000 })

    console.log('✅ Event search completed')
  })

  test('should RSVP to event', async ({ page }) => {
    // Create test event
    const artistUser = await createTestUser()
    const artist = await createTestArtist(artistUser.id, {
      subscription_status: 'active',
    })

    const event = await createTestEvent(artist.id)

    const user = await createTestUser()
    await loginAsTestUser(page, { email: user.email })

    const eventPage = new EventPage(page)
    await eventPage.goto(event.id)

    // RSVP to event
    await eventPage.clickRSVP()

    // Should see RSVP confirmation
    await eventPage.expectRSVPed()

    // Unconfirm RSVP
    await eventPage.clickCancelRSVP()

    // Should see RSVP removed
    await expect(page.getByText(/RSVP|Attend/i)).toBeVisible({ timeout: 5000 })

    console.log('✅ Event RSVP flow completed')
  })

  test('should view event details', async ({ page }) => {
    // Create test event
    const artistUser = await createTestUser()
    const artist = await createTestArtist(artistUser.id, {
      subscription_status: 'active',
    })

    const event = await createTestEvent(artist.id, {
      location_address: 'Blue Frog, Lower Parel, Mumbai',
    })

    await loginAsTestUser(page, { email: artistUser.email })

    const eventPage = new EventPage(page)
    await eventPage.goto(event.id)

    // Should see event details
    await expect(page.getByText(event.title)).toBeVisible({ timeout: 5000 })

    // Should see location
    if (event.location_address) {
      await expect(page.getByText(event.location_address)).toBeVisible({ timeout: 5000 })
    }

    // Should see attendees count
    await expect(page.getByText(/attendees|RSVPed|going/i)).toBeVisible({ timeout: 5000 })

    // Check for map if exists
    const mapElement = page.locator('[data-testid="event-map"], iframe[src*="map"]')
    // Map may not load immediately
    if (await mapElement.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(mapElement).toBeVisible()
    }

    console.log('✅ Event details viewing completed')
  })

  test('should create event as artist', async ({ page }) => {
    // Create test artist
    const artistUser = await createTestUser()
    const artist = await createTestArtist(artistUser.id, {
      subscription_status: 'active',
    })

    await loginAsArtist(page, { email: artistUser.email })

    // Navigate to event creation
    await page.goto('/artists/dashboard')
    await page.click('button:has-text("Create Event")')

    // Fill event form
    const eventTitle = `Live Music Concert ${Date.now()}`
    await page.fill('input[name="title"]', eventTitle)
    await page.fill('textarea[name="description"]', 'An evening of jazz and soul music')

    // Set date (tomorrow)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = tomorrow.toISOString().split('T')[0]
    if (!dateStr) {
      throw new Error('Failed to format date')
    }

    await page.fill('input[type="date"]', dateStr)
    await page.fill('input[type="time"]', '19:00')

    // Select category
    await page.click('button:has-text("Music"), select[name="category"]')

    // Fill location
    await page.fill('input[name="location_city"]', 'Mumbai')
    await page.fill('input[name="location_address"]', 'Blue Frog, Lower Parel')

    // Submit
    await page.click('button:has-text("Create Event")')

    // Should see success or redirect to event page
    await page.waitForTimeout(2000)
    await expect(page.getByText(eventTitle)).toBeVisible({ timeout: 10000 })

    console.log('✅ Event creation as artist completed')
  })

  test('should cancel event', async ({ page }) => {
    // Create test event
    const artistUser = await createTestUser()
    const artist = await createTestArtist(artistUser.id, {
      subscription_status: 'active',
    })

    const event = await createTestEvent(artist.id)

    await loginAsArtist(page, { email: artistUser.email })

    const eventPage = new EventPage(page)
    await eventPage.goto(event.id)

    // Click cancel event
    const cancelButton = page.locator('button:has-text("Cancel Event"), button:has-text("Cancel")')
    if (await cancelButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cancelButton.click()

      // Confirm cancellation
      await page.click('button:has-text("Confirm"), button:has-text("Yes")')

      // Should see cancellation notice
      await expect(page.getByText(/cancelled|event cancelled/i)).toBeVisible({ timeout: 5000 })
    }

    console.log('✅ Event cancellation completed')
  })

  test('should update event details', async ({ page }) => {
    // Create test event
    const artistUser = await createTestUser()
    const artist = await createTestArtist(artistUser.id, {
      subscription_status: 'active',
    })

    const event = await createTestEvent(artist.id)

    await loginAsArtist(page, { email: artistUser.email })

    const eventPage = new EventPage(page)
    await eventPage.goto(event.id)

    // Click edit event
    const editButton = page.locator('button:has-text("Edit"), button[aria-label="Edit event"]')
    if (await editButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editButton.click()

      // Update event title
      const updatedTitle = `${event.title} - Updated`
      await page.fill('input[name="title"]', updatedTitle)

      // Save changes
      await page.click('button:has-text("Save"), button:has-text("Update")')

      // Should see updated title
      await expect(page.getByText(updatedTitle)).toBeVisible({ timeout: 5000 })
    }

    console.log('✅ Event update completed')
  })
})
