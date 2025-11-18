# 🧠 AI TOOLING CHECKLIST

### For building your Next.js + React + Supabase + Vercel app with Cursor AI

> This checklist helps prevent the “fix-one-break-another” cycle common in AI-assisted development.  
> Follow it strictly to maintain **speed, stability, and security** when using AI tools like Cursor.

---

## 🧩 1. AI-GENERATED CODE & REVIEW

- [ ] Every AI-generated snippet or file must be **reviewed by a human** before merge.
- [ ] Include an **“AI prompt” block** in the PR description (model name, date, and prompt used).
- [ ] Keep PRs **small and atomic** – one logical fix or feature per PR.
- [ ] Add **rollback instructions** in each PR (what to revert if the fix breaks prod).

---

## 🧱 2. REPRODUCIBLE DEV ENVIRONMENT

- [ ] Commit lockfile (`package-lock.json` / `pnpm-lock.yaml`) and `.nvmrc` for consistent Node versions.
- [ ] Maintain `.env.example` and a preflight script that checks required environment variables.
- [ ] Optionally include `docker-compose.dev.yml` or `.devcontainer.json` for full local parity.
- [ ] Never rely solely on MCP (Supabase/Vercel) integrations for local runs — use SDKs too.

---

## 🧪 3. TESTING & CI SAFETY NET

- [ ] CI pipeline must run: `lint`, `typecheck`, `unit tests`, `build`, and **Playwright e2e tests**.
- [ ] Add contract tests for critical APIs (post creation, auth, feed fetch).
- [ ] Add visual regression checks (Storybook or Playwright screenshots) for core UI.
- [ ] Run automated regression tests before merges — no green CI = no deploy.

---

## 🔐 4. SECURITY & SECRETS

- [ ] Never paste real secrets into AI prompts or commits.
- [ ] `.env` must be in `.gitignore`; secrets managed via Vercel / Supabase env manager.
- [ ] Run **git-secrets** or **truffleHog** in CI to detect key leaks.
- [ ] Supabase Row Level Security (RLS) **enabled and tested** with real JWTs.
- [ ] CSP & Trusted Types validated in staging (Next.js internals whitelisted).

---

## ⚙️ 5. DEPENDENCIES & BUILD STABILITY

- [ ] Audit dependencies weekly (`npm audit`, `snyk test`).
- [ ] Pin framework versions (`next`, `react`, `supabase-js`, etc.) in `package.json`.
- [ ] Watch bundle size via CI (`webpack-bundle-analyzer`) and alert on >10% increase.
- [ ] Document framework conventions: App Router vs Pages, Server vs Client components.

---

## 📈 6. OBSERVABILITY & DEBUGGING

- [ ] Add **structured logging** (pino, winston) with request IDs.
- [ ] Integrate **Sentry** for error tracking (staging + prod).
- [ ] Capture core metrics: request latency, DB query time, error rates.
- [ ] Enable Vercel Analytics or lightweight telemetry for user flow monitoring.

---

## 🚀 7. DEPLOYMENT & ROLLBACK STRATEGY

- [ ] Every PR auto-deploys to **Vercel Preview** for review.
- [ ] Production deploy only after staging smoke tests pass.
- [ ] Enable **automatic rollback** for failed deploys or 5xx spikes.
- [ ] Document emergency rollback steps (`scripts/rollback.sh` or Vercel UI).

---

## 🧭 8. DEVELOPMENT PRINCIPLES

- [ ] Use AI for **scaffolding, not architecture** — review all structural suggestions.
- [ ] Keep domain logic isolated from framework glue.
- [ ] Maintain an internal **AI Prompt Library** (`/docs/ai-prompts/`) for recurring tasks.
- [ ] Train yourself or team on safe prompting (avoid credentials, use placeholders).

---

## 🧑‍💻 9. STACK-SPECIFIC CHECKS

### Next.js

- [ ] Choose and stick to **App Router** or **Pages** directory structure.
- [ ] Use **server components** for data-heavy sections, client components for interaction.
- [ ] Test **CSP and Trusted Types** early in staging.

### Supabase

- [ ] RLS on; schema migrations reviewed before apply.
- [ ] Use **Edge Functions** for secure server logic, not client calls.
- [ ] Test auth, signup, and session refresh in staging before prod.

### Vercel

- [ ] Use **Preview Deployments** for every PR.
- [ ] Configure region and runtime matching staging.
- [ ] Add health checks and alerting for deploy failures.

---

## 🧠 10. WHEN THINGS GO WRONG

- [ ] Run `npm run preflight` before debugging to verify env and config.
- [ ] Check Sentry logs and Vercel analytics for clues.
- [ ] Rollback quickly if multiple regressions appear; isolate the root cause before retry.
- [ ] Avoid prompting AI to “fix errors” blindly — understand the diff first.

---

## 🪄 PRIORITY ACTIONS (do these first)

1. ✅ Set up CI gates: lint + typecheck + test before merge.
2. ✅ Enable RLS in Supabase and write tests for it.
3. ✅ Add Sentry or similar for real-time error tracking.
4. ✅ Abstract Supabase/Vercel clients behind small adapter modules.
5. ✅ Start keeping AI prompts in `/docs/ai-prompts/` for traceability.

---

> **Remember:** AI tools make you faster, not safer.  
> Your safety net is tests, typing, CI, and discipline — not the AI.

---
