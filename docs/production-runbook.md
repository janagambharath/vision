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

## Payment Recovery

- Check `PaymentWebhookEvent` for unprocessed or unmatched webhook events.
- Check `Notification` rows with `entityType = "PaymentWebhookEvent"`.
- Reconcile Razorpay order/payment IDs against local `Payment.providerOrderId` and `Payment.providerPaymentId`.
- Never manually mark an order paid without confirming the Razorpay signature or dashboard payment state.

## Product Launch Gate

A product can be active only when:

- Price and inventory are set.
- At least one real product image is present.
- `tryOnEligible` has a catalog image. A transparent PNG/WebP is preferred; otherwise the try-on service automatically uses the front image, then the highest-priority gallery image.
- The product dashboard has no duplicate-image or try-on readiness warnings.

## AI Try-On Retention

- Set `BFL_API_KEY` and the Cloudinary credentials before enabling customer AI try-on.
- Run `npm run worker:purge-previews` daily. It removes temporary customer selfie assets after their 30-day retention window while retaining generated preview records for cache and audit purposes.

## AI Product Detail Prefill

- Set `OPENROUTER_API_KEY`. The default `OPENROUTER_PRODUCT_ENRICHMENT_MODEL=openrouter/free` selects a currently available free model that supports both product-image understanding and strict JSON output.
- Free-model availability and latency vary. Staff must review every draft before publishing; the workflow intentionally fills blank fields only and never infers price, SKU, stock, measurements, or warranty terms.
