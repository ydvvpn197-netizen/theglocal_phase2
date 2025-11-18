/**
 * Accessibility Tests for Button Components
 *
 * Tests that all button variants are accessible and meet WCAG 2.1 AA standards.
 */

import React from 'react'
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { Button } from '@/components/ui/button'

expect.extend(toHaveNoViolations)

describe('Button Accessibility', () => {
  it('should not have accessibility violations (default variant)', async () => {
    const { container } = render(<Button>Click me</Button>)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should not have accessibility violations (outline variant)', async () => {
    const { container } = render(<Button variant="outline">Click me</Button>)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should not have accessibility violations (ghost variant)', async () => {
    const { container } = render(<Button variant="ghost">Click me</Button>)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should not have accessibility violations (link variant)', async () => {
    const { container } = render(<Button variant="link">Click me</Button>)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should have proper aria attributes when disabled', async () => {
    const { container, getByRole } = render(<Button disabled>Disabled</Button>)
    const button = getByRole('button')

    expect(button).toHaveAttribute('disabled')
    // aria-disabled is optional when disabled attribute is present
    // The disabled attribute is sufficient for accessibility

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should support aria-label for icon-only buttons', async () => {
    const { container, getByLabelText } = render(
      <Button aria-label="Close dialog" size="icon">
        ×
      </Button>
    )

    expect(getByLabelText('Close dialog')).toBeInTheDocument()

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
