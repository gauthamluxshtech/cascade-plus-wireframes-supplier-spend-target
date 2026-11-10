# Review before placing order – compact popup prompt (21-10-2026)

Paste this prompt on any Cascade Plus Order Pad wireframe to make the **"Review before placing order"** popup smaller, with slightly bigger item icons. It changes only the CSS of that popup; nothing else in the wireframe is touched.

**Files involved:** `styles.css` (popup styles). `app.js` is only read to find the popup, not edited.

---

## Prompt

```
TASK: Make the "Review before placing order" popup more compact and make its item icons slightly bigger.
Change ONLY this popup. Do not change anything else in the app.

HOW TO FIND IT
- It is the order confirmation popup whose title reads "Review before placing order" (set in app.js, in openOrderModal / openConfirmation).
- In the reference build it is the <dialog> with class "order-modal", and the extra class "flagged-order-modal" is added when the order has attention items.
- Its parts: warning "!" circle (.warning-icon), title (h2), summary line (#orderModalSummary), the "This order contains products requiring attention:" panel (.order-attention-summary, h3, .order-attention-categories, .order-attention-category rows with .modal-product-tag badges, .tag-icon, .snowflake-icon, .modal-threshold-tag svg), the info note (p.order-attention-description and its ::before "i" icon), and the Review Basket / Place Order buttons (.modal-actions).
- If this copy uses different class names, find the matching elements and apply the same values to them.

STRICT RULES
1. CSS only. Do not edit HTML, JavaScript, text, labels, colours, fonts, icons or behaviour.
2. Every change must apply only to the "Review before placing order" popup.
   - Do NOT change the plain "Are you sure?" popup (same .order-modal without .flagged-order-modal).
   - Do NOT change badges/icons in basket lines, the icon key above the Order Basket, Edit Product, Order History or any other screen.
   - If a rule you need to change is shared with other screens (e.g. .warning-icon, .product-tag, .modal-actions), do NOT edit the shared rule. Add a new rule scoped to the popup (e.g. ".flagged-order-modal .warning-icon").
3. Change only the properties listed below. Leave every other property and rule as it is.
4. Do not reformat, reorder, rename or "tidy up" any other CSS.

CHANGES (property: old value -> new value)

A. Popup box (.order-modal.flagged-order-modal)
- width: min(650px, calc(100vw - 32px)) -> min(480px, calc(100vw - 32px))
- padding: 34px 28px 28px -> 24px 22px 20px
  (keep max-height and overflow-y as they are)

B. Warning "!" circle. Add a new scoped rule ".flagged-order-modal .warning-icon":
- width: 52px; height: 52px; margin-bottom: 12px; border-width: 2.5px; font-size: 30px;
  (do not edit the shared .warning-icon rule)

C. Title (.order-modal.flagged-order-modal h2)
- margin-bottom: 14px -> 8px
- font-size: 25px -> 21px

D. Summary line (.flagged-order-modal #orderModalSummary)
- remove max-width: 540px
- font-size: 16px -> 14px
- line-height: 1.45 -> 1.4

E. Attention panel (.order-attention-summary)
- margin: 20px auto 0 -> 14px auto 0
- padding: 18px 20px -> 12px 16px

F. Attention panel heading (.order-attention-summary h3)
- margin: 0 0 14px -> 0 0 8px
- font-size: 16px -> 14px

G. Rows list (.order-attention-categories)
- gap: 10px -> 6px

H. Each row (.order-attention-category)
- grid-template-columns: 24px minmax(0, 1fr) -> 28px minmax(0, 1fr)
- gap: 10px -> 8px
- font-size: 15px -> 14px
- line-height: 1.35 -> 1.3

I. Row icons (bigger, so they are easy to see). Only the rules under .order-attention-category / .modal-threshold-tag:
- .order-attention-category .modal-product-tag: min-height 16px -> 20px; padding 0 3px -> 0 4px; add font-size: 11px; (keep justify-self: center and border-radius: 4px)
- .order-attention-category .tag-icon: width/height 12px -> 15px; stroke-width 2.6 -> 2.4
- .order-attention-category .snowflake-icon: width/height 13px -> 16px; stroke-width 1.9 -> 1.8
- .modal-threshold-tag svg: width 16px -> 20px; height 14.7px -> 18.4px
- Update the CSS comments above these rules to say the badges are 20px tall (15-16px icons) in the popup.

J. Info note (.order-modal p.order-attention-description)
- margin-top: 14px -> 10px
- padding: 15px 18px 15px 54px -> 10px 14px 10px 42px
- font-size: 14px -> 12.5px
- line-height: 1.45 -> 1.4

K. Info "i" icon (.order-attention-description::before)
- top: 16px -> 11px; left: 20px -> 14px
- width/height: 22px -> 18px
- font-size: 14px -> 12px

L. Buttons
- .flagged-order-modal .modal-actions: gap 16px -> 12px; margin-top 24px -> 18px
- .flagged-order-modal .modal-actions button: width min(210px, 48%) -> min(180px, 48%); min-height 50px -> 42px; font-size 15px -> 14px

M. Mobile (inside the existing small-screen @media block that already styles this popup)
- .order-modal.flagged-order-modal padding: 30px 18px 20px -> 22px 16px 18px
- .order-modal.flagged-order-modal h2 font-size: 21px -> 19px
- .order-attention-summary padding: 15px -> 12px

If a starting value in this copy differs from the "old value" above, still set the new value, but report which ones differed.

WHEN DONE
- List each rule you changed or added, with file and line.
- Confirm that nothing outside this popup was changed: no HTML or JS edits, no shared rules edited, basket tags and the icon key unchanged.
```
