/**
 * Accessibility Test Helpers
 *
 * Reusable utilities for testing accessibility features including
 * keyboard navigation, screen reader compatibility, and ARIA attributes.
 */

import { render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { checkA11y } from '../setup/jest-axe.setup'

/**
 * Get all focusable elements in a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[role="button"]:not([aria-disabled="true"])',
    '[role="link"]:not([aria-disabled="true"])',
    '[role="tab"]:not([aria-disabled="true"])',
    '[role="menuitem"]:not([aria-disabled="true"])',
  ].join(', ')

  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors))
}

/**
 * Test keyboard navigation through focusable elements
 */
export async function testKeyboardNavigation(
  container: HTMLElement,
  expectedOrder: string[]
): Promise<void> {
  const focusableElements = getFocusableElements(container)
  const user = userEvent.setup()

  for (let i = 0; i < expectedOrder.length; i++) {
    const expectedText = expectedOrder[i]
    const element = focusableElements[i]

    if (!element) {
      throw new Error(`Expected element at index ${i} with text "${expectedText}" not found`)
    }

    // Focus the element
    element.focus()

    // Verify it's focused
    expect(document.activeElement).toBe(element)

    // Verify it has the expected accessible name
    const accessibleName =
      element.getAttribute('aria-label') ||
      element.getAttribute('aria-labelledby') ||
      element.textContent?.trim() ||
      element.getAttribute('title') ||
      element.getAttribute('alt')

    if (expectedText && !accessibleName?.includes(expectedText)) {
      console.warn(
        `Element at index ${i} has accessible name "${accessibleName}" but expected "${expectedText}"`
      )
    }

    // Tab to next element
    if (i < focusableElements.length - 1) {
      await user.tab()
    }
  }
}

/**
 * Test that Escape key closes a modal/dialog
 */
export async function testEscapeClosesModal(
  modalElement: HTMLElement,
  onClose: () => void
): Promise<void> {
  const user = userEvent.setup()
  const escapeSpy = jest.fn(onClose)

  // Focus an element inside the modal
  const focusableElements = getFocusableElements(modalElement)
  const firstElement = focusableElements[0]
  if (firstElement) {
    firstElement.focus()
  }

  // Press Escape
  await user.keyboard('{Escape}')

  // Verify close was called
  await waitFor(() => {
    expect(escapeSpy).toHaveBeenCalled()
  })
}

/**
 * Test that Enter/Space activates a button
 */
export async function testButtonActivation(
  button: HTMLElement,
  onClick: () => void
): Promise<void> {
  const user = userEvent.setup()
  const clickSpy = jest.fn(onClick)

  button.focus()

  // Test Enter key
  await user.keyboard('{Enter}')
  expect(clickSpy).toHaveBeenCalledTimes(1)

  clickSpy.mockClear()

  // Test Space key
  await user.keyboard(' ')
  expect(clickSpy).toHaveBeenCalledTimes(1)
}

/**
 * Test focus trap in a modal
 */
export async function testFocusTrap(modalElement: HTMLElement): Promise<void> {
  const user = userEvent.setup()
  const focusableElements = getFocusableElements(modalElement)

  if (focusableElements.length < 2) {
    throw new Error('Focus trap test requires at least 2 focusable elements')
  }

  // Focus first element
  const firstElement = focusableElements[0]
  if (!firstElement) {
    throw new Error('No focusable elements found')
  }
  firstElement.focus()
  expect(document.activeElement).toBe(firstElement)

  // Tab through all elements
  for (let i = 1; i < focusableElements.length; i++) {
    await user.tab()
    expect(document.activeElement).toBe(focusableElements[i])
  }

  // Tab again - should wrap to first element
  await user.tab()
  expect(document.activeElement).toBe(focusableElements[0])

  // Shift+Tab from first element - should wrap to last element
  await user.tab({ shift: true })
  expect(document.activeElement).toBe(focusableElements[focusableElements.length - 1])
}

/**
 * Test that focus returns to trigger after closing modal
 */
export async function testFocusReturn(
  triggerElement: HTMLElement,
  openModal: () => void,
  closeModal: () => void
): Promise<void> {
  const user = userEvent.setup()

  // Focus trigger
  triggerElement.focus()
  expect(document.activeElement).toBe(triggerElement)

  // Open modal
  openModal()
  await waitFor(() => {
    const modal = document.querySelector('[role="dialog"]')
    expect(modal).toBeInTheDocument()
  })

  // Close modal
  closeModal()
  await waitFor(() => {
    const modal = document.querySelector('[role="dialog"]')
    expect(modal).not.toBeInTheDocument()
  })

  // Verify focus returned to trigger
  expect(document.activeElement).toBe(triggerElement)
}

/**
 * Test ARIA attributes on an element
 */
export function testAriaAttributes(
  element: HTMLElement,
  expectedAttributes: Record<string, string | null>
): void {
  Object.entries(expectedAttributes).forEach(([attr, value]) => {
    const actualValue = element.getAttribute(attr)
    if (value === null) {
      expect(actualValue).toBeNull()
    } else {
      expect(actualValue).toBe(value)
    }
  })
}

/**
 * Test that element has accessible name
 */
export function testAccessibleName(element: HTMLElement, expectedName?: string): void {
  const accessibleName =
    element.getAttribute('aria-label') ||
    element.getAttribute('aria-labelledby') ||
    element.textContent?.trim() ||
    element.getAttribute('title') ||
    element.getAttribute('alt')

  expect(accessibleName).toBeTruthy()
  expect(accessibleName?.length).toBeGreaterThan(0)

  if (expectedName) {
    expect(accessibleName).toContain(expectedName)
  }
}

/**
 * Test heading hierarchy
 */
export function testHeadingHierarchy(container: HTMLElement): void {
  const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'))
  let previousLevel = 0

  headings.forEach((heading) => {
    const level = parseInt(heading.tagName.charAt(1))
    if (previousLevel > 0) {
      // Heading should not skip more than one level
      expect(level - previousLevel).toBeLessThanOrEqual(1)
    }
    previousLevel = level
  })

  // Should have at least one h1
  const h1Elements = container.querySelectorAll('h1')
  expect(h1Elements.length).toBeGreaterThan(0)
}

/**
 * Test form field has associated label
 */
export function testFormFieldLabel(field: HTMLElement): void {
  const id = field.getAttribute('id')
  const ariaLabel = field.getAttribute('aria-label')
  const ariaLabelledBy = field.getAttribute('aria-labelledby')
  const placeholder = field.getAttribute('placeholder')

  // Must have either id with label, aria-label, or aria-labelledby
  const hasLabel = !!(id && document.querySelector(`label[for="${id}"]`))
  const hasAriaLabel = !!ariaLabel
  const hasAriaLabelledBy = !!ariaLabelledBy && !!document.getElementById(ariaLabelledBy)

  expect(hasLabel || hasAriaLabel || hasAriaLabelledBy).toBe(true)

  // Placeholder is not sufficient for accessibility
  if (placeholder && !hasLabel && !hasAriaLabel && !hasAriaLabelledBy) {
    throw new Error('Form field has placeholder but no accessible label')
  }
}

/**
 * Test error message association
 */
export function testErrorMessageAssociation(field: HTMLElement, errorMessage: HTMLElement): void {
  const fieldId = field.getAttribute('id')
  const errorId = errorMessage.getAttribute('id')
  const ariaDescribedBy = field.getAttribute('aria-describedby')

  // Error message should have an id
  expect(errorId).toBeTruthy()

  // Field should reference error message via aria-describedby
  if (fieldId && errorId) {
    expect(ariaDescribedBy).toContain(errorId)
  }

  // Error message should have role="alert" or aria-live
  const hasAlertRole = errorMessage.getAttribute('role') === 'alert'
  const hasAriaLive = !!errorMessage.getAttribute('aria-live')

  expect(hasAlertRole || hasAriaLive).toBe(true)
}

/**
 * Test color contrast (basic check - full contrast testing requires specialized tools)
 */
export function testColorContrast(element: HTMLElement): void {
  const styles = window.getComputedStyle(element)
  const color = styles.color
  const backgroundColor = styles.backgroundColor

  // This is a basic check - full contrast testing requires calculating relative luminance
  // For now, we just verify that colors are set
  expect(color).toBeTruthy()
  expect(backgroundColor || styles.background).toBeTruthy()
}

/**
 * Test skip link functionality
 */
export async function testSkipLink(skipLink: HTMLElement, targetId: string): Promise<void> {
  const user = userEvent.setup()

  // Skip link should be visually hidden initially
  const styles = window.getComputedStyle(skipLink)
  expect(styles.position).toBe('absolute')

  // Focus skip link
  skipLink.focus()

  // Should become visible when focused
  const focusedStyles = window.getComputedStyle(skipLink)
  expect(focusedStyles.position).not.toBe('absolute')

  // Click skip link
  await user.click(skipLink)

  // Target should be focused or scrolled into view
  const target = document.getElementById(targetId)
  expect(target).toBeInTheDocument()

  // Verify focus moved to target or target is in viewport
  await waitFor(() => {
    const isFocused = document.activeElement === target
    const rect = target?.getBoundingClientRect()
    const isInViewport = rect && rect.top >= 0 && rect.left >= 0

    expect(isFocused || isInViewport).toBe(true)
  })
}

/**
 * Test screen reader announcement
 */
export function testScreenReaderAnnouncement(
  container: HTMLElement,
  expectedText: string,
  role: 'status' | 'alert' = 'status'
): void {
  const liveRegion = container.querySelector(`[role="${role}"], [aria-live]`)
  expect(liveRegion).toBeInTheDocument()

  if (liveRegion) {
    const text = liveRegion.textContent || liveRegion.getAttribute('aria-label')
    expect(text).toContain(expectedText)
  }
}

/**
 * Comprehensive accessibility test for a component
 */
export async function testComponentAccessibility(
  component: React.ReactElement,
  options: {
    axeConfig?: Parameters<typeof checkA11y>[1]
    skipKeyboardNav?: boolean
    skipFocusTrap?: boolean
  } = {}
): Promise<void> {
  const { container } = render(component)

  // Run axe-core check
  await checkA11y(container, options.axeConfig)

  // Test keyboard navigation if applicable
  if (!options.skipKeyboardNav) {
    const focusableElements = getFocusableElements(container)
    const firstElement = focusableElements[0]
    if (firstElement) {
      // Basic keyboard navigation test
      firstElement.focus()
      expect(document.activeElement).toBe(firstElement)
    }
  }
}

/**
 * Test landmark regions
 */
export function testLandmarks(container: HTMLElement): void {
  // Should have at least one main landmark
  const mainLandmarks = container.querySelectorAll('main, [role="main"]')
  expect(mainLandmarks.length).toBeGreaterThan(0)

  // Navigation landmarks should have accessible names
  const navLandmarks = container.querySelectorAll('nav, [role="navigation"]')
  navLandmarks.forEach((nav) => {
    const name =
      nav.getAttribute('aria-label') ||
      nav.getAttribute('aria-labelledby') ||
      nav.querySelector('h1, h2, h3, h4, h5, h6')?.textContent

    // Navigation landmarks should have accessible names (unless there's only one)
    if (navLandmarks.length > 1) {
      expect(name).toBeTruthy()
    }
  })
}

/**
 * Test that all images have alt text
 */
export function testImageAltText(container: HTMLElement): void {
  const images = container.querySelectorAll('img')
  images.forEach((img) => {
    const alt = img.getAttribute('alt')
    // Alt attribute should be present (can be empty for decorative images)
    expect(img.hasAttribute('alt')).toBe(true)
  })
}

/**
 * Test that icon-only buttons have aria-label
 */
export function testIconOnlyButtons(container: HTMLElement): void {
  const buttons = container.querySelectorAll('button')
  buttons.forEach((button) => {
    const text = button.textContent?.trim()
    const hasAriaLabel = button.hasAttribute('aria-label')
    const hasAriaLabelledBy = button.hasAttribute('aria-labelledby')
    const hasTitle = button.hasAttribute('title')

    // If button has no visible text, it must have aria-label or aria-labelledby
    if (!text || text.length === 0) {
      expect(hasAriaLabel || hasAriaLabelledBy || hasTitle).toBe(true)
    }
  })
}
