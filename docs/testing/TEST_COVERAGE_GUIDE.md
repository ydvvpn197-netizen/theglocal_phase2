# Test Coverage Guide

## Running Coverage Reports

### Generate Coverage

```bash
# Run tests with coverage
npm run test:coverage

# View HTML report
open coverage/index.html  # macOS
start coverage/index.html  # Windows
```

### Coverage Thresholds

Current thresholds set in `jest.config.js`:

- **Branches:** 70%
- **Functions:** 70%
- **Lines:** 80%
- **Statements:** 80%

## Coverage Reports

### Available Formats

1. **Text** - Console output
2. **HTML** - Interactive browser report (`coverage/index.html`)
3. **LCOV** - For CI/CD integration
4. **JSON Summary** - For badges and automation

## Viewing Coverage

### HTML Report

The most detailed view showing:

- Per-file coverage statistics
- Line-by-line coverage highlighting
- Uncovered code paths
- Branch coverage details

Navigate to `coverage/index.html` after running tests.

### Console Output

Quick summary displayed after running `npm run test:coverage`.

## Coverage Badges

### Setup (GitHub Actions)

```yaml
# In .github/workflows/ci.yml
- name: Upload Coverage to Codecov
  uses: codecov/codecov-action@v4
  with:
    files: ./coverage/coverage-final.json
    flags: unittests
```

### Badge Markdown

```markdown
![Coverage](https://codecov.io/gh/your-org/theglocal/branch/main/graph/badge.svg)
```

## Improving Coverage

### Identify Gaps

1. Run `npm run test:coverage`
2. Open `coverage/index.html`
3. Look for files with low coverage
4. Click on files to see uncovered lines

### Priority Areas

Focus coverage efforts on:

1. **API Routes** (80%+ target)
2. **Business Logic** (90%+ target)
3. **Utilities** (85%+ target)
4. **Critical Flows** (95%+ target)

### Common Gaps

- Error handling branches
- Edge cases
- Async error paths
- Validation logic
- Permission checks

## CI/CD Integration

### Enforce Coverage in PR

```yaml
- name: Check Coverage
  run: npm run test:coverage
  # Fails if below threshold
```

### Coverage Comments

Use GitHub Actions to comment coverage changes on PRs.

## Excluded from Coverage

Files excluded (see `jest.config.js`):

- Type definitions (`*.d.ts`)
- Node modules
- Build output (`.next/`)
- Test files themselves
- Configuration files

## Best Practices

1. **Write tests first** for new features
2. **Test edge cases** not just happy paths
3. **Mock external dependencies** properly
4. **Test error scenarios** thoroughly
5. **Keep tests maintainable** - don't test implementation details
6. **Review coverage** before merging PRs

## Coverage Goals

| Phase   | Target | Timeline  |
| ------- | ------ | --------- |
| Current | 75%    | Baseline  |
| Q1 2026 | 80%    | 3 months  |
| Q2 2026 | 85%    | 6 months  |
| Stable  | 90%+   | 12 months |

## Monitoring

### Weekly Review

- Check coverage trends
- Identify declining files
- Plan coverage improvements

### Monthly Report

- Coverage by module
- New code coverage
- Improvement areas

## Common Commands

```bash
# Run specific test with coverage
npm run test:coverage -- path/to/test

# Coverage for changed files only
npm run test:coverage -- --onlyChanged

# Coverage with watch mode
npm run test:coverage -- --watch

# Update snapshots and coverage
npm run test:coverage -- -u
```
