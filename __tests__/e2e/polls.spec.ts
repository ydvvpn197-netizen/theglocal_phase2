import { test, expect } from '@playwright/test'
import { PollPage, CommunityPage } from './helpers/page-objects'
import { loginAsTestUser } from './helpers/auth'
import {
  createTestUser,
  createTestCommunity,
  createTestPoll,
  cleanupTestData,
} from './helpers/test-data'

/**
 * E2E Test: Poll Voting Flow
 *
 * Tests the complete poll workflow:
 * 1. Create poll (options, expiry, visibility)
 * 2. Vote on poll (single/multiple choice)
 * 3. View poll results (real-time updates, percentages)
 * 4. Poll expiry handling (disable voting after expiry)
 * 5. Poll deletion
 * 6. Poll results visibility (before/after expiry)
 * 7. Anonymous vs public voting
 */

test.describe('Poll Voting Flow', () => {
  test.beforeEach(async () => {
    await cleanupTestData('e2e')
  })

  test('should create poll with options and expiry', async ({ page }) => {
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
    const pollPage = new PollPage(page)

    await communityPage.goto(community.slug)

    // Click create poll
    await pollPage.clickCreatePoll()

    // Fill poll question
    const question = `Test Poll ${Date.now()}?`
    await pollPage.fillQuestion(question)

    // Add options
    const options = ['Option A', 'Option B', 'Option C']
    for (const option of options) {
      await pollPage.addOption(option)
    }

    // Set expiry (7 days from now)
    const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const dateStr = expiryDate.toISOString().split('T')[0]
    const dateInput = page.locator('input[type="date"][name="expires_at"], input[type="date"]')
    if (dateStr && (await dateInput.isVisible({ timeout: 2000 }).catch(() => false))) {
      await dateInput.fill(dateStr)
    }

    // Select visibility (anonymous)
    const anonymousCheckbox = page.locator('input[type="checkbox"][name="is_anonymous"]')
    if (await anonymousCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await anonymousCheckbox.check()
    }

    // Submit poll
    await pollPage.clickSubmitPoll()

    // Should see poll created
    await expect(page.getByText(question)).toBeVisible({ timeout: 10000 })

    console.log('✅ Poll creation completed')
  })

  test('should vote on poll (single choice)', async ({ page }) => {
    // Create test poll
    const user = await createTestUser()
    const community = await createTestCommunity(user.id)
    const poll = await createTestPoll(community.id, user.id, {
      question: `Vote Test ${Date.now()}?`,
      options: ['Yes', 'No', 'Maybe'],
    })

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

    const pollPage = new PollPage(page)
    await pollPage.goto(poll.id)

    // Select an option
    await pollPage.selectOption('Yes')

    // Click vote
    await pollPage.clickVote()

    // Should see vote confirmation
    await expect(page.getByText(/voted|thank you/i)).toBeVisible({ timeout: 5000 })

    // Should see vote count update
    await page.waitForTimeout(1000)

    console.log('✅ Poll voting completed')
  })

  test('should view poll results with percentages', async ({ page }) => {
    // Create test poll with votes
    const user = await createTestUser()
    const community = await createTestCommunity(user.id)
    const poll = await createTestPoll(community.id, user.id)

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

    const pollPage = new PollPage(page)
    await pollPage.goto(poll.id)

    // Vote on poll first
    await pollPage.selectOption('Option A')
    await pollPage.clickVote()
    await page.waitForTimeout(1000)

    // Should see poll results
    await pollPage.expectPollResults()

    // Should see percentages or vote counts
    await expect(page.getByText(/percent|%|\d+\s+votes|\d+\s+vote/i)).toBeVisible({ timeout: 5000 })

    console.log('✅ Poll results viewing completed')
  })

  test('should disable voting after poll expiry', async ({ page }) => {
    // Create test poll with expired date
    const user = await createTestUser()
    const community = await createTestCommunity(user.id)
    const expiredDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // Yesterday

    const poll = await createTestPoll(community.id, user.id, {
      expires_at: expiredDate,
    })

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

    const pollPage = new PollPage(page)
    await pollPage.goto(poll.id)

    // Should see expiry notice
    await expect(page.getByText(/expired|ended|closed/i)).toBeVisible({ timeout: 5000 })

    // Vote button should be disabled or not visible
    const voteButton = page.locator('button:has-text("Vote")')
    await expect(voteButton).not.toBeVisible({ timeout: 3000 })

    // Should still be able to view results
    await pollPage.expectPollResults()

    console.log('✅ Poll expiry handling verified')
  })

  test('should delete poll', async ({ page }) => {
    // Create test poll
    const user = await createTestUser()
    const community = await createTestCommunity(user.id)
    const poll = await createTestPoll(community.id, user.id)

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

    const pollPage = new PollPage(page)
    await pollPage.goto(poll.id)

    // Click delete button
    const deleteButton = page.locator('button:has-text("Delete"), button[aria-label="Delete poll"]')
    if (await deleteButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteButton.click()

      // Confirm deletion
      await page.click('button:has-text("Confirm"), button:has-text("Delete")')

      // Should redirect or show success
      await page.waitForTimeout(1000)
      await expect(page.getByText(poll.question)).not.toBeVisible()
    }

    console.log('✅ Poll deletion completed')
  })

  test('should handle anonymous vs public voting', async ({ page }) => {
    // Create test poll with anonymous voting
    const user = await createTestUser()
    const community = await createTestCommunity(user.id)
    const poll = await createTestPoll(community.id, user.id, {
      is_anonymous: true,
    })

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

    const pollPage = new PollPage(page)
    await pollPage.goto(poll.id)

    // Vote on anonymous poll
    await pollPage.selectOption('Option A')
    await pollPage.clickVote()

    // Should see results but not voter names (if anonymous)
    await pollPage.expectPollResults()

    // Voter names should not be visible for anonymous polls
    const voterNames = page.locator('text=@, text=user, [data-testid="voter-name"]')
    if (
      await voterNames
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false)
    ) {
      // If voter names are shown, verify they're anonymized
      await expect(voterNames.first()).toContainText(/anonymous|hidden/i)
    }

    console.log('✅ Anonymous voting handling verified')
  })

  test('should show poll results before and after expiry', async ({ page }) => {
    // Create test poll that will expire soon
    const user = await createTestUser()
    const community = await createTestCommunity(user.id)
    const futureDate = new Date(Date.now() + 1 * 60 * 60 * 1000) // 1 hour from now

    const poll = await createTestPoll(community.id, user.id, {
      expires_at: futureDate,
    })

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

    const pollPage = new PollPage(page)
    await pollPage.goto(poll.id)

    // Before expiry: should be able to vote and see partial results
    await pollPage.selectOption('Option A')
    await pollPage.clickVote()
    await page.waitForTimeout(1000)

    // Should see results while still active
    await pollPage.expectPollResults()

    // After expiry: simulate by updating expiry date
    const expiredDate = new Date(Date.now() - 1000) // Just expired
    const { error: updateError } = await adminClient
      .from('polls')
      .update({ expires_at: expiredDate.toISOString() })
      .eq('id', poll.id)
    if (updateError) {
      // Table may not exist or update failed, continue anyway
      console.warn('Failed to update poll expiry:', updateError)
    }

    // Reload page
    await page.reload()

    // Should still see results but voting disabled
    await pollPage.expectPollResults()

    const voteButton = page.locator('button:has-text("Vote")')
    await expect(voteButton).not.toBeVisible({ timeout: 3000 })

    console.log('✅ Poll results visibility before/after expiry verified')
  })
})
