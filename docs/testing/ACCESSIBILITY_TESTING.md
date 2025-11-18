# Accessibility Testing Guide

## Overview

Theglocal implements comprehensive accessibility testing to ensure WCAG 2.1 AA compliance. This guide covers both automated testing (jest-axe) and runtime checking (@axe-core/react).

## Tools

### 1. jest-axe (Automated Testing)

- **Purpose**: Test components for accessibility violations in Jest tests
- **Package**: `jest-axe`
- **Runs**: During `npm test`

### 2. @axe-core/react (Runtime Checking)

- **Purpose**: Check for accessibility violations in development mode
- **Package**: `@axe-core/react`
- **Runs**: In browser during development

## Writing Accessibility Tests

### Basic Setup

```typescript
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

it('should not have accessibility violations', async () => {
  const { container } = render(<YourComponent />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

### Testing Components

#### Buttons

```typescript
it('should have accessible button with label', async () => {
  const { container, getByRole } = render(
    <Button aria-label="Close">×</Button>
  )

  const button = getByRole('button', { name: 'Close' })
  expect(button).toBeInTheDocument()

  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

#### Forms

```typescript
it('should have accessible form inputs with labels', async () => {
  const { container } = render(
    <>
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" />
    </>
  )

  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

#### Error States

```typescript
it('should indicate errors accessibly', async () => {
  const { container, getByLabelText } = render(
    <>
      <Label htmlFor="password">Password</Label>
      <Input
        id="password"
        type="password"
        aria-invalid="true"
        aria-describedby="password-error"
      />
      <span id="password-error" role="alert">
        Password is required
      </span>
    </>
  )

  const input = getByLabelText('Password')
  expect(input).toHaveAttribute('aria-invalid', 'true')

  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

## Runtime Accessibility Checking

### Setup in Root Layout

```typescript
// app/layout.tsx or _app.tsx
import { useAxeReact } from '@/lib/utils/accessibility'

export default function RootLayout({ children }) {
  // Automatically runs in development mode
  useAxeReact()

  return (
    <html>
      <body>{children}</body>
    </html>
  )
}
```

### Check Specific Components

```typescript
import { useAccessibilityCheck } from '@/lib/utils/accessibility'

export function MyComponent() {
  const ref = useRef<HTMLDivElement>(null)

  // Check this component for violations
  useAccessibilityCheck(ref, {
    enabled: process.env.NODE_ENV === 'development',
  })

  return <div ref={ref}>...</div>
}
```

### HOC for Component Testing

```typescript
import { withAccessibilityCheck } from '@/lib/utils/accessibility'

const AccessibleComponent = withAccessibilityCheck(MyComponent, {
  enabled: true,
  rules: [{ id: 'color-contrast', enabled: true }],
})
```

## Common Accessibility Patterns

### 1. Keyboard Navigation

```typescript
// Ensure all interactive elements are keyboard accessible
<button
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick()
    }
  }}
>
  Click me
</button>
```

### 2. Focus Management

```typescript
// Move focus to important elements
const dialogRef = useRef<HTMLDialogElement>(null)

useEffect(() => {
  if (isOpen) {
    dialogRef.current?.focus()
  }
}, [isOpen])
```

### 3. ARIA Labels

```typescript
// Icon-only buttons
<Button aria-label="Close dialog" size="icon">
  <X />
</Button>

// Search inputs
<Input
  type="search"
  placeholder="Search..."
  aria-label="Search posts"
/>

// Navigation
<nav aria-label="Main navigation">
  <ul>...</ul>
</nav>
```

### 4. ARIA Landmarks

```typescript
<header role="banner">...</header>
<nav role="navigation" aria-label="Main">...</nav>
<main role="main">...</main>
<aside role="complementary">...</aside>
<footer role="contentinfo">...</footer>
```

### 5. Skip Links

```typescript
<a href="#main-content" className="skip-link">
  Skip to main content
</a>
<main id="main-content">...</main>
```

### 6. Loading States

```typescript
<div
  role="status"
  aria-live="polite"
  aria-busy={isLoading}
>
  {isLoading ? 'Loading...' : content}
</div>
```

### 7. Error Messages

```typescript
<Input
  aria-invalid={hasError}
  aria-describedby={hasError ? 'email-error' : undefined}
/>
{hasError && (
  <span id="email-error" role="alert">
    Invalid email address
  </span>
)}
```

## WCAG 2.1 AA Requirements

### Level A (Must Have)

- ✅ Keyboard accessible
- ✅ Text alternatives for non-text content
- ✅ Captions for audio/video
- ✅ Semantic HTML structure
- ✅ No keyboard traps

### Level AA (Should Have)

- ✅ Color contrast ratio 4.5:1 (normal text)
- ✅ Color contrast ratio 3:1 (large text)
- ✅ No reliance on color alone
- ✅ Visible focus indicator
- ✅ Multiple ways to find content
- ✅ Headings and labels describe topic

## Testing Checklist

### Automated Tests

- [ ] All UI components have jest-axe tests
- [ ] Forms have proper labels and error states
- [ ] Buttons have accessible names
- [ ] Images have alt text
- [ ] Links have descriptive text

### Manual Testing

- [ ] Keyboard navigation works (Tab, Shift+Tab, Enter, Space, Esc)
- [ ] Screen reader announces content correctly
- [ ] Focus is visible on all interactive elements
- [ ] Color contrast meets 4.5:1 minimum
- [ ] Text can be zoomed to 200% without loss of content

### Browser Extensions

- **axe DevTools**: Browser extension for automated checks
- **WAVE**: Web accessibility evaluation tool
- **Lighthouse**: Includes accessibility audit
- **Color Contrast Analyzer**: Check color combinations

### Screen Readers

- **NVDA** (Windows): Free, most popular
- **JAWS** (Windows): Industry standard, paid
- **VoiceOver** (macOS/iOS): Built-in
- **TalkBack** (Android): Built-in

## Running Tests

```bash
# Run all tests (including a11y tests)
npm test

# Run only accessibility tests
npm test -- __tests__/a11y

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## CI/CD Integration

Accessibility tests run automatically in CI:

- ✅ Pre-commit hook (via Husky)
- ✅ GitHub Actions CI workflow
- ✅ Vercel deployment preview

## Common Violations and Fixes

### 1. Missing Form Labels

❌ **Problem**:

```tsx
<input type="email" />
```

✅ **Fix**:

```tsx
<Label htmlFor="email">Email</Label>
<Input id="email" type="email" />
```

### 2. Missing Button Labels

❌ **Problem**:

```tsx
<button>
  <X />
</button>
```

✅ **Fix**:

```tsx
<button aria-label="Close">
  <X />
</button>
```

### 3. Missing Alt Text

❌ **Problem**:

```tsx
<img src="/logo.png" />
```

✅ **Fix**:

```tsx
<Image src="/logo.png" alt="Theglocal logo" />
```

### 4. Low Color Contrast

❌ **Problem**:

```css
.text {
  color: #999;
  background: #fff;
} /* 2.8:1 */
```

✅ **Fix**:

```css
.text {
  color: #767676;
  background: #fff;
} /* 4.5:1 */
```

### 5. Non-Semantic HTML

❌ **Problem**:

```tsx
<div onClick={handleClick}>Click me</div>
```

✅ **Fix**:

```tsx
<button onClick={handleClick}>Click me</button>
```

## Resources

### Official Documentation

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [jest-axe](https://github.com/nickcolley/jest-axe)
- [@axe-core/react](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/react)

### Learning Resources

- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
- [MDN Accessibility Guide](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

## Audit Trail

- **2025-11-14**: Implemented jest-axe and @axe-core/react
- **Tests Created**: Button, Forms, Navigation components
- **Runtime Checker**: Enabled in development mode
- **Documentation**: Comprehensive testing guide created
