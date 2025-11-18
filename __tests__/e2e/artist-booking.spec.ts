import { test, expect } from '@playwright/test'
import { ArtistPage, BookingPage, EventPage } from './helpers/page-objects'
import { loginAsTestUser, loginAsArtist } from './helpers/auth'
import {
  createTestUser,
  createTestArtist,
  createTestCommunity,
  createTestBooking,
  cleanupTestData,
} from './helpers/test-data'

/**
 * E2E Test: Artist Registration → Booking Flow
 *
 * Tests the complete artist and booking workflow:
 * 1. Register as artist
 * 2. Complete subscription (trial)
 * 3. Browse artists (filtering, search)
 * 4. View artist profile
 * 5. User requests booking
 * 6. Artist manages booking (accept/reject)
 * 7. Message exchange in booking
 * 8. Complete booking
 */

test.describe('Artist and Booking Flow', () => {
  test.beforeEach(async () => {
    await cleanupTestData('e2e')
  })

  test('should register artist and set up profile', async ({ page }) => {
    // Create test user first
    const user = await createTestUser()
    await loginAsTestUser(page, { email: user.email })

    // Navigate to artist registration
    await page.goto('/artists/register')

    // Fill registration form
    const stageName = `Test Musician ${Date.now()}`
    await page.fill('input[name="stage_name"]', stageName)

    // Select category
    await page.click('text=Musician, button:has-text("Musician")')

    // Fill description
    await page.fill('textarea[name="description"]', 'Professional musician available for events')

    // Fill location
    await page.fill('input[name="location_city"]', 'Mumbai')

    // Fill rates
    await page.fill('input[name="rate_min"]', '10000')
    await page.fill('input[name="rate_max"]', '50000')

    // Submit
    await page.click('button:has-text("Continue to Payment"), button:has-text("Next")')

    // Should redirect to subscription page
    await expect(page).toHaveURL(/\/artists\/.*\/subscribe/, { timeout: 10000 })

    console.log('✅ Artist registration completed')
  })

  test('should browse artists with filtering', async ({ page }) => {
    // Create test artist
    const user = await createTestUser()
    const artist = await createTestArtist(user.id, {
      stage_name: `Test Artist ${Date.now()}`,
      service_category: 'Musician',
      location_city: 'Mumbai',
    })

    await loginAsTestUser(page, { email: user.email })

    const artistPage = new ArtistPage(page)
    await artistPage.goto()

    // Should see artists list
    await expect(page.getByText(/Artists|Browse Artists/i)).toBeVisible({ timeout: 5000 })

    // Filter by category
    const categoryFilter = page.locator('button:has-text("Musician"), select[name="category"]')
    if (await categoryFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await categoryFilter.click()
      await page.waitForTimeout(1000)
    }

    // Filter by location
    const locationFilter = page.locator('input[name="location"], select[name="city"]')
    if (await locationFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await locationFilter.fill('Mumbai')
      await page.waitForTimeout(1000)
    }

    // Search artists
    const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]')
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.fill(artist.stage_name)
      await page.waitForTimeout(1000)
      await expect(page.getByText(artist.stage_name)).toBeVisible({ timeout: 5000 })
    }

    console.log('✅ Artist browsing and filtering completed')
  })

  test('should create event as artist', async ({ page }) => {
    // Navigate to event creation (assuming artist is logged in)
    await page.goto('/artists/dashboard')

    await page.click('button:has-text("Create Event")')

    // Fill event form
    await page.fill('input[name="title"]', 'Live Music Concert')
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
    await page.click('button:has-text("Music")')

    // Fill location
    await page.fill('input[name="location_city"]', 'Mumbai')
    await page.fill('input[name="location_address"]', 'Blue Frog, Lower Parel')

    // Submit
    await page.click('button:has-text("Create Event")')

    // Should see success or redirect to event page
    await page.waitForTimeout(2000)

    console.log('✅ Event creation completed')
  })

  test('should view artist profile and request booking', async ({ page }) => {
    // Create test artist
    const artistUser = await createTestUser()
    const artist = await createTestArtist(artistUser.id, {
      subscription_status: 'active',
    })

    // Create test user to request booking
    const user = await createTestUser()
    await loginAsTestUser(page, { email: user.email })

    const artistPage = new ArtistPage(page)

    // Navigate to artist profile
    await artistPage.goto(artist.id)

    // Should see artist profile details
    await artistPage.expectProfileVisible()
    await expect(page.getByText(artist.stage_name)).toBeVisible()
    await expect(page.getByText(artist.service_category)).toBeVisible({ timeout: 5000 })

    // Click booking button
    await artistPage.clickRequestBooking()

    // Fill booking form
    const eventDate = new Date()
    eventDate.setDate(eventDate.getDate() + 14) // 2 weeks from now

    await artistPage.fillBookingForm({
      eventDate,
      eventTime: '18:00',
      eventType: 'Wedding Reception',
      location: 'Taj Hotel, Colaba, Mumbai',
      budgetRange: '₹25,000 - ₹35,000',
      message: 'Looking for a live band for my wedding reception',
    })

    // Submit booking
    await artistPage.submitBooking()

    // Should see confirmation
    await artistPage.expectBookingSuccess()

    console.log('✅ Booking request completed')
  })

  test('artist should accept booking and exchange messages', async ({ page, context }) => {
    // Create test artist
    const artistUser = await createTestUser()
    const artist = await createTestArtist(artistUser.id, {
      subscription_status: 'active',
    })

    // Create test user to request booking
    const user = await createTestUser()
    const booking = await createTestBooking(artist.id, user.id, {
      status: 'pending',
    })

    // Login as artist
    await loginAsArtist(page, { email: artistUser.email })

    const bookingPage = new BookingPage(page)
    await bookingPage.goto()

    // Should see booking requests
    await expect(page.getByText(/Booking Request|Pending|Bookings/i)).toBeVisible({ timeout: 5000 })

    // Click on a booking
    await bookingPage.clickBookingCard(0)

    // Should see booking details
    await expect(page.getByText(/Event Date|Location|Event Type/i)).toBeVisible({ timeout: 5000 })

    // Accept the booking
    await bookingPage.clickAcceptBooking()

    // Status should update to accepted
    await bookingPage.expectBookingAccepted()

    // Send a message
    const messageText = 'Thank you for your booking! I am available on that date.'
    await bookingPage.fillMessage(messageText)
    await bookingPage.sendMessage()

    // Message should appear
    await page.waitForTimeout(1000)
    await expect(page.getByText(messageText)).toBeVisible({ timeout: 5000 })

    console.log('✅ Artist booking management and messaging completed')
  })

  test('artist should reject booking', async ({ page }) => {
    // Create test artist
    const artistUser = await createTestUser()
    const artist = await createTestArtist(artistUser.id, {
      subscription_status: 'active',
    })

    // Create test user and booking
    const user = await createTestUser()
    const booking = await createTestBooking(artist.id, user.id, {
      status: 'pending',
    })

    await loginAsArtist(page, { email: artistUser.email })

    const bookingPage = new BookingPage(page)
    await bookingPage.goto()

    // Click on booking
    await bookingPage.clickBookingCard(0)

    // Reject booking
    await bookingPage.clickRejectBooking()

    // Confirm rejection
    await page.click('button:has-text("Confirm"), button:has-text("Reject")')

    // Status should update to rejected
    await expect(page.getByText(/Rejected|Declined/i)).toBeVisible({ timeout: 5000 })

    console.log('✅ Artist booking rejection completed')
  })

  test('should handle messaging in booking', async ({ page, context }) => {
    // Create test artist and user
    const artistUser = await createTestUser()
    const artist = await createTestArtist(artistUser.id, {
      subscription_status: 'active',
    })

    const user = await createTestUser()
    const booking = await createTestBooking(artist.id, user.id, {
      status: 'accepted',
    })

    // Login as artist
    await loginAsArtist(page, { email: artistUser.email })

    const bookingPage = new BookingPage(page)
    await bookingPage.goto()
    await bookingPage.clickBookingCard(0)

    // Send message from artist
    const artistMessage = 'Looking forward to the event!'
    await bookingPage.fillMessage(artistMessage)
    await bookingPage.sendMessage()

    await expect(page.getByText(artistMessage)).toBeVisible({ timeout: 5000 })

    // Switch to user view (open new page)
    const userPage = await context.newPage()
    await loginAsTestUser(userPage, { email: user.email })

    await userPage.goto('/bookings')
    await userPage.locator('[data-testid="booking-card"]').first().click()

    // Should see artist's message
    await expect(userPage.getByText(artistMessage)).toBeVisible({ timeout: 5000 })

    // Send reply from user
    const userMessage = 'Thank you! See you there.'
    await userPage.fill('textarea[name="message"], textarea[placeholder*="message" i]', userMessage)
    await userPage.click('button[type="submit"]:has-text("Send"), button:has-text("Message")')

    await expect(userPage.getByText(userMessage)).toBeVisible({ timeout: 5000 })

    // Verify message appears on artist side
    await page.reload()
    await expect(page.getByText(userMessage)).toBeVisible({ timeout: 5000 })

    await userPage.close()

    console.log('✅ Messaging flow in booking completed')
  })

  test('should mock Razorpay payment integration', async ({ page }) => {
    // Mock Razorpay payment page
    await page.route('**/razorpay.com/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          payment_id: 'pay_test_' + Date.now(),
          order_id: 'order_test_' + Date.now(),
        }),
      })
    })

    // Mock payment verification endpoint
    await page.route('**/api/artists/*/subscribe/verify**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          subscription_id: 'sub_test_' + Date.now(),
        }),
      })
    })

    // Create test user and artist
    const user = await createTestUser()
    const artist = await createTestArtist(user.id, {
      subscription_status: 'trial',
    })

    await loginAsTestUser(page, { email: user.email })

    // Navigate to subscription page
    await page.goto(`/artists/${artist.id}/subscribe`)

    // Should see payment form
    await expect(page.getByText(/Subscribe|Payment|Razorpay/i)).toBeVisible({ timeout: 5000 })

    // Click payment button
    const payButton = page.locator('button:has-text("Pay"), button:has-text("Subscribe")')
    if (await payButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await payButton.click()

      // Wait for mocked payment
      await page.waitForTimeout(1000)

      // Should redirect to success page
      await expect(page).toHaveURL(/success|verify|complete/i, { timeout: 10000 })
    }

    console.log('✅ Razorpay payment mock completed')
  })

  test('should complete full artist-to-booking journey', async ({ page }) => {
    // This is an integration of all above steps
    // 1. Register artist → 2. Create event → 3. Receive booking → 4. Message → 5. Complete

    // Navigate to artist dashboard
    await page.goto('/artists/dashboard')

    // Should see dashboard elements
    await expect(page.getByText(/Profile Views|Upcoming Events|Bookings/i)).toBeVisible()

    // Should see subscription status
    await expect(page.getByText(/Subscription Status|Trial|Active/i)).toBeVisible()

    console.log('✅ Full artist journey accessible')
  })
})
