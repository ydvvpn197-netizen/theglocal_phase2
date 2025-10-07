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

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run Jest tests
- `npm run test:e2e` - Run Playwright E2E tests

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

