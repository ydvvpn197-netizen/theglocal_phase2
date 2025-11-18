/**
 * Focus Trap Hook
 *
 * Implements focus trap for modals and dialogs to ensure keyboard navigation
 * stays within the modal when it's open.
 */

import { useEffect, useRef } from 'react'

interface UseFocusTrapOptions {
  /**
   * Whether the trap is active
   */
  active: boolean
  /**
   * Optional callback when focus escapes the trap
   */
  onEscape?: () => void
  /**
   * Optional element to return focus to when trap is deactivated
   */
  returnFocus?: HTMLElement | null
}

/**
 * Hook to trap focus within a container element
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement>,
  options: UseFocusTrapOptions
): void {
  const { active, onEscape, returnFocus } = options
  const previousActiveElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!active || !containerRef.current) {
      return
    }

    const container = containerRef.current

    // Store the previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement

    // Get all focusable elements within the container
    const getFocusableElements = (): HTMLElement[] => {
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

    // Focus the first focusable element
    const focusFirstElement = (): void => {
      const focusableElements = getFocusableElements()
      const firstElement = focusableElements[0]
      if (firstElement) {
        firstElement.focus()
      }
    }

    // Handle Tab key
    const handleTabKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Tab') {
        return
      }

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) {
        e.preventDefault()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      const activeElement = document.activeElement as HTMLElement

      if (!firstElement || !lastElement) {
        return
      }

      // If Shift+Tab on first element, focus last element
      if (e.shiftKey && activeElement === firstElement) {
        e.preventDefault()
        lastElement.focus()
        return
      }

      // If Tab on last element, focus first element
      if (!e.shiftKey && activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
        return
      }
    }

    // Handle Escape key
    const handleEscapeKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault()
        onEscape()
      }
    }

    // Focus first element when trap is activated
    focusFirstElement()

    // Add event listeners
    container.addEventListener('keydown', handleTabKey)
    container.addEventListener('keydown', handleEscapeKey)

    // Cleanup
    return () => {
      container.removeEventListener('keydown', handleTabKey)
      container.removeEventListener('keydown', handleEscapeKey)

      // Return focus to previous element or specified element
      if (returnFocus && returnFocus.focus) {
        returnFocus.focus()
      } else if (previousActiveElement.current && previousActiveElement.current.focus) {
        previousActiveElement.current.focus()
      }
    }
  }, [active, containerRef, onEscape, returnFocus])
}
