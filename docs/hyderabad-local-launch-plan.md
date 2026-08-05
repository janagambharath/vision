# Vision Vistara Hyderabad local-launch plan

## 1. Executive Summary

Do not launch publicly yet. Launch only after a narrow Hyderabad pilot catalog
and one accountable lens lab are ready. The platform now enforces a local
pincode zone and refuses to expose a frame without price, landed cost, stock,
and usable imagery; operations must supply the real commercial inputs.

## 2. Business Model

Sell one thing first: optometrist-guided finished prescription eyewear for
select Hyderabad customers. The initial conversion path is referral or
WhatsApp lead -> frame shortlist -> prescription review -> finished pair ->
local delivery/fitting -> aftercare and review.

Do not compete with Lenskart on national selection, free trials, or discount
depth. Compete on accountable human guidance, transparent local service, and
correct prescription/fit follow-up.

## 3. Pricing Strategy

Use a three-step price ladder, but publish only values backed by the supplier
and lens-lab quotation:

| Offer | Customer promise | Rule |
| --- | --- | --- |
| Frame only | A clearly priced frame, case, and local delivery fee | Publish only after recorded landed cost and stock. |
| Everyday finished pair | Frame plus verified single-vision lens package | Show one all-in total before checkout. |
| Clinical upgrade | Thin, photochromic, progressive, or speciality lens | Quote only after prescription and lab confirmation. |

The frame selling price must exceed recorded landed cost. The finished-pair
price must also cover lens/lab cost, case/packing, local delivery, COD/RTO
reserve, support time, and an allowance for remakes. Keep delivery at a clear
flat local fee until measured economics justify a threshold-based waiver.
No open-ended coupons, free delivery promotions, or “free trial everywhere.”

## 4. Product Strategy

Build a 48–72 SKU initial collection, not a thousand-SKU marketplace:

- 60% adult everyday frames: black, brown, transparent, lightweight metal,
  and acetate in proven shapes.
- 25% style-led frames: women’s and unisex statement shapes with exact sizes.
- 15% kids only after a suitable prescription/fitting process exists.

Every SKU needs supplier, supplier SKU, landed cost, real quantity, material,
measurements, warranty, return terms, and four or more real angles. Do not
activate progressive/high-index offers until the lab has signed off on range,
turnaround, fitting data, and remake responsibility.

## 5. Local Service Zone

The server-enforced default is the approved Hyderabad pincode set in
`lib/local-service.ts`, including `500001`–`500119` where listed and `501505`.
Production may configure the list with `HYDERABAD_SERVICEABLE_PINCODES`.
Operations must not expand it beyond the approved set without route capacity,
fulfillment timing, and staff coverage evidence.

Delivery: 1–3 business days after COD confirmation. Home trial: up to five
frames, only after route, stock, and staff confirmation. A rejected pincode is
a polite WhatsApp lead, not a manual exception that silently changes the
service area.

## 6. Operations Plan

Daily owner: one named operations person per advertised shift.

1. Respond to new WhatsApp, appointment, and trial leads within ten minutes.
2. Qualify pincode, prescription state, desired frame type, and budget.
3. Confirm a trial only after batching a viable route and scanning the frames
   out of inventory.
4. Verify prescription and PD/fitting requirements before sending a lab job.
5. Perform final lens/frame QC before local dispatch.
6. Send order status and a seven-day adjustment/remake follow-up.
7. Log outcome, route time, trial conversion, refund/remake reason, and review
   request in the admin system.

Never use an unowned WhatsApp chat as the order record. The dashboard status,
staff owner, next action, and promise date are the source of truth.

## 7. Supply Chain Plan

Start with Indian suppliers and one local/national lens lab. Before a purchase
order, obtain samples, GST invoice capability, supplier SKU, MOQ, replacement
terms, lead time, and a written quality checklist. Two suppliers per winning
shape are preferable once the first 30 days of sell-through are known.

Do not import launch stock. Import later only after repeat demand, stable
reorder forecasts, and a fully costed landed-cost model that includes product,
freight, insurance, duty/tax cash flow, customs brokerage, local transport,
damage reserve, and lead time. An import workflow must include IEC and customs
documentation; DDP is not a substitute for understanding the landed cost.

## 8. Website / Store Upgrade Plan

The homepage should sell trust: named optometrist, local service scope,
prescription review, WhatsApp response promise, honest clinical referrals, and
real reviews. The `/frames` store should sell a validated product: final price,
size, material, delivery estimate, warranty, prescription compatibility, and
one dominant action.

Implemented platform rules:

- Delivery and home-trial pincode checks are server-enforced.
- The public catalog excludes products without cost, price, stock, COD, and a
  sellable inventory status.
- Unverified fixture products and promotions remain private.
- A no-catalog state directs customers to WhatsApp instead of pretending stock
  exists.

## 9. AI Try-On Plan

Keep Gemini try-on behind a clear “preview only” disclosure. Generate only
after explicit customer consent and a button tap; preserve the existing
retention/deletion workflow. Show product images and frame measurements beside
the preview. If generation fails, return the customer to real product photos
and WhatsApp fitting support. Never claim that a preview confirms fit,
prescription suitability, or lens thickness.

## 10. Prescription Workflow Plan

The supported customer choices are: enter values manually, upload an existing
prescription, request an eye test, or upload later. All prescription-lens
orders remain in `AWAITING_PRESCRIPTION` until staff review. Staff must verify
OD/OS SPH, CYL, AXIS, ADD, PD, prism/base, date, and suitability before the
lens job starts. Ambiguous or expired prescriptions go to WhatsApp/clinical
review, never directly to the lab.

## 11. Local SEO Plan

Create one accurate Google Business Profile as either a service-area business
or a real staffed clinic—never a virtual showroom. Use the same business name,
phone, hours, website, and service area everywhere. Publish only genuine local
photos, actual practitioner credentials, and verified customer reviews.

Create pages for the real launch intent: `optometrist-guided eyewear Hyderabad`,
`prescription glasses Gachibowli`, and `home frame fitting Hyderabad` only
after the underlying service is actually available. Do not create city pages
for locations the team cannot serve.

## 12. Finance / Unit Economics Plan

Measure every completed order with:

`contribution = collected revenue - frame landed cost - lens/lab - packing - delivery - COD/RTO - support - discount - trial allocation - remake/refund reserve`

Launch targets:

- Gross margin before fulfillment: at least 55%.
- Contribution before CAC: at least ₹1,000 per completed order.
- Home-trial cost divided by trial-to-paid-order conversion: below the planned
  contribution margin.
- Blended CAC: below one-third of contribution until repeat/referral data is
  established.

If a ₹400 route converts one in four trials, it costs ₹1,600 per resulting
order. That is unacceptable for an entry-price pair; qualify, batch, charge a
redeemable fee when appropriate, or decline the trial.

## 13. Risks

| Risk | Control |
| --- | --- |
| Dead inventory | Buy shallow, review 30-day sell-through weekly, reorder winners only. |
| COD/RTO | Phone/WhatsApp confirmation, pincode zone, dispatch cut-off, and RTO reserve. |
| Wrong prescription or remake | Mandatory staff review and lab QC/rewrite agreement. |
| Home-trial loss or route burn | Five-frame limit, custody scan, staff confirmation, and route-level P&L. |
| Trust failure | No fake reviews, no inflated catalog claims, clear practitioner/service identity. |
| Supplier or lab failure | Written SLA, samples, backup supplier, and tracked defect rate. |

## 14. Must-Fix Before Launch

- Configure the real Hyderabad service-pincode list in production.
- Record supplier and landed cost for every intended launch SKU.
- Publish at least 48 priced, stocked, photographed frames through the admin
  gate.
- Activate only lens packages backed by the selected lab’s quotation and remake
  policy.
- Complete a real mobile order, prescription review, trial, delivery, return,
  and adjustment drill.
- Verify Google Business Profile, phone, WhatsApp templates, practitioner
  credentials, local hours, and aftercare owner.
- Run the production preflight and preserve its operational attestations.

## 15. Final Verdict

Launch locally after—not before—the must-fix list is complete. The highest ROI
work is not more AI, more pages, or more stock. It is a priced 48–72 SKU local
catalog, lab accountability, a strict pincode zone, and disciplined WhatsApp
operations. Nationwide claims, import inventory, blanket discounts, and
unqualified free trials remain out of scope until the Hyderabad pilot produces
repeatable contribution margin.
