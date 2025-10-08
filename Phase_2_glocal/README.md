# Theglocal - Privacy-First Local Community Platform

> *Your local community's digital town square*

A privacy-first, hyper-local digital public square designed to connect communities, support local artists, and enable civic engagement - all while protecting user anonymity.

## ✨ Features

### 🏘️ **Community Platform**
- Anonymous participation with auto-generated handles
- Location-based community discovery
- Posts, comments, and threaded discussions
- Upvote/downvote system
- Community moderation tools

### 🎭 **Artist Ecosystem**
- Artist profiles with portfolio showcase
- Subscription-based visibility (₹500/month, 30-day free trial)
- Event creation and management
- Direct booking system with messaging
- Payment integration via Razorpay

### 📊 **Civic Engagement**
- Anonymous polls with 5 categories
- Government authority tagging
- Local issue discussions
- Community decision-making

### 📰 **Content Discovery**
- Google News integration for local news
- Reddit post aggregation
- BookMyShow event syncing
- Share external content to communities

### 🛡️ **Moderation & Governance**
- Content reporting with 6 categories
- Community admin dashboards
- Transparent public moderation logs
- Privacy-preserving enforcement
- Appeal process

### 🔒 **Privacy & Security**
- Anonymous handles (no real names)
- City-level location only (coordinates rounded to ~1km)
- Row Level Security (RLS) on all tables
- Encrypted data at rest and in transit
- No tracking or profiling
- GDPR/CCPA compliant

## 🚀 Tech Stack

### **Frontend**
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript 5.x
- **Styling:** TailwindCSS 3.x + shadcn/ui
- **State Management:** React Query (TanStack Query)
- **Forms:** React Hook Form + Zod validation
- **Icons:** Lucide React

### **Backend & Infrastructure**
- **Database:** Supabase (PostgreSQL + PostGIS)
- **Authentication:** Supabase Auth (Email/Phone OTP)
- **Storage:** Supabase Storage (images)
- **Payments:** Razorpay (subscriptions)
- **Email:** Resend (transactional emails)
- **Hosting:** Vercel (with Cron Jobs)

### **External APIs**
- Google News API (local news)
- Reddit API (community content)
- BookMyShow API (events)

## 📦 Test Coverage

- **Integration Tests:** 167+ passing
- **E2E Tests:** 4 critical flows
- **Unit Tests:** Components and utilities
- **Total:** 180+ tests

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn

### Installation

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

Create a `.env.local` file in the project root with your Supabase credentials:

```bash
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Application Settings
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

See `SUPABASE_SETUP.md` and `ENV_SETUP.md` for detailed instructions.

3. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
├── app/                    # Next.js App Router pages
├── components/            # React components
├── lib/                   # Utilities and libraries
├── supabase/             # Database migrations and schemas
└── public/               # Static assets
```

## Development Workflow

### Common Commands

```bash
# Development
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Build for production
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix lint issues automatically
npm run format           # Format all files with Prettier
npm run format:check     # Check if files are formatted
npm run type-check       # Run TypeScript compiler

# Testing
npm test                 # Run Jest unit/integration tests
npm run test:watch       # Run tests in watch mode
npm run test:e2e         # Run Playwright E2E tests (requires dev server)

# Database (Supabase)
npm run db:start         # Start local Supabase (requires Docker)
npm run db:stop          # Stop local Supabase
npm run db:reset         # Reset database and reapply migrations
npm run db:migrate       # Push migrations to remote database
npm run generate-types   # Generate TypeScript types from schema
```

### Development Flow

1. **Start development:**

   ```bash
   npm run dev
   ```

2. **Make changes** to code

3. **Run tests:**

   ```bash
   npm test
   ```

4. **Check code quality:**

   ```bash
   npm run lint
   npm run type-check
   ```

5. **Format code:**

   ```bash
   npm run format
   ```

6. **Commit changes:**
   ```bash
   git add .
   git commit -m "feat: your change description"
   ```

### Before Pushing

Always run before pushing to ensure quality:

```bash
npm run lint            # No linting errors
npm run type-check      # No type errors
npm test                # All tests pass
npm run build           # Build succeeds
```

Or use this one-liner:

```bash
npm run lint && npm run type-check && npm test && npm run build
```

## Privacy First

This platform is built with privacy as a first-class feature:

- Anonymous user identities by default
- No tracking or behavioral profiling
- Location data kept at city level only
- Transparent moderation logs
- GDPR/CCPA compliant

## 📚 Documentation

### **Setup Guides**
- [ENV_SETUP.md](./ENV_SETUP.md) - Environment variables configuration
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Database setup instructions
- [APPLY_MIGRATIONS.md](./APPLY_MIGRATIONS.md) - How to apply database migrations
- [TESTING.md](./TESTING.md) - Testing guide and best practices
- [CRON_JOBS.md](./CRON_JOBS.md) - Automated job configuration

### **Project Documentation**
- [master_prd.md](./master_prd.md) - Product Requirements Document
- [tasks/tasks-master-prd.md](./tasks/tasks-master-prd.md) - Development task list with progress
- [PROGRESS_SUMMARY.md](./PROGRESS_SUMMARY.md) - Current implementation status
- [PRE_6.0_STATUS.md](./PRE_6.0_STATUS.md) - Pre-launch readiness report

### **Deployment**
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment guide
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines and how to contribute.

## 📄 License

Proprietary - All rights reserved

## 📧 Contact

- **Support:** support@theglocal.com
- **Appeals:** appeals@theglocal.com
- **General:** hello@theglocal.com

---

**Built with ❤️ for local communities across India**
