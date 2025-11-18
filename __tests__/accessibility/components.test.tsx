/**
 * Accessibility Tests for UI Components
 *
 * Tests that all UI components meet WCAG 2.1 AA standards.
 */

import React from 'react'
import { render } from '@testing-library/react'
import { checkA11y } from '../setup/jest-axe.setup'
import { testAccessibleName, testIconOnlyButtons, testImageAltText } from './helpers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

describe('UI Components Accessibility', () => {
  describe('Button', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(<Button>Click me</Button>)
      await checkA11y(container)
    })

    it('should have accessible name for icon-only buttons', () => {
      const { container } = render(
        <Button aria-label="Close dialog" size="icon">
          ×
        </Button>
      )
      const button = container.querySelector('button')
      expect(button).toBeTruthy()
      if (button) {
        testAccessibleName(button)
      }
    })
  })

  describe('Input', () => {
    it('should not have accessibility violations with label', async () => {
      const { container } = render(
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" />
        </div>
      )
      await checkA11y(container)
    })

    it('should not have violations with aria-label', async () => {
      const { container } = render(<Input aria-label="Search" type="search" />)
      await checkA11y(container)
    })
  })

  describe('Alert', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <Alert>
          <AlertTitle>Alert Title</AlertTitle>
          <AlertDescription>Alert description text</AlertDescription>
        </Alert>
      )
      await checkA11y(container)
    })

    it('should have proper role attribute', () => {
      const { container } = render(
        <Alert role="alert">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Something went wrong</AlertDescription>
        </Alert>
      )
      const alert = container.querySelector('[role="alert"]')
      expect(alert).toBeTruthy()
    })
  })

  describe('Checkbox', () => {
    it('should not have accessibility violations with label', async () => {
      const { container } = render(
        <div className="flex items-center space-x-2">
          <Checkbox id="terms" />
          <Label htmlFor="terms">Accept terms and conditions</Label>
        </div>
      )
      await checkA11y(container)
    })
  })

  describe('Switch', () => {
    it('should not have accessibility violations with label', async () => {
      const { container } = render(
        <div className="flex items-center space-x-2">
          <Switch id="notifications" />
          <Label htmlFor="notifications">Enable notifications</Label>
        </div>
      )
      await checkA11y(container)
    })

    it('should have switch role', () => {
      const { container } = render(<Switch aria-label="Toggle notifications" />)
      const switchElement = container.querySelector('[role="switch"]')
      expect(switchElement).toBeTruthy()
    })
  })

  describe('Dialog', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <Dialog open>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dialog Title</DialogTitle>
              <DialogDescription>Dialog description</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )
      await checkA11y(container)
    })

    it('should have proper ARIA attributes', () => {
      const { container } = render(
        <Dialog open>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Dialog</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )
      const dialog = container.querySelector('[role="dialog"]')
      expect(dialog).toBeTruthy()
    })
  })

  describe('Tabs', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      )
      await checkA11y(container)
    })

    it('should have proper tablist role', () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>
      )
      const tablist = container.querySelector('[role="tablist"]')
      expect(tablist).toBeTruthy()
    })
  })

  describe('Icon-only buttons', () => {
    it('should all have accessible names', () => {
      const { container } = render(
        <div>
          <Button aria-label="Close" size="icon">
            ×
          </Button>
          <Button aria-label="Menu" size="icon">
            ☰
          </Button>
        </div>
      )
      testIconOnlyButtons(container)
    })
  })
})
