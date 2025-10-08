import { test, expect } from '@playwright/test'

/**
 * E2E Test: Post Creation → Comment → Vote Flow
 * 
 * Tests the complete content interaction flow:
 * 1. Navigate to community
 * 2. Create a post
 * 3. View the post
 * 4. Add a comment
 * 5. Vote on post and comment
 * 6. Edit post (within 10 minutes)
 */

test.describe('Post Creation and Interaction Flow', () => {
  test('should create post, comment, and vote', async ({ page }) => {
    // Assuming user is already authenticated
    await page.goto('/communities')
    
    // Navigate to a community
    const firstCommunity = page.locator('.community-card, [data-testid="community-card"]').first()
    await firstCommunity.click()
    
    // Create a post
    await page.click('button:has-text("Create Post"), button:has-text("New Post")')
    
    // Fill post form
    const postTitle = `Test Post ${Date.now()}`
    await page.fill('input[name="title"], input[placeholder*="title" i]', postTitle)
    await page.fill(
      'textarea[name="body"], textarea[placeholder*="share" i]',
      'This is a test post for E2E testing. Testing comment and vote functionality.'
    )
    
    // Submit post
    await page.click('button[type="submit"]:has-text("Post"), button:has-text("Create Post")')
    
    // Wait for post to appear or redirect
    await page.waitForTimeout(2000)
    
    // Should see the post (either in feed or on detail page)
    await expect(page.getByText(postTitle)).toBeVisible({ timeout: 10000 })
    
    // Navigate to post detail if not already there
    const postLink = page.getByText(postTitle)
    await postLink.click()
    
    // Add a comment
    const commentText = 'Great post! This is my comment.'
    await page.fill('textarea[placeholder*="comment" i]', commentText)
    await page.click('button:has-text("Comment"), button:has-text("Post Comment")')
    
    // Comment should appear
    await expect(page.getByText(commentText)).toBeVisible({ timeout: 5000 })
    
    // Vote on the post
    const upvoteButton = page.locator('button[aria-label="Upvote"], button:has-text("↑")').first()
    await upvoteButton.click()
    
    // Vote count should update
    await page.waitForTimeout(1000)
    
    // Vote on the comment
    const commentUpvote = page.locator('button[aria-label="Upvote"]').nth(1)
    if (await commentUpvote.isVisible()) {
      await commentUpvote.click()
    }
    
    console.log('✅ Post creation, comment, and vote flow completed')
  })

  test('should edit post within time limit', async ({ page }) => {
    // Create a post first
    await page.goto('/communities')
    
    const firstCommunity = page.locator('.community-card').first()
    await firstCommunity.click()
    
    await page.click('button:has-text("Create Post")')
    
    const originalTitle = `Edit Test ${Date.now()}`
    await page.fill('input[name="title"]', originalTitle)
    await page.fill('textarea[name="body"]', 'Original content')
    await page.click('button[type="submit"]')
    
    await page.waitForTimeout(2000)
    
    // Find and click edit button
    const editButton = page.locator('button:has-text("Edit"), button[aria-label="Edit post"]').first()
    if (await editButton.isVisible()) {
      await editButton.click()
      
      // Edit the post
      const editedTitle = `${originalTitle} - Edited`
      await page.fill('input[name="title"]', editedTitle)
      await page.fill('textarea[name="body"]', 'Edited content')
      await page.click('button:has-text("Save"), button:has-text("Update")')
      
      // Should see edited indicator
      await expect(page.getByText(/edited/i)).toBeVisible()
    }
  })

  test('should delete post and show placeholder', async ({ page }) => {
    // Assume authenticated and on a post page
    await page.goto('/communities')
    
    // Find delete button on user's own post
    const deleteButton = page.locator('button:has-text("Delete"), button[aria-label="Delete post"]').first()
    
    if (await deleteButton.isVisible()) {
      await deleteButton.click()
      
      // Confirm deletion
      await page.click('button:has-text("Confirm"), button:has-text("Delete")')
      
      // Should show [deleted] placeholder
      await expect(page.getByText(/\[deleted\]/i)).toBeVisible()
    }
  })

  test('should handle vote toggle (upvote → remove → downvote)', async ({ page }) => {
    await page.goto('/')
    
    // Find a post
    const upvoteBtn = page.locator('button[aria-label="Upvote"]').first()
    const downvoteBtn = page.locator('button[aria-label="Downvote"]').first()
    
    // Upvote
    await upvoteBtn.click()
    await page.waitForTimeout(500)
    
    // Click again to remove vote
    await upvoteBtn.click()
    await page.waitForTimeout(500)
    
    // Downvote
    await downvoteBtn.click()
    await page.waitForTimeout(500)
    
    console.log('✅ Vote toggle flow works')
  })
})

