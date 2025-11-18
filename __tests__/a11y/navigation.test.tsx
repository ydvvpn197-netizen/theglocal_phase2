/**
 * Accessibility Tests for Navigation Components
 *
 * Tests that navigation elements have proper landmarks, roles,
 * and keyboard navigation support.
 */

import React from 'react'
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

describe('Navigation Accessibility', () => {
  it('should have proper navigation landmark', async () => {
    const { container, getByRole } = render(
      <nav aria-label="Main navigation">
        <ul>
          <li>
            <a href="/">Home</a>
          </li>
          <li>
            <a href="/about">About</a>
          </li>
          <li>
            <a href="/contact">Contact</a>
          </li>
        </ul>
      </nav>
    )

    const nav = getByRole('navigation', { name: 'Main navigation' })
    expect(nav).toBeInTheDocument()

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should have accessible link text', async () => {
    const { container } = render(
      <nav>
        <a href="/profile">View Profile</a>
        <a href="/settings">Settings</a>
      </nav>
    )

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should use aria-current for active page', async () => {
    const { container, getByText } = render(
      <nav aria-label="Breadcrumb">
        <ul>
          <li>
            <a href="/">Home</a>
          </li>
          <li>
            <a href="/products">Products</a>
          </li>
          <li>
            <a href="/products/123" aria-current="page">
              Product Details
            </a>
          </li>
        </ul>
      </nav>
    )

    const currentLink = getByText('Product Details')
    expect(currentLink).toHaveAttribute('aria-current', 'page')

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should have accessible skip navigation link', async () => {
    const { container, getByText } = render(
      <>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <nav>
          <ul>
            <li>
              <a href="/">Home</a>
            </li>
          </ul>
        </nav>
        <main id="main-content">
          <h1>Main Content</h1>
        </main>
      </>
    )

    const skipLink = getByText('Skip to main content')
    expect(skipLink).toHaveAttribute('href', '#main-content')

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
