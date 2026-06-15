# BugBountyAI

BugBountyAI is a web application built with Next.js, Supabase, and Circle Wallet integration to support authenticated bug bounty audits, reward tracking, and agent-based security scanning.

## Key Features

- Email/password authentication using Supabase
- Sign-up email verification with callback redirect handling
- Protected dashboard for authenticated users
- Leaderboard and audits listing with live updates
- Wallet integration via Circle for audit fees and rewards
- Responsive UI with modern Tailwind and Radix component styling

## Architecture

- `app/` — Next.js App Router pages and API routes
- `components/` — Reusable UI and dashboard components
- `lib/` — Supabase helpers, Circle wallet utilities, and shared utilities
- `app/api/` — Server API routes for audits, wallet session handling, uploads, and rewards
- `components/ui/` — Shared design system primitives and UI building blocks

## Authentication Flow

- `app/auth/sign-up/page.tsx` handles user registration and sends a confirmation email
- `app/auth/login/page.tsx` handles email/password login and redirects users to the dashboard
- `app/auth/callback/route.ts` consumes Supabase auth callbacks and redirects users after verification
- `middleware.ts` keeps Supabase session cookies in sync for server-side authenticated pages

## Important Environment Variables

Use a `.env.local` or `.env.development.local` file with the following values:

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `NEXT_PUBLIC_SUPABASE_REDIRECT_URL` — Auth redirect URL after email confirmation
- `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` — Fallback redirect URL for development
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key for server-side operations

## Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build the project:

```bash
npm run build
```

## Notes

- The project uses Next.js 16, React 19, and Supabase SSR auth helpers.
- Session handling is implemented through custom Supabase proxy middleware and server-side `getUser` checks.
- The dashboard requires an authenticated session and redirects unauthorized users to the login page.

## License

This repository does not include a license file. Add one if you want to define reuse permissions.

