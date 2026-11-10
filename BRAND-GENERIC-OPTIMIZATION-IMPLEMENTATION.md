# Brand/Generic Optimization in the Order Pad

## Purpose

This guide explains how to recreate the current Cascade Plus cheaper-alternatives feature in another Order Pad wireframe. The logic is bidirectional: an approved mapped product can be replaced by a cheaper Brand or a cheaper Generic product.

The feature must preserve the current Order Pad layout. The suggestions drawer overlays the basket; it does not resize the table or add a permanent column. No product images or full supplier matrix are required.

The current reference implementation is split across:

- `brand-equalisation.js` — mapping graph, opportunity calculation, API adapter, audit fallback.
- `app.js` — Order Pad state, drawer, selection, switch, undo, banner and submission snapshot.
- `brand-equalisation.css` — overlay drawer, cards, statuses, popover and modal styling.
- `index.html` — Order Pad, drawer and confirmation-modal markup.
- `history.html` — submitted-order badge and expanded Product Change Details.

## User-facing terminology

Use neutral wording because the direction may be Brand to Generic or Generic to Brand.

| Location | Wording |
| --- | --- |
| Order Pad banner | `5 cheaper alternatives available · Save up to £25.00` |
| Drawer heading | `Cheaper Alternatives (5)` |
| Drawer subtitle | `Approved lower-cost alternatives for products in your basket.` |
| Selection helper | `Select multiple items to switch together.` |
| Row before a change | `Cheaper equivalent available` |
| Row after a change | `✓ Alternative selected · Saved £5.10` |
| Order History badge | `Alternative selected` |
| Expanded history heading | `Product Change Details` |
| Audit labels | `Changed by`, `Changed at`, `Estimated saving` |

The alternative-side heading is dynamic:

- replacement type Brand → `Lower-cost Brand`
- replacement type Generic → `Lower-cost Generic`

Do not show saving percentages. Display money to two decimal places in GBP.

## Required data

### Product

Each catalogue product needs:

```js
{
  id,
  name,
  pip,
  productType,       // "Brand" or "Generic"
  packSize,
  tariff,
  supplierOffers: [
    { supplierId, supplierLabel, supplierPip, price, available }
  ]
}
```

### Basket line

Each basket line needs a stable `lineId` that survives a product replacement:

```js
{
  lineId,
  productId,
  name,
  pip,
  productType,
  packSize,
  quantity,
  selectedSupplier,
  selectedSupplierPip,
  selectedOfferKey,
  selectedPrice,
  equalisation: null // populated after a successful change
}
```

### Approved mapping

Mappings must come from the approved Product Mapping source, not name matching:

```js
{
  sourceProductId,
  replacementProductId,
  mappingType: "brand",
  status: "Valid"
}
```

Treat an Admin unlink or status downgrade as authoritative. Do not restore an invalid mapping from stale fallback data.

## Bidirectional Brand ↔ Generic logic

An approved relationship is an undirected equivalence relationship. If Admin links product A to product B, build both directions:

```text
A → B
B → A
```

If mappings connect more than two products, expand the connected component so every member can be considered against every other member. Assign the members a stable `equivalentGroupId`.

Example:

```text
Generic A — Brand B — Generic C

Candidates:
A → B, A → C
B → A, B → C
C → A, C → B
```

The replacement label comes from the replacement product's type, not from the direction of the original Admin link.

### Pair eligibility

A current/replacement pair is eligible only when all of these are true:

1. The mapping is approved and has status `Valid`.
2. The current and replacement IDs are different.
3. Both products exist in the active catalogue.
4. Pack sizes are compatible. In this wireframe, normalized non-empty pack-size strings must match.
5. The replacement has at least one selectable supplier offer.
6. The replacement offer is not above Drug Tariff.
7. The replacement pack price is strictly lower than the current selected pack price.
8. The calculated total saving is greater than zero.

Apply any existing customer, product, supplier, availability or ordering restrictions before presenting the recommendation.

### Choosing the recommendation

For every basket line:

1. Find all products in its approved equivalence group.
2. Get the best valid supplier offer for each replacement.
3. Discard ineligible or non-cheaper candidates.
4. Sort by lowest replacement pack price.
5. Use product ID as a stable tie-breaker.
6. Return only the best candidate for that basket line.

This keeps the drawer lightweight and avoids reintroducing the old supplier matrix.

## Pricing and saving calculation

Use the same pack-price basis as the Order Pad:

```text
Saving per pack = Current selected pack price - Recommended pack price
Total saving    = Saving per pack × Basket quantity
```

Round stored/displayed money to two decimal places.

Example:

```text
Current price:      £12.60
Recommended price:  £11.00
Quantity:           2
Saving per pack:    £1.60
Total saving:       £3.20
```

Card copy:

```text
Qty 2 · Save £3.20 total
£1.60 cheaper per pack
```

The Order Pad's existing basket-level Potential Savings KPI must retain its existing business meaning. The cheaper-alternatives summary is separate and is communicated through its own banner and drawer.

## Opportunity data contract

An opportunity should contain enough data to render, revalidate and audit a switch:

```js
{
  lineId,
  mapping,
  equivalentGroupId,

  currentProductId,
  currentName,
  currentPip,
  currentType,
  currentPackSize,
  currentSupplierId,
  currentSupplier,
  currentPrice,
  quantity,

  replacementProductId,
  replacementName,
  replacementPip,
  replacementType,
  replacementPackSize,

  recommendedOffer: {
    supplierId,
    supplierLabel,
    supplierPip,
    price,
    key
  },
  recommendedSupplier,
  recommendedPrice,
  savingPerPack,
  totalSaving
}
```

## Summary and detail loading

Keep loading in two stages:

1. Request a lightweight summary when basket content, quantity, selected supplier or price changes.
2. Request full opportunity details only when the drawer opens.

The summary needs:

```js
{
  hasBrandOpportunity,
  opportunityCount,
  totalPotentialSaving,
  opportunityLineIds,
  opportunityKey
}
```

`opportunityKey` should change when line ID, replacement, quantity or saving changes. It can be used to reset a dismissed banner after the basket changes.

Checkbox selection is local UI state. Do not call the backend for each checkbox interaction.

## Drawer states

### Nothing selected

```text
Total potential saving
£30.10

Based on 6 items
Savings apply to affected items only, not your entire basket.

Keep All Original | Switch All 6
                    Save £30.10
```

### One or more selected

```text
Selected saving
£8.30

Based on 2 selected items

Clear Selection | Switch Selected 2
                  Save £8.30
```

Selected count and saving are sums of the locally selected opportunity objects. `Clear Selection` unchecks everything, restores the all-opportunity context and leaves the drawer open.

## Individual switch flow

1. User chooses `Switch` on a card.
2. Show a compact confirmation:

   ```text
   Switch this product?

   Current             Bisacodyl 5mg tabs (60)
   Switch to           Dulcolax 5mg tabs (60)
   Quantity            4
   Estimated saving    £4.80

   Cancel | Switch Product
   ```

3. On confirmation, fetch/recalculate opportunities and verify that the same line/replacement is still eligible.
4. Call the switch endpoint and create the audit record.
5. Replace the basket product, retaining its `lineId` and quantity.
6. Apply the validated recommended supplier offer.
7. Store original and final details in `line.equalisation`.
8. Remove the completed opportunity from local drawer state immediately.
9. Recalculate the banner, drawer count, total saving and basket value.
10. Refresh pricing/summary from the server without a full page reload.

## Bulk switch flow

If checkboxes are selected, bulk action targets only those lines. Otherwise `Switch All` targets all active opportunities.

Confirmation copy:

```text
Switch 2 selected products?

We'll check each product again before switching. If one can't be switched,
the others will still continue.

Estimated saving    £10.10

Cancel | Switch 2 Products
```

On confirmation:

1. Revalidate all requested opportunities once.
2. Process each valid item independently.
3. Mark the audit source `Bulk Equalisation`.
4. Remove successful items from the active list.
5. Keep failed items visible and show a clear failure reason.
6. Never fail the entire batch solely because one item failed.
7. Recalculate basket values, active count, total saving, selected count and selected saving.

## Basket-line change metadata

After a successful switch attach metadata to the final basket line while preserving the original request:

```js
line.equalisation = {
  auditId,
  orderId,
  customerId,

  originalProductId,
  originalName,
  originalPip,
  originalType,
  originalPackSize,
  originalSupplierId,
  originalSupplier,
  originalSupplierPip,
  originalOfferKey,
  originalPrice,

  replacementProductId,
  replacementName,
  replacementPip,
  replacementType,
  replacementSupplierId,
  replacementSupplier,
  replacementPrice,

  quantity,
  estimatedSaving,
  switchedBy,
  switchedAt,
  switchSource // "Individual" or "Bulk Equalisation"
};
```

Never overwrite the original requested-product data permanently. Order History must be able to show the original request and final transmitted product separately.

## Status and undo before submission

Before switching, show under the product name:

```text
Cheaper equivalent available
```

After switching, replace it with:

```text
✓ Alternative selected · Saved £4.80
```

The status opens a lightweight popover showing:

- Originally
- Changed to
- Original supplier
- New supplier
- Quantity
- Estimated saving
- Undo

Undo is available only before order submission. It must:

1. Record a new Undo audit event linked to the switch audit ID.
2. Restore the original catalogue product.
3. Restore the original supplier/offer where it remains valid.
4. Restore the original quantity and retain the basket `lineId`.
5. Remove `equalisation` metadata from the active basket line.
6. Recalculate basket value, alternatives and savings.
7. Restore `Cheaper equivalent available` if the opportunity is still valid.

Do not delete or alter the original switch audit record.

## Submission and Order History

The wireframe stores submitted order snapshots in:

```text
localStorage: cascade-submitted-orders-v1
```

In a real application, persist the equivalent server-side with the order. The snapshot must contain the final product plus its nested `equalisation` metadata.

Order History shows a subtle `Alternative selected` badge beside the final product. Use the existing row expansion to render `Product Change Details`:

```text
Originally ordered
Changed to
Original PIP Code
Final PIP Code
Original supplier
Final supplier
Quantity
Original price
Final price
Estimated saving
Changed by
Changed at
```

Keep existing supplier outcome information. Do not add a permanent Equalisation column. Undo is not available after transmission.

## Audit requirements

Every successful switch must permanently record:

- Order ID and Customer ID
- Original product ID, name, PIP, type, supplier and price
- Replacement product ID, name, PIP, type, supplier and price
- Quantity and estimated saving
- User and date/time
- Source: `Individual` or `Bulk Equalisation`

Every undo must be a separate audit action containing:

- Parent switch/audit ID
- Order ID and Customer ID
- Original and replacement product identifiers
- Estimated saving
- Undo user and date/time

## API contract

The current adapter expects these endpoints:

```http
POST /api/order-pad/brand-equalisation/summary
Content-Type: application/json

{ "basket": [/* lightweight basket lines */] }
```

```http
POST /api/order-pad/brand-equalisation/details
Content-Type: application/json

{ "basket": [/* lightweight basket lines */] }
```

```http
POST /api/order-pad/brand-equalisation/switch
Content-Type: application/json

{
  "line": {/* current line snapshot */},
  "replacementProductId": "80872",
  "context": {
    "user": "user@example.com",
    "customer": "Pharmacy name",
    "customerId": "customer-id",
    "orderReference": "order-reference",
    "orderId": "order-reference",
    "switchSource": "Individual"
  }
}
```

```http
POST /api/order-pad/brand-equalisation/undo
Content-Type: application/json

{
  "switchId": "audit-id",
  "context": {/* user, customer and order context */}
}
```

The server must recalculate eligibility and saving during switch. Never trust the browser's displayed price as final authorization.

## Core opportunity pseudocode

```js
function getOpportunities(basket, approvedEquivalenceGraph, catalogue) {
  return basket.flatMap(line => {
    const currentPrice = getSelectedPackPrice(line);
    if (!isFinite(currentPrice)) return [];

    const candidates = equivalentsOf(line.productId)
      .map(productId => catalogue.get(productId))
      .filter(replacement => pairIsEligible(line, replacement))
      .map(replacement => ({
        replacement,
        offer: getBestSelectableOffer(replacement)
      }))
      .filter(x => x.offer && x.offer.price <= x.replacement.tariff)
      .map(x => {
        const savingPerPack = roundMoney(currentPrice - x.offer.price);
        const totalSaving = roundMoney(savingPerPack * line.quantity);
        return { ...x, savingPerPack, totalSaving };
      })
      .filter(x => x.totalSaving > 0)
      .sort((a, b) =>
        a.offer.price - b.offer.price ||
        String(a.replacement.id).localeCompare(String(b.replacement.id))
      );

    return candidates.length ? [toOpportunity(line, candidates[0])] : [];
  });
}
```

## Recreation checklist

- [ ] Load approved Valid mappings and expand them bidirectionally.
- [ ] Preserve Brand/Generic product type and compatible pack size.
- [ ] Use the current selected pack price as the comparison price.
- [ ] Select the lowest valid replacement supplier offer under Drug Tariff.
- [ ] Calculate per-pack and quantity-adjusted total saving.
- [ ] Load summary first and details only when the drawer opens.
- [ ] Overlay the drawer without moving or shrinking the Order Pad.
- [ ] Keep checkbox totals entirely in local state.
- [ ] Revalidate immediately before individual or bulk switching.
- [ ] Preserve stable basket `lineId` and quantity through a switch.
- [ ] Preserve original and final product/supplier/price data separately.
- [ ] Update counts and savings without a full page refresh.
- [ ] Allow partial success in bulk operations.
- [ ] Allow Undo before submission and record it as a separate action.
- [ ] Persist metadata with the submitted order.
- [ ] Show the Order History badge and details in existing row expansion.
- [ ] Keep all savings labelled as estimated where fulfilment may change outcome.

## Minimum acceptance scenarios

1. Generic → cheaper Brand with the same pack size.
2. Brand → cheaper Generic with the same pack size.
3. More than one mapped replacement; the cheapest valid offer wins.
4. Replacement above Drug Tariff; no opportunity is shown.
5. Same/lower mapping exists but replacement is not cheaper; no opportunity is shown.
6. Basket quantity changes; card and summary savings update.
7. Two selections; selected count and saving update without a request.
8. Bulk switch has one success and one failure; success remains applied and failure remains visible.
9. Individual switch removes the opportunity and updates the banner/drawer immediately.
10. Undo restores the original line and creates a new audit event.
11. Submitted Order History retains both original and final products.
12. No Undo control is available after order submission.
