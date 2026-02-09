# Pulse.Online - Copilot Instructions

## Project Overview
Pulse.Online is an internal governed publishing system for multi-channel content management. It supports 9 product channels with different governance profiles.

## Tech Stack
- Next.js 14+ (App Router)
- TypeScript (strict mode)
- Supabase (PostgreSQL + Storage)
- Tailwind CSS
- Zod for validation
- Vitest for testing

## Key Concepts

### Channels
Each product is a "channel" with its own:
- Governance profile (strict/standard/experimental)
- Allowed platforms
- Cadence rules
- Asset requirements

### Governance Profiles
- **STRICT**: No hype, mandatory CTA/hashtags, images required
- **STANDARD**: Softer language OK, images recommended
- **EXPERIMENTAL**: Creative freedom, only blocks spam/scams

## Directory Structure
- `/src/app` - Next.js App Router pages
- `/src/components` - React components
- `/src/lib/governance` - Validation engine
- `/src/lib/csv` - CSV import parser
- `/src/lib/schemas` - Zod schemas
- `/src/lib/supabase` - Database client
- `/src/tests` - Vitest tests
- `/supabase` - SQL schema and seeds

## Code Style
- Use TypeScript strict mode
- Prefer named exports
- Use Zod for all validation
- Keep components in `/components`
- Keep business logic in `/lib`

## Testing
- All governance rules must have tests
- Test CSV parsing edge cases
- Run with `npm test`
