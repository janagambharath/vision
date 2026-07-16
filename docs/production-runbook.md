# Vision Vistara Production Runbook

## Runtime Version

This application requires Node.js 20. The checked-in `engines.node` and
`.nvmrc` pin Nixpacks to that major version because `@google/genai` requires
Node 20 or later. If a Railway build still reports Node 18, remove any
conflicting `NIXPACKS_NODE_VERSION=18` service variable or set it to `20`.

## Production Readiness Preflight

Run the non-secret release gate from an environment that has the same variables
as production. It checks variable presence without printing their values,
performs read-only PostgreSQL/Redis checks, validates the checked-in worker
manifests, and, with `--live`, checks the public health endpoint and security
headers:

```powershell
$env:NODE_ENV = "production"
node --env-file=.env scripts/production-preflight.mjs --live --strict
```

In Railway, run `npm run ops:preflight -- --live --strict` from a one-off
service/shell after setting `NODE_ENV=production`. Never put `.env` or any
secret value in source control or CI output.

Before this can pass, set `REQUIRE_REDIS_FOR_RATE_LIMITS=true` in Railway.
When Redis is unavailable, public rate-limited mutations then fail closed
instead of relying on per-instance memory limits. Local development may keep
the variable `false` or unset.

The three timestamp variables are deliberate operational attestations, not
automatic proof:

- `PRODUCTION_WORKERS_VERIFIED_AT`: update only after every Railway scheduled
  service is deployed, has the web-service variable group, and has a successful
  first log entry. It must be refreshed weekly.
- `PRODUCTION_BACKUP_RESTORE_VERIFIED_AT`: update only after a current backup
  is restored into a disposable staging database. It must be refreshed every
  90 days.
- `PRODUCTION_PROVIDER_CANARY_VERIFIED_AT`: update only after controlled test
  canaries verify the signed Razorpay webhook, delivery email, approved
  WhatsApp template, Shiprocket sandbox/test path, and a consented Gemini
  preview followed by deletion. It must be refreshed every 14 days and after a
  provider credential/configuration change.

The preflight can validate the local worker manifests, but it cannot discover
Railway scheduled services or safely invoke chargeable/mutating provider APIs.
Do not set an attestation timestamp without the evidence above.

## Database Backups

Run a verified local dump before every production release and schedule the same command hourly on the host:

```powershell
npm run db:backup -- -OutputDir C:\vision-vistara-backups -RetentionDays 14
```

Requirements:

- `DATABASE_URL` must point at the production PostgreSQL database.
- `pg_dump` and `pg_restore` must be installed on the machine running the backup.
- Store the backup directory on durable storage, not only the app container disk.

The backup script fails if `pg_dump` fails, the archive is suspiciously small,
or `pg_restore --list` cannot read the custom archive. It also prints a SHA-256
digest for release evidence. This validates archive integrity; it is not a
substitute for the staging restore drill below.

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
- The product has a Cloudinary product image. A transparent PNG or WebP is preferred for the most faithful result, but Gemini can use a front or gallery product image when that is all the catalog has.
- The product dashboard has no duplicate-image or try-on readiness warnings.

## AI Try-On Retention

- Set `GEMINI_API_KEY`, `GEMINI_TRY_ON_MODEL=gemini-3.1-flash-lite-image`, and the Cloudinary credentials before enabling customer AI try-on. Flash Lite Image is the default cost-saving customer-preview model. The chosen Gemini image model needs available paid-tier quota; a key with free-tier quota of zero will return `429 RESOURCE_EXHAUSTED` and cannot generate previews. Never use a `NEXT_PUBLIC_` key.
- Run `npm run worker:purge-previews` daily. It processes the 100 oldest expired
  preview records first and emits JSON logs with `selected`, `purged`, `failed`,
  and `backlogRemaining`. A Cloudinary deletion that is not confirmed leaves the
  database references intact for a retry, writes an `AI_PREVIEW_RETENTION_PURGE_FAILED`
  activity log, and exits nonzero. Alert on any failed run or a growing backlog.

## AI Product Detail Prefill

- Product-image enrichment uses OpenRouter only: set `OPENROUTER_API_KEY`, keep `OPENROUTER_PRODUCT_ENRICHMENT_MODEL=nvidia/nemotron-nano-12b-v2-vl:free`, and set `OPENROUTER_PRODUCT_ENRICHMENT_FALLBACK_MODEL=google/gemma-4-31b-it:free`. OpenRouter tries Nemotron first and only uses the explicit free vision fallback when the primary model cannot complete the request. `GEMINI_API_KEY` is reserved for customer AI try-on.
- Free-model availability and latency vary. Staff must review every draft before publishing; the workflow intentionally fills blank fields only and never infers price, SKU, stock, or warranty terms. Measurements are accepted only from a signed 15-minute result tied to the uploaded Cloudinary image; they remain blank when no readable marking is present.

## Railway Scheduled Workers

Railway cron jobs must be deployed as separate scheduled services; a web
service start command does not make a worker run on its own. The root
`railway.json` is deliberately web-only. Create one service per worker, link
the same variable group as the web service, set its Railway config-file path to
the listed `/railway.workers/*.json` file, and deploy the web service (including
migrations) before enabling the worker services:

| Railway config file | Schedule (UTC) | Command |
| --- | --- | --- |
| `/railway.workers/abandoned-carts.json` | `0 */6 * * *` | `npm run worker:abandoned-carts` |
| `/railway.workers/order-followup.json` | `0 9 * * *` | `npm run worker:order-followup` |
| `/railway.workers/low-stock-alert.json` | `0 8 * * *` | `npm run worker:low-stock-alert` |
| `/railway.workers/purge-previews.json` | `0 3 * * *` | `npm run worker:purge-previews` |
| `/railway.workers/retry-shipments.json` | `*/15 * * * *` | `npm run worker:retry-shipments` |
| `/railway.workers/reconcile-payments.json` | `*/10 * * * *` | `npm run worker:reconcile-payments` |

Each worker command exits after one pass. Verify the first run in Railway logs;
the order follow-up worker writes an `ORDER_FOLLOWUP` notification for phone-
only deliveries too, preventing repeat WhatsApp sends on later schedules.

For the preview-retention worker specifically, retain the structured completion
log as release evidence and investigate a nonzero exit immediately. `backlogRemaining`
above zero is expected during a large historical cleanup, but must trend down on
successive daily runs; it is not a reason to clear image references manually.
