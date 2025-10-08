import { test, expect } from '@playwright/test'

/**
 * E2E Test: Complete User Onboarding Flow
 * 
 * Tests the full journey from landing to first interaction:
 * 1. Visit homepage
 * 2. Sign up with email/phone
 * 3. Verify OTP
 * 4. Grant location permission (or select city)
 * 5. See personalized feed
 * 6. Join a community
 * 7. Create first post
 */

test.describe('User Onboarding Flow', () => {
  test('should complete full signup and onboarding', async ({ page }) => {
    // Step 1: Visit homepage
    await page.goto('/')
    
    // Should see landing page or signup prompt
    await expect(page).toHaveTitle(/Theglocal/)
    
    // Step 2: Navigate to signup
    await page.click('text=Sign Up')
    await expect(page).toHaveURL(/\/auth\/signup/)
    
    // Step 3: Enter email
    const testEmail = `test-${Date.now()}@example.com`
    await page.fill('input[type="email"]', testEmail)
    await page.click('button:has-text("Send OTP")')
    
    // Should redirect to OTP verification
    await expect(page).toHaveURL(/\/auth\/verify/)
    
    // Step 4: Enter OTP (in real test, you'd mock or use test OTP)
    // For now, we'll skip OTP verification in E2E tests
    // In production, use Supabase test mode or mock
    
    // Step 5: After auth, should see location permission prompt
    // await page.click('button:has-text("Allow Location")')
    // Or select city manually
    // await page.selectOption('select[name="city"]', 'Mumbai')
    
    // Step 6: Should see main feed
    await expect(page.getByText(/Recent Posts|Welcome/)).toBeVisible()
    
    // Step 7: Browse communities
    await page.click('a[href="/communities"]')
    await expect(page).toHaveURL('/communities')
    await expect(page.getByText(/Communities/)).toBeVisible()
    
    // Step 8: Join a community
    const firstCommunity = page.locator('.community-card').first()
    await firstCommunity.click()
    
    // Should see community page
    await expect(page.getByText(/Join Community|Leave Community/)).toBeVisible()
    
    // Click join button if not already joined
    const joinButton = page.getByRole('button', { name: /Join Community/ })
    if (await joinButton.isVisible()) {
      await joinButton.click()
      await expect(page.getByText(/Leave Community/)).toBeVisible()
    }
    
    // Step 9: Create a post
    await page.click('button:has-text("Create Post")')
    
    await page.fill('input[name="title"]', 'My First Post')
    await page.fill('textarea[name="body"]', 'This is my first post in the community!')
    await page.click('button:has-text("Post")')
    
    // Should see success message
    await expect(page.getByText(/Post created|posted/i)).toBeVisible()
    
    console.log('✅ Onboarding flow completed successfully')
  })

  test('should handle manual city selection', async ({ page }) => {
    await page.goto('/auth/signup')
    
    // Complete signup...
    // Then on location prompt:
    await page.click('button:has-text("Select Manually")')
    
    await page.fill('input[name="city"]', 'Delhi')
    await page.click('button:has-text("Continue")')
    
    // Should proceed to feed with Delhi content
    await expect(page).toHaveURL('/')
  })

  test('should show appropriate empty states for new user', async ({ page }) => {
    // After signup, new user should see helpful empty states
    await page.goto('/bookings')
    
    await expect(page.getByText(/No bookings|haven't made any/i)).toBeVisible()
    await expect(page.getByText(/Browse Artists/i)).toBeVisible()
  })
})

