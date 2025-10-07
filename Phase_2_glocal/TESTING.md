# Testing Guide

This project uses a comprehensive testing strategy with unit tests, integration tests, and end-to-end tests.

## Testing Stack

- **Unit Tests:** Jest + React Testing Library
- **Integration Tests:** Jest
- **E2E Tests:** Playwright

## Running Tests

### Unit and Integration Tests

```bash
# Run all unit/integration tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

### E2E Tests

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npx playwright test --ui

# Run E2E tests in headed mode (see browser)
npx playwright test --headed
```

## Writing Tests

### Unit Tests

Create test files alongside the code they test with `.test.ts` or `.test.tsx` extension.

**Example:** `lib/utils.test.ts`

```typescript
import { myFunction } from './utils'

describe('myFunction', () => {
  it('should do something', () => {
    expect(myFunction()).toBe('expected')
  })
})
```

### React Component Tests

Use React Testing Library for component tests.

**Example:** `components/Button.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const onClick = jest.fn()
    render(<Button onClick={onClick}>Click me</Button>)
    fireEvent.click(screen.getByText('Click me'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
```

### Integration Tests

Place integration tests in `__tests__/integration/`

These test multiple units working together, like API routes with database operations.

### E2E Tests

Place E2E tests in `__tests__/e2e/` with `.spec.ts` extension.

**Example:** `__tests__/e2e/auth.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('user can sign up', async ({ page }) => {
    await page.goto('/auth/signup')

    await page.fill('input[name="email"]', 'test@example.com')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/auth/verify')
  })
})
```

## Test Organization

```
├── __tests__/
│   ├── e2e/                    # End-to-end tests
│   │   └── *.spec.ts
│   └── integration/            # Integration tests
│       └── *.test.ts
├── lib/
│   ├── utils.ts
│   └── utils.test.ts           # Unit test alongside code
└── components/
    ├── Button.tsx
    └── Button.test.tsx         # Component test alongside code
```

## Best Practices

### Unit Tests

- Test individual functions and components in isolation
- Mock external dependencies
- Aim for 80%+ code coverage
- Keep tests fast and focused

### Integration Tests

- Test multiple units working together
- Test API routes with database interactions
- Use real dependencies when possible
- Test error handling and edge cases

### E2E Tests

- Test critical user flows
- Test from user's perspective
- Focus on happy paths and critical errors
- Keep E2E tests stable and reliable

## Coverage

Generate coverage report:

```bash
npm test -- --coverage
```

Coverage reports are generated in the `coverage/` directory.

## Continuous Integration

Tests run automatically on:

- Every pull request
- Before deployment to production

All tests must pass before merging.

## Debugging Tests

### Jest Tests

```bash
# Run specific test file
npm test lib/utils.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should merge classes"

# Debug in VS Code: Add breakpoint and press F5
```

### Playwright Tests

```bash
# Debug with Playwright Inspector
npx playwright test --debug

# Run specific test file
npx playwright test __tests__/e2e/home.spec.ts

# Open test report
npx playwright show-report
```

## Common Issues

### Jest can't find modules

- Check `moduleNameMapper` in `jest.config.js`
- Ensure `@/` alias is configured correctly

### Playwright browsers not installed

Run: `npx playwright install`

### E2E tests timing out

- Increase timeout in `playwright.config.ts`
- Check if dev server is running

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
