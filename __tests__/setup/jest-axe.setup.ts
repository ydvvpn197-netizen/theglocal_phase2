/**
 * jest-axe Setup for Accessibility Testing
 *
 * This setup file configures jest-axe for automated accessibility testing.
 * It extends Jest's expect with custom matchers for a11y violations.
 * Configured for WCAG 2.1 AA compliance.
 */

import { toHaveNoViolations } from 'jest-axe'

// Extend Jest matchers with jest-axe custom matchers
expect.extend(toHaveNoViolations)

/**
 * WCAG 2.1 AA compliant axe-core configuration
 * All critical rules are enabled to ensure accessibility standards
 */
export const axeConfig = {
  // Run all rules (WCAG 2.1 Level A and AA)
  runOnly: {
    type: 'tag' as const,
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
  },
  // Global config applied to all tests
  rules: {
    // Critical rules - must pass
    'color-contrast': { enabled: true },
    'aria-roles': { enabled: true },
    'button-name': { enabled: true },
    label: { enabled: true },
    'input-button-name': { enabled: true },
    'link-name': { enabled: true },
    'image-alt': { enabled: true },
    'heading-order': { enabled: true },
    'landmark-one-main': { enabled: true },
    'page-has-heading-one': { enabled: true },
    region: { enabled: true },
    'focus-order-semantics': { enabled: true },
    'focusable-no-name': { enabled: true },
    tabindex: { enabled: true },
    'aria-hidden-focus': { enabled: true },
    'aria-required-attr': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    'aria-valid-attr': { enabled: true },
    'aria-unsupported-elements': { enabled: true },
    'aria-hidden-body': { enabled: true },
    'aria-toggle-field-name': { enabled: true },
    'form-field-multiple-labels': { enabled: true },
    'html-has-lang': { enabled: true },
    'html-lang-valid': { enabled: true },
    list: { enabled: true },
    listitem: { enabled: true },
    'definition-list': { enabled: true },
    dlitem: { enabled: true },
    'document-title': { enabled: true },
    'frame-title': { enabled: true },
    'frame-title-unique': { enabled: true },
    'meta-viewport': { enabled: true },
    'object-alt': { enabled: true },
    'video-caption': { enabled: true },
    'audio-caption': { enabled: true },
    bypass: { enabled: true },
    'scrollable-region-focusable': { enabled: true },
    'aria-required-children': { enabled: true },
    'aria-required-parent': { enabled: true },
    'aria-roledescription': { enabled: true },
    'aria-text': { enabled: true },
    'aria-allowed-attr': { enabled: true },
    'aria-prohibited-attr': { enabled: true },
    'aria-activedescendant-has-tabindex': { enabled: true },
    'aria-errormessage': { enabled: true },
    'aria-flowto': { enabled: true },
    'aria-labelledby': { enabled: true },
    'aria-describedby': { enabled: true },
    'aria-dialog-name': { enabled: true },
    'aria-tooltip-name': { enabled: true },
    'aria-treeitem-name': { enabled: true },
    'aria-meter-name': { enabled: true },
    'aria-progressbar-name': { enabled: true },
    'aria-tabindex': { enabled: true },
    'aria-changed': { enabled: true },
    'aria-expanded': { enabled: true },
    'aria-level': { enabled: true },
    'aria-posinset': { enabled: true },
    'aria-setsize': { enabled: true },
    'aria-valuemax': { enabled: true },
    'aria-valuemin': { enabled: true },
    'aria-valuenow': { enabled: true },
    'aria-valuetext': { enabled: true },
    'aria-live': { enabled: true },
    'aria-busy': { enabled: true },
    'aria-relevant': { enabled: true },
    'aria-atomic': { enabled: true },
    'aria-autocomplete': { enabled: true },
    'aria-checked': { enabled: true },
    'aria-disabled': { enabled: true },
    'aria-haspopup': { enabled: true },
    'aria-invalid': { enabled: true },
    'aria-modal': { enabled: true },
    'aria-multiline': { enabled: true },
    'aria-multiselectable': { enabled: true },
    'aria-orientation': { enabled: true },
    'aria-pressed': { enabled: true },
    'aria-readonly': { enabled: true },
    'aria-required': { enabled: true },
    'aria-selected': { enabled: true },
    'aria-sort': { enabled: true },
  },
  // Tags to include
  tags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
}

/**
 * Custom test helper for accessibility checks with WCAG 2.1 AA compliance
 */
export async function checkA11y(
  container: HTMLElement,
  config: typeof axeConfig = axeConfig
): Promise<void> {
  const { axe } = await import('jest-axe')
  const results = await axe(container, config)
  expect(results).toHaveNoViolations()
}

/**
 * Check accessibility with custom rules (useful for specific component tests)
 */
export async function checkA11yWithRules(
  container: HTMLElement,
  customRules: Partial<typeof axeConfig.rules> = {}
): Promise<void> {
  const customConfig = {
    ...axeConfig,
    rules: {
      ...axeConfig.rules,
      ...customRules,
    },
  }
  await checkA11y(container, customConfig)
}

/**
 * Check for specific accessibility violations
 */
export async function getA11yViolations(
  container: HTMLElement,
  config: typeof axeConfig = axeConfig
): Promise<Array<{ id: string; description: string; impact: string; nodes: unknown[] }>> {
  const { axe } = await import('jest-axe')
  const results = await axe(container, config)
  return results.violations.map((v) => ({
    id: v.id,
    description: v.description,
    impact: v.impact || 'unknown',
    nodes: v.nodes,
  }))
}

/**
 * Custom matcher to check if element has accessible name
 */
export function toHaveAccessibleName(element: HTMLElement): {
  pass: boolean
  message: () => string
} {
  const name =
    element.getAttribute('aria-label') ||
    element.getAttribute('aria-labelledby') ||
    element.textContent?.trim() ||
    element.getAttribute('title') ||
    element.getAttribute('alt')

  const pass = !!name && name.length > 0

  return {
    pass,
    message: () =>
      pass
        ? `Expected element not to have an accessible name, but it has: ${name}`
        : `Expected element to have an accessible name, but it doesn't`,
  }
}

/**
 * Custom matcher to check if element is keyboard accessible
 */
export function toBeKeyboardAccessible(element: HTMLElement): {
  pass: boolean
  message: () => string
} {
  const tagName = element.tagName.toLowerCase()
  const role = element.getAttribute('role')
  const tabIndex = element.getAttribute('tabindex')
  const disabled =
    element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true'
  const hidden =
    element.getAttribute('aria-hidden') === 'true' ||
    element.style.display === 'none' ||
    element.style.visibility === 'hidden'

  // Native interactive elements
  const isNativelyInteractive = ['button', 'a', 'input', 'select', 'textarea'].includes(tagName)

  // Elements with interactive roles
  const hasInteractiveRole =
    role &&
    [
      'button',
      'link',
      'menuitem',
      'option',
      'tab',
      'checkbox',
      'radio',
      'switch',
      'textbox',
    ].includes(role)

  // Elements with tabindex >= 0
  const hasTabIndex = tabIndex !== null && parseInt(tabIndex) >= 0

  const isFocusable =
    (isNativelyInteractive || hasInteractiveRole || hasTabIndex) && !disabled && !hidden

  const pass = isFocusable

  return {
    pass,
    message: () =>
      pass
        ? `Expected element not to be keyboard accessible, but it is`
        : `Expected element to be keyboard accessible, but it isn't. Tag: ${tagName}, Role: ${role || 'none'}, Disabled: ${disabled}, Hidden: ${hidden}`,
  }
}
