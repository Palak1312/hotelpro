# HotelPro implementation

## Architecture

One Vercel project serves the React/Vite frontend and a single Express API function. MongoDB Atlas stores all users, properties, rooms, guests, reservations, payment entries and audit events. The frontend has no local data mode and requires authentication.

## Delivered workflows

- Required administrator/staff sign-in and database-validated role permissions.
- Room inventory, capacity and rate management, availability search, atomic reservation creation and overlap protection.
- Guest records, check-in/out, cancellation rules and room readiness updates.
- Recording received payments with exact minor-unit amounts, partial balances and idempotent retries.
- Property profile/policy editing and administrator-managed staff access.
- Actual database metrics, occupancy history, CSV exports and audit activity.
- Automatic state refresh after writes, on focus and every ten seconds.
- Repeatable setup seed for the property, administrator and starter room inventory.

## Setup still required

Configure an Atlas connection and a strong JWT signing secret in `.env`, supply the administrator/property seed values, review `scripts/seed-data.json`, then run `npm run seed`. Deploy using the matching Vercel environment variables. No database credentials are included in the repository.

## Boundaries

Payments are records of funds received outside HotelPro; online collection, refunds and ledger reversals need a separate implementation. Public guest booking, email/SMS delivery and channel-manager integrations are not included. Hotel data updates by polling rather than a persistent streaming connection.

See README.md for commands, environment configuration and verification instructions.
