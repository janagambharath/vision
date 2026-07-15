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
- Free-model availability and latency vary. Staff must review every draft before publishing; the workflow intentionally fills blank fields only and never infers price, SKU, stock, measurements, or warranty terms.
