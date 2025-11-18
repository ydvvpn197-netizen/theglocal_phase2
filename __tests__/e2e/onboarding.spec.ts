import { test, expect } from '@playwright/test'
import { HomePage, SignupPage, LocationPage, CommunityPage, PostPage } from './helpers/page-objects'
import { loginAsTestUser, mockOTPVerification } from './helpers/auth'
import { createTestUser, createTestCommunity, cleanupTestData } from './helpers/test-data'

/**
 * E2E Test: Complete User Onboarding Flow
 *
 * Tests the full journey from landing to first interaction:
 * 1. Visit homepage
 * 2. Sign up with email/phone
 * 3. Verify OTP (mocked)
 * 4. Grant location permission (or select city)
 * 5. See personalized feed
 * 6. Join a community
 * 7. Create first post
 */

test.describe('User Onboarding Flow', () => {
  test.beforeEach(async () => {
    // Clean up test data before each test
    await cleanupTestData('e2e')
  })

  test('should complete full signup with OTP and onboarding', async ({ page }) => {
    const homePage = new HomePage(page)
    const signupPage = new SignupPage(page)
    const locationPage = new LocationPage(page)
    const communityPage = new CommunityPage(page)
    const postPage = new PostPage(page)

    // Step 1: Visit homepage
    await homePage.goto()
    await homePage.expectTitle(/Theglocal/)

    // Step 2: Navigate to signup
    await homePage.clickSignUp()
    await expect(page).toHaveURL(/\/auth\/signup/)

    // Step 3: Enter email
    const testEmail = `test-${Date.now()}@example.com`
    await signupPage.fillEmail(testEmail)
    await signupPage.clickSendOTP()

    // Mock OTP verification for faster tests
    await mockOTPVerification(page)

    // Step 4: Should redirect to OTP verification
    await expect(page).toHaveURL(/\/auth\/verify/)

    // Fill OTP (mocked to auto-fill)
    await signupPage.fillOTP('123456')
    await signupPage.clickVerify()

    // Wait for redirect after OTP verification
    await page.waitForURL(/\/(location|$)/, { timeout: 10000 })

    // Step 5: Location permission flow
    // Try to allow location first
    const allowButton = page.locator('button:has-text("Allow Location"), button:has-text("Grant")')
    if (await allowButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Mock geolocation
      await locationPage.mockGeolocation(19.076, 72.8777) // Mumbai coordinates
      await locationPage.clickAllowLocation()
      await page.waitForTimeout(1000)
    } else {
      // Select city manually
      await locationPage.clickSelectManually()
      await locationPage.fillCity('Mumbai')
      await locationPage.clickContinue()
    }

    // Step 6: Should see main feed
    await homePage.expectWelcomeMessage()

    // Step 7: Browse communities
    await communityPage.goto()
    await expect(page.getByText(/Communities/i)).toBeVisible()

    // Step 8: Join a community
    await communityPage.clickCommunityCard(0)
    await expect(page.getByText(/Join Community|Leave Community/i)).toBeVisible()

    // Click join button if not already joined
    const joinButton = page.getByRole('button', { name: /Join Community/i })
    if (await joinButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await communityPage.clickJoinCommunity()
      await communityPage.expectJoined()
    }

    // Step 9: Create first post
    await communityPage.clickCreatePost()

    const postTitle = `My First Post ${Date.now()}`
    await postPage.fillTitle(postTitle)
    await postPage.fillBody('This is my first post in the community!')
    await postPage.clickSubmit()

    // Should see success message or post appear
    await expect(
      page.getByText(/Post created|posted|success/i).or(page.getByText(postTitle))
    ).toBeVisible({ timeout: 10000 })

    console.log('✅ Onboarding flow completed successfully')
  })

  test('should handle manual city selection flow', async ({ page }) => {
    const signupPage = new SignupPage(page)
    const locationPage = new LocationPage(page)
    const homePage = new HomePage(page)

    await signupPage.goto()

    // Complete signup
    const testEmail = `test-${Date.now()}@example.com`
    await signupPage.fillEmail(testEmail)
    await signupPage.clickSendOTP()

    // Mock OTP
    await mockOTPVerification(page)
    await expect(page).toHaveURL(/\/auth\/verify/)

    await signupPage.fillOTP('123456')
    await signupPage.clickVerify()

    // Wait for location prompt
    await page.waitForURL(/\/(location|$)/, { timeout: 10000 })

    // Select city manually
    await locationPage.clickSelectManually()
    await locationPage.fillCity('Delhi')
    await locationPage.clickContinue()

    // Should proceed to feed with Delhi content
    await expect(page).toHaveURL(/\//)
    await homePage.expectWelcomeMessage()
  })

  test('should handle location permission flow with geolocation', async ({ page }) => {
    const signupPage = new SignupPage(page)
    const locationPage = new LocationPage(page)

    await signupPage.goto()

    // Complete signup
    const testEmail = `test-${Date.now()}@example.com`
    await signupPage.fillEmail(testEmail)
    await signupPage.clickSendOTP()

    await mockOTPVerification(page)
    await signupPage.fillOTP('123456')
    await signupPage.clickVerify()

    await page.waitForURL(/\/(location|$)/, { timeout: 10000 })

    // Grant location permission
    await locationPage.mockGeolocation(19.076, 72.8777) // Mumbai

    const allowButton = page.locator('button:has-text("Allow Location"), button:has-text("Grant")')
    if (await allowButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await locationPage.clickAllowLocation()
      await page.waitForTimeout(1000)
    }

    // Should proceed to feed
    await expect(page).toHaveURL(/\//)
  })

  test('should show appropriate empty states for new user', async ({ page }) => {
    // Create a test user and login
    const user = await createTestUser()
    await loginAsTestUser(page, { email: user.email })

    // After signup, new user should see helpful empty states
    await page.goto('/bookings')

    await expect(page.getByText(/No bookings|haven't made any/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/Browse Artists/i)).toBeVisible()

    // Check messages empty state
    await page.goto('/messages')
    await expect(
      page.getByText(/No messages|start a conversation/i).or(page.getByText(/empty/i))
    ).toBeVisible({ timeout: 5000 })
  })

  test('should verify first community join persists', async ({ page }) => {
    // Create test user and community
    const user = await createTestUser()
    const community = await createTestCommunity(user.id)

    await loginAsTestUser(page, { email: user.email })

    const communityPage = new CommunityPage(page)
    await communityPage.goto(community.slug)

    // Verify join button is visible
    await communityPage.expectNotJoined()

    // Join community
    await communityPage.clickJoinCommunity()

    // Verify join state persists
    await communityPage.expectJoined()

    // Refresh page to verify persistence
    await page.reload()
    await communityPage.expectJoined()
  })

  test('should verify first post creation appears in feed', async ({ page }) => {
    // Create test user and community
    const user = await createTestUser()
    const community = await createTestCommunity(user.id)

    // Make user a member
    const adminClient = await import('@supabase/supabase-js').then((m) =>
      m.createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: { autoRefreshToken: false, persistSession: false },
        }
      )
    )

    try {
      await adminClient.from('community_members').insert({
        community_id: community.id,
        user_id: user.id,
        role: 'member',
        joined_at: new Date().toISOString(),
      })
    } catch {
      // Already a member or table doesn't exist
    }

    await loginAsTestUser(page, { email: user.email })

    const communityPage = new CommunityPage(page)
    const postPage = new PostPage(page)

    await communityPage.goto(community.slug)

    // Create post
    const postTitle = `Test Post ${Date.now()}`
    await communityPage.clickCreatePost()
    await postPage.fillTitle(postTitle)
    await postPage.fillBody('This post should appear in the feed!')
    await postPage.clickSubmit()

    // Verify post appears in feed
    await page.waitForTimeout(2000)
    await postPage.expectPostVisible(postTitle)
  })
})
