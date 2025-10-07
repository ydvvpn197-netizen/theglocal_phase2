# Theglocal - Privacy-First Local Community Platform

A privacy-first, hyper-local digital public square designed to be the virtual town square for communities everywhere.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript 5.x
- **Styling:** TailwindCSS 3.x
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth (OTP-based)

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

## Documentation

See the `docs/` directory for detailed documentation:

- [PRD](./master_prd.md) - Product Requirements Document
- [Tasks](./tasks/tasks-master-prd.md) - Development task list

## License

Proprietary - All rights reserved
