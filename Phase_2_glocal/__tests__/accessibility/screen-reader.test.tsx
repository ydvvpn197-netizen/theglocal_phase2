/**
 * Screen Reader Compatibility Tests
 *
 * Tests that components are properly announced by screen readers
 * through ARIA attributes and semantic HTML.
 */

import React from 'react'
import { render } from '@testing-library/react'
import { checkA11y } from '../setup/jest-axe.setup'
import {
  testAccessibleName,
  testScreenReaderAnnouncement,
  testFormFieldLabel,
  testErrorMessageAssociation,
} from './helpers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

describe('Screen Reader Compatibility', () => {
  describe('Accessible Names', () => {
    it('should have accessible names for all interactive elements', () => {
      const { container } = render(
        <div>
          <Button aria-label="Submit form">Submit</Button>
          <Button>Click me</Button>
          <a href="/" aria-label="Go to home page">
            Home
          </a>
        </div>
      )

      const buttons = container.querySelectorAll('button')
      buttons.forEach((button) => {
        testAccessibleName(button)
      })

      const links = container.querySelectorAll('a')
      links.forEach((link) => {
        testAccessibleName(link)
      })
    })
  })

  describe('Form Labels', () => {
    it('should have associated labels for form fields', () => {
      const { container } = render(
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" />
        </div>
      )

      const input = container.querySelector('input')
      expect(input).toBeTruthy()
      if (input) {
        testFormFieldLabel(input)
      }
    })

    it('should support aria-label for form fields', () => {
      const { container } = render(<Input aria-label="Search" type="search" />)

      const input = container.querySelector('input')
      expect(input).toBeTruthy()
      if (input) {
        testFormFieldLabel(input)
      }
    })
  })

  describe('Error Messages', () => {
    it('should associate error messages with form fields', () => {
      const { container } = render(
        <div>
          <Label htmlFor="email-error">Email</Label>
          <Input
            id="email-error"
            type="email"
            aria-invalid="true"
            aria-describedby="email-error-message"
          />
          <span id="email-error-message" role="alert">
            Please enter a valid email address
          </span>
        </div>
      )

      const input = container.querySelector('input')
      const errorMessage = container.querySelector('[role="alert"]')
      expect(input).toBeTruthy()
      expect(errorMessage).toBeTruthy()
      if (input && errorMessage) {
        testErrorMessageAssociation(input, errorMessage as HTMLElement)
      }
    })
  })

  describe('Live Regions', () => {
    it('should announce alerts to screen readers', () => {
      const { container } = render(
        <Alert role="alert">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Something went wrong</AlertDescription>
        </Alert>
      )

      testScreenReaderAnnouncement(container, 'Error', 'alert')
    })

    it('should announce status updates', () => {
      const { container } = render(
        <div role="status" aria-live="polite">
          Status update message
        </div>
      )

      testScreenReaderAnnouncement(container, 'Status update message', 'status')
    })
  })

  describe('Dialog Announcements', () => {
    it('should announce dialog title and description', async () => {
      const { container } = render(
        <Dialog open>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dialog Title</DialogTitle>
              <DialogDescription>Dialog description text</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )

      await checkA11y(container)

      const dialog = container.querySelector('[role="dialog"]')
      expect(dialog).toBeTruthy()

      const title = container.querySelector(
        '[role="dialog"] h2, [role="dialog"] [data-radix-dialog-title]'
      )
      expect(title).toBeTruthy()
    })
  })

  describe('Icon-only Buttons', () => {
    it('should have aria-label for icon-only buttons', () => {
      const { container } = render(
        <div>
          <Button aria-label="Close dialog" size="icon">
            ×
          </Button>
          <Button aria-label="Menu" size="icon">
            ☰
          </Button>
        </div>
      )

      const buttons = container.querySelectorAll('button')
      buttons.forEach((button) => {
        const text = button.textContent?.trim()
        if (!text || text.length === 0) {
          const ariaLabel = button.getAttribute('aria-label')
          expect(ariaLabel).toBeTruthy()
          expect(ariaLabel?.length).toBeGreaterThan(0)
        }
      })
    })
  })
})
