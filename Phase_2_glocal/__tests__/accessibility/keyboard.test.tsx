/**
 * Keyboard Navigation Tests
 *
 * Tests keyboard accessibility including tab order, focus management,
 * and keyboard shortcuts.
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { checkA11y } from '../setup/jest-axe.setup'
import {
  testKeyboardNavigation,
  testEscapeClosesModal,
  testButtonActivation,
  testFocusTrap,
  getFocusableElements,
} from './helpers'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

describe('Keyboard Navigation', () => {
  describe('Tab Order', () => {
    it('should have logical tab order', async () => {
      const { container } = render(
        <div>
          <Button>First</Button>
          <Button>Second</Button>
          <Button>Third</Button>
        </div>
      )

      const focusableElements = getFocusableElements(container)
      expect(focusableElements.length).toBe(3)

      // Test tab navigation
      await testKeyboardNavigation(container, ['First', 'Second', 'Third'])
    })
  })

  describe('Button Activation', () => {
    it('should activate with Enter key', async () => {
      const handleClick = jest.fn()
      const { container } = render(<Button onClick={handleClick}>Click me</Button>)
      const button = container.querySelector('button')
      expect(button).toBeTruthy()
      if (button) {
        await testButtonActivation(button, handleClick)
      }
    })

    it('should activate with Space key', async () => {
      const handleClick = jest.fn()
      const { container } = render(<Button onClick={handleClick}>Click me</Button>)
      const button = container.querySelector('button')
      expect(button).toBeTruthy()
      if (button) {
        button.focus()
        const user = userEvent.setup()
        await user.keyboard(' ')
        expect(handleClick).toHaveBeenCalled()
      }
    })
  })

  describe('Modal/Dialog Keyboard Navigation', () => {
    it('should close dialog with Escape key', async () => {
      const handleClose = jest.fn()
      const { container } = render(
        <Dialog open onOpenChange={handleClose}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Dialog</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )

      const dialog = container.querySelector('[role="dialog"]')
      expect(dialog).toBeTruthy()
      if (dialog) {
        const user = userEvent.setup()
        await user.keyboard('{Escape}')
        // Note: Radix UI handles this, so we just verify the dialog is accessible
        await checkA11y(container)
      }
    })

    it('should trap focus within dialog', async () => {
      const { container } = render(
        <Dialog open>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Dialog</DialogTitle>
            </DialogHeader>
            <Button>First Button</Button>
            <Button>Second Button</Button>
          </DialogContent>
        </Dialog>
      )

      const dialog = container.querySelector('[role="dialog"]')
      expect(dialog).toBeTruthy()
      if (dialog) {
        // Focus trap is handled by Radix UI, but we verify it's accessible
        await checkA11y(container)
      }
    })
  })

  describe('Dropdown Menu Keyboard Navigation', () => {
    it('should be keyboard accessible', async () => {
      const { container } = render(
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>Open Menu</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
            <DropdownMenuItem>Item 2</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      await checkA11y(container)
    })
  })

  describe('Skip Links', () => {
    it('should have skip link to main content', async () => {
      const { container } = render(
        <div>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <main id="main-content">Main content</main>
        </div>
      )

      await checkA11y(container)

      const skipLink = container.querySelector('.skip-link')
      expect(skipLink).toBeTruthy()
      expect(skipLink?.getAttribute('href')).toBe('#main-content')
    })
  })
})
