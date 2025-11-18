/**
 * Color Contrast Tests
 *
 * Tests color contrast ratios meet WCAG AA standards.
 * Note: Full contrast testing requires specialized tools, this provides basic checks.
 */

import React from 'react'
import { render } from '@testing-library/react'
import { checkA11y } from '../setup/jest-axe.setup'
import { testColorContrast } from './helpers'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'

describe('Color Contrast', () => {
  it('should pass axe color-contrast checks', async () => {
    const { container } = render(
      <div>
        <Button>Primary Button</Button>
        <Button variant="outline">Outline Button</Button>
        <Alert>
          <p>Alert message with sufficient contrast</p>
        </Alert>
      </div>
    )

    // Axe-core will check color contrast
    await checkA11y(container)
  })

  it('should have colors set on text elements', () => {
    const { container } = render(
      <div>
        <p>Regular text</p>
        <p className="text-muted-foreground">Muted text</p>
      </div>
    )

    const paragraphs = container.querySelectorAll('p')
    paragraphs.forEach((p) => {
      testColorContrast(p)
    })
  })

  it('should have sufficient contrast for buttons', async () => {
    const { container } = render(
      <div>
        <Button>Default Button</Button>
        <Button variant="destructive">Destructive Button</Button>
        <Button variant="secondary">Secondary Button</Button>
      </div>
    )

    await checkA11y(container)
  })
})
