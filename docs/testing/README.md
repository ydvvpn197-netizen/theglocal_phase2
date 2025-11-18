# Testing Guides

This directory contains all testing documentation and guides for the Theglocal platform.

## Main Testing Guide

- **[Testing Overview](README.md)** - Main testing guide (this file)
- **[Testing Recommendations](recommendations.md)** - Best practices and recommendations

## Specialized Testing Guides

### Accessibility Testing

- **[Accessibility Testing Guide](accessibility-guide.md)** - jest-axe setup and usage
- **[Screen Reader Testing Guide](accessibility.md)** - Manual accessibility testing with screen readers
- **[ARIA Audit Checklist](accessibility-guide.md)** - ARIA labels audit guide
- **[Animation Performance Audit](accessibility-guide.md)** - Animation optimization guide

### Feature-Specific Testing

- **[Realtime Testing Guide](realtime.md)** - Testing realtime features and subscriptions
- **[Notification Testing Guide](notifications.md)** - Testing notification race conditions and fixes
- **[End User Testing Report](user-testing.md)** - User acceptance testing results

### Test Coverage

- **[Test Coverage Guide](coverage.md)** - Test coverage reporting and improvement strategies

## Testing Strategy

### Unit Tests

- Jest + React Testing Library
- Component testing
- Utility function testing
- Hook testing

### Integration Tests

- API route testing
- Database operation testing
- External API integration testing

### E2E Tests

- Playwright for critical user flows
- Cross-browser testing
- Mobile device testing

### Accessibility Tests

- jest-axe for automated a11y testing
- Manual screen reader testing
- Keyboard navigation testing

## Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage

# Accessibility tests
npm run test:a11y
```

## Test Structure

```
__tests__/
├── unit/          # Unit tests
├── integration/   # Integration tests
├── e2e/          # End-to-end tests
└── a11y/         # Accessibility tests
```

## Additional Resources

- [CONTRIBUTING.md](../../CONTRIBUTING.md) - Contribution guidelines including testing
- [Testing Overview](README.md) - Main testing documentation

---

_For specific testing scenarios, refer to the individual guides in this directory._
