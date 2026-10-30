# HotelPro

HotelPro is a React application and Express API deployed together as one Vercel project. MongoDB Atlas is the source of truth. Sign-in is required, and the interface has no browser-storage data fallback.

## First setup

Use Node.js 22 and npm.

1. Run `npm install`.
2. Copy `.env.example` to `.env` and enter your Atlas connection string and database name.
3. Generate a signing secret with `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"` and put it in `JWT_SECRET`.
4. Fill in `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME`, and `SEED_PROPERTY_NAME`. The password must be at least 12 characters and at most 72 UTF-8 bytes. Address and phone are optional.
5. Review `scripts/seed-data.json`: it contains the hotel's time zone, currency, check-in/out times, and 12 starter rooms with capacities and nightly rates. Adjust these to your property before seeding.
6. Run `npm run seed`.
7. Run `npm run dev`, then open the printed local URL and sign in using the seeded administrator account.

The same API handles development and Vercel requests. The local Vite server mounts the Express API directly, so no second development server is needed. Restart it after changing environment variables.

Do not put Atlas credentials or JWT secrets in frontend variables. `.env` is ignored by Git. Atlas must permit the application's network access, and its database user needs read/write and index creation permissions. Transactions require an Atlas replica set or sharded deployment.

## Seed behavior

`scripts/seed.js` runs `scripts/bootstrap.js` using the inventory in `scripts/seed-data.json`.

The seed creates one property, one administrator and the configured room inventory, plus database indexes. It creates no guests, reservations or payment history. Those screens start empty until staff enter operational records.

The seed is safe to repeat: it only inserts missing records and preserves existing passwords, settings, rates and room edits. It does not reset an existing administrator password. A conflicting admin email belonging to another property or role causes the seed to stop. Never use seed runs as a database reset.

If you used the earlier schema, choose a new `MONGODB_DB` and run the new seed. Old records are not deleted or silently converted. The application rejects incompatible reservation or room records rather than presenting incorrect financial figures.

## Working features

- Public workspace sign-up creates a real property and administrator in Atlas; no inbox or email verification is required. The email-shaped login name must still be unique. Sign-in uses hashed passwords and an HttpOnly session cookie, with sign-out and session restoration.
- New workspaces start with empty room inventory, guests, reservations and payment history. Add the property's actual rooms before making reservations.
- Roles for administrator, manager and front desk. Administrators create and activate/deactivate staff. Account activity and permissions are checked on every authenticated request.
- Shared property settings, contact information, time zone and check-in/out policy times.
- Room creation/editing, capacities, nightly rates, readiness and maintenance status.
- Availability lookup, physical-room allocation and reservation creation. Prices are calculated from stored room rates and stay duration on the server. Existing bookings retain their price.
- Transactional overlap prevention: reservation changes serialize on the room before checking dates. Back-to-back bookings are permitted because check-out dates are exclusive.
- Controlled check-in, check-out and cancellation. Check-in requires a vacant, ready room during the booked dates. Check-out requires a settled balance and marks the room for cleaning.
- Guest records, contact editing, notes and reservation history.
- Received-payment ledger with partial payments, balance checks, transaction references and request deduplication.
- Database-derived dashboard/report figures, CSV downloads and a persisted activity log.

Hotel data refreshes after each successful write, when the window gains focus, and every 10 seconds while visible. This is near-real-time polling, not a WebSocket subscription. A failed refresh displays an error; it never substitutes fabricated data. Open forms retain unsaved edits during background refreshes.

## Payments

HotelPro records payments already collected by cash, UPI, bank transfer or an external card terminal. It does not initiate bank transfers or charge cards. A non-cash entry requires a transaction reference. No card credentials are accepted. Currency values are stored as integer minor units to avoid decimal rounding errors.

Payment entries are immutable through the app. Refund processing and ledger reversals are not implemented. Cancellation is blocked once payments have been recorded, so staff cannot silently discard a paid stay. Currency is fixed after property setup.

## Vercel deployment

Import this repository as one Vercel project with Node.js 22. The configuration builds the frontend to `dist` and routes `/api/*` to the single `api/index.js` entry point. Server helpers live outside the API directory.

Set `MONGODB_URI`, `MONGODB_DB` and `JWT_SECRET` in Vercel's environment settings. Use the same database you seeded, and a separate database for preview deployments. Seed credentials are only needed locally for setup and should not be added to the browser bundle or deployment configuration.

## Validation

- `npm run build` builds the frontend and loads the API module through the development configuration.
- `npm test` runs date, monetary precision, reservation lifecycle and reporting checks.
- For the Atlas integration test, set `TEST_MONGODB_URI` to a test-capable Atlas connection and run `npm test`. The test creates a randomly named `hotelpro_test_*` database, verifies concurrent booking prevention, server-owned pricing, payment retry deduplication, role restrictions, tenant isolation, session revocation and lifecycle updates, then removes only that generated test database. It never uses the configured application database. The Atlas test is explicitly skipped without this variable.

## API

Authentication: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.

Shared state: `GET /api/state`, `GET /api/availability`, `GET /api/health`.

Writes: `POST /api/reservations`, `PATCH /api/reservations/:id/status`, `POST /api/reservations/:id/payment`, `POST/PATCH /api/rooms[/:id]`, `POST/PATCH /api/guests[/:id]`, `PUT /api/property`, `POST/PATCH /api/staff[/:id]`.

All operational endpoints require an active session and scope data to that user's property. Mutation endpoints require JSON and reject cross-origin browser requests. Responses containing hotel records are not cached.
