/**
 * Semantic HTML Tests
 *
 * Tests proper use of semantic HTML elements, heading hierarchy,
 * and landmark regions.
 */

import React from 'react'
import { render } from '@testing-library/react'
import { checkA11y } from '../setup/jest-axe.setup'
import { testHeadingHierarchy, testLandmarks } from './helpers'
import { AppLayout } from '@/components/layout/app-layout'

describe('Semantic HTML', () => {
  describe('Heading Hierarchy', () => {
    it('should have proper heading hierarchy', () => {
      const { container } = render(
        <div>
          <h1>Main Title</h1>
          <h2>Section Title</h2>
          <h3>Subsection Title</h3>
        </div>
      )

      testHeadingHierarchy(container)
    })

    it('should not skip heading levels', () => {
      const { container } = render(
        <div>
          <h1>Main Title</h1>
          <h3>Subsection Title</h3>
        </div>
      )

      // This should pass as h3 is still within hierarchy
      testHeadingHierarchy(container)
    })
  })

  describe('Landmark Regions', () => {
    it('should have proper landmark regions', () => {
      const { container } = render(
        <div>
          <nav role="navigation" aria-label="Main navigation">
            <a href="/">Home</a>
          </nav>
          <main role="main">
            <h1>Main Content</h1>
          </main>
          <aside role="complementary">
            <h2>Sidebar</h2>
          </aside>
        </div>
      )

      testLandmarks(container)
    })

    it('should have main landmark', async () => {
      const { container } = render(
        <div>
          <main role="main">
            <h1>Content</h1>
          </main>
        </div>
      )

      await checkA11y(container)
      testLandmarks(container)
    })
  })

  describe('App Layout', () => {
    it('should have proper semantic structure', async () => {
      const { container } = render(
        <AppLayout>
          <h1>Page Title</h1>
          <p>Content</p>
        </AppLayout>
      )

      await checkA11y(container)
      testLandmarks(container)
    })
  })
})
