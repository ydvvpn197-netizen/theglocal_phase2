/**
 * Page Object Models for E2E Tests
 *
 * Encapsulates page interactions for better test maintainability.
 * Each class represents a page or major component.
 */

import { Page, Locator, expect } from '@playwright/test'

/**
 * Home Page Object Model
 */
export class HomePage {
  constructor(private page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/')
  }

  async expectTitle(title: string | RegExp): Promise<void> {
    await expect(this.page).toHaveTitle(title)
  }

  async expectHeading(text: string | RegExp): Promise<void> {
    await expect(this.page.locator('h1')).toContainText(text)
  }

  async clickSignUp(): Promise<void> {
    await this.page.click('text=Sign Up, a:has-text("Sign Up")')
  }

  async clickSignIn(): Promise<void> {
    await this.page.click('text=Sign In, a:has-text("Sign In")')
  }

  async expectWelcomeMessage(): Promise<void> {
    await expect(this.page.getByText(/Recent Posts|Welcome|Coming soon/i)).toBeVisible()
  }
}

/**
 * Signup Page Object Model
 */
export class SignupPage {
  constructor(private page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/auth/signup')
  }

  async fillEmail(email: string): Promise<void> {
    await this.page.fill('input[type="email"], input[name="email"]', email)
  }

  async fillPhone(phone: string): Promise<void> {
    await this.page.fill('input[type="tel"], input[name="phone"]', phone)
  }

  async clickSendOTP(): Promise<void> {
    await this.page.click('button:has-text("Send OTP"), button:has-text("Continue")')
  }

  async fillOTP(otp: string): Promise<void> {
    // Handle OTP input fields (6 individual inputs or single input)
    const otpInputs = this.page.locator('input[type="text"][maxlength="1"]')
    const count = await otpInputs.count()

    if (count === 6) {
      // Individual inputs
      for (let i = 0; i < 6; i++) {
        await otpInputs.nth(i).fill(otp[i] || '')
      }
    } else {
      // Single input
      await this.page.fill('input[name="otp"], input[placeholder*="OTP" i]', otp)
    }
  }

  async clickVerify(): Promise<void> {
    await this.page.click('button:has-text("Verify"), button:has-text("Confirm")')
  }

  async expectVerificationSuccess(): Promise<void> {
    await expect(this.page).toHaveURL(/\/(location|$)/)
  }
}

/**
 * Location Permission Page Object Model
 */
export class LocationPage {
  constructor(private page: Page) {}

  async clickAllowLocation(): Promise<void> {
    await this.page.click('button:has-text("Allow Location"), button:has-text("Grant")')
  }

  async clickSelectManually(): Promise<void> {
    await this.page.click('button:has-text("Select Manually"), button:has-text("Skip")')
  }

  async fillCity(city: string): Promise<void> {
    await this.page.fill('input[name="city"], input[placeholder*="city" i]', city)
  }

  async selectCityFromDropdown(city: string): Promise<void> {
    await this.page.selectOption('select[name="city"]', city)
  }

  async clickContinue(): Promise<void> {
    await this.page.click('button:has-text("Continue"), button:has-text("Next")')
  }

  async mockGeolocation(latitude: number, longitude: number): Promise<void> {
    await this.page.context().grantPermissions(['geolocation'])
    await this.page.context().setGeolocation({ latitude, longitude })
  }
}

/**
 * Community Page Object Model
 */
export class CommunityPage {
  constructor(private page: Page) {}

  async goto(communitySlug?: string): Promise<void> {
    if (communitySlug) {
      await this.page.goto(`/communities/${communitySlug}`)
    } else {
      await this.page.goto('/communities')
    }
  }

  async clickCommunityCard(index = 0): Promise<void> {
    await this.page.locator('.community-card, [data-testid="community-card"]').nth(index).click()
  }

  async clickJoinCommunity(): Promise<void> {
    await this.page.click('button:has-text("Join Community")')
  }

  async clickLeaveCommunity(): Promise<void> {
    await this.page.click('button:has-text("Leave Community")')
  }

  async expectJoined(): Promise<void> {
    await expect(this.page.getByText(/Leave Community/i)).toBeVisible()
  }

  async expectNotJoined(): Promise<void> {
    await expect(this.page.getByText(/Join Community/i)).toBeVisible()
  }

  async clickCreatePost(): Promise<void> {
    await this.page.click('button:has-text("Create Post"), button:has-text("New Post")')
  }
}

/**
 * Post Page Object Model
 */
export class PostPage {
  constructor(private page: Page) {}

  async goto(postId: string): Promise<void> {
    await this.page.goto(`/posts/${postId}`)
  }

  async fillTitle(title: string): Promise<void> {
    await this.page.fill('input[name="title"], input[placeholder*="title" i]', title)
  }

  async fillBody(body: string): Promise<void> {
    await this.page.fill(
      'textarea[name="body"], textarea[placeholder*="share" i], textarea[placeholder*="post" i]',
      body
    )
  }

  async uploadImage(filePath: string): Promise<void> {
    const fileInput = this.page.locator('input[type="file"]')
    await fileInput.setInputFiles(filePath)
  }

  async clickSubmit(): Promise<void> {
    await this.page.click('button[type="submit"]:has-text("Post"), button:has-text("Create Post")')
  }

  async expectPostVisible(title: string): Promise<void> {
    await expect(this.page.getByText(title)).toBeVisible({ timeout: 10000 })
  }

  async clickEdit(): Promise<void> {
    await this.page.click('button:has-text("Edit"), button[aria-label="Edit post"]')
  }

  async clickDelete(): Promise<void> {
    await this.page.click('button:has-text("Delete"), button[aria-label="Delete post"]')
  }

  async confirmDelete(): Promise<void> {
    await this.page.click('button:has-text("Confirm"), button:has-text("Delete")')
  }

  async expectDeleted(): Promise<void> {
    await expect(this.page.getByText(/\[deleted\]/i)).toBeVisible()
  }

  async fillComment(comment: string): Promise<void> {
    await this.page.fill('textarea[placeholder*="comment" i]', comment)
  }

  async clickComment(): Promise<void> {
    await this.page.click('button:has-text("Comment"), button:has-text("Post Comment")')
  }

  async expectComment(comment: string): Promise<void> {
    await expect(this.page.getByText(comment)).toBeVisible({ timeout: 5000 })
  }

  async clickUpvote(): Promise<void> {
    await this.page.locator('button[aria-label="Upvote"], button:has-text("↑")').first().click()
  }

  async clickDownvote(): Promise<void> {
    await this.page.locator('button[aria-label="Downvote"], button:has-text("↓")').first().click()
  }

  async clickReport(): Promise<void> {
    await this.page.click('button:has-text("Report"), button[aria-label="Report"]')
  }
}

/**
 * Artist Page Object Model
 */
export class ArtistPage {
  constructor(private page: Page) {}

  async goto(artistId?: string): Promise<void> {
    if (artistId) {
      await this.page.goto(`/artists/${artistId}`)
    } else {
      await this.page.goto('/artists')
    }
  }

  async clickArtistCard(index = 0): Promise<void> {
    await this.page.locator('[data-testid="artist-card"], .artist-card').nth(index).click()
  }

  async clickRequestBooking(): Promise<void> {
    await this.page.click('button:has-text("Request Booking")')
  }

  async expectProfileVisible(): Promise<void> {
    await expect(this.page.getByText(/Book This Artist|Request Booking/i)).toBeVisible()
  }

  async fillBookingForm(data: {
    eventDate: Date
    eventTime?: string
    eventType?: string
    location?: string
    budgetRange?: string
    message?: string
  }): Promise<void> {
    const dateStr = data.eventDate.toISOString().split('T')[0]
    if (dateStr) {
      await this.page.fill('input[type="date"]', dateStr)
    }

    if (data.eventTime) {
      await this.page.fill('input[type="time"]', data.eventTime)
    }

    if (data.eventType) {
      await this.page.fill('input[name="event_type"]', data.eventType)
    }

    if (data.location) {
      await this.page.fill('input[name="location"]', data.location)
    }

    if (data.budgetRange) {
      await this.page.fill('input[name="budget_range"]', data.budgetRange)
    }

    if (data.message) {
      await this.page.fill('textarea[name="message"]', data.message)
    }
  }

  async submitBooking(): Promise<void> {
    await this.page.click('button:has-text("Send Booking Request")')
  }

  async expectBookingSuccess(): Promise<void> {
    await expect(this.page.getByText(/booking request sent|booking created/i)).toBeVisible({
      timeout: 5000,
    })
  }
}

/**
 * Booking Page Object Model
 */
export class BookingPage {
  constructor(private page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/bookings')
  }

  async clickBookingCard(index = 0): Promise<void> {
    await this.page.locator('[data-testid="booking-card"]').nth(index).click()
  }

  async clickAcceptBooking(): Promise<void> {
    await this.page.click('button:has-text("Accept Booking")')
  }

  async clickRejectBooking(): Promise<void> {
    await this.page.click('button:has-text("Reject Booking")')
  }

  async expectBookingAccepted(): Promise<void> {
    await expect(this.page.getByText(/Accepted/i)).toBeVisible()
  }

  async fillMessage(message: string): Promise<void> {
    await this.page.fill('textarea[name="message"], textarea[placeholder*="message" i]', message)
  }

  async sendMessage(): Promise<void> {
    await this.page.click('button[type="submit"]:has-text("Send"), button:has-text("Message")')
  }
}

/**
 * Event Page Object Model
 */
export class EventPage {
  constructor(private page: Page) {}

  async goto(eventId?: string): Promise<void> {
    if (eventId) {
      await this.page.goto(`/events/${eventId}`)
    } else {
      await this.page.goto('/events')
    }
  }

  async clickEventCard(index = 0): Promise<void> {
    await this.page.locator('[data-testid="event-card"], .event-card').nth(index).click()
  }

  async clickRSVP(): Promise<void> {
    await this.page.click('button:has-text("RSVP"), button:has-text("Attend")')
  }

  async clickCancelRSVP(): Promise<void> {
    await this.page.click('button:has-text("Cancel RSVP"), button:has-text("Unattend")')
  }

  async expectRSVPed(): Promise<void> {
    await expect(this.page.getByText(/Attending|RSVPed/i)).toBeVisible()
  }

  async filterByDate(date: Date): Promise<void> {
    const dateStr = date.toISOString().split('T')[0]
    if (dateStr) {
      await this.page.fill('input[type="date"][name="date"], input[type="date"]', dateStr)
    }
  }

  async filterByCategory(category: string): Promise<void> {
    await this.page.click(`button:has-text("${category}")`)
  }

  async searchEvents(query: string): Promise<void> {
    await this.page.fill('input[placeholder*="search" i], input[type="search"]', query)
  }
}

/**
 * Poll Page Object Model
 */
export class PollPage {
  constructor(private page: Page) {}

  async goto(pollId?: string): Promise<void> {
    if (pollId) {
      await this.page.goto(`/polls/${pollId}`)
    } else {
      await this.page.goto('/polls')
    }
  }

  async clickCreatePoll(): Promise<void> {
    await this.page.click('button:has-text("Create Poll"), button:has-text("New Poll")')
  }

  async fillQuestion(question: string): Promise<void> {
    await this.page.fill('input[name="question"], textarea[name="question"]', question)
  }

  async addOption(option: string): Promise<void> {
    await this.page.fill('input[placeholder*="option" i]', option)
    await this.page.press('input[placeholder*="option" i]', 'Enter')
  }

  async clickSubmitPoll(): Promise<void> {
    await this.page.click('button:has-text("Create Poll"), button:has-text("Submit")')
  }

  async selectOption(optionText: string): Promise<void> {
    await this.page.click(`button:has-text("${optionText}"), input[value="${optionText}"]`)
  }

  async clickVote(): Promise<void> {
    await this.page.click('button:has-text("Vote"), button[type="submit"]')
  }

  async expectPollResults(): Promise<void> {
    await expect(this.page.getByText(/results|percent|votes/i)).toBeVisible()
  }
}

/**
 * Moderation Page Object Model
 */
export class ModerationPage {
  constructor(private page: Page) {}

  async gotoReportDialog(): Promise<void> {
    await this.page.click('button:has-text("Report"), button[aria-label="Report"]')
  }

  async selectReportReason(reason: string): Promise<void> {
    await this.page.click(`text=${reason}, button:has-text("${reason}")`)
  }

  async fillReportContext(context: string): Promise<void> {
    await this.page.fill('textarea[name="additional_context"]', context)
  }

  async submitReport(): Promise<void> {
    await this.page.click('button:has-text("Submit Report")')
  }

  async expectReportSubmitted(): Promise<void> {
    await expect(this.page.getByText(/report submitted|thank you/i)).toBeVisible({ timeout: 5000 })
  }

  async gotoModerationDashboard(communityId: string): Promise<void> {
    await this.page.goto(`/admin/community/${communityId}`)
  }

  async clickRemoveContent(): Promise<void> {
    await this.page.click('button:has-text("Remove Content")')
  }

  async confirmAction(): Promise<void> {
    await this.page.click('button:has-text("Confirm")')
  }

  async expectContentRemoved(): Promise<void> {
    await expect(this.page.getByText(/content removed|action completed/i)).toBeVisible({
      timeout: 5000,
    })
  }
}
