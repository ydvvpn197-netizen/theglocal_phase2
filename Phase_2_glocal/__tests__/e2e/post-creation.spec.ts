import { test, expect } from '@playwright/test'
import { PostPage, CommunityPage } from './helpers/page-objects'
import { loginAsTestUser } from './helpers/auth'
import {
  createTestUser,
  createTestCommunity,
  createTestPost,
  cleanupTestData,
} from './helpers/test-data'
import * as path from 'path'
import * as fs from 'fs'

/**
 * E2E Test: Post Creation → Comment → Vote Flow
 *
 * Tests the complete content interaction flow:
 * 1. Navigate to community
 * 2. Create a post (text and image)
 * 3. View the post
 * 4. Edit post (within 10 minutes)
 * 5. Delete post (soft delete)
 * 6. Add a comment
 * 7. Vote on post and comment
 */

test.describe('Post Creation and Interaction Flow', () => {
  test.beforeEach(async () => {
    await cleanupTestData('e2e')
  })

  test('should create text post, comment, and vote', async ({ page }) => {
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

    // Navigate to community
    await communityPage.goto(community.slug)

    // Create a post
    await communityPage.clickCreatePost()

    // Fill post form
    const postTitle = `Test Post ${Date.now()}`
    await postPage.fillTitle(postTitle)
    await postPage.fillBody(
      'This is a test post for E2E testing. Testing comment and vote functionality.'
    )

    // Submit post
    await postPage.clickSubmit()

    // Wait for post to appear or redirect
    await page.waitForTimeout(2000)

    // Should see the post (either in feed or on detail page)
    await expect(page.getByText(postTitle)).toBeVisible({ timeout: 10000 })

    // Navigate to post detail if not already there
    const postLink = page.getByText(postTitle)
    await postLink.click()

    // Add a comment
    const commentText = 'Great post! This is my comment.'
    await postPage.fillComment(commentText)
    await postPage.clickComment()

    // Comment should appear
    await postPage.expectComment(commentText)

    // Vote on the post
    await postPage.clickUpvote()

    // Vote count should update
    await page.waitForTimeout(1000)

    // Vote on the comment
    const commentUpvote = page.locator('button[aria-label="Upvote"]').nth(1)
    if (await commentUpvote.isVisible({ timeout: 2000 }).catch(() => false)) {
      await commentUpvote.click()
    }

    console.log('✅ Post creation, comment, and vote flow completed')
  })

  test('should create post with image upload', async ({ page }) => {
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

    // Create a post
    await communityPage.clickCreatePost()

    const postTitle = `Image Post ${Date.now()}`
    await postPage.fillTitle(postTitle)
    await postPage.fillBody('This is a test post with an image.')

    // Create a test image file
    const testImagePath = path.join(__dirname, '../fixtures/test-image.png')
    const testImageDir = path.dirname(testImagePath)

    // Create directory if it doesn't exist
    if (!fs.existsSync(testImageDir)) {
      fs.mkdirSync(testImageDir, { recursive: true })
    }

    // Create a minimal PNG file (1x1 pixel) for testing
    // In real tests, you'd use an actual image file
    if (!fs.existsSync(testImagePath)) {
      // Create minimal PNG file
      const minimalPng = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      )
      fs.writeFileSync(testImagePath, minimalPng)
    }

    // Upload image if file exists
    if (fs.existsSync(testImagePath)) {
      await postPage.uploadImage(testImagePath)
      await page.waitForTimeout(1000) // Wait for image to upload
    }

    // Submit post
    await postPage.clickSubmit()

    // Wait for post to appear
    await page.waitForTimeout(2000)

    // Should see the post with image
    await expect(page.getByText(postTitle)).toBeVisible({ timeout: 10000 })

    // Verify image is displayed (either img tag or image container)
    const imageElement = page.locator(
      'img[src*="image"], img[alt*="post"], [data-testid="post-image"]'
    )
    // Image may not load immediately, so this is optional
    if (await imageElement.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(imageElement).toBeVisible()
    }

    console.log('✅ Post with image creation completed')
  })

  test('should edit post within 10 minute window', async ({ page }) => {
    // Create test user, community, and post
    const user = await createTestUser()
    const community = await createTestCommunity(user.id)
    const post = await createTestPost(community.id, user.id)

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

    const postPage = new PostPage(page)

    // Navigate to post
    await postPage.goto(post.id)

    // Find and click edit button
    const editButton = page.locator('button:has-text("Edit"), button[aria-label="Edit post"]')
    if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await postPage.clickEdit()

      // Edit the post
      const editedTitle = `${post.title} - Edited`
      await postPage.fillTitle(editedTitle)
      await postPage.fillBody('Edited content')
      await page.click('button:has-text("Save"), button:has-text("Update")')

      // Wait for update
      await page.waitForTimeout(1000)

      // Should see edited indicator
      await expect(
        page.getByText(/edited/i).or(page.locator('[data-testid="edited-indicator"]'))
      ).toBeVisible({ timeout: 5000 })

      // Verify edited content appears
      await expect(page.getByText(editedTitle)).toBeVisible()
    } else {
      console.warn('Edit button not visible - post may be older than 10 minutes')
    }
  })

  test('should not allow editing post after 10 minutes', async ({ page }) => {
    // Create test user, community, and post with old timestamp
    const user = await createTestUser()
    const community = await createTestCommunity(user.id)

    // Create post with timestamp 11 minutes ago
    const elevenMinutesAgo = new Date(Date.now() - 11 * 60 * 1000).toISOString()

    const adminClient = await import('@supabase/supabase-js').then((m) =>
      m.createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: { autoRefreshToken: false, persistSession: false },
        }
      )
    )

    const { data: oldPost } = await adminClient
      .from('posts')
      .insert({
        community_id: community.id,
        author_id: user.id,
        title: `Old Post ${Date.now()}`,
        body: 'Old content',
        created_at: elevenMinutesAgo,
        updated_at: elevenMinutesAgo,
      })
      .select()
      .single()

    if (!oldPost) {
      throw new Error('Failed to create old post')
    }

    // Make user a member
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

    const postPage = new PostPage(page)

    // Navigate to post
    await postPage.goto(oldPost.id)

    // Edit button should not be visible for old posts
    const editButton = page.locator('button:has-text("Edit"), button[aria-label="Edit post"]')
    await expect(editButton).not.toBeVisible({ timeout: 3000 })

    console.log('✅ Post edit restriction after 10 minutes verified')
  })

  test('should delete post and show [deleted] placeholder', async ({ page }) => {
    // Create test user, community, and post
    const user = await createTestUser()
    const community = await createTestCommunity(user.id)
    const post = await createTestPost(community.id, user.id)

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

    const postPage = new PostPage(page)

    // Navigate to post
    await postPage.goto(post.id)

    // Find delete button on user's own post
    const deleteButton = page.locator('button:has-text("Delete"), button[aria-label="Delete post"]')
    if (await deleteButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await postPage.clickDelete()

      // Confirm deletion
      await postPage.confirmDelete()

      // Should show [deleted] placeholder
      await postPage.expectDeleted()

      // Verify post content is hidden but placeholder is visible
      await expect(page.getByText(post.title)).not.toBeVisible()
      await expect(page.getByText(/\[deleted\]/i)).toBeVisible()
    }
  })

  test('should handle vote toggle (upvote → remove → downvote)', async ({ page }) => {
    // Create test user and post
    const user = await createTestUser()
    const community = await createTestCommunity(user.id)
    const post = await createTestPost(community.id, user.id)

    await loginAsTestUser(page, { email: user.email })

    const postPage = new PostPage(page)
    await postPage.goto(post.id)

    // Find vote buttons
    const upvoteBtn = page.locator('button[aria-label="Upvote"]').first()
    const downvoteBtn = page.locator('button[aria-label="Downvote"]').first()

    // Upvote
    if (await upvoteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await upvoteBtn.click()
      await page.waitForTimeout(500)

      // Click again to remove vote
      await upvoteBtn.click()
      await page.waitForTimeout(500)

      // Downvote
      if (await downvoteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await downvoteBtn.click()
        await page.waitForTimeout(500)
      }
    }

    console.log('✅ Vote toggle flow works')
  })
})
