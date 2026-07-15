# Vision Vistara Production Runbook

## Database Backups

Run a verified local dump before every production release and schedule the same command hourly on the host:

```powershell
npm run db:backup -- -OutputDir C:\vision-vistara-backups -RetentionDays 14
```

Requirements:

- `DATABASE_URL` must point at the production PostgreSQL database.
- `pg_dump` must be installed on the machine running the backup.
- Store the backup directory on durable storage, not only the app container disk.

Restore drill:

```powershell
pg_restore --clean --if-exists --no-owner --dbname $env:DATABASE_URL C:\vision-vistara-backups\vision-vistara-YYYYMMDD-HHMMSS.dump
```

Before launch:

- Confirm one backup can be restored into staging.
- Keep at least 14 days of hourly/daily backups.
- Add provider snapshots or object storage replication for off-host copies.

## Database Migration Baseline

New databases are bootstrapped by the checked-in initial migration. Railway
runs `prisma migrate deploy` before starting the application, so do not use
`prisma db push` in production.

For an existing database created before migrations were tracked:

1. Take and verify a backup.
2. Compare the live schema with `prisma/schema.prisma` in staging.
3. Mark only the baseline as applied, then deploy the later migrations:

```powershell
npx prisma migrate resolve --applied 20260712000000_initial_baseline
npx prisma migrate deploy
```

Never run the initial baseline SQL directly against a populated database.

### Recovery: failed `20260715120000_gemini_tryon_prescriptions`

The `P3009` deployment loop means Prisma recorded this migration as failed, so
it will refuse every later deployment until the failed record is resolved. The
checked-in migration now includes the required PostgreSQL enum casts. Do not
delete migration files or bypass migrations with `db push`.

For the recorded failure (`column "status" is of type "PrescriptionStatus" but
expression is of type text`), PostgreSQL rolled back the migration transaction.
Open a Railway service shell on the latest release and run exactly once:

```sh
CONFIRM_FAILED_PRESCRIPTION_MIGRATION_ROLLBACK=yes npm run db:recover-prescription-migration
```

The command marks only that known failed migration as rolled back, then applies
the corrected migration. Confirm `npx prisma migrate status` reports the
database is up to date before restarting the service.

The release start command includes the same narrow recovery for this exact
`P3009` record. It does not resolve any other failed migration automatically;
those remain blocked for review rather than risking schema history.

If this is truly an empty disposable database and the recovery command cannot
run because the schema has been changed manually, take a snapshot, reset the
database from the Railway PostgreSQL service, redeploy `main`, then run
`npm run db:seed` once in a Railway shell. Never use an empty-database reset on
a database containing customer, order, prescription, or payment data.

## Payment Recovery

- Check `PaymentWebhookEvent` for unprocessed or unmatched webhook events.
- Check `Notification` rows with `entityType = "PaymentWebhookEvent"`.
- Reconcile Razorpay order/payment IDs against local `Payment.providerOrderId` and `Payment.providerPaymentId`.
- Never manually mark an order paid without confirming the Razorpay signature or dashboard payment state.
- Online checkout stock is reserved for 30 minutes; COD/manual checkout stock is reserved for 48 hours. The `worker:reconcile-payments` job releases unpaid expired checkouts.
- A captured payment that cannot consume its allocation creates a `PaymentReconciliation`. The worker makes one guarded refund attempt. Do not retry an `REFUNDING` or `REQUIRES_REVIEW` record until an owner has checked Razorpay, because a timed-out provider response can be ambiguous.
- `REFUND_PENDING` is not a completed refund. Keep payment and fulfillment closed until the signed `refund.processed` webhook moves it to `REFUNDED`; Razorpay can return a pending normal refund before the final provider result.
- Do not create a shipment while an order has an open payment reconciliation.

## Product Launch Gate

A product can be active only when:

- Price and inventory are set.
- At least one real product image is present.
- `tryOnEligible` has a Cloudinary product image. A transparent PNG or WebP is preferred for the most faithful result, but Gemini can use a front or gallery product image when that is all the catalog has.
- The product dashboard has no duplicate-image or try-on readiness warnings.

## AI Try-On Retention

- Set `GEMINI_API_KEY`, `GEMINI_TRY_ON_MODEL`, and the Cloudinary credentials before enabling customer AI try-on. Never use a `NEXT_PUBLIC_` key.
- Run `npm run worker:purge-previews` daily. It removes temporary customer selfie assets after their 30-day retention window while retaining generated preview records for cache and audit purposes.

## AI Product Detail Prefill

- Product-image enrichment uses OpenRouter only: set `OPENROUTER_API_KEY`, keep `OPENROUTER_PRODUCT_ENRICHMENT_MODEL=nvidia/nemotron-nano-12b-v2-vl:free`, and set `OPENROUTER_PRODUCT_ENRICHMENT_FALLBACK_MODEL=openrouter/free`. OpenRouter will try Nemotron first and only use the free fallback when the primary model cannot complete the request. `GEMINI_API_KEY` is reserved for customer AI try-on.
- Free-model availability and latency vary. Staff must review every draft before publishing; the workflow intentionally fills blank fields only and never infers price, SKU, stock, or warranty terms. Measurements are accepted only from a signed 15-minute result tied to the uploaded Cloudinary image; they remain blank when no readable marking is present.

## Railway Scheduled Workers

Railway cron jobs must be deployed as separate scheduled services; a web
service start command does not make a worker run on its own. Create one service
per command from this repository, give each the same database and provider
environment variables as the web service, and configure these schedules in the
Railway service settings:

| Schedule (UTC) | Command |
| --- | --- |
| `0 */6 * * *` | `npm run worker:abandoned-carts` |
| `0 9 * * *` | `npm run worker:order-followup` |
| `0 8 * * *` | `npm run worker:low-stock-alert` |
| `0 3 * * *` | `npm run worker:purge-previews` |
| `*/15 * * * *` | `npm run worker:retry-shipments` |
| `*/10 * * * *` | `npm run worker:reconcile-payments` |

Each worker command exits after one pass. Verify the first run in Railway logs;
the order follow-up worker writes an `ORDER_FOLLOWUP` notification for phone-
only deliveries too, preventing repeat WhatsApp sends on later schedules.
