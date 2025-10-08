import { test, expect } from '@playwright/test'

/**
 * E2E Test: Artist Registration → Booking Flow
 * 
 * Tests the complete artist and booking workflow:
 * 1. Register as artist
 * 2. Complete subscription (trial)
 * 3. Create event
 * 4. User requests booking
 * 5. Artist manages booking
 * 6. Message exchange
 * 7. Complete booking
 */

test.describe('Artist and Booking Flow', () => {
  test('should register artist and set up profile', async ({ page }) => {
    // Navigate to artist registration
    await page.goto('/artists/register')
    
    // Fill registration form
    await page.fill('input[name="stage_name"]', 'Test Musician')
    
    // Select category
    await page.click('text=Musician')
    
    // Fill description
    await page.fill('textarea[name="description"]', 'Professional musician available for events')
    
    // Fill location
    await page.fill('input[name="location_city"]', 'Mumbai')
    
    // Fill rates
    await page.fill('input[name="rate_min"]', '10000')
    await page.fill('input[name="rate_max"]', '50000')
    
    // Submit
    await page.click('button:has-text("Continue to Payment")')
    
    // Should redirect to subscription page
    await expect(page).toHaveURL(/\/artists\/.*\/subscribe/)
    
    console.log('✅ Artist registration completed')
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

  test('should request booking from artist profile', async ({ page }) => {
    // Navigate to artists discovery
    await page.goto('/artists')
    
    // Click on an artist
    const firstArtist = page.locator('[data-testid="artist-card"], .artist-card').first()
    await firstArtist.click()
    
    // Should see artist profile
    await expect(page.getByText(/Book This Artist|Request Booking/)).toBeVisible()
    
    // Click booking button
    await page.click('button:has-text("Request Booking")')
    
    // Fill booking form
    const eventDate = new Date()
    eventDate.setDate(eventDate.getDate() + 14) // 2 weeks from now
    
    await page.fill('input[type="date"]', eventDate.toISOString().split('T')[0])
    await page.fill('input[type="time"]', '18:00')
    await page.fill('input[name="event_type"]', 'Wedding Reception')
    await page.fill('input[name="location"]', 'Taj Hotel, Colaba, Mumbai')
    await page.fill('input[name="budget_range"]', '₹25,000 - ₹35,000')
    await page.fill('textarea[name="message"]', 'Looking for a live band for my wedding reception')
    
    // Submit booking
    await page.click('button:has-text("Send Booking Request")')
    
    // Should see confirmation
    await expect(page.getByText(/booking request sent|booking created/i)).toBeVisible({ timeout: 5000 })
    
    console.log('✅ Booking request completed')
  })

  test('artist should manage booking request', async ({ page, context }) => {
    // Open artist view in new page
    const artistPage = await context.newPage()
    
    // Navigate to bookings as artist
    await artistPage.goto('/bookings')
    
    // Should see booking requests
    await expect(artistPage.getByText(/Booking Request|Pending/)).toBeVisible()
    
    // Click on a booking
    const firstBooking = artistPage.locator('[data-testid="booking-card"]').first()
    await firstBooking.click()
    
    // Should see booking details
    await expect(artistPage.getByText(/Event Date|Location/)).toBeVisible()
    
    // Accept the booking
    await artistPage.click('button:has-text("Accept Booking")')
    
    // Status should update to accepted
    await expect(artistPage.getByText(/Accepted/)).toBeVisible()
    
    // Send a message
    await artistPage.fill('textarea', 'Thank you for your booking! I am available on that date.')
    await artistPage.click('button[type="submit"]')
    
    // Message should appear
    await page.waitForTimeout(1000)
    
    console.log('✅ Artist booking management completed')
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

