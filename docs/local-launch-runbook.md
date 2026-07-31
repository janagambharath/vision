# Vision Vistara: Hyderabad launch runbook

This runbook is for an online, scheduled-home-visit Hyderabad launch. It does not replace medical,
tax, employment, or consumer-law advice.

## Before the site is public

1. Set `LOCAL_SERVICE_PINCODES` in the production service: a comma-separated
   list of pincodes the team can fulfil for COD delivery. Home-trial requests
   are accepted from any valid Indian pincode and must be reviewed manually.
2. Do not publish a physical address, map, walk-in, or showroom claim unless
   Vision Vistara actually opens a staffed public location.
3. Assign one named staff member per shift to own new leads, COD orders,
   prescription review, and home-trial requests.
4. Confirm every active frame has real stock, a correct image, price, SKU,
   measurements, lens compatibility, warranty, and return terms.
5. Test a real customer flow on a phone: appointment request, WhatsApp
   continuation, home-trial request, COD order, prescription upload, and
   order lookup.
6. Run the release gate from the production environment only after the real
   operations checks are complete:

   ```powershell
   $env:NODE_ENV="production"
   npm run ops:preflight -- --live --strict
   ```

## Every new appointment or WhatsApp lead

1. Contact the person within ten minutes during clinic hours.
2. Confirm the service, clinician/optometrist availability, date, and time.
3. Record the confirmed slot and outcome in the admin lead record.
4. Do not call a request a confirmed appointment until staff confirm it.

## Every home-trial request

1. Check the request pincode, practical travel route, and staff availability;
   never confirm a visit merely because the request was submitted.
2. Confirm every chosen frame is physically available and photograph/scan the
   handover if the team uses that process.
3. Confirm the address, date, time, staff assignee, and return handover on
   WhatsApp before marking the request `CONFIRMED`.
4. Use `PACKED` only when frames are physically packed, `SHIPPED` only when
   the staff member is leaving, and `DELIVERED` only after frames return or
   the trial is completed.
5. Cancel stale requests; do not leave customer addresses in an unowned queue.

## Every COD order

1. Call or WhatsApp to confirm the order before dispatch.
2. Verify prescription status before lens processing.
3. Verify address, pincode, stock, total, and delivery promise.
4. Record dispatch and delivery updates on the order, not only in WhatsApp.

## Stop conditions

Pause ads and home-trial promotion if any of these are true:

- Staff are taking more than ten minutes to respond during advertised hours.
- A home-trial visit is being confirmed without a viable route and staff plan.
- Product stock or pricing is inaccurate.
- A prescription order is moving without review.
- The production preflight, backup restore, provider canary, or worker
  verification has not passed.
