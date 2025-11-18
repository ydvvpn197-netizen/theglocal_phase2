/**
 * Accessibility Tests for Form Components
 *
 * Tests that all form elements have proper labels, ARIA attributes,
 * and meet WCAG 2.1 AA standards.
 */

import React from 'react'
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

expect.extend(toHaveNoViolations)

describe('Form Accessibility', () => {
  describe('Input', () => {
    it('should not have accessibility violations with label', async () => {
      const { container } = render(
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" />
        </div>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should not have violations with aria-label', async () => {
      const { container } = render(<Input aria-label="Search" type="search" />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should not have violations with placeholder and label', async () => {
      const { container } = render(
        <div>
          <Label htmlFor="username">Username</Label>
          <Input id="username" placeholder="Enter username" />
        </div>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should indicate required fields properly', async () => {
      const { container, getByLabelText } = render(
        <div>
          <Label htmlFor="password">
            Password <span aria-label="required">*</span>
          </Label>
          <Input id="password" type="password" required aria-required="true" />
        </div>
      )

      const input = getByLabelText(/password/i)
      expect(input).toHaveAttribute('required')
      expect(input).toHaveAttribute('aria-required', 'true')

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should properly indicate errors with aria-invalid and aria-describedby', async () => {
      const { container, getByLabelText, getByText } = render(
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

      const input = getByLabelText('Email')
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(input).toHaveAttribute('aria-describedby', 'email-error-message')
      expect(getByText('Please enter a valid email address')).toBeInTheDocument()

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Textarea', () => {
    it('should not have accessibility violations with label', async () => {
      const { container } = render(
        <div>
          <Label htmlFor="message">Message</Label>
          <Textarea id="message" />
        </div>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should not have violations with aria-label', async () => {
      const { container } = render(<Textarea aria-label="Your feedback" />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })
})
