# Smart Quantity Recommendations – change prompts (12-10-2026)

Run these prompts, in order, on a Cascade Plus wireframe that has the **Daily Quantity Threshold** feature as described in *Functional_Requirements_Daily_Threshold_v2* (Settings › Daily Quantity Threshold with General Threshold / Product Specific Threshold, Audit Log, and the warning sign in Order Pad). Each prompt is self-contained: paste one, let it finish, check the result, then paste the next.

The finished result is described in *Functional_Requirements_Daily_Threshold_v3.docx*.

**Files involved:** `settings.html` (Settings page markup, styles and script), `daily-threshold.js` (warning message), `app.js` (Order Pad "Review before placing order" popup).

---

## Prompt 0 – Context (paste first)

```
You are updating an HTML/CSS/JS wireframe of Cascade Plus. The Settings page (settings.html) has a
"Daily Quantity Threshold" option group with two sub-items, "General Threshold" and "Product Specific
Threshold", and an "Audit Log" group with a "Daily Quantity Threshold" sub-item. The Order Pad (index.html
+ app.js) shows a yellow warning sign on basket lines whose quantity today is above the limit; its hover
message comes from warningText() in daily-threshold.js.

I will give you a series of changes. For each one:
- Change only what the prompt asks. Keep the existing theme, fonts, colours, spacing style and behaviour.
- Keep internal ids, class names and function names as they are unless the prompt says otherwise; only
  visible text changes when a prompt says "rename".
- If something in my wireframe is named slightly differently, find the equivalent and apply the change.
- If the Settings list also contains other items (for example "Override DT" / "Override Drug Tariff"),
  leave them where they are.
- After each change, open the page and check the "Verify" list in the prompt.
Reply "ready" and wait for the first change.
```

---

## Prompt 1 – Rename the feature and its items in Settings

```
In settings.html, rename these visible names (labels and headings only):

Settings OPTIONS list
- Group "Daily Quantity Threshold"  ->  "Smart Quantity Recommendations"
- Sub-item "General Threshold"       ->  "General Limit"
- Sub-item "Product Specific Threshold" -> "Product Specific Limit"
- Audit Log sub-item "Daily Quantity Threshold" -> "Smart Quantity Recommendations"

Page headings (h2)
- "General Threshold" -> "General Limit"
- "Product Specific Threshold" -> "Product Specific Limit"

Audit Log (Smart Quantity Recommendations)
- TYPE dropdown options: "General Threshold" -> "General Limit", "Product Specific Threshold" -> "Product Specific Limit"
- History heading for the general type: "Daily Quantity General Threshold History" -> "General Limit History"
  (change it both in the HTML h2 and in the JS that sets the title for each type)
- History heading for the product type: "Daily Quantity Product Specific Threshold History" -> "Product Specific Limit History"

Remove popup
- Eyebrow label above "Remove threshold?": "Product Specific Threshold" -> "Product Specific Limit"

The On/Off switch's aria-label "General threshold" -> "General limit".

Verify: the Options list reads Smart Quantity Recommendations › General Limit, Product Specific Limit, and
Audit Log › Smart Quantity Recommendations; the page headings, the Audit Log TYPE options and both history
headings use the new names.
```

---

## Prompt 2 – Change the word "threshold" to "limit" everywhere it is visible in Settings

```
In settings.html, for Smart Quantity Recommendations (General Limit, Product Specific Limit and its Audit
Log), replace every VISIBLE use of "threshold" with "limit": headings, sub-headings, labels, column names,
info notes, hints, error messages, toasts, popups, empty-table text, audit sub-headings and footnote, and
aria-label/title text. Do not rename ids, classes, data-attributes or JS variables.

Use exactly these texts:

General Limit
- Sub-heading: "Applies to every product that does not have a product-specific limit."
- Box label: "Quantity limit" (it displays as "Quantity Limit")
- Off note: "The general limit is off. Only products with a product-specific limit show a warning in the Order Pad."
- Green info note: "When an item's quantity for today (orders placed plus the basket) goes above its limit, its Order Pad line shows a warning sign. Hover over the sign for the details."
- Error: "Enter a quantity limit of 1 or more in natural numbers."
- Toasts: "General limit saved: X per item, per day" and "General limit turned off. Only products with their own limit show a warning"

Product Specific Limit
- Sub-heading: "Set a different quantity limit for selected products. It replaces the general limit for those products, and still applies when the general limit is off."
- Table aria-label: "Product specific limits"; column "Quantity Threshold" -> "Quantity Limit"
- Hints: "Type a product name or PIP code, then choose the product to set its own limit."
         "Prefilled with the general limit (X). If needed, change it, then save it."
         "Prefilled with X. The general limit is off, so only products listed below show a warning."
         "<Product> already has its own limit. Change it and select Update, or Cancel."
- Empty table: "No product-specific limits yet. Every product uses the general limit."
               "No product-specific limits yet. The general limit is off, so no product shows a warning."
- Toasts: "Limit saved for <Product>: X", "Limit updated for <Product>: X",
          "<Product> now uses the general limit", "Limit removed for <Product>"
- Remove popup title: "Remove limit?"; message: "<Product> will use the general limit again, if it is on."
- aria-labels: "Remove limit for <Product>", "Quantity limit"

Audit Log
- General sub-heading: "Every time the general limit was switched on or off, or its quantity changed. Newest first."
- Product sub-heading: "Every product-specific limit that was added, updated or removed. Newest first."
- Column "Quantity Threshold" -> "Quantity Limit" (both history types)
- Footnote: "History entries are added automatically when a limit is saved or removed. They cannot be edited or deleted."

Verify: walk through General Limit (valid, invalid, save, switch off), Product Specific Limit (add, update,
remove, empty table) and both Audit Log types; no visible text, toast, popup or tooltip says "threshold".
```

---

## Prompt 3 – General Limit layout

```
Redesign the General Limit panel in settings.html (keep the heading, sub-heading and the green-topped panel
exactly as they are):

1. Row 1: only the On/Off switch, aligned to the top right of the panel (6px space below it).
2. Row 2 (one line, vertically centred, wraps on narrow screens, 18px gap):
   - Left: the Quantity Limit card. Inside the card, on ONE line: the label "Quantity Limit", the number box,
     then "Per item, per day" to its right (card padding 14px 20px, 14px gap, label 14px and not wrapping).
     The number box is 96px wide, 46px tall, 18px text, sized for 4 digits; set max="9999" and do not allow
     more than 4 digits to be typed (if 5+ digits are entered, keep the first 4).
   - Right: Restore Defaults, Discard and Save Settings (same buttons as now), on the same row as the card.
3. "Unsaved Changes" tag: remove it from the button row. Show it only when there are unsaved changes,
   directly under Save Settings and right-aligned with it (position it absolutely under the buttons so the
   buttons do not move). While it is shown, add about 26px of space under the row (for example
   `.generic-top-row:has(.unsaved-flag:not([hidden])) { margin-bottom: 26px; }`) so it does not touch the notes.
4. The field error and the "general limit is off" note stay under the row; the two notes stay at the bottom.

Behaviour is unchanged: switching Off greys out the box and keeps its value, invalid values show the red box
and the error and disable Save Settings, Enter in the box saves when there is a change, Restore Defaults sets
On + 100.

Verify: the label, box and "Per item, per day" are on one line; the box and the three buttons share one
centred row; the switch is top right; typing 12345 keeps 1234; "Unsaved Changes" appears under Save Settings
only after a change and does not overlap the orange note.
```

---

## Prompt 4 – Product Specific Limit: Add/Update line, pencil edit and delete icon

```
Redesign the Product Specific Limit panel in settings.html. Keep the heading, sub-heading, green-topped
panel, the table columns (Product, PIP Code, Quantity Limit, Last Changed, actions), the Show entries /
paging footer, the product search data (Order Pad catalogue + Order History products, up to 12 matches) and
all messages, toasts, validation and Audit Log recording exactly as they are.

A. Remove the product search box, Quantity box and Cancel/Save that sit ABOVE the table.

B. Below the table (above the Show entries footer) add a link-style button "+ Add/Update Product":
   green text (bold 15px), a plus icon (SVG, 18px, stroke 2.2), no border, underline on hover/focus.
   It is disabled (greyed) while the new line is open.

C. Selecting it opens a NEW LAST LINE inside the table (after the product rows), with one flat light-green
   background across the whole line (#f2fbf6 on the row, not a gradient per cell) and a divider line above it:
   - Product column: the product search box (placeholder "Search Product or PIP code...", aria-label
     "Product"), with the results dropdown under it (same look as before; arrow keys, Enter and click to choose;
     "No products found. Try another product name or PIP code." when nothing matches). While the line is open,
     let the dropdown hang outside the table (overflow visible on the table wrapper).
   - PIP Code column: empty until a product is chosen, then the product's PIP.
   - Quantity Limit column: the quantity box (120px wide, 38px tall), shown only after a product is chosen.
   - Last two columns: Cancel and Save buttons (38px tall), right-aligned. Save is disabled until a product is
     chosen and the quantity is valid; it reads "Update" when the product already has a limit.
   - A second row under it (same tint, spanning all columns) shows the red error and the hint text
     (the existing hints: type a product..., prefilled with the general limit..., already has its own limit...).
   - The search box gets focus when the line opens; choosing a product focuses and selects the quantity.
   - Enter in the quantity saves (same as Save). Escape in the quantity, or Cancel, closes the line.
     Escape in the search closes the results first, then the line.
   - Save/Update closes the line, keeps the existing toast and audit entry, and puts focus back on
     "+ Add/Update Product".

D. Quantity Limit column for each product row: a pencil (✎, &#9998;) button before the value, green, 26px,
   with title "Edit quantity limit". Selecting it replaces the value with an inline editor (same as the Out Of
   Stock "required quantity" edit): a number box (72px wide, 30px tall, bold, centred, no spin arrows) followed
   by a green square button with a white ✓ (save) and a red square button with a white × (cancel), each 30x28px.
   - Only one row (or the Add/Update line) is edited at a time; opening one closes the other.
   - Enter or ✓ saves; Escape or × cancels and returns focus to that row's pencil.
   - Invalid value (empty, 0, negative, decimal): red box, ✓ disabled, and the error
     "Enter a quantity limit of 1 or more in natural numbers." in a row under that product.
     Update the box state while typing without re-rendering the table (the box must keep focus).
   - Saving a different value: update Last Changed (date/time and signed-in user), move the product to the top
     (newest first, go to page 1), add an "Updated" entry to the Audit Log and show
     "Limit updated for <Product>: X". Saving the same value just closes the editor (no toast, no audit entry).
   - The mouse wheel must not change the number.

E. Actions column: remove the "Edit" and "Remove" text buttons. Add one red delete icon box per row
   (34x34px, light red background, red border #f3c6c0, red trash SVG 18px; on hover/focus: red background,
   white icon; aria-label "Remove limit for <Product>", title "Remove"). It opens the existing
   "Remove limit?" popup; removing keeps the existing toast and "Removed" audit entry.

F. Opening another Settings item, or returning with Back, closes the Add/Update line and any pencil edit.

Verify: add a product (search, Enter, quantity, Enter), add one that already exists (button reads Update),
no-match message, Escape closes the line, pencil edit with ✓/×/Enter/Escape and an invalid value, delete via
the popup, and the Audit Log shows Added / Updated / Removed with the right quantities.
```

---

## Prompt 5 – Order Pad warning messages

```
1. In daily-threshold.js, replace the hover message of the warning sign (warningText) so it reads:

   General limit:
   "Quantity:105 (10 ordered + 95 in basket). General Limit 100 per day. Warning only, can be edited in Settings."
   Product-specific limit:
   "Quantity:8 (3 ordered + 5 in basket). Product specific Limit 6 per day. Warning only, can be edited in Settings."

   The "Y ordered + Z in basket" split is shown only when some was ordered earlier today; otherwise the
   brackets show just the basket, e.g. "Quantity:32 (32 in basket). Product specific Limit 20 per day. ...".
   Note there is no space after "Quantity:".

   function warningText(result) {
     if (!result.quantityExceeded) return "";
     const split = result.ordered.quantity > 0
       ? `${result.ordered.quantity} ordered + ${result.inBasket.quantity} in basket`
       : `${result.inBasket.quantity} in basket`;
     const limitName = result.threshold.specific ? "Product specific Limit" : "General Limit";
     return `Quantity:${result.totalQuantity} (${split}). ${limitName} ${result.threshold.quantity} per day. Warning only, can be edited in Settings.`;
   }

2. In app.js, "Review before placing order" popup:
   - The warning-sign row label: "N Above Daily Quantity Threshold" -> "N Above Daily Quantity Limit".
   - The hover message on that sign:
     "Daily quantity limit — quantity (ordered + in basket) is above the daily set limit. Warning only, edit in Settings."

Verify: in Order Pad, hover the sign on Metformin (general limit) and on a product with its own limit; open
Place Order and check the last row and its hover message.
```

---

## Final check (optional prompt)

```
Open settings.html and index.html and confirm:
- Settings › Smart Quantity Recommendations › General Limit: switch top right; "Quantity Limit [box] Per item,
  per day" on one line with Restore Defaults / Discard / Save Settings on the same row; "Unsaved Changes"
  under Save Settings only when needed.
- Product Specific Limit: table first, "+ Add/Update Product" below it opening a last line with search,
  PIP, quantity, Cancel/Save; pencil edit with green ✓ / red ×; red delete icon.
- Audit Log › Smart Quantity Recommendations: "General Limit History" / "Product Specific Limit History",
  TYPE "General Limit" / "Product Specific Limit", "Quantity Limit" columns.
- No visible "threshold" text anywhere in Smart Quantity Recommendations.
- Order Pad hover and "Review before placing order" texts as in Prompt 5.
- No errors in the browser console.
```
