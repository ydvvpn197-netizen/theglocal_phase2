# CI/CD Pipeline Setup

## Overview

The project uses GitHub Actions for continuous integration and deployment. The pipeline ensures code quality, runs tests, and automatically deploys to Vercel.

## Workflows

### 1. Main CI/CD Pipeline (`.github/workflows/ci.yml`)

Triggers on: Push to `main`/`develop`, Pull Requests

**Jobs:**

1. **Quality Checks** (runs first)
   - TypeScript type-check
   - ESLint
   - Prettier format check

2. **Tests** (after quality checks)
   - Unit tests with coverage
   - Uploads coverage to Codecov

3. **Build Verification** (after quality checks)
   - Builds the Next.js app
   - Verifies `.next` directory exists

4. **E2E Tests** (main branch only)
   - Runs Playwright tests
   - Uploads test results as artifacts

5. **Security Audit**
   - npm audit
   - Secret scanning with TruffleHog

6. **Deploy** (main branch, after all checks)
   - Deploys to Vercel production
   - Runs health check post-deployment

7. **Notify on Failure**
   - Sends Slack notification if any job fails

### 2. Preview Deployments (`.github/workflows/preview-deploy.yml`)

Triggers on: Pull Request opened/updated

**Jobs:**

- Deploys preview to Vercel
- Comments preview URL on PR

## Required Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

### Vercel

- `VERCEL_TOKEN`: Vercel API token
- `VERCEL_ORG_ID`: Vercel organization ID
- `VERCEL_PROJECT_ID`: Vercel project ID

### Supabase (for builds)

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon/public key

### Optional

- `SLACK_WEBHOOK_URL`: For failure notifications
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: Google Maps API key

## How to Get Secrets

### Vercel Secrets

1. Install Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. Link project: `vercel link`
4. Get project info: `vercel project ls`
5. Find your org ID and project ID in `.vercel/project.json`
6. Get token: Visit https://vercel.com/account/tokens

### Slack Webhook (Optional)

1. Create a Slack app: https://api.slack.com/apps
2. Enable "Incoming Webhooks"
3. Add webhook to workspace
4. Copy webhook URL

## Branch Protection Rules

Recommended settings for `main` branch:

- ✅ Require a pull request before merging
- ✅ Require approvals: 1
- ✅ Require status checks to pass:
  - Quality Checks
  - Run Tests
  - Build Verification
- ✅ Require branches to be up to date before merging
- ✅ Require conversation resolution before merging

## Local CI Simulation

Run the same checks locally before pushing:

```bash
# Full CI check
npm run type-check && npm run lint && npm run format:check && npm test && npm run build

# Or add to package.json
npm run ci:check
```

Add to `package.json`:

```json
{
  "scripts": {
    "ci:check": "npm run type-check && npm run lint && npm run format:check && npm test && npm run build"
  }
}
```

## Monitoring

- **GitHub Actions**: View workflow runs in the "Actions" tab
- **Vercel**: Monitor deployments at https://vercel.com/dashboard
- **Codecov**: Track coverage at https://codecov.io (if configured)

## Troubleshooting

### Build Fails

1. Check if all environment variables are set
2. Verify `npm run build` works locally
3. Check for type errors: `npm run type-check`

### Tests Fail

1. Run tests locally: `npm test`
2. Check for environment-specific issues
3. Verify test database is properly seeded

### Deployment Fails

1. Verify Vercel secrets are correct
2. Check Vercel dashboard for detailed logs
3. Ensure build succeeds in CI before deployment

### E2E Tests Timeout

1. Increase timeout in `playwright.config.ts`
2. Check if preview URL is accessible
3. Verify browser installation: `npx playwright install`

## Cost Optimization

- E2E tests run only on `main` branch (saves CI minutes)
- Preview deployments use Vercel's free tier
- Artifacts retained for 30 days only
- Failed jobs stop dependent jobs early

## Future Improvements

- [ ] Add visual regression testing (Percy/Chromatic)
- [ ] Implement canary deployments
- [ ] Add performance budgets
- [ ] Setup automated dependency updates (Renovate/Dependabot)
- [ ] Add bundle size checks
- [ ] Implement smoke tests post-deployment
