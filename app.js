// Suppliers and the product catalogue are in order-pad-catalogue.js, shared with Settings.
const { suppliers, catalogue } = window.CascadeOrderPadCatalogue;

const quickOrderData = window.CascadeOrderPadQuickOrder;
const cartFlagData = window.CascadeOrderPadCartFlags;
// Daily quantity thresholds (set on settings.html).
const dailyThreshold = window.CascadeDailyThreshold;
const currentAccountId = (document.querySelector(".profile-button")?.textContent || "anonymous")
  .replace(/^\s*HI,?\s*/i, "")
  .trim();
// Placed orders (with any Brand/Generic product change details), read by Order History.
const SUBMITTED_ORDERS_STORAGE_KEY = "cascade-submitted-orders-v1";
// New order IDs follow on from the fixture orders (latest 336995). Declared before the initial order
// reference is created.
const LAST_FIXTURE_ORDER_ID = 337000;
// Drug Tariff price override (set on settings.html). 0 = Off, i.e. today's behaviour.
// Declared before the initial basket is built, because building it checks which suppliers are selectable.
const dtOverridePercent = window.cascadePriceOverride ? window.cascadePriceOverride.getPercent() : 0;
// Supplier locks (set on settings.html): a locked supplier is never selected or cascaded to.
// Also declared before the initial basket is built; refreshed while the page is open (refreshSupplierLocks).
const supplierLock = window.CascadeSupplierLock;
let lockedSupplierIds = supplierLock ? supplierLock.lockedSupplierIds() : [];
// Supplier outcome comment for a locked supplier skipped by the cascade (Order History, Order Report and
// Order Exceptions Report, where it is grouped under "Blocked By System").
const SUPPLIER_LOCKED_COMMENT = "Blocked as Supplier Locked. Check in Settings.";

const unavailable = {};
const initialBasketQuantities = [2, 3, 6, 9, 5, 4, 6, 2, 8, 3, 5, 7, 4, 6, 9, 2, 5, 3, 6, 4];

const state = {
  // Catalogue products marked initialBasket: false (approved cheaper alternatives) are not in the starting basket.
  basket: catalogue.filter((product) => product.initialBasket !== false).map((product, index) => createBasketItem(
    product,
    product.initialQuantity || initialBasketQuantities[index % initialBasketQuantities.length],
    product.selectedSupplier
  )),
  search: { name: "", pip: "", quantity: 1, selectedProductId: null },
  basketFilter: "",
  basketSort: { key: null, direction: null },
  advancedSort: { key: null, direction: null, label: "" },
  advancedSortPanelOpen: false,
  sortLoading: false,
  editingId: null,
  drawerDraft: null,
  selectedLineIds: [],
  addProductVisible: true,
  quickOrder: createQuickOrderState(),
  panels: loadPanelPreferences(),
  // Cheaper alternatives (Brand <-> Generic). Checkbox selection is local state only.
  brand: {
    summary: null,
    opportunities: [],
    drawerOpen: false,
    loadingDetails: false,
    focusLineId: null,
    dismissedKey: null,
    lastBulkFailures: [],
    selectedOpportunityLineIds: [],
    equalisedPopoverLineId: null
  },
  orderContext: {
    user: currentAccountId,
    // Same pharmacy as the Order History fixtures, so the Order Report's default Pharmacy filter shows placed orders.
    customer: "Dummy",
    customerId: "DEMO-PHARMACY",
    orderReference: newOrderReference()
  }
};

// Wireframe examples of products already ordered today (Order History, 3 July 2026), added the same way as from
// Frequently Ordered, so the daily threshold warning shows "ordered + in basket":
// Metformin MR 1000mg goes above the quantity threshold.
state.basket.unshift(...[
  { pip: "6596324", quantity: 95 },
  { pip: "5402953", quantity: 5 }
].map(({ pip, quantity }) => {
  const product = state.quickOrder.frequentlyOrdered.find((item) => item.pip === pip);
  return product ? createBasketItem(product, quantity, product.selectedSupplier) : null;
}).filter(Boolean));

const els = {
  orderLayout: document.querySelector(".order-layout"),
  utilitySidebar: document.querySelector(".utility-sidebar"),
  addProductPanel: document.querySelector("#addProductPanel"),
  toggleAddProduct: document.querySelector("#toggleAddProduct"),
  nameSearch: document.querySelector("#nameSearch"),
  quantityInput: document.querySelector("#quantityInput"),
  decreaseQuantity: document.querySelector("#decreaseQuantity"),
  increaseQuantity: document.querySelector("#increaseQuantity"),
  orderUpload: document.querySelector("#orderUpload"),
  uploadOrderWidget: document.querySelector(".upload-order-widget"),
  uploadOrderButton: document.querySelector("#uploadOrderButton"),
  downloadOrderTemplate: document.querySelector("#downloadOrderTemplate"),
  searchResults: document.querySelector("#searchResults"),
  basketPanel: document.querySelector(".basket-panel"),
  productList: document.querySelector("#productList"),
  sortStatus: document.querySelector("#sortStatus"),
  advancedSortToggle: document.querySelector("#advancedSortToggle"),
  advancedSortPanel: document.querySelector("#advancedSortPanel"),
  resetAdvancedSort: document.querySelector("#resetAdvancedSort"),
  emptyState: document.querySelector("#emptyState"),
  basketFilter: document.querySelector("#basketFilter"),
  placeOrderButton: document.querySelector("#placeOrderButton"),
  removeSelectedButton: document.querySelector("#removeSelectedButton"),
  totalProducts: document.querySelector("#totalProducts"),
  totalValue: document.querySelector("#totalValue"),
  potentialSavings: document.querySelector("#potentialSavings"),
  quickOrderPanel: document.querySelector(".quick-order-panel"),
  quickOrderSidebarMount: document.querySelector("#quickOrderSidebarMount"),
  quickOrderToggle: document.querySelector("#quickOrderToggle"),
  quickOrderContent: document.querySelector("#quickOrderContent"),
  quickOrderSearch: document.querySelector("#quickOrderSearch"),
  quickOrderResults: document.querySelector("#quickOrderResults"),
  quickOrderFooter: document.querySelector("#quickOrderFooter"),
  quickOrderTabs: Array.from(document.querySelectorAll("[data-quick-order-view]")),
  brandOpportunityBanner: document.querySelector("#brandOpportunityBanner"),
  brandOpportunityCount: document.querySelector("#brandOpportunityCount"),
  brandOpportunitySaving: document.querySelector("#brandOpportunitySaving"),
  viewBrandSuggestions: document.querySelector("#viewBrandSuggestions"),
  dismissBrandBanner: document.querySelector("#dismissBrandBanner"),
  brandDrawer: document.querySelector("#brandSuggestionsDrawer"),
  brandDrawerBackdrop: document.querySelector("#brandDrawerBackdrop"),
  brandDrawerTitle: document.querySelector("#brandDrawerTitle"),
  brandDrawerSummaryLabel: document.querySelector("#brandDrawerSummaryLabel"),
  brandDrawerTotal: document.querySelector("#brandDrawerTotal"),
  brandDrawerItemCount: document.querySelector("#brandDrawerItemCount"),
  brandDrawerBasisSuffix: document.querySelector("#brandDrawerBasisSuffix"),
  brandDrawerScopeNote: document.querySelector("#brandDrawerScopeNote"),
  brandDrawerMessage: document.querySelector("#brandDrawerMessage"),
  brandOpportunityList: document.querySelector("#brandOpportunityList"),
  closeBrandDrawer: document.querySelector("#closeBrandDrawer"),
  keepAllOriginal: document.querySelector("#keepAllOriginal"),
  switchAllBrands: document.querySelector("#switchAllBrands"),
  brandBulkActionLabel: document.querySelector("#brandBulkActionLabel"),
  brandSwitchAllCount: document.querySelector("#brandSwitchAllCount"),
  brandBulkSaving: document.querySelector("#brandBulkSaving"),
  brandSwitchModal: document.querySelector("#brandSwitchModal"),
  brandSwitchModalTitle: document.querySelector("#brandSwitchModalTitle"),
  brandSwitchModalContent: document.querySelector("#brandSwitchModalContent"),
  closeBrandSwitchModal: document.querySelector("#closeBrandSwitchModal"),
  cancelBrandSwitch: document.querySelector("#cancelBrandSwitch"),
  confirmBrandSwitch: document.querySelector("#confirmBrandSwitch"),
  drawer: document.querySelector("#productDrawer"),
  drawerBackdrop: document.querySelector("#drawerBackdrop"),
  drawerNavigation: document.querySelector("#drawerNavigation"),
  drawerContent: document.querySelector("#drawerContent"),
  orderModal: document.querySelector("#orderModal"),
  orderModalTitle: document.querySelector("#orderModalTitle"),
  orderModalSummary: document.querySelector("#orderModalSummary"),
  orderModalAttention: document.querySelector("#orderModalAttention"),
  orderModalCategories: document.querySelector("#orderModalCategories"),
  orderModalDescription: document.querySelector("#orderModalDescription"),
  orderModalCancel: document.querySelector("#orderModalCancel"),
  confirmOrder: document.querySelector("#confirmOrder"),
  orderSuccessModal: document.querySelector("#orderSuccessModal"),
  toastRegion: document.querySelector("#toastRegion")
};

let pendingConfirmationAction = null;
let confirmationReturnFocus = null;
let orderSubmissionPending = false;
let uploadConfirmed = false;
let advancedSortRunId = 0;
let quickOrderScrollbarTimer = null;
let pendingBrandAction = null;
let brandSummaryRunId = 0;
let brandDetailsRunId = 0;
let brandSummaryTimer = null;
let brandReturnFocus = null;
let lastBrandBasketSignature = null;
const kpiDisplayedValues = new WeakMap();
const kpiTargetValues = new WeakMap();
const kpiAnimationFrames = new WeakMap();

function createQuickOrderState() {
  let frequentlyOrdered = [];
  let frequentlyOrderedError = null;

  try {
    frequentlyOrdered = quickOrderData.buildFrequentlyOrdered(window.orderHistoryData, catalogue, suppliers);
  } catch (error) {
    frequentlyOrderedError = error;
  }

  const favouriteResult = quickOrderData.readFavouritePips(window.localStorage, currentAccountId);
  return {
    activeView: "frequent",
    expanded: false,
    search: "",
    scrollPositions: { frequent: 0, favourites: 0 },
    quantities: {},
    frequentlyOrdered,
    frequentlyOrderedError,
    favouritePips: new Set(favouriteResult.pips),
    favouriteError: favouriteResult.error
  };
}

// Short unique reference, so it fits Order History's Order ID column.
// Order IDs are numbers like the fixture orders: one more than the highest ID placed so far.
function newOrderReference() {
  let lastId = LAST_FIXTURE_ORDER_ID;
  try {
    const stored = JSON.parse(window.localStorage.getItem(SUBMITTED_ORDERS_STORAGE_KEY) || "[]");
    (Array.isArray(stored) ? stored : []).forEach((order) => {
      if (/^\d+$/.test(String(order?.id))) lastId = Math.max(lastId, Number(order.id));
    });
  } catch (error) {
    // Storage unavailable: numbering starts again after the fixture orders.
  }
  return String(lastId + 1);
}

function loadPanelPreferences() {
  return { quickOrderExpanded: true };
}

function savePanelPreferences() {
  // Collapse is session-only so every new Order Pad visit starts expanded.
}

function createBasketItem(product, quantity, selectedSupplier) {
  const recommended = getRecommendedSupplier(product);
  const selectedOffer = supplierOffers(product).find((offer) =>
    offer.supplierId === (selectedSupplier || recommended?.supplierId)
    && isSelectableOffer(product, offer)
  ) || recommended;
  return {
    lineId: `${product.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    productId: product.id,
    name: product.name,
    pip: product.pip,
    productType: product.productType || "Product",
    packSize: product.packSize || "",
    quantity,
    tariff: product.tariff,
    concessionPrice: Boolean(product.concessionPrice),
    isControlledDrug: product.isControlledDrug === true,
    isFridge: product.isFridge === true
      || product.requiresRefrigeration === true
      || String(product.storageType || "").toLowerCase() === "fridge",
    prices: { ...product.prices },
    supplierPipMappings: product.supplierPipMappings ? product.supplierPipMappings.map((mapping) => ({ ...mapping })) : null,
    selectedSupplier: selectedOffer?.supplierId || null,
    selectedSupplierPip: selectedOffer?.supplierPip || null,
    selectedPrice: selectedOffer?.price ?? null,
    selectedOfferKey: selectedOffer?.key || null
  };
}

function formatCurrency(value) {
  return typeof value === "number"
    ? new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value)
    : "NA";
}

function formatTariff(value) {
  return typeof value === "number" ? value.toFixed(2) : "NA";
}

function dtValueTemplate(product, formatter = formatTariff) {
  return `
    <span class="dt-value">
      ${formatter(product.tariff)}
      ${product.concessionPrice ? '<span class="concession-indicator" title="Concession price" aria-label="Concession price" tabindex="0">C</span>' : ""}
    </span>
  `;
}

function netDtValue(product) {
  return product.concessionPrice ? null : netTariff(product.tariff);
}

function netTariff(value) {
  return typeof value === "number" ? Number((value * 0.8).toFixed(2)) : null;
}

function supplierLabel(id) {
  return suppliers.find((supplier) => supplier.id === id)?.label || "Not selected";
}

function offerKey(supplierId, supplierPip, price) {
  return `${supplierId}::${supplierPip || ""}::${price}`;
}

function isOverDrugTariff(product, price) {
  return typeof product.tariff === "number" && typeof price === "number" && price > product.tariff;
}

// Highest selectable price: Drug Tariff + override %, rounded down to the penny.
// With the override Off (0%) this is the Drug Tariff itself, so every supplier priced above DT is blocked.
function maxAllowedPrice(product) {
  if (typeof product.tariff !== "number") return null;
  return window.cascadePriceOverride
    ? window.cascadePriceOverride.maxAllowedPrice(product.tariff, dtOverridePercent)
    : product.tariff;
}

function isAboveMaxAllowed(product, price) {
  const max = maxAllowedPrice(product);
  return max !== null && typeof price === "number" && Math.round(price * 100) > Math.round(max * 100);
}

// Above DT but allowed by the override (only while an override percentage is set).
function isOverrideOffer(product, offer) {
  return dtOverridePercent > 0 && Boolean(offer) && isOverDrugTariff(product, offer.price) && !isAboveMaxAllowed(product, offer.price);
}

function isSupplierLocked(supplierId) {
  return lockedSupplierIds.includes(supplierId);
}

function isSelectableOffer(product, offer) {
  const blocked = unavailable[product.productId || product.id] || [];
  return Boolean(offer)
    && typeof offer.price === "number"
    && !blocked.includes(offer.supplierId)
    && !isSupplierLocked(offer.supplierId)
    && !isAboveMaxAllowed(product, offer.price);
}

function lowestOfferPerSupplier(offers) {
  return Array.from(offers.reduce((lowestBySupplier, offer) => {
    const current = lowestBySupplier.get(offer.supplierId);
    if (!current || offer.price < current.price) {
      lowestBySupplier.set(offer.supplierId, offer);
    }
    return lowestBySupplier;
  }, new Map()).values());
}

function supplierOffers(product) {
  if (Array.isArray(product.supplierPipMappings) && product.supplierPipMappings.length) {
    const offers = product.supplierPipMappings
      .filter((mapping) => typeof mapping.price === "number")
      .map((mapping) => {
        const supplier = suppliers.find((item) => item.id === mapping.supplierId);
        return {
          supplierId: mapping.supplierId,
          supplierLabel: supplier?.label || mapping.supplier,
          supplierPip: mapping.supplierPip || product.pip,
          price: mapping.price,
          key: offerKey(mapping.supplierId, mapping.supplierPip || product.pip, mapping.price)
        };
      })
      .filter((offer) => offer.supplierLabel);

    return lowestOfferPerSupplier(offers);
  }

  const offers = suppliers.flatMap((supplier) => {
    const value = product.prices[supplier.id];
    const prices = Array.isArray(value) ? value : [value];
    return prices
      .filter((price) => typeof price === "number")
      .map((price) => ({
        supplierId: supplier.id,
        supplierLabel: supplier.label,
        supplierPip: product.pip,
        price,
        key: offerKey(supplier.id, product.pip, price)
      }));
  });

  return lowestOfferPerSupplier(offers);
}

function selectedOffer(product) {
  return supplierOffers(product).find((offer) => offer.key === product.selectedOfferKey)
    || supplierOffers(product).find((offer) => offer.supplierId === product.selectedSupplier && offer.supplierPip === product.selectedSupplierPip)
    || null;
}

function applySelectedOffer(product, offer) {
  product.selectedSupplier = offer.supplierId;
  product.selectedSupplierPip = offer.supplierPip;
  product.selectedPrice = offer.price;
  product.selectedOfferKey = offer.key;
}

function lowestNumericPrice(value) {
  if (typeof value === "number") return value;
  if (Array.isArray(value)) {
    return value
      .filter((price) => typeof price === "number")
      .sort((a, b) => a - b)[0] ?? null;
  }
  return null;
}

function availableSupplierRows(product) {
  const blocked = unavailable[product.productId || product.id] || [];
  return suppliers.map((supplier) => {
    const offers = supplierOffers(product).filter((offer) => offer.supplierId === supplier.id);
    const price = offers.length ? Math.min(...offers.map((offer) => offer.price)) : null;
    const hasPrice = typeof price === "number";
    const unavailableReason = blocked.includes(supplier.id)
      ? "Unavailable"
      : isSupplierLocked(supplier.id)
        ? "Supplier locked"
        : hasPrice && offers.every((offer) => isAboveMaxAllowed(product, offer.price))
        ? dtOverridePercent ? "Above max allowed price" : "Above Drug Tariff"
        : "";

    return {
      id: supplier.id,
      label: supplier.label,
      price,
      offers,
      available: hasPrice && offers.some((offer) => isSelectableOffer(product, offer)),
      unavailableReason
    };
  });
}

function getRecommendedSupplier(product) {
  return supplierOffers(product)
    .filter((offer) => isSelectableOffer(product, offer))
    .sort((a, b) => a.price - b.price)[0] || null;
}

function highestAvailableSupplierPrice(product) {
  const prices = supplierOffers(product)
    .filter((offer) => isSelectableOffer(product, offer))
    .map((offer) => offer.price);
  return prices.length ? Math.max(...prices) : null;
}

function selectedPrice(product) {
  const offer = selectedOffer(product);
  return typeof offer?.price === "number"
    ? offer.price
    : typeof product.selectedPrice === "number"
      ? product.selectedPrice
      : product.selectedSupplier
        ? lowestNumericPrice(product.prices[product.selectedSupplier])
        : null;
}

function lineValue(product) {
  const price = selectedPrice(product);
  return cartFlagData.lineValue(product.quantity, price);
}

function bestValue(product) {
  const recommended = getRecommendedSupplier(product);
  return recommended ? recommended.price * product.quantity : 0;
}

function potentialSaving(product) {
  return Math.max(0, lineValue(product) - bestValue(product));
}

// Cheaper alternatives use the Order Pad's own pack price, supplier offers and availability / Drug Tariff rules.
const brandEqualisation = window.CascadeBrandEqualisation.createClient({
  getProductById(productId) {
    return catalogue.find((product) => String(product.id) === String(productId)) || null;
  },
  getSelectedPrice: selectedPrice,
  getBestOffer: getRecommendedSupplier,
  getSupplierLabel: supplierLabel,
  // Pack sizes must match (normalised, non-empty).
  isEligiblePair(current, replacement) {
    const currentPack = String(current.packSize || "").trim().toLowerCase();
    const replacementPack = String(replacement.packSize || "").trim().toLowerCase();
    return Boolean(currentPack) && currentPack === replacementPack;
  }
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

// Six-armed snowflake, each arm with one V branch, kept sparse so it stays clear at tag size.
const SNOWFLAKE_SVG = `<svg class="tag-icon snowflake-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.2 12 22.8"></path><path d="M21.35 6.6 2.65 17.4"></path><path d="M21.35 17.4 2.65 6.6"></path><path d="M9.31 2.91 12 5.6 14.69 2.91"></path><path d="M18.53 5.13 17.54 8.8 21.21 9.78"></path><path d="M21.21 14.22 17.54 15.2 18.53 18.87"></path><path d="M14.69 21.09 12 18.4 9.31 21.09"></path><path d="M5.47 18.87 6.46 15.2 2.79 14.22"></path><path d="M2.79 9.78 6.46 8.8 5.47 5.13"></path></svg>`;

// Single pound sign for the HIGH VALUE tag.
const POUND_SVG = `<svg class="tag-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M17 7c0-5.33-8-5.33-8 0"></path><path d="M9 7v14"></path><path d="M5 21h13"></path><path d="M5 13h10"></path></svg>`;

// label is the tag's content (FRIDGE shows a snowflake, HIGH VALUE a pound sign); name is read out by screen readers.
const productTagDetails = {
  cd: {
    label: "CD",
    name: "CD",
    tooltip: "Controlled Drug \u2014 additional handling and compliance controls may apply."
  },
  fridge: {
    label: SNOWFLAKE_SVG,
    name: "Fridge",
    tooltip: "Fridge line \u2014 temperature-controlled storage and transport may apply."
  },
  "high-value": {
    label: POUND_SVG,
    name: "High Value",
    tooltip: "High Value line \u2014 quantity multiplied by the selected unit price exceeds \u00a3100."
  }
};

function cartLineFlags(product) {
  return cartFlagData.productFlags(product, lineValue(product));
}

function productTagTemplate(key, extraClass = "") {
  const details = productTagDetails[key];
  if (!details) return "";
  return `<span class="product-tag product-tag--${key} ${extraClass}" tabindex="0" title="${escapeHtml(details.tooltip)}" aria-label="${escapeHtml(`${details.name}: ${details.tooltip}`)}">${details.label}</span>`;
}

function productTagsTemplate(product, { includeHighValue = true } = {}) {
  const flags = cartLineFlags(product);
  return [
    flags.isControlledDrug ? productTagTemplate("cd") : "",
    flags.isFridge ? productTagTemplate("fridge") : "",
    includeHighValue && flags.isHighValue ? productTagTemplate("high-value") : ""
  ].filter(Boolean).join("");
}

function basketTotalsForPip(pip) {
  return state.basket
    .filter((item) => quickOrderData.productIdentity(item) === pip)
    .reduce((totals, item) => ({
      quantity: totals.quantity + (Number(item.quantity) || 0),
      value: totals.value + lineValue(item)
    }), { quantity: 0, value: 0 });
}

// Today's placed orders plus the basket, against the product-specific threshold if one is set,
// otherwise the general one (no warning when the general threshold is off).
function dailyThresholdResult(product) {
  const pip = quickOrderData.productIdentity(product);
  return dailyThreshold.evaluate({
    ordered: dailyThreshold.orderedToday(pip, window.orderHistoryData),
    inBasket: basketTotalsForPip(pip),
    threshold: dailyThreshold.thresholdFor(pip)
  });
}

const THRESHOLD_SIGN_SVG = `<svg viewBox="0 0 24 22" aria-hidden="true"><path class="threshold-sign-shape" d="M10.3 1.9a2 2 0 0 1 3.4 0l9.6 16.6a2 2 0 0 1-1.7 3H2.4a2 2 0 0 1-1.7-3Z"></path><path class="threshold-sign-mark" d="M12 7.5v6"></path><circle class="threshold-sign-dot" cx="12" cy="17.2" r="1.5"></circle></svg>`;

// Warning sign shown last, after CD / FRIDGE / HIGH VALUE (and OVERRIDE). It never blocks the order.
function dailyThresholdTagTemplate(product) {
  if (!dailyThreshold) return "";
  const result = dailyThresholdResult(product);
  if (!result.quantityExceeded) return "";
  const message = dailyThreshold.warningText(result);
  return `<span class="product-tag product-tag--threshold" tabindex="0" data-threshold-message="${escapeHtml(message)}" aria-label="${escapeHtml(`Daily threshold exceeded. ${message}`)}">${THRESHOLD_SIGN_SVG}</span>`;
}

// Hover message for every OVERRIDE tag: basket lines, Edit Product and "Review before placing order".
const OVERRIDE_TAG_TOOLTIP = "Override — Above Drug Tariff rate, allowed by price override";
// Content of every OVERRIDE tag: "DT" with a thin diagonal line corner to corner across the tag.
const OVERRIDE_TAG_LABEL = '<span class="dt-crossed">DT<svg class="dt-cross" aria-hidden="true"><line x1="0" y1="100%" x2="100%" y2="0"></line></svg></span>';

// Hover messages for the warning sign and DT tag in the legend, pointing to where each is set
// (basket lines show the line's own quantities / the shared OVERRIDE message instead).
const THRESHOLD_LEGEND_TOOLTIP = "Daily Quantity Warning — As per daily quantity limit set in Smart Quantity Recommendations in Settings";
const OVERRIDE_LEGEND_TOOLTIP = `${OVERRIDE_TAG_TOOLTIP} in Settings`;

// Order Pad legend next to the concession key: each basket line icon followed by its name. Hovering the icon or
// the name shows the same message as that tag on a basket line.
function basketIconLegendTemplate() {
  const items = [
    [`<span class="product-tag product-tag--threshold">${THRESHOLD_SIGN_SVG}</span>`, "Daily Quantity Warning", THRESHOLD_LEGEND_TOOLTIP],
    [`<span class="product-tag product-tag--high-value">${POUND_SVG}</span>`, "High order value", productTagDetails["high-value"].tooltip],
    ['<span class="product-tag product-tag--cd">CD</span>', "Controlled Drug", productTagDetails.cd.tooltip],
    [`<span class="product-tag product-tag--fridge">${SNOWFLAKE_SVG}</span>`, "Fridge Line", productTagDetails.fridge.tooltip],
    [`<span class="product-tag product-tag--override">${OVERRIDE_TAG_LABEL}</span>`, "DT Override", OVERRIDE_LEGEND_TOOLTIP]
  ];
  return items.map(([icon, name, tip]) => `<span class="basket-legend-item" tabindex="0" data-tip="${escapeHtml(tip)}">${icon.replace("<span ", '<span aria-hidden="true" ')}<span>${name}</span></span>`).join("");
}

function renderBasketIconLegend() {
  const legend = document.querySelector(".basket-legend");
  if (!legend || legend.querySelector(".basket-legend-item")) return;
  legend.insertAdjacentHTML("beforeend", basketIconLegendTemplate());
}

// "Review before placing order": one row for the basket lines that show the OVERRIDE tag, after HIGH VALUE.
function overrideAttentionCategories() {
  const count = state.basket.filter((product) => isOverrideOffer(product, selectedOffer(product))).length;
  return count ? [{ key: "override", count, label: `${count} Above Drug Tariff, allowed by override` }] : [];
}

// "Review before placing order": one row for the basket lines that show the warning sign, always the last row.
function dailyThresholdAttentionCategories() {
  const count = dailyThreshold
    ? state.basket.filter((product) => dailyThresholdResult(product).quantityExceeded).length
    : 0;
  return count ? [{ key: "threshold", count, label: `${count} Above Daily Quantity Limit` }] : [];
}

// One dark message box for every hover message in Order Pad: the warning sign, CD / FRIDGE / HIGH VALUE,
// OVERRIDE, the Net DT and concession marks, buttons and the rest. It shows straight away on hover, keyboard
// focus or click, instead of the browser's own light title tooltip (delayed, and often missing on a small tag).
const HOVER_TOOLTIP_SELECTOR = "[data-threshold-message], [data-tip], [title]";
const hoverTooltip = document.createElement("div");
hoverTooltip.className = "hover-tooltip";
hoverTooltip.id = "hoverTooltip";
hoverTooltip.setAttribute("role", "tooltip");
hoverTooltip.hidden = true;
document.body.appendChild(hoverTooltip);
let hoverTooltipAnchor = null;

// A title attribute is moved to data-tip, so the browser does not show its own tooltip as well.
function hoverTooltipText(element) {
  if (element.hasAttribute("title")) {
    element.dataset.tip = element.getAttribute("title");
    element.removeAttribute("title");
  }
  return element.dataset.thresholdMessage || element.dataset.tip || "";
}

function showHoverTooltip(element) {
  const text = hoverTooltipText(element);
  if (!text) {
    hideHoverTooltip();
    return;
  }
  // Inside an open popup the box must be part of the popup, or the popup covers it.
  const host = element.closest("dialog[open]") || document.body;
  if (hoverTooltip.parentElement !== host) host.appendChild(hoverTooltip);
  if (hoverTooltipAnchor && hoverTooltipAnchor !== element) hoverTooltipAnchor.removeAttribute("aria-describedby");
  hoverTooltipAnchor = element;
  element.setAttribute("aria-describedby", hoverTooltip.id);
  hoverTooltip.textContent = text;
  hoverTooltip.hidden = false;
  const anchorRect = element.getBoundingClientRect();
  const tipRect = hoverTooltip.getBoundingClientRect();
  const left = Math.min(Math.max(8, anchorRect.left), window.innerWidth - tipRect.width - 8);
  const below = anchorRect.bottom + 6;
  const top = below + tipRect.height > window.innerHeight - 8 ? anchorRect.top - tipRect.height - 6 : below;
  hoverTooltip.style.left = `${Math.round(left)}px`;
  hoverTooltip.style.top = `${Math.round(top)}px`;
}

function hideHoverTooltip() {
  hoverTooltipAnchor?.removeAttribute("aria-describedby");
  hoverTooltipAnchor = null;
  hoverTooltip.hidden = true;
}

function isFavourite(product) {
  return state.quickOrder.favouritePips.has(quickOrderData.productIdentity(product));
}

function favouriteButtonTemplate(product, extraClass = "") {
  const favourite = isFavourite(product);
  const action = favourite ? "Remove" : "Add";
  const preposition = favourite ? "from" : "to";
  return `
    <button class="favourite-button ${favourite ? "is-favourite" : ""} ${extraClass}" type="button"
      data-toggle-favourite="${escapeHtml(product.pip)}"
      aria-pressed="${String(favourite)}"
      aria-label="${action} ${escapeHtml(product.name)} ${preposition} favourites"
      title="${action} ${escapeHtml(product.name)} ${preposition} favourites">
      <span aria-hidden="true">${favourite ? "★" : "☆"}</span>
    </button>
  `;
}

function quickOrderProductRegistry() {
  const productsByPip = new Map();
  [...catalogue, ...state.quickOrder.frequentlyOrdered].forEach((product) => {
    const pip = quickOrderData.productIdentity(product);
    if (pip) productsByPip.set(pip, product);
  });
  state.basket.forEach((product) => {
    const pip = quickOrderData.productIdentity(product);
    if (pip && !productsByPip.has(pip)) productsByPip.set(pip, product);
  });
  return productsByPip;
}

function quickOrderProducts() {
  if (state.quickOrder.activeView === "frequent") {
    return state.quickOrder.frequentlyOrdered;
  }

  const productsByPip = quickOrderProductRegistry();
  return Array.from(state.quickOrder.favouritePips)
    .map((pip) => productsByPip.get(pip))
    .filter(Boolean)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function quickOrderQuantity(product) {
  const pip = quickOrderData.productIdentity(product);
  if (Object.prototype.hasOwnProperty.call(state.quickOrder.quantities, pip)) {
    return quickOrderData.normaliseQuantity(state.quickOrder.quantities[pip]);
  }
  return 0;
}

function quickOrderRowTemplate(product) {
  const pip = quickOrderData.productIdentity(product);
  const basketItem = quickOrderData.findBasketItem(state.basket, product);
  const quantity = quickOrderQuantity(product);
  const basketQuantity = basketItem ? quickOrderData.normaliseQuantity(basketItem.quantity) : 0;
  const classificationTags = productTagsTemplate(product, { includeHighValue: false });
  return `
    <article class="quick-order-row" data-quick-order-product="${escapeHtml(pip)}">
      <div class="quick-order-product-heading">
        ${favouriteButtonTemplate(product, "quick-order-favourite")}
        <div class="quick-order-product-copy">
          <span class="quick-order-description-line">
            <strong title="${escapeHtml(product.name)}">${escapeHtml(product.name)}</strong>
            ${classificationTags ? `<span class="quick-order-tags">${classificationTags}</span>` : ""}
          </span>
          <span class="quick-order-pip">PIP ${escapeHtml(product.pip)}</span>
        </div>
      </div>
      <div class="quick-order-ordering">
        <div class="quick-order-actions">
          <div class="quick-order-quantity">
            <input class="quick-order-quantity-input" type="number" min="0" step="1" inputmode="numeric" value="${quantity}" data-quick-quantity="${escapeHtml(pip)}" aria-label="Quantity to add for ${escapeHtml(product.name)}" />
            ${basketItem ? `<small>In Basket: ${basketQuantity}</small>` : ""}
          </div>
          <button class="basket-add-button quick-order-add" type="button" data-quick-add="${escapeHtml(pip)}" aria-label="Add ${escapeHtml(product.name)} to basket" title="${quantity === 0 ? "Enter a quantity to add" : "Add to basket"}" ${quantity === 0 ? 'disabled aria-disabled="true"' : 'aria-disabled="false"'}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 7h14l-1.2 8.2a2 2 0 0 1-2 1.7H8.2a2 2 0 0 1-2-1.7L5 7Z" />
              <path d="M8.2 7 10.8 3h2.4l2.6 4" />
              <path d="M9 11h6" />
              <path d="M12 8v6" />
              <circle cx="9" cy="20" r="1" />
              <circle cx="16" cy="20" r="1" />
            </svg>
            <span class="quick-order-add-label">Add</span>
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderQuickOrder() {
  const favouritesView = state.quickOrder.activeView === "favourites";
  if (els.quickOrderResults.dataset.view) {
    state.quickOrder.scrollPositions[els.quickOrderResults.dataset.view] = els.quickOrderResults.scrollTop;
  }
  els.quickOrderTabs.forEach((tab) => {
    const selected = tab.dataset.quickOrderView === state.quickOrder.activeView;
    tab.classList.toggle("active", selected);
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  els.quickOrderResults.setAttribute("aria-labelledby", favouritesView ? "favouritesTab" : "frequentlyOrderedTab");
  els.quickOrderResults.dataset.view = state.quickOrder.activeView;
  if (els.quickOrderSearch.value !== state.quickOrder.search) {
    els.quickOrderSearch.value = state.quickOrder.search;
  }
  els.quickOrderFooter.innerHTML = "";

  const loadingError = favouritesView
    ? state.quickOrder.favouriteError
    : state.quickOrder.frequentlyOrderedError;
  if (loadingError) {
    els.quickOrderResults.innerHTML = `<div class="quick-order-empty" role="status">${favouritesView ? "Favourites" : "Frequently ordered products"} are temporarily unavailable.</div>`;
    return;
  }

  const products = quickOrderProducts();
  if (favouritesView && products.length === 0) {
    els.quickOrderResults.innerHTML = `
      <div class="quick-order-empty">
        <strong>No favourites yet</strong>
        <span>Select ☆ beside a product to save it here for quick ordering.</span>
      </div>
    `;
    return;
  }

  if (!favouritesView && products.length === 0) {
    els.quickOrderResults.innerHTML = '<div class="quick-order-empty">No frequently ordered products yet.</div>';
    return;
  }

  const query = state.quickOrder.search.trim().toLowerCase();
  const filteredProducts = query
    ? products.filter((product) => product.name.toLowerCase().includes(query) || String(product.pip).toLowerCase().includes(query))
    : products;
  if (filteredProducts.length === 0) {
    els.quickOrderResults.innerHTML = `
      <div class="quick-order-empty">
        <strong>No products found</strong>
        <span>Try another product name or PIP code.</span>
      </div>
    `;
    return;
  }

  const defaultLimit = 10;
  const visibleLimit = state.quickOrder.expanded ? 20 : defaultLimit;
  const visibleProducts = filteredProducts.slice(0, visibleLimit);
  const canExpand = filteredProducts.length > defaultLimit;
  els.quickOrderResults.innerHTML = `<div class="quick-order-list">${visibleProducts.map(quickOrderRowTemplate).join("")}</div>`;
  els.quickOrderFooter.innerHTML = canExpand
    ? `<button class="quick-order-more" type="button" data-quick-order-more>${state.quickOrder.expanded ? "Show fewer" : "View more"} <span aria-hidden="true">${state.quickOrder.expanded ? "−" : ">"}</span></button>`
    : "";
  els.quickOrderResults.scrollTop = state.quickOrder.scrollPositions[state.quickOrder.activeView] || 0;
}

function toggleFavourite(pip) {
  const product = quickOrderProductRegistry().get(String(pip));
  if (!product) {
    toast("This product is temporarily unavailable", "error");
    return;
  }

  const wasFavourite = state.quickOrder.favouritePips.has(product.pip);
  if (wasFavourite) state.quickOrder.favouritePips.delete(product.pip);
  else state.quickOrder.favouritePips.add(product.pip);
  state.quickOrder.favouriteError = null;
  renderBasket();
  renderQuickOrder();

  const result = quickOrderData.writeFavouritePips(
    window.localStorage,
    currentAccountId,
    state.quickOrder.favouritePips
  );
  if (result.error) {
    if (wasFavourite) state.quickOrder.favouritePips.add(product.pip);
    else state.quickOrder.favouritePips.delete(product.pip);
    state.quickOrder.favouriteError = result.error;
    renderBasket();
    renderQuickOrder();
    toast("Favourites could not be saved. Please try again.", "error");
    return;
  }

  window.dispatchEvent(new CustomEvent("cascade:favourites-changed", {
    detail: { accountId: currentAccountId, pips: result.pips, source: "order-pad" }
  }));
  toast(wasFavourite ? "Removed from favourites" : "Added to favourites");
}

function setQuickOrderView(view) {
  if (view !== "frequent" && view !== "favourites") return;
  state.quickOrder.activeView = view;
  state.quickOrder.expanded = false;
  state.quickOrder.search = "";
  renderQuickOrder();
}

function renderPanelStates() {
  const { quickOrderExpanded } = state.panels;

  els.quickOrderToggle.setAttribute("aria-expanded", String(quickOrderExpanded));
  els.quickOrderToggle.setAttribute("aria-label", `${quickOrderExpanded ? "Collapse" : "Expand"} Quick Order`);
  els.quickOrderToggle.title = `${quickOrderExpanded ? "Collapse" : "Expand"} Quick Order`;
  els.quickOrderContent.hidden = !quickOrderExpanded;
  els.quickOrderPanel.classList.toggle("is-collapsed", !quickOrderExpanded);

  els.utilitySidebar.classList.toggle("quick-order-collapsed", !quickOrderExpanded);
  els.orderLayout.classList.toggle("utility-collapsed", !quickOrderExpanded);
}

function togglePanel(panel) {
  if (panel === "quickOrder") state.panels.quickOrderExpanded = !state.panels.quickOrderExpanded;
  savePanelPreferences();
  renderPanelStates();
}

function addQuickOrderProduct(pip) {
  const product = quickOrderProductRegistry().get(String(pip));
  if (!product) {
    toast("This product is temporarily unavailable", "error");
    return;
  }
  const quantity = quickOrderQuantity(product);
  if (quantity === 0) {
    toast("Enter a quantity greater than zero", "error");
    return;
  }

  try {
    addProductToBasket(product, quantity, { openDetails: false });
    delete state.quickOrder.quantities[pip];
    render();
  } catch (error) {
    toast("The product could not be added to the basket", "error");
  }
}

function render(options = {}) {
  renderAddProductToggle();
  renderSearchResults();
  renderBasket();
  renderAdvancedSortPanel();
  renderSummary();
  renderQuickOrder();
  renderPanelStates();
  if (state.editingId && !options.skipDrawer) renderDrawer();
  scheduleBrandSummaryIfBasketChanged();
}

function selectedLines() {
  const basketIds = new Set(state.basket.map((product) => product.lineId));
  state.selectedLineIds = state.selectedLineIds.filter((lineId) => basketIds.has(lineId));
  return state.selectedLineIds;
}

function renderAddProductToggle() {
  els.addProductPanel.hidden = !state.addProductVisible;
  els.toggleAddProduct.textContent = state.addProductVisible ? "- Hide Add Product" : "+ Show Add Product";
  els.toggleAddProduct.setAttribute("aria-expanded", String(state.addProductVisible));
}

function focusAddProductSearch() {
  if (!state.addProductVisible || !els.nameSearch) return;
  window.requestAnimationFrame(() => els.nameSearch.focus());
}

function focusSearchQuantity() {
  if (!state.addProductVisible || !els.quantityInput) return;
  window.requestAnimationFrame(() => {
    els.quantityInput.focus();
    els.quantityInput.select();
  });
}

function selectSearchProduct(productId) {
  const product = catalogue.find((item) => item.id === productId);
  if (!product) return false;
  state.search.selectedProductId = product.id;
  els.nameSearch.value = product.name;
  state.search.name = product.name;
  state.search.pip = "";
  els.searchResults.innerHTML = "";
  focusSearchQuantity();
  return true;
}

function renderSearchResults() {
  const query = state.search.name.trim().toLowerCase();
  if (!query) {
    els.searchResults.innerHTML = "";
    state.search.selectedProductId = null;
    return;
  }

  const matches = catalogue.filter((product) => {
    return product.name.toLowerCase().includes(query) || product.pip.toLowerCase().includes(query);
  }).slice(0, 12);

  if (!matches.some((product) => product.id === state.search.selectedProductId)) {
    state.search.selectedProductId = matches[0]?.id || null;
  }

  els.searchResults.innerHTML = matches.map((product) => `
    <button class="search-result ${product.id === state.search.selectedProductId ? "active" : ""}" type="button" data-select-product="${product.id}">
      <strong>${escapeHtml(product.name)}</strong>
    </button>
  `).join("");
}

function visibleBasket() {
  const query = state.basketFilter.trim().toLowerCase();
  const rows = !query ? [...state.basket] : state.basket.filter((product) => {
    return product.name.toLowerCase().includes(query) || product.pip.toLowerCase().includes(query);
  });
  return sortedBasketRows(rows);
}

function sortedBasketRows(rows) {
  if (state.advancedSort.key) return advancedSortedBasketRows(rows);

  const { key, direction } = state.basketSort;
  if (!key || !direction) return rows;

  const multiplier = direction === "asc" ? 1 : -1;
  const originalOrder = new Map(state.basket.map((product, index) => [product.lineId, index]));
  const valueFor = {
    product: (product) => product.name.toLowerCase(),
    quantity: (product) => product.quantity,
    dt: (product) => product.tariff
  }[key];

  return [...rows].sort((a, b) => {
    const aValue = valueFor(a);
    const bValue = valueFor(b);
    const aMissing = aValue === null || aValue === undefined;
    const bMissing = bValue === null || bValue === undefined;

    if (aMissing && bMissing) return originalOrder.get(a.lineId) - originalOrder.get(b.lineId);
    if (aMissing) return 1;
    if (bMissing) return -1;

    const comparison = typeof aValue === "string"
      ? aValue.localeCompare(bValue)
      : aValue - bValue;

    return comparison === 0
      ? originalOrder.get(a.lineId) - originalOrder.get(b.lineId)
      : comparison * multiplier;
  });
}

function nextSortDirection(key) {
  if (state.basketSort.key !== key) return "asc";
  if (state.basketSort.direction === "asc") return "desc";
  if (state.basketSort.direction === "desc") return null;
  return "asc";
}

function columnSortButtonTemplate(key, label) {
  const active = state.basketSort.key === key && state.basketSort.direction;
  const indicator = active ? (state.basketSort.direction === "asc" ? "&uarr;" : "&darr;") : "&#8597;";
  const ariaSort = !active ? "none" : state.basketSort.direction === "asc" ? "ascending" : "descending";
  return `<button class="sort-header ${active ? "active" : ""}" type="button" data-sort="${key}" aria-sort="${ariaSort}">${label} <span>${indicator}</span></button>`;
}

function cycleBasketSort(key) {
  const direction = nextSortDirection(key);
  state.basketSort = direction ? { key, direction } : { key: null, direction: null };
  state.advancedSort = { key: null, direction: null, label: "" };
  state.sortLoading = false;
  renderBasket();
  renderAdvancedSortPanel();
}

function originalBasketOrder() {
  return new Map(state.basket.map((product, index) => [product.lineId, index]));
}

function hasUnknownDescription(product) {
  const inCatalogue = catalogue.some((item) => item.id === product.productId || item.pip === product.pip);
  return !product.name || !inCatalogue || /unknown|not present|not in system/i.test(product.name);
}

function isAboveDrugTariff(product) {
  if (typeof product.tariff !== "number") return false;
  const prices = supplierOffers(product).map((offer) => offer.price);
  return prices.length > 0 && prices.every((price) => price > product.tariff);
}

function isAdvancedMarked(product) {
  return (state.advancedSort.key === "aboveDt" && isAboveDrugTariff(product))
    || (state.advancedSort.key === "unknownDescription" && hasUnknownDescription(product))
    || (state.advancedSort.key === "activeConcession" && product.concessionPrice);
}

function matchesAdvancedSort(product, key = state.advancedSort.key) {
  if (key === "aboveDt") return isAboveDrugTariff(product);
  if (key === "unknownDescription") return hasUnknownDescription(product);
  if (key === "activeConcession") return product.concessionPrice;

  const flags = cartLineFlags(product);
  if (key === "controlledDrug") return flags.isControlledDrug;
  if (key === "fridgeLines") return flags.isFridge;
  if (key === "highValueLines") return flags.isHighValue;
  return false;
}

function advancedSortedBasketRows(rows) {
  const originalOrder = originalBasketOrder();
  const { key, direction } = state.advancedSort;

  if (key === "selectedPrice") {
    const multiplier = direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const aValue = selectedPrice(a);
      const bValue = selectedPrice(b);
      const aMissing = typeof aValue !== "number";
      const bMissing = typeof bValue !== "number";
      if (aMissing && bMissing) return originalOrder.get(a.lineId) - originalOrder.get(b.lineId);
      if (aMissing) return 1;
      if (bMissing) return -1;
      const comparison = aValue - bValue;
      return comparison === 0
        ? originalOrder.get(a.lineId) - originalOrder.get(b.lineId)
        : comparison * multiplier;
    });
  }

  if (["aboveDt", "unknownDescription", "activeConcession", "controlledDrug", "fridgeLines", "highValueLines"].includes(key)) {
    return [...rows].sort((a, b) => {
      const aMatches = matchesAdvancedSort(a, key);
      const bMatches = matchesAdvancedSort(b, key);
      if (aMatches !== bMatches) return aMatches ? -1 : 1;
      return originalOrder.get(a.lineId) - originalOrder.get(b.lineId);
    });
  }

  return rows;
}

function advancedSortLabel(key, direction) {
  if (key === "selectedPrice") return `Selected Supplier Price ${direction === "asc" ? "Low-High" : "High-Low"}`;
  if (key === "aboveDt") return "Above Drug Tariff";
  if (key === "unknownDescription") return "Unknown Product Description";
  if (key === "activeConcession") return "Active Concession";
  if (key === "controlledDrug") return "Controlled Drugs";
  if (key === "fridgeLines") return "Fridge Lines";
  if (key === "highValueLines") return "High Value Lines over \u00a3100";
  return "";
}

function renderSortStatus() {
  if (state.sortLoading) {
    els.sortStatus.hidden = false;
    els.sortStatus.className = "sort-status loading";
    els.sortStatus.textContent = "Sorting basket...";
    return;
  }

  els.sortStatus.hidden = true;
  els.sortStatus.textContent = "";
}

function renderAdvancedSortPanel() {
  els.advancedSortPanel.hidden = !state.advancedSortPanelOpen;
  els.advancedSortToggle.setAttribute("aria-expanded", String(state.advancedSortPanelOpen));
  els.advancedSortToggle.classList.toggle("active", state.advancedSortPanelOpen || Boolean(state.advancedSort.key));

  els.advancedSortPanel.querySelectorAll(".advanced-sort-choice").forEach((choice) => {
    const key = choice.dataset.advancedSort || (choice.matches("[data-selected-price-choice]") ? "selectedPrice" : "");
    const selected = key === state.advancedSort.key;
    choice.classList.toggle("selected", selected);
  });

  els.advancedSortPanel.querySelectorAll("[data-advanced-sort]").forEach((button) => {
    const selected = button.dataset.advancedSort === state.advancedSort.key
      && (!button.dataset.direction || button.dataset.direction === state.advancedSort.direction);
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function closeAdvancedSortPanel() {
  if (!state.advancedSortPanelOpen) return;
  state.advancedSortPanelOpen = false;
  renderAdvancedSortPanel();
}

function applyAdvancedSort(key, direction) {
  const sortRunId = ++advancedSortRunId;
  const label = advancedSortLabel(key, direction);
  state.advancedSortPanelOpen = false;
  state.basketSort = { key: null, direction: null };
  state.advancedSort = { key: null, direction: null, label: "" };
  state.sortLoading = true;
  renderBasket();
  renderAdvancedSortPanel();

  window.setTimeout(() => {
    if (sortRunId !== advancedSortRunId) return;
    state.advancedSort = { key, direction: direction || null, label };
    state.sortLoading = false;
    renderBasket();
    renderAdvancedSortPanel();
    toast(`${label} applied`);
  }, 260);
}

function resetAllSorts(options = {}) {
  advancedSortRunId += 1;
  state.basketSort = { key: null, direction: null };
  state.advancedSort = { key: null, direction: null, label: "" };
  state.advancedSortPanelOpen = false;
  state.sortLoading = false;
  if (options.render === false) return;
  renderBasket();
  renderAdvancedSortPanel();
  if (options.toast !== false) toast("All filters reset");
}

function renderBasket() {
  hideHoverTooltip();
  const rows = visibleBasket();
  const selected = selectedLines();
  const visibleIds = rows.map((product) => product.lineId);
  const selectedVisibleCount = visibleIds.filter((lineId) => selected.includes(lineId)).length;
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
  els.basketPanel.classList.toggle("is-empty", state.basket.length === 0);
  els.emptyState.hidden = state.basket.length > 0;
  els.placeOrderButton.disabled = state.basket.length === 0;
  els.removeSelectedButton.disabled = selected.length === 0;
  els.removeSelectedButton.title = selected.length
    ? `Remove ${selected.length} selected product${selected.length === 1 ? "" : "s"}`
    : "Remove selected products";
  const showBestPrice = rows.some((product) => {
    const recommended = getRecommendedSupplier(product);
    return recommended && recommended.key !== product.selectedOfferKey;
  });

  els.productList.classList.toggle("has-best-price", showBestPrice);
  els.productList.classList.toggle("is-sorting", state.sortLoading);
  renderSortStatus();
  els.productList.innerHTML = rows.length
    ? `
      <div class="product-list-header" role="row">
        <label class="select-all-control" title="Select all visible products">
          <input type="checkbox" data-select-all ${allVisibleSelected ? "checked" : ""} ${selectedVisibleCount > 0 && !allVisibleSelected ? "data-indeterminate=\"true\"" : ""} />
          <span>Edit</span>
        </label>
        ${columnSortButtonTemplate("product", "Product")}
        <span>Pip Code</span>
        <span class="numeric-col">${columnSortButtonTemplate("quantity", "Quantity")}</span>
        <span class="net-dt-header numeric-col">
          Net DT
          <span class="info-icon" title="Calculated on the basis of the Discount deduction rates by DHSC" aria-label="Calculated on the basis of the Discount deduction rates by DHSC" tabindex="0">i</span>
        </span>
        <span class="numeric-col">${columnSortButtonTemplate("dt", "DT")}</span>
        <span class="selected-supplier-col">Selected Supplier</span>
        <span class="numeric-col">Price</span>
        <span class="numeric-col">Order Value</span>
        ${showBestPrice ? "<span>Best Price</span>" : ""}
      </div>
      ${rows.map((product) => productCardTemplate(product, showBestPrice)).join("")}
    `
    : "";

  const selectAll = els.productList.querySelector("[data-select-all]");
  if (selectAll) selectAll.indeterminate = selectedVisibleCount > 0 && !allVisibleSelected;
  if (state.brand.equalisedPopoverLineId) {
    window.requestAnimationFrame(() => showEqualisedPopover(state.brand.equalisedPopoverLineId));
  }
}

// The change popover sits in the top layer so the basket's horizontal scroll area does not clip it.
function showEqualisedPopover(lineId) {
  const trigger = els.productList.querySelector(`[data-equalised-details="${CSS.escape(lineId)}"]`);
  const popover = els.productList.querySelector(`#equalised-popover-${CSS.escape(lineId)}`);
  if (!trigger || !popover) return;
  if (typeof popover.showPopover === "function" && !popover.matches(":popover-open")) popover.showPopover();
  const triggerBounds = trigger.getBoundingClientRect();
  const popoverBounds = popover.getBoundingClientRect();
  const left = Math.max(8, Math.min(triggerBounds.left, window.innerWidth - popoverBounds.width - 8));
  const top = Math.max(8, Math.min(triggerBounds.bottom + 6, window.innerHeight - popoverBounds.height - 8));
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}

function closeEqualisedPopover() {
  const lineId = state.brand.equalisedPopoverLineId;
  if (!lineId) return;
  const trigger = els.productList.querySelector(`[data-equalised-details="${CSS.escape(lineId)}"]`);
  const popover = els.productList.querySelector(`#equalised-popover-${CSS.escape(lineId)}`);
  state.brand.equalisedPopoverLineId = null;
  trigger?.setAttribute("aria-expanded", "false");
  if (popover && typeof popover.hidePopover === "function" && popover.matches(":popover-open")) {
    popover.hidePopover();
  }
  popover?.remove();
}

// "Cheaper equivalent available" before a change; "Alternative selected" (with details and Undo) after it.
function brandRowStatusTemplate(product) {
  if (product.equalisation) return equalisedStatusTemplate(product);
  if (!state.brand.summary?.opportunityLineIds?.includes(product.lineId)) return "";
  return `<button class="brand-row-indicator" type="button" data-brand-opportunity="${escapeHtml(product.lineId)}" title="Cheaper approved equivalent available"><span aria-hidden="true"></span>Cheaper equivalent available</button>`;
}

function equalisedStatusTemplate(product) {
  const equalisation = product.equalisation;
  const expanded = state.brand.equalisedPopoverLineId === product.lineId;
  return `
    <span class="equalised-status-wrap">
      <button class="equalised-row-indicator" type="button" data-equalised-details="${escapeHtml(product.lineId)}" aria-expanded="${expanded}" title="View product change details">
        <span aria-hidden="true">&#10003;</span> Alternative selected &middot; Saved ${formatCurrency(equalisation.estimatedSaving)}
      </button>
      ${expanded ? `
        <span class="equalised-popover" id="equalised-popover-${escapeHtml(product.lineId)}" popover="manual" role="dialog" aria-label="Product Change Details">
          <strong>Product Change Details</strong>
          <dl>
            <div><dt>Originally</dt><dd>${escapeHtml(equalisation.originalName)}</dd></div>
            <div><dt>Changed to</dt><dd>${escapeHtml(equalisation.replacementName)}</dd></div>
            <div><dt>Original supplier</dt><dd>${escapeHtml(equalisation.originalSupplier)}</dd></div>
            <div><dt>New supplier</dt><dd>${escapeHtml(equalisation.replacementSupplier)}</dd></div>
            <div><dt>Quantity</dt><dd>${escapeHtml(equalisation.quantity)}</dd></div>
            <div><dt>Estimated saving</dt><dd><strong>${formatCurrency(equalisation.estimatedSaving)}</strong></dd></div>
          </dl>
          <button class="equalised-undo" type="button" data-equalisation-undo="${escapeHtml(product.lineId)}">Undo</button>
        </span>` : ""}
    </span>`;
}

function productCardTemplate(product, showBestPriceColumn) {
  const price = selectedPrice(product);
  const value = lineValue(product);
  const productTags = productTagsTemplate(product);
  const recommended = getRecommendedSupplier(product);
  const showBestPrice = recommended && recommended.key !== product.selectedOfferKey;
  const marked = isAdvancedMarked(product);
  const markText = state.advancedSort.key === "aboveDt"
    ? "Above DT"
    : state.advancedSort.key === "activeConcession"
      ? "Active Concession"
      : "Unknown Description";
  const selectedSupplierText = supplierLabel(product.selectedSupplier);
  const currentOffer = selectedOffer(product);
  // OVERRIDE follows any existing product tags (e.g. HIGH VALUE OVERRIDE) when the selected supplier is allowed only by the override.
  const overrideTip = isOverrideOffer(product, currentOffer)
    ? OVERRIDE_TAG_TOOLTIP
    : "";
  const overrideTag = overrideTip
    ? `<span class="product-tag product-tag--override" tabindex="0" title="${escapeHtml(overrideTip)}" aria-label="${escapeHtml(overrideTip)}">${OVERRIDE_TAG_LABEL}</span>`
    : "";
  // The daily threshold warning sign is always the last tag.
  const lineTags = productTags + overrideTag + dailyThresholdTagTemplate(product);

  return `
    <article class="product-card ${marked ? "advanced-mark" : ""}" data-line-id="${product.lineId}">
      <div class="card-actions">
        <input class="row-select" type="checkbox" data-select-line="${product.lineId}" aria-label="Select ${escapeHtml(product.name)}" ${state.selectedLineIds.includes(product.lineId) ? "checked" : ""} />
        <button class="icon-action edit-action" type="button" data-edit="${product.lineId}" aria-label="Edit ${escapeHtml(product.name)}" title="Edit">&#9998;</button>
      </div>
      <div class="product-main">
        <div class="product-name-with-favourite">
          <span class="product-card-title">${escapeHtml(product.name)}</span>
          ${favouriteButtonTemplate(product, "basket-favourite")}
          ${lineTags ? `<span class="product-tags">${lineTags}</span>` : ""}
        </div>
        ${brandRowStatusTemplate(product)}
        ${marked ? `<span class="advanced-row-badge">${markText}</span>` : ""}
      </div>
      <span>${product.pip}</span>
      <span class="numeric-col">${product.quantity}</span>
      <span class="net-dt-value numeric-col" title="Calculated on the basis of the Discount deduction rates by DHSC">${formatTariff(netDtValue(product))}</span>
      <span class="numeric-col">${dtValueTemplate(product)}</span>
      <span class="selected-supplier-col">${selectedSupplierText}</span>
      <span class="numeric-col">${formatCurrency(price)}</span>
      <span class="numeric-col">${formatCurrency(value)}</span>
      ${showBestPriceColumn ? `<strong class="best-price ${showBestPrice ? "" : "empty"}">${showBestPrice ? `${recommended.supplierLabel} - ${formatCurrency(recommended.price)}` : ""}</strong>` : ""}
    </article>
  `;
}

function animateKpiValue(element, nextValue, formatter) {
  if (!element) return;

  const safeNextValue = Number.isFinite(nextValue) ? nextValue : 0;
  if (!kpiTargetValues.has(element)) {
    kpiDisplayedValues.set(element, safeNextValue);
    kpiTargetValues.set(element, safeNextValue);
    element.textContent = formatter(safeNextValue);
    return;
  }

  if (kpiTargetValues.get(element) === safeNextValue) return;

  const activeFrame = kpiAnimationFrames.get(element);
  if (activeFrame) window.cancelAnimationFrame(activeFrame);

  const startValue = kpiDisplayedValues.get(element) ?? safeNextValue;
  kpiTargetValues.set(element, safeNextValue);

  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    kpiDisplayedValues.set(element, safeNextValue);
    element.textContent = formatter(safeNextValue);
    return;
  }

  const duration = 650;
  let startTime = null;

  function update(timestamp) {
    if (startTime === null) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    const easedProgress = 1 - Math.pow(1 - progress, 3);
    const displayedValue = startValue + ((safeNextValue - startValue) * easedProgress);

    kpiDisplayedValues.set(element, displayedValue);
    element.textContent = formatter(displayedValue);

    if (progress < 1) {
      kpiAnimationFrames.set(element, window.requestAnimationFrame(update));
      return;
    }

    kpiDisplayedValues.set(element, safeNextValue);
    kpiAnimationFrames.delete(element);
    element.textContent = formatter(safeNextValue);
  }

  kpiAnimationFrames.set(element, window.requestAnimationFrame(update));
}

function renderSummary() {
  const totalValue = state.basket.reduce((sum, product) => sum + lineValue(product), 0);
  const totalSavings = state.basket.reduce((sum, product) => sum + potentialSaving(product), 0);
  animateKpiValue(els.totalProducts, state.basket.length, (value) => String(Math.round(value)));
  animateKpiValue(els.totalValue, totalValue, formatCurrency);
  animateKpiValue(els.potentialSavings, totalSavings, formatCurrency);
  els.potentialSavings.classList.toggle("is-positive", totalSavings > 0);
}

// ---- Cheaper alternatives (Brand <-> Generic optimisation) ----
// Separate from the Potential Savings KPI: the banner and drawer carry their own summary.

function brandBasketSignature() {
  return state.basket
    .map((product) => `${product.lineId}:${product.productId}:${product.quantity}:${product.selectedOfferKey}:${selectedPrice(product)}`)
    .join("|");
}

// Lightweight summary only when basket content, quantity, selected supplier or price changes.
function scheduleBrandSummaryIfBasketChanged() {
  const signature = brandBasketSignature();
  if (signature === lastBrandBasketSignature) return;
  lastBrandBasketSignature = signature;
  window.clearTimeout(brandSummaryTimer);
  brandSummaryTimer = window.setTimeout(() => refreshBrandSummary(), 80);
}

function recommendationLabel(opportunity) {
  const type = String(opportunity.replacementType || "Product").trim();
  const normalisedType = type
    ? `${type.charAt(0).toUpperCase()}${type.slice(1).toLowerCase()}`
    : "Product";
  return `Lower-cost ${normalisedType}`;
}

function productTypeClass(productType) {
  const normalised = String(productType || "").trim().toLowerCase();
  return normalised === "brand" || normalised === "generic" ? `is-${normalised}` : "";
}

function renderBrandBanner() {
  const summary = state.brand.summary;
  const visible = Boolean(summary?.hasBrandOpportunity)
    && state.brand.dismissedKey !== summary.opportunityKey;
  els.brandOpportunityBanner.hidden = !visible;
  if (!summary) return;
  els.brandOpportunityCount.textContent = `${summary.opportunityCount} cheaper alternative${summary.opportunityCount === 1 ? "" : "s"} available`;
  els.brandOpportunitySaving.textContent = `Save up to ${formatCurrency(summary.totalPotentialSaving)}`;
}

function brandOpportunityCardTemplate(opportunity, index) {
  const selected = state.brand.selectedOpportunityLineIds.includes(opportunity.lineId);
  const savingPerPack = typeof opportunity.savingPerPack === "number"
    ? opportunity.savingPerPack
    : Number((opportunity.currentPrice - opportunity.recommendedPrice).toFixed(2));
  return `
    <article class="brand-opportunity-card ${selected ? "selected" : ""}" data-brand-line-id="${escapeHtml(opportunity.lineId)}">
      <div class="brand-card-comparison">
        <div class="brand-card-leading">
          <span class="brand-card-number" aria-hidden="true">${index + 1}</span>
          <label class="brand-card-selector">
            <input type="checkbox" data-brand-select="${escapeHtml(opportunity.lineId)}" aria-label="Select ${escapeHtml(opportunity.currentName)}" ${selected ? "checked" : ""} />
          </label>
        </div>
        <div class="brand-product-side current">
          <span class="brand-side-label">Current product</span>
          <strong>${escapeHtml(opportunity.currentName)}</strong>
          <small class="brand-type-badge ${productTypeClass(opportunity.currentType)}">${escapeHtml(opportunity.currentType)}</small>
          <span class="brand-product-price"><strong>${formatCurrency(opportunity.currentPrice)}</strong><small>${escapeHtml(opportunity.currentSupplier)}</small></span>
        </div>
        <span class="brand-direction" aria-label="Current to recommended">&rarr;</span>
        <div class="brand-product-side recommended">
          <span class="brand-side-label">${escapeHtml(recommendationLabel(opportunity))}</span>
          <strong>${escapeHtml(opportunity.replacementName)}</strong>
          <small class="brand-type-badge ${productTypeClass(opportunity.replacementType)}">${escapeHtml(opportunity.replacementType)}</small>
          <span class="brand-product-price"><strong>${formatCurrency(opportunity.recommendedPrice)}</strong><small>${escapeHtml(opportunity.recommendedSupplier)}</small></span>
        </div>
      </div>
      <div class="brand-card-saving">
        <span class="brand-card-saving-copy">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12.5 12.5 20 4 11.5V4h7.5Z"></path><circle cx="8.3" cy="8.2" r="1.1"></circle></svg>
          <span class="brand-card-saving-details">
            <span class="brand-card-saving-primary">
              <small>Qty ${escapeHtml(opportunity.quantity)}</small>
              <span aria-hidden="true">&middot;</span>
              <strong>Save ${formatCurrency(opportunity.totalSaving)} total</strong>
            </span>
            <small>${formatCurrency(savingPerPack)} cheaper per pack</small>
          </span>
        </span>
        <button type="button" data-brand-switch="${escapeHtml(opportunity.lineId)}"><span aria-hidden="true">&#8644;</span>Switch</button>
      </div>
    </article>
  `;
}

function selectedBrandOpportunities() {
  const selectedIds = new Set(state.brand.selectedOpportunityLineIds);
  return state.brand.opportunities.filter((opportunity) => selectedIds.has(opportunity.lineId));
}

function bulkBrandOpportunities() {
  const selected = selectedBrandOpportunities();
  return selected.length ? selected : state.brand.opportunities;
}

// Selected count and saving are sums of the locally selected opportunities (no request per checkbox).
function updateBrandSelectionControls() {
  const availableIds = new Set(state.brand.opportunities.map((opportunity) => opportunity.lineId));
  state.brand.selectedOpportunityLineIds = state.brand.selectedOpportunityLineIds.filter((lineId) => availableIds.has(lineId));
  const selected = selectedBrandOpportunities();
  const bulkOpportunities = selected.length ? selected : state.brand.opportunities;
  const summary = state.brand.summary;
  const displayedSaving = selected.length
    ? selected.reduce((sum, opportunity) => sum + opportunity.totalSaving, 0)
    : summary?.totalPotentialSaving ?? bulkOpportunities.reduce((sum, opportunity) => sum + opportunity.totalSaving, 0);
  const displayedCount = selected.length
    ? selected.length
    : summary?.opportunityCount ?? bulkOpportunities.length;
  els.brandDrawerSummaryLabel.textContent = selected.length ? "Selected saving" : "Total potential saving";
  els.brandDrawerTotal.textContent = formatCurrency(displayedSaving);
  els.brandDrawerItemCount.textContent = String(displayedCount);
  els.brandDrawerBasisSuffix.textContent = selected.length
    ? ` selected item${displayedCount === 1 ? "" : "s"}`
    : ` item${displayedCount === 1 ? "" : "s"}`;
  els.brandDrawerScopeNote.hidden = selected.length > 0;
  els.keepAllOriginal.textContent = selected.length ? "Clear Selection" : "Keep All Original";
  els.brandBulkActionLabel.textContent = selected.length ? "Switch Selected" : "Switch All";
  els.brandSwitchAllCount.textContent = String(bulkOpportunities.length);
  els.brandBulkSaving.textContent = `Save ${formatCurrency(displayedSaving)}`;
  els.switchAllBrands.disabled = state.brand.loadingDetails || bulkOpportunities.length === 0;
  els.brandOpportunityList.querySelectorAll("[data-brand-select]").forEach((checkbox) => {
    checkbox.checked = state.brand.selectedOpportunityLineIds.includes(checkbox.dataset.brandSelect);
    checkbox.closest(".brand-opportunity-card")?.classList.toggle("selected", checkbox.checked);
  });
}

function renderBrandDrawer() {
  const summary = state.brand.summary || { opportunityCount: 0, totalPotentialSaving: 0 };
  const opportunities = state.brand.opportunities;
  els.brandDrawerTitle.textContent = `Cheaper Alternatives (${summary.opportunityCount || opportunities.length})`;

  if (state.brand.lastBulkFailures.length) {
    els.brandDrawerMessage.hidden = false;
    els.brandDrawerMessage.innerHTML = `<strong>${state.brand.lastBulkFailures.length} item${state.brand.lastBulkFailures.length === 1 ? "" : "s"} could not be switched:</strong> ${state.brand.lastBulkFailures.map(escapeHtml).join(", ")}`;
  } else {
    els.brandDrawerMessage.hidden = true;
    els.brandDrawerMessage.textContent = "";
  }

  if (state.brand.loadingDetails) {
    els.brandOpportunityList.innerHTML = `
      <div class="brand-drawer-loading" role="status">
        <span class="brand-loading-dot" aria-hidden="true"></span>
        Loading approved alternatives and current prices&hellip;
      </div>`;
    updateBrandSelectionControls();
    return;
  }

  els.brandOpportunityList.innerHTML = opportunities.length
    ? opportunities.map(brandOpportunityCardTemplate).join("")
    : '<div class="brand-drawer-empty"><strong>No cheaper equivalents available</strong><p>Your basket already uses the best valid mapped products.</p></div>';
  updateBrandSelectionControls();
}

// Completed switches leave the drawer straight away; the server summary then refreshes in the background.
function reconcileBrandOpportunitiesAfterSwitch(switchedLineIds) {
  const switched = new Set(switchedLineIds);
  state.brand.opportunities = state.brand.opportunities.filter((opportunity) => !switched.has(opportunity.lineId));
  state.brand.selectedOpportunityLineIds = state.brand.selectedOpportunityLineIds.filter((lineId) => !switched.has(lineId));
  state.brand.summary = {
    ...(state.brand.summary || {}),
    hasBrandOpportunity: state.brand.opportunities.length > 0,
    opportunityCount: state.brand.opportunities.length,
    totalPotentialSaving: window.CascadeBrandEqualisation.money(state.brand.opportunities
      .reduce((sum, opportunity) => sum + opportunity.totalSaving, 0)),
    opportunityLineIds: state.brand.opportunities.map((opportunity) => opportunity.lineId),
    opportunityKey: window.CascadeBrandEqualisation.opportunityKey(state.brand.opportunities)
  };
}

async function refreshBrandSummary({ reloadDrawer = state.brand.drawerOpen } = {}) {
  window.clearTimeout(brandSummaryTimer);
  lastBrandBasketSignature = brandBasketSignature();
  const runId = ++brandSummaryRunId;
  let summary;
  try {
    summary = await brandEqualisation.getSummary(state.basket);
  } catch (error) {
    return;
  }
  if (runId !== brandSummaryRunId) return;
  // A basket change gives a new key, so a dismissed banner can return.
  if (state.brand.dismissedKey && state.brand.dismissedKey !== summary.opportunityKey) {
    state.brand.dismissedKey = null;
  }
  state.brand.summary = summary;
  renderBrandBanner();
  renderBasket();
  if (reloadDrawer && state.brand.drawerOpen) await loadBrandDetails(state.brand.focusLineId, { showLoading: false });
}

// Full opportunity details are requested only when the drawer is open.
async function loadBrandDetails(focusLineId = null, { showLoading = true } = {}) {
  const runId = ++brandDetailsRunId;
  state.brand.loadingDetails = true;
  state.brand.focusLineId = focusLineId || state.brand.focusLineId;
  if (showLoading) renderBrandDrawer();
  let opportunities;
  try {
    opportunities = await brandEqualisation.getOpportunities(state.basket);
  } catch (error) {
    opportunities = [];
    toast(error.message || "Cheaper alternatives could not be loaded", "error");
  }
  if (runId !== brandDetailsRunId || !state.brand.drawerOpen) return;
  state.brand.opportunities = opportunities;
  state.brand.loadingDetails = false;
  renderBrandDrawer();

  if (state.brand.focusLineId) {
    window.requestAnimationFrame(() => {
      const card = Array.from(els.brandOpportunityList.querySelectorAll("[data-brand-line-id]"))
        .find((item) => item.dataset.brandLineId === state.brand.focusLineId);
      if (!card) return;
      card.classList.add("focused");
      // Scroll only the drawer list, never the Order Pad behind it.
      els.brandOpportunityList.scrollTop = Math.max(0, card.offsetTop - (els.brandOpportunityList.clientHeight - card.offsetHeight) / 2);
      card.querySelector("[data-brand-switch]")?.focus({ preventScroll: true });
    });
  }
}

async function openBrandDrawer(focusLineId = null) {
  if (state.editingId) closeDrawer();
  brandReturnFocus = document.activeElement;
  state.brand.drawerOpen = true;
  state.brand.focusLineId = focusLineId;
  state.brand.lastBulkFailures = [];
  state.brand.selectedOpportunityLineIds = [];
  els.brandDrawerBackdrop.hidden = false;
  els.brandDrawer.classList.add("open");
  els.brandDrawer.setAttribute("aria-hidden", "false");
  renderBrandDrawer();
  await loadBrandDetails(focusLineId);
}

function closeBrandDrawer({ restoreFocus = true } = {}) {
  brandDetailsRunId += 1;
  state.brand.drawerOpen = false;
  state.brand.loadingDetails = false;
  state.brand.focusLineId = null;
  els.brandDrawerBackdrop.hidden = true;
  els.brandDrawer.classList.remove("open");
  els.brandDrawer.setAttribute("aria-hidden", "true");
  if (restoreFocus && brandReturnFocus instanceof HTMLElement && document.contains(brandReturnFocus)) {
    brandReturnFocus.focus({ preventScroll: true });
  }
  brandReturnFocus = null;
}

function dismissBrandBanner() {
  if (!state.brand.summary) return;
  state.brand.dismissedKey = state.brand.summary.opportunityKey;
  renderBrandBanner();
}

function closeBrandSwitchModal() {
  pendingBrandAction = null;
  if (els.brandSwitchModal.open) els.brandSwitchModal.close();
}

function showBrandConfirmation({ title, content, confirmLabel, onConfirm }) {
  pendingBrandAction = onConfirm;
  els.brandSwitchModalTitle.textContent = title;
  els.brandSwitchModalContent.innerHTML = content;
  els.confirmBrandSwitch.textContent = confirmLabel;
  els.confirmBrandSwitch.disabled = false;
  els.brandSwitchModal.showModal();
}

function requestBrandSwitch(opportunity) {
  showBrandConfirmation({
    title: "Switch this product?",
    confirmLabel: "Switch Product",
    content: `
      <dl class="brand-confirm-details">
        <div><dt>Current</dt><dd>${escapeHtml(opportunity.currentName)}</dd></div>
        <div><dt>Switch to</dt><dd>${escapeHtml(opportunity.replacementName)}</dd></div>
        <div><dt>Quantity</dt><dd>${escapeHtml(opportunity.quantity)}</dd></div>
        <div><dt>Estimated saving</dt><dd><strong>${formatCurrency(opportunity.totalSaving)}</strong></dd></div>
      </dl>`,
    onConfirm: () => executeSingleBrandSwitch(opportunity)
  });
}

// With checkboxes selected only those lines switch; otherwise all active opportunities.
function requestSwitchAllBrands() {
  const opportunities = bulkBrandOpportunities();
  if (!opportunities.length) return;
  const selectedCount = selectedBrandOpportunities().length;
  const saving = opportunities.reduce((sum, item) => sum + item.totalSaving, 0);
  const plural = opportunities.length === 1 ? "" : "s";
  showBrandConfirmation({
    title: selectedCount
      ? `Switch ${opportunities.length} selected product${plural}?`
      : `Switch ${opportunities.length} product${plural}?`,
    confirmLabel: `Switch ${opportunities.length} Product${plural}`,
    content: `
      <p class="brand-bulk-confirm-copy">We&rsquo;ll check each product again before switching. If one can&rsquo;t be switched, the others will still continue.</p>
      <div class="brand-bulk-saving"><span>Estimated saving</span><strong>${formatCurrency(saving)}</strong></div>`,
    onConfirm: () => executeBulkBrandSwitch(opportunities)
  });
}

// Replaces the basket product on the same lineId and quantity, with the validated recommended offer,
// and keeps the original request separately in line.equalisation.
async function applyBrandSwitch(opportunity, switchSource) {
  const index = state.basket.findIndex((item) => item.lineId === opportunity.lineId
    && String(item.productId) === opportunity.currentProductId);
  if (index === -1) throw new Error(`${opportunity.currentName} is no longer in the basket`);

  const current = state.basket[index];
  const replacement = catalogue.find((product) => String(product.id) === opportunity.replacementProductId);
  if (!replacement) throw new Error(`${opportunity.replacementName} is no longer available`);
  const offer = supplierOffers(replacement).find((item) => item.key === opportunity.recommendedOffer?.key)
    || getRecommendedSupplier(replacement);
  if (!offer || !isSelectableOffer(replacement, offer)) {
    throw new Error(`${opportunity.replacementName} has no valid supplier offer`);
  }

  const replacementLine = createBasketItem(replacement, current.quantity, offer.supplierId);
  replacementLine.lineId = current.lineId;
  applySelectedOffer(replacementLine, offer);
  const record = await brandEqualisation.recordSwitch(opportunity, {
    ...state.orderContext,
    orderId: state.orderContext.orderReference,
    switchSource
  });
  replacementLine.equalisation = {
    auditId: record.id,
    orderId: record.orderId || state.orderContext.orderReference,
    customerId: record.customerId || state.orderContext.customerId,
    originalProductId: opportunity.currentProductId,
    originalName: opportunity.currentName,
    originalPip: opportunity.currentPip,
    originalType: opportunity.currentType,
    originalPackSize: opportunity.currentPackSize || "",
    originalSupplierId: opportunity.currentSupplierId,
    originalSupplier: opportunity.currentSupplier,
    originalSupplierPip: current.selectedSupplierPip || opportunity.currentPip,
    originalOfferKey: current.selectedOfferKey || "",
    originalPrice: opportunity.currentPrice,
    originalComparisonPrice: opportunity.currentPrice,
    replacementProductId: opportunity.replacementProductId,
    replacementName: opportunity.replacementName,
    replacementPip: opportunity.replacementPip,
    replacementType: opportunity.replacementType,
    replacementSupplierId: offer.supplierId,
    replacementSupplier: opportunity.recommendedSupplier,
    replacementPrice: opportunity.recommendedPrice,
    optimisationType: "Brand ↔ Generic",
    quantity: opportunity.quantity,
    estimatedSaving: opportunity.totalSaving,
    switchedBy: record.user || state.orderContext.user,
    switchedAt: record.dateTime || new Date().toISOString(),
    switchSource
  };
  state.basket[index] = replacementLine;
  return opportunity.totalSaving;
}

// Undo before submission: a new audit event, then the original product, supplier offer and quantity on the same lineId.
async function undoEqualisation(lineId) {
  const index = state.basket.findIndex((item) => item.lineId === lineId);
  const current = state.basket[index];
  const equalisation = current?.equalisation;
  if (!current || !equalisation) return;
  const originalProduct = catalogue.find((product) => String(product.id) === String(equalisation.originalProductId));
  if (!originalProduct) throw new Error(`${equalisation.originalName} is no longer available`);

  await brandEqualisation.recordUndo(equalisation, {
    ...state.orderContext,
    orderId: state.orderContext.orderReference
  });

  const restoredLine = createBasketItem(originalProduct, equalisation.quantity, equalisation.originalSupplierId);
  restoredLine.lineId = current.lineId;
  const originalOffer = supplierOffers(originalProduct).find((offer) =>
    offer.key === equalisation.originalOfferKey
      || (offer.supplierId === equalisation.originalSupplierId && offer.price === equalisation.originalPrice));
  if (originalOffer && isSelectableOffer(originalProduct, originalOffer)) applySelectedOffer(restoredLine, originalOffer);
  state.basket[index] = restoredLine;
  state.brand.equalisedPopoverLineId = null;
  render();
  await refreshBrandSummary({ reloadDrawer: state.brand.drawerOpen });
  toast(`Product change undone - ${equalisation.originalName} restored`);
}

async function executeSingleBrandSwitch(requestedOpportunity) {
  const latest = (await brandEqualisation.getOpportunities(state.basket))
    .find((item) => item.lineId === requestedOpportunity.lineId
      && item.replacementProductId === requestedOpportunity.replacementProductId);
  if (!latest) throw new Error("This cheaper alternative is no longer available");

  const saving = await applyBrandSwitch(latest, "Individual");
  state.brand.lastBulkFailures = [];
  reconcileBrandOpportunitiesAfterSwitch([latest.lineId]);
  renderBrandBanner();
  if (state.brand.drawerOpen) renderBrandDrawer();
  render();
  await refreshBrandSummary({ reloadDrawer: true });
  if (!state.brand.summary?.hasBrandOpportunity) closeBrandDrawer({ restoreFocus: false });
  toast(`Alternative selected successfully - ${formatCurrency(saving)} estimated saving`);
}

// Revalidates once, then switches each item on its own: one failure never stops the others.
async function executeBulkBrandSwitch(requestedOpportunities) {
  const latest = await brandEqualisation.getOpportunities(state.basket);
  let switched = 0;
  let saving = 0;
  const failures = [];
  const switchedLineIds = [];

  for (const requested of requestedOpportunities) {
    const opportunity = latest.find((item) => item.lineId === requested.lineId
      && item.replacementProductId === requested.replacementProductId);
    if (!opportunity) {
      failures.push(`${requested.currentName} (opportunity changed)`);
      continue;
    }
    try {
      saving += await applyBrandSwitch(opportunity, "Bulk Equalisation");
      switched += 1;
      switchedLineIds.push(opportunity.lineId);
    } catch (error) {
      failures.push(`${requested.currentName} (${error.message})`);
    }
  }

  state.brand.lastBulkFailures = failures;
  reconcileBrandOpportunitiesAfterSwitch(switchedLineIds);
  renderBrandBanner();
  if (state.brand.drawerOpen) renderBrandDrawer();
  render();
  await refreshBrandSummary({ reloadDrawer: true });
  if (!state.brand.summary?.hasBrandOpportunity && !failures.length) closeBrandDrawer({ restoreFocus: false });
  if (switched) {
    toast(`${switched} product${switched === 1 ? "" : "s"} changed - ${formatCurrency(saving)} estimated saving${failures.length ? `; ${failures.length} failed` : ""}`);
  } else {
    toast("No products could be changed. Review the failed items in Cheaper Alternatives.", "error");
  }
}

function createDrawerDraft(product) {
  return {
    lineId: product.lineId,
    quantity: product.quantity,
    selectedSupplier: product.selectedSupplier,
    selectedSupplierPip: product.selectedSupplierPip,
    selectedPrice: product.selectedPrice,
    selectedOfferKey: product.selectedOfferKey
  };
}

function drawerProductWithDraft(product) {
  if (!state.drawerDraft || state.drawerDraft.lineId !== product.lineId) {
    state.drawerDraft = createDrawerDraft(product);
  }
  return { ...product, ...state.drawerDraft };
}

function renderDrawerContent({ preserveScroll = true } = {}) {
  const product = state.basket.find((item) => item.lineId === state.editingId);
  if (!product) return;
  const scrollTop = els.drawer.scrollTop;
  els.drawerContent.innerHTML = drawerProductTemplate(drawerProductWithDraft(product));
  if (preserveScroll) els.drawer.scrollTop = scrollTop;
}

function openDrawer(lineId) {
  if (state.brand.drawerOpen) closeBrandDrawer({ restoreFocus: false });
  state.editingId = lineId;
  state.drawerDraft = null;
  renderDrawer({ preserveScroll: false });
  els.drawerBackdrop.hidden = false;
  els.drawer.classList.add("open");
  els.drawer.setAttribute("aria-hidden", "false");
  positionDrawer();
}

// Edit Product keeps a steady bottom edge (Previous / Next, Go to product and Save stay in place): it is
// placed where the popup would be centred with 7 supplier rows, so fewer suppliers only move the top edge
// down (and more move it up).
const DRAWER_ANCHOR_SUPPLIER_ROWS = 7;
let drawerBottomCache = null;

function positionDrawer() {
  const viewportKey = `${window.innerWidth}x${window.innerHeight}`;
  if (!drawerBottomCache || drawerBottomCache.viewportKey !== viewportKey) {
    const rows = els.drawer.querySelectorAll(".supplier-comparison-table tbody tr");
    const rowHeight = rows[0]?.offsetHeight || 40;
    const drawerHeight = els.drawer.scrollHeight > els.drawer.clientHeight ? els.drawer.scrollHeight : els.drawer.offsetHeight;
    const anchorHeight = drawerHeight + (DRAWER_ANCHOR_SUPPLIER_ROWS - rows.length) * rowHeight;
    drawerBottomCache = { viewportKey, bottom: Math.max(16, Math.round((window.innerHeight - anchorHeight) / 2)) };
  }
  els.drawer.style.setProperty("--drawer-bottom", `${drawerBottomCache.bottom}px`);
}

window.addEventListener("resize", () => {
  if (els.drawer.classList.contains("open")) positionDrawer();
});

function closeDrawer() {
  state.editingId = null;
  state.drawerDraft = null;
  els.drawerBackdrop.hidden = true;
  els.drawerNavigation.hidden = true;
  els.drawerNavigation.innerHTML = "";
  els.drawer.classList.remove("open");
  els.drawer.setAttribute("aria-hidden", "true");
}

function scrollDrawerProductIntoView(lineId) {
  const target = Array.from(els.drawerContent.querySelectorAll("[data-drawer-product]"))
    .find((section) => section.dataset.drawerProduct === lineId);
  if (target) target.scrollIntoView({ block: "start" });
}

function setActiveDrawerProduct(lineId) {
  els.drawerContent.querySelectorAll("[data-drawer-product]").forEach((section) => {
    section.classList.toggle("active", section.dataset.drawerProduct === lineId);
  });
}

function showDrawerProductAtIndex(index) {
  const safeIndex = Math.min(Math.max(index, 0), state.basket.length - 1);
  const product = state.basket[safeIndex];
  if (!product) return;
  state.editingId = product.lineId;
  state.drawerDraft = null;
  renderDrawer({ preserveScroll: false });
}

function moveDrawerProduct(direction) {
  const currentIndex = state.basket.findIndex((item) => item.lineId === state.editingId);
  if (currentIndex === -1) return;
  showDrawerProductAtIndex(currentIndex + direction);
}

function drawerProductSearchMatches(query, showAll = false) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery && !showAll) return [];

  const rows = normalizedQuery
    ? state.basket.filter((product) => product.name.toLowerCase().includes(normalizedQuery))
    : state.basket;

  return rows.slice(0, 8);
}

function renderDrawerProductSearchResults(query = "", showAll = false) {
  const results = els.drawerNavigation.querySelector("[data-drawer-product-results]");
  if (!results) return;

  const matches = drawerProductSearchMatches(query, showAll);
  if (!matches.length) {
    results.innerHTML = query.trim()
      ? '<div class="drawer-product-search-empty">No basket products found</div>'
      : "";
    return;
  }

  results.innerHTML = matches.map((product) => `
    <button class="drawer-product-result" type="button" data-drawer-product-result="${product.lineId}" role="option">
      <strong>${escapeHtml(product.name)}</strong>
      <span>PIP ${product.pip}</span>
    </button>
  `).join("");
}

function closeDrawerProductSearchResults() {
  const results = els.drawerNavigation.querySelector("[data-drawer-product-results]");
  if (results) results.innerHTML = "";
}

function goToDrawerProduct(lineId) {
  const productIndex = state.basket.findIndex((item) => item.lineId === lineId);
  if (productIndex === -1) return;
  showDrawerProductAtIndex(productIndex);
}

function renderDrawer({ preserveScroll = true } = {}) {
  const scrollTop = els.drawer.scrollTop;
  if (!state.basket.length) {
    closeDrawer();
    return;
  }

  if (!state.basket.some((item) => item.lineId === state.editingId)) {
    state.editingId = state.basket[0].lineId;
  }

  const product = state.basket.find((item) => item.lineId === state.editingId);
  const activeIndex = state.basket.findIndex((item) => item.lineId === state.editingId);
  els.drawerNavigation.hidden = !product;
  els.drawerNavigation.innerHTML = product ? drawerNavigationTemplate(activeIndex) : "";
  els.drawerContent.innerHTML = product ? drawerProductTemplate(drawerProductWithDraft(product)) : "";
  if (preserveScroll) els.drawer.scrollTop = scrollTop;
}

function drawerNavigationTemplate(activeIndex) {
  const canMovePrevious = activeIndex > 0;
  const canMoveNext = activeIndex >= 0 && activeIndex < state.basket.length - 1;

  return `
    <button class="modal-nav-button" type="button" data-drawer-nav="previous" aria-label="Previous item" ${canMovePrevious ? "" : "disabled"}>&lt;</button>
    <strong>${activeIndex + 1} of ${state.basket.length}</strong>
    <button class="modal-nav-button" type="button" data-drawer-nav="next" aria-label="Next item" ${canMoveNext ? "" : "disabled"}>&gt;</button>
    <div class="go-to-product">
      <span>GO TO PRODUCT</span>
      <div class="drawer-product-search">
        <input data-drawer-product-search type="search" autocomplete="off" placeholder="Search product name..." aria-label="Go to product" aria-controls="drawerProductSearchResults" />
        <div class="drawer-product-results" id="drawerProductSearchResults" data-drawer-product-results role="listbox"></div>
      </div>
      <button class="drawer-save-button" type="button" data-drawer-save aria-label="Save product changes" title="Save (Enter)">Save</button>
    </div>
  `;
}

function drawerProductTemplate(product) {
  const recommended = getRecommendedSupplier(product);
  const activeClass = product.lineId === state.editingId ? "active" : "";
  const max = maxAllowedPrice(product);
  // The indicator appears only while an override percentage is set; the price and Locked legend is always shown.
  const overrideIndicator = max === null || !dtOverridePercent
    ? ""
    : `<span class="override-indicator" title="Suppliers up to ${formatCurrency(max)} are allowed"><b>Price override +${dtOverridePercent}%</b><span class="divider" aria-hidden="true"></span>Max allowed ${formatCurrency(max)}</span>`;
  const legend = `
    <div class="table-legend">
      <span><b class="legend-price within-tariff-price">Price</b> - Within DT</span>
      <span><span class="override-pill">${OVERRIDE_TAG_LABEL}</span><b class="legend-price override-price">Price</b> - Above DT, allowed by Override</span>
      <span><b class="legend-price over-tariff-price">Price</b> - Blocked as price above DT</span>
      <span><span class="supplier-lock-pill">${SUPPLIER_LOCK_SVG}Locked</span> - Supplier locked in Settings</span>
    </div>
  `;

  return `
    <article class="drawer-product ${activeClass}" data-drawer-product="${product.lineId}">
      <section class="drawer-section product-detail-strip">
        <div class="meta-pair product-name-detail"><span>Product Name</span><strong>${escapeHtml(product.name)}</strong></div>
        <div class="meta-pair"><span>Drug Tariff</span><strong>${dtValueTemplate(product, formatCurrency)}</strong></div>
        <div class="meta-pair"><span>Net Drug Tariff</span><strong>${formatCurrency(netDtValue(product))}</strong></div>
        <div class="meta-pair pip-code-detail"><span>PIP Code</span><strong>${product.pip}</strong></div>
        <label class="quantity-detail">
          <span>Quantity</span>
          <div class="drawer-quantity-stepper">
            <button type="button" data-drawer-quantity-step="${product.lineId}" data-step="-1" aria-label="Decrease quantity">-</button>
            <input data-drawer-quantity="${product.lineId}" type="number" min="1" value="${product.quantity}" aria-label="Quantity for ${escapeHtml(product.name)}" />
            <button type="button" data-drawer-quantity-step="${product.lineId}" data-step="1" aria-label="Increase quantity">+</button>
          </div>
        </label>
      </section>

      <div class="drawer-modal-grid">
        <section class="drawer-section supplier-comparison-panel">
          <div class="supplier-comparison-heading">
            <h3>Supplier Comparison</h3>
            ${overrideIndicator}
          </div>
          <div class="supplier-table-wrap">
            <table class="supplier-comparison-table">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>PIP Code</th>
                  <th>Price</th>
                  <th>Savings</th>
                </tr>
              </thead>
              <tbody>
                ${supplierTableRows(product, recommended)}
              </tbody>
            </table>
          </div>
          ${legend}
        </section>
      </div>
    </article>
  `;
}

function supplierTableRows(product, recommended) {
  const rows = availableSupplierRows(product)
    .filter((row) => row.offers.length)
    .map((row) => ({ ...row, offer: row.offers.slice().sort((a, b) => a.price - b.price)[0] }))
    .sort((a, b) => a.offer.price - b.offer.price);

  if (!rows.length) {
    return `<tr><td colspan="4" class="supplier-empty">No supplier prices available</td></tr>`;
  }

  return rows.map((row) => supplierTableRowTemplate(product, row, recommended)).join("");
}

// Padlock for the LOCKED tag (Edit Product), the basket chip and the legend.
const SUPPLIER_LOCK_SVG = `<svg class="lock-pill-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>`;

function supplierLockMessage(supplierId) {
  return supplierLock?.lockMessage(supplierId) || "Supplier locked in Settings. It cannot be selected or cascaded to.";
}

function supplierTableRowTemplate(product, row, recommended) {
  const isSelected = product.selectedOfferKey === row.offer.key;
  const isSelectable = isSelectableOffer(product, row.offer);
  const isBestPrice = recommended?.key === row.offer.key;
  // A locked supplier is shown (so the pharmacy sees its price) but greyed out with a LOCKED tag and no saving.
  const isLocked = isSupplierLocked(row.id);
  const isBlocked = isAboveMaxAllowed(product, row.offer.price);
  const isOverride = !isLocked && isOverrideOffer(product, row.offer);
  const priceClass = isLocked ? "locked-price" : isBlocked ? "over-tariff-price" : isOverride ? "override-price" : "";
  // Only the OVERRIDE and LOCKED tags have a hover message; rows (including disabled ones) have none.
  const overrideTip = OVERRIDE_TAG_TOOLTIP;
  const lockTip = isLocked ? supplierLockMessage(row.id) : "";
  const highestPrice = highestAvailableSupplierPrice(product);
  const saving = typeof highestPrice === "number"
    ? Math.max(0, (highestPrice - row.offer.price) * product.quantity)
    : 0;
  return `
    <tr class="${isSelected ? "selected" : ""} ${isSelectable ? "" : "unavailable"} ${isLocked ? "supplier-locked" : ""}" ${isSelectable ? `data-select-supplier-offer="${row.offer.key}" data-line-id="${product.lineId}" tabindex="0"` : ""}>
      <td>
        <label class="supplier-radio-label">
          <input type="radio" name="supplierChoice-${product.lineId}" value="${row.offer.key}" data-supplier-choice="${product.lineId}" ${isSelected ? "checked" : ""} ${isSelectable ? "" : "disabled"} />
          <strong>${row.label}</strong>
          ${isBestPrice ? `<span class="best-price-pill">Best Price</span>` : ""}${isOverride ? `<span class="override-pill" tabindex="0" title="${escapeHtml(overrideTip)}" aria-label="${escapeHtml(overrideTip)}">${OVERRIDE_TAG_LABEL}</span>` : ""}${isLocked ? `<span class="supplier-lock-pill" tabindex="0" title="${escapeHtml(lockTip)}" aria-label="${escapeHtml(lockTip)}">${SUPPLIER_LOCK_SVG}Locked</span>` : ""}
        </label>
      </td>
      <td>${row.offer.supplierPip}</td>
      <td><strong class="${priceClass}">${formatCurrency(row.offer.price)}</strong></td>
      <td>${isLocked ? `<span class="locked-price">&ndash;</span>` : `<strong class="supplier-saving">${formatCurrency(saving)}</strong>`}</td>
    </tr>
  `;
}

function supplierCardTemplate(product, row) {
  return `
    <article class="supplier-card ${row.available ? "" : "unavailable"}">
      <div class="supplier-group-heading">
        <strong>${row.label}</strong>
      </div>
      <div class="supplier-offer-list">
        ${row.offers.map((offer) => supplierOfferTemplate(product, row, offer)).join("")}
      </div>
    </article>
  `;
}

function supplierOfferTemplate(product, row, offer) {
  const isSelected = product.selectedOfferKey === offer.key;
  const isSelectable = isSelectableOffer(product, offer);
  return `
    <label class="supplier-offer ${isSelected ? "selected" : ""} ${isSelectable ? "" : "unavailable"}">
      <input type="radio" name="supplierChoice-${product.lineId}" value="${offer.key}" data-supplier-choice="${product.lineId}" ${isSelected ? "checked" : ""} ${isSelectable ? "" : "disabled"} />
      <div class="supplier-offer-detail">
        <span>Supplier PIP</span>
        <strong>${offer.supplierPip}</strong>
      </div>
      <div class="supplier-offer-detail">
        <span>Price</span>
        <strong>${formatCurrency(offer.price)}</strong>
      </div>
      <span class="supplier-select-text">${isSelected ? "Selected" : "Select"}</span>
    </label>
  `;
}

function addProduct(event) {
  event.preventDefault();
  const product = catalogue.find((item) => item.id === state.search.selectedProductId);
  const quantity = Math.max(1, Number(els.quantityInput.value || 1));

  if (!product) {
    toast("Choose a product before adding to the basket", "error");
    return;
  }

  addProductToBasket(product, quantity, { openDetails: false });
  els.nameSearch.value = "";
  els.quantityInput.value = "1";
  state.search.name = "";
  state.search.pip = "";
  state.search.selectedProductId = null;
  state.search.quantity = 1;
  render();
}

function addProductToBasket(product, quantity, options = {}) {
  const safeQuantity = Math.max(1, Math.floor(Number(quantity) || 1));
  const result = quickOrderData.mergeBasketProduct(
    state.basket,
    product,
    safeQuantity,
    (newProduct, newQuantity) => createBasketItem(newProduct, newQuantity)
  );
  if (result.status === "updated") {
    toast(`Quantity updated for ${product.name}`);
    if (options.openDetails) {
      state.editingId = result.item.lineId;
      openDrawer(result.item.lineId);
    }
    return result.item;
  } else {
    toast(`${product.name} added to basket`);
    if (options.openDetails) openDrawer(result.item.lineId);
    return result.item;
  }
}

function selectSupplier(lineId, selectedOfferKey) {
  const product = state.basket.find((item) => item.lineId === lineId);
  const offer = product && supplierOffers(product).find((supplierOffer) => supplierOffer.key === selectedOfferKey);
  const row = product && offer && availableSupplierRows(product).find((supplier) => supplier.id === offer.supplierId);
  if (!product || !row || !row.available || !isSelectableOffer(product, offer)) {
    toast("This supplier offer is not available for selection", "error");
    return;
  }
  drawerProductWithDraft(product);
  applySelectedOffer(state.drawerDraft, offer);
  renderDrawerContent();
}

function updateQuantity(lineId, quantity) {
  const product = state.basket.find((item) => item.lineId === lineId);
  if (!product) return;
  drawerProductWithDraft(product);
  state.drawerDraft.quantity = Math.max(1, Number(quantity || 1));
}

function saveDrawerProduct() {
  const product = state.basket.find((item) => item.lineId === state.editingId);
  if (!product || !state.drawerDraft || state.drawerDraft.lineId !== product.lineId) return;

  product.quantity = Math.max(1, Number(state.drawerDraft.quantity || 1));
  const offer = supplierOffers(product)
    .find((supplierOffer) => supplierOffer.key === state.drawerDraft.selectedOfferKey);
  if (offer && isSelectableOffer(product, offer)) {
    applySelectedOffer(product, offer);
  }

  state.drawerDraft = createDrawerDraft(product);
  render({ skipDrawer: true });
  renderDrawer();
  toast(`Changes saved for ${product.name}`);
}

function removeSelectedProducts() {
  const selected = selectedLines();
  if (!selected.length) {
    toast("Select one or more products to remove", "error");
    return;
  }

  const selectedSet = new Set(selected);
  const removedCount = selected.length;
  state.basket = state.basket.filter((item) => !selectedSet.has(item.lineId));
  state.selectedLineIds = [];
  if (state.editingId && selectedSet.has(state.editingId)) closeDrawer();
  render();
  toast(`${removedCount} product${removedCount === 1 ? "" : "s"} removed from basket`);
}

function requestRemoveSelectedProducts() {
  const selected = selectedLines();
  if (!selected.length) {
    toast("Select one or more products to remove", "error");
    return;
  }
  openConfirmation({
    message: `You want to delete ${selected.length} selected product${selected.length === 1 ? "" : "s"}?`,
    onConfirm: removeSelectedProducts
  });
}

function stepSearchQuantity(amount) {
  const nextQuantity = Math.max(1, Number(els.quantityInput.value || 1) + amount);
  els.quantityInput.value = nextQuantity;
  state.search.quantity = nextQuantity;
}

function announceUploadedFile(file) {
  if (!file) return;
  toast(`${file.name} ready to upload`);
}

function toggleLineSelection(lineId, selected) {
  if (selected) {
    if (!state.selectedLineIds.includes(lineId)) state.selectedLineIds.push(lineId);
  } else {
    state.selectedLineIds = state.selectedLineIds.filter((selectedId) => selectedId !== lineId);
  }
  renderBasket();
}

function toggleVisibleSelection(selected) {
  const visibleIds = visibleBasket().map((product) => product.lineId);
  const visibleSet = new Set(visibleIds);
  state.selectedLineIds = selected
    ? Array.from(new Set([...state.selectedLineIds, ...visibleIds]))
    : state.selectedLineIds.filter((lineId) => !visibleSet.has(lineId));
  renderBasket();
}

function refreshPrices() {
  refreshSupplierLocks();
  resetAllSorts();
}

const THRESHOLD_ATTENTION_TOOLTIP = "Daily quantity limit — quantity (ordered + in basket) is above the daily set limit. Warning only, edit in Settings.";

function orderAttentionCategoryTemplate(category) {
  // The daily threshold badge shows the warning sign, at the same size as CD / FRIDGE / HIGH VALUE.
  // The OVERRIDE badge keeps its Order Basket colours, at the same size as the other badges.
  const overrideTip = OVERRIDE_TAG_TOOLTIP;
  const badge = category.key === "threshold"
    ? `<span class="product-tag modal-product-tag modal-threshold-tag" tabindex="0" title="${escapeHtml(THRESHOLD_ATTENTION_TOOLTIP)}" aria-label="${escapeHtml(`Warning: ${THRESHOLD_ATTENTION_TOOLTIP}`)}">${THRESHOLD_SIGN_SVG}</span>`
    : category.key === "override"
      ? `<span class="product-tag product-tag--override modal-product-tag" tabindex="0" title="${escapeHtml(overrideTip)}" aria-label="${escapeHtml(overrideTip)}">${OVERRIDE_TAG_LABEL}</span>`
      : productTagTemplate(category.key, "modal-product-tag");
  return `
    <div class="order-attention-category">
      ${badge}
      <span>${escapeHtml(category.label)}</span>
    </div>
  `;
}

function restoreConfirmationFocus(target) {
  window.requestAnimationFrame(() => {
    if (target instanceof HTMLElement && document.contains(target)) target.focus();
  });
}

function closeConfirmation({ reviewBasket = false } = {}) {
  const returnTarget = reviewBasket ? els.basketPanel : confirmationReturnFocus;
  pendingConfirmationAction = null;
  confirmationReturnFocus = null;
  orderSubmissionPending = false;
  els.confirmOrder.disabled = false;
  if (els.orderModal.open) els.orderModal.close();
  restoreConfirmationFocus(returnTarget);
}

function openConfirmation({
  message,
  onConfirm,
  title = "Are you sure?",
  categories = [],
  cancelLabel = "No",
  confirmLabel = "Yes",
  reviewBasket = false,
  returnFocus = document.activeElement
}) {
  const hasAttention = categories.length > 0;
  pendingConfirmationAction = onConfirm;
  confirmationReturnFocus = returnFocus;
  orderSubmissionPending = false;
  els.confirmOrder.disabled = false;
  els.orderModal.classList.toggle("flagged-order-modal", hasAttention);
  els.orderModalTitle.textContent = title;
  els.orderModalSummary.textContent = message;
  els.orderModalAttention.hidden = !hasAttention;
  els.orderModalDescription.hidden = !hasAttention;
  els.orderModalCategories.innerHTML = categories.map(orderAttentionCategoryTemplate).join("");
  els.orderModalCancel.textContent = cancelLabel;
  els.orderModalCancel.dataset.reviewBasket = String(reviewBasket);
  els.confirmOrder.textContent = confirmLabel;
  els.orderModal.setAttribute(
    "aria-describedby",
    hasAttention ? "orderModalSummary orderModalAttention orderModalDescription" : "orderModalSummary"
  );
  els.orderModal.showModal();
  window.requestAnimationFrame(() => els.orderModalCancel.focus());
}

function openOrderModal() {
  if (!state.basket.length || orderSubmissionPending) return;
  const total = state.basket.reduce((sum, product) => sum + lineValue(product), 0);
  const counts = cartFlagData.countBasketFlags(state.basket, lineValue);
  const categories = [
    ...cartFlagData.attentionCategories(counts),
    ...overrideAttentionCategories(),
    ...dailyThresholdAttentionCategories()
  ];
  const hasAttention = categories.length > 0;
  const productCount = state.basket.length;
  openConfirmation({
    title: hasAttention ? "Review before placing order" : "Are you sure?",
    message: `You are about to place an order for ${productCount} product${productCount === 1 ? "" : "s"} with a total order value of ${formatCurrency(total)}.`,
    categories,
    cancelLabel: hasAttention ? "Review Basket" : "No",
    confirmLabel: hasAttention ? "Place Order" : "Yes",
    reviewBasket: hasAttention,
    returnFocus: els.placeOrderButton,
    onConfirm: completeOrder
  });
}

// Suppliers with a price for this line that the cascade skipped because they are locked in Settings.
function lockedSupplierOutcomes(product) {
  return supplierOffers(product)
    .filter((offer) => offer.supplierId !== product.selectedSupplier && isSupplierLocked(offer.supplierId))
    .map((offer) => ({
      supplier: offer.supplierLabel,
      pip: offer.supplierPip,
      requestedQty: product.quantity,
      receivedQty: 0,
      status: "Not Fulfilled",
      comment: SUPPLIER_LOCKED_COMMENT,
      price: offer.price,
      responseCode: "",
      account: ""
    }));
}

// Submitted line: the final (transmitted) product, with the original request kept in equalisation.
function submittedOrderProduct(product) {
  const price = selectedPrice(product);
  const supplier = supplierLabel(product.selectedSupplier);
  return {
    orderLineId: product.lineId,
    productId: String(product.productId),
    pip: product.pip,
    description: product.name,
    finalProductId: String(product.productId),
    finalProductName: product.name,
    finalPipCode: product.pip,
    finalSupplier: supplier,
    finalAcceptedPrice: price,
    requestedQty: product.quantity,
    receivedQty: product.quantity,
    status: "Completed",
    fulfilledBy: supplier,
    outcomes: [...lockedSupplierOutcomes(product), {
      supplier,
      pip: product.selectedSupplierPip || product.pip,
      requestedQty: product.quantity,
      receivedQty: product.quantity,
      status: "Successful",
      comment: "Order transmitted",
      price,
      responseCode: "",
      account: ""
    }],
    ...(product.equalisation ? { equalisation: { ...product.equalisation } } : {})
  };
}

// Wireframe: Order History reads this snapshot. Dated on the wireframe "today" so its date filters show it.
function saveSubmittedOrder() {
  const now = new Date();
  const day = dailyThreshold?.WIREFRAME_TODAY || now.toISOString().slice(0, 10);
  const time = [now.getHours(), now.getMinutes(), now.getSeconds()].map((part) => String(part).padStart(2, "0")).join(":");
  const products = state.basket.map(submittedOrderProduct);
  const productChangeCount = products.filter((product) => product.equalisation).length;
  const order = {
    id: state.orderContext.orderReference,
    customerId: state.orderContext.customerId,
    customer: state.orderContext.customer,
    orderedBy: state.orderContext.user,
    dateIso: `${day}T${time}`,
    status: "Completed",
    hasProductChanges: productChangeCount > 0,
    productChangeCount,
    products
  };
  try {
    const stored = JSON.parse(window.localStorage.getItem(SUBMITTED_ORDERS_STORAGE_KEY) || "[]");
    const submittedOrders = Array.isArray(stored) ? stored : [];
    // Orders saved before numeric order IDs (e.g. "OPMVQIWT8V") are dropped.
    window.localStorage.setItem(SUBMITTED_ORDERS_STORAGE_KEY, JSON.stringify([
      order,
      ...submittedOrders.filter((existing) => existing?.id !== order.id && /^\d+$/.test(String(existing?.id)))
    ].slice(0, 100)));
  } catch (error) {
    // Storage unavailable: the order is still placed in this page view.
  }
}

function completeOrder() {
  // Placed lines count towards today's totals for the daily threshold warning.
  dailyThreshold?.recordPlacedOrder(state.basket.map((product) => ({
    pip: quickOrderData.productIdentity(product),
    quantity: product.quantity,
    value: lineValue(product)
  })));
  saveSubmittedOrder();
  // Product changes cannot be undone after submission; the next order gets a new reference.
  state.orderContext.orderReference = newOrderReference();
  state.brand.equalisedPopoverLineId = null;
  if (state.brand.drawerOpen) closeBrandDrawer({ restoreFocus: false });
  state.basket = [];
  state.selectedLineIds = [];
  closeDrawer();
  resetAllSorts({ render: false });
  render();
  els.orderSuccessModal.showModal();
}

function toast(message, type = "success") {
  const node = document.createElement("div");
  node.className = `toast ${type}`;
  node.textContent = message;
  els.toastRegion.appendChild(node);
  window.setTimeout(() => {
    node.style.opacity = "0";
    node.style.transform = "translateY(-8px)";
    window.setTimeout(() => node.remove(), 180);
  }, 2600);
}

document.querySelector("#productSearchForm").addEventListener("submit", addProduct);
document.querySelector("#refreshPrices").addEventListener("click", refreshPrices);
els.quickOrderToggle.addEventListener("click", () => togglePanel("quickOrder"));
els.placeOrderButton.addEventListener("click", openOrderModal);
els.removeSelectedButton.addEventListener("click", requestRemoveSelectedProducts);
els.advancedSortToggle.addEventListener("click", () => {
  state.advancedSortPanelOpen = !state.advancedSortPanelOpen;
  renderAdvancedSortPanel();
});
els.advancedSortPanel.addEventListener("click", (event) => {
  const priceChoice = event.target.closest("[data-select-price-sort]");
  if (priceChoice) {
    applyAdvancedSort("selectedPrice", "asc");
    return;
  }

  const option = event.target.closest("[data-advanced-sort]");
  if (!option) return;
  applyAdvancedSort(option.dataset.advancedSort, option.dataset.direction || null);
});
els.resetAdvancedSort.addEventListener("click", resetAllSorts);
els.toggleAddProduct.addEventListener("click", () => {
  state.addProductVisible = !state.addProductVisible;
  renderAddProductToggle();
  focusAddProductSearch();
});
document.querySelector("#closeDrawer").addEventListener("click", closeDrawer);
els.drawerBackdrop.addEventListener("click", closeDrawer);

els.viewBrandSuggestions.addEventListener("click", () => openBrandDrawer());
els.dismissBrandBanner.addEventListener("click", dismissBrandBanner);
els.closeBrandDrawer.addEventListener("click", () => closeBrandDrawer());
els.brandDrawerBackdrop.addEventListener("click", () => closeBrandDrawer());
els.keepAllOriginal.addEventListener("click", () => {
  // With a selection this clears it and keeps the drawer open; otherwise keep everything as ordered.
  if (state.brand.selectedOpportunityLineIds.length) {
    state.brand.selectedOpportunityLineIds = [];
    updateBrandSelectionControls();
    return;
  }
  dismissBrandBanner();
  closeBrandDrawer();
});
els.switchAllBrands.addEventListener("click", requestSwitchAllBrands);
els.brandOpportunityList.addEventListener("change", (event) => {
  const checkbox = event.target.closest("[data-brand-select]");
  if (!checkbox) return;
  const selectedIds = new Set(state.brand.selectedOpportunityLineIds);
  if (checkbox.checked) selectedIds.add(checkbox.dataset.brandSelect);
  else selectedIds.delete(checkbox.dataset.brandSelect);
  state.brand.selectedOpportunityLineIds = [...selectedIds];
  updateBrandSelectionControls();
});
els.brandOpportunityList.addEventListener("click", (event) => {
  const switchButton = event.target.closest("[data-brand-switch]");
  if (!switchButton) return;
  const opportunity = state.brand.opportunities.find((item) => item.lineId === switchButton.dataset.brandSwitch);
  if (opportunity) requestBrandSwitch(opportunity);
});
els.closeBrandSwitchModal.addEventListener("click", closeBrandSwitchModal);
els.cancelBrandSwitch.addEventListener("click", closeBrandSwitchModal);
els.brandSwitchModal.addEventListener("cancel", () => {
  pendingBrandAction = null;
});
els.confirmBrandSwitch.addEventListener("click", async () => {
  if (typeof pendingBrandAction !== "function") return;
  const action = pendingBrandAction;
  pendingBrandAction = null;
  els.confirmBrandSwitch.disabled = true;
  try {
    await action();
  } catch (error) {
    toast(error.message || "The product could not be switched", "error");
  } finally {
    if (els.brandSwitchModal.open) els.brandSwitchModal.close();
    els.confirmBrandSwitch.disabled = false;
  }
});

els.nameSearch.addEventListener("input", (event) => {
  state.search.name = event.target.value;
  state.search.pip = event.target.value;
  renderSearchResults();
});

els.nameSearch.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== "Tab") return;
  if (!state.search.selectedProductId || !state.search.name.trim()) return;
  event.preventDefault();
  selectSearchProduct(state.search.selectedProductId);
});

els.quantityInput.addEventListener("input", (event) => {
  state.search.quantity = Math.max(1, Number(event.target.value || 1));
});

els.quantityInput.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    stepSearchQuantity(-1);
    return;
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    stepSearchQuantity(1);
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    document.querySelector("#productSearchForm").requestSubmit();
  }
});

els.decreaseQuantity.addEventListener("click", () => stepSearchQuantity(-1));
els.increaseQuantity.addEventListener("click", () => stepSearchQuantity(1));

els.uploadOrderButton.addEventListener("click", () => {
  openConfirmation({
    message: "You want to upload order?",
    onConfirm: () => {
      uploadConfirmed = true;
      els.orderUpload.click();
      window.setTimeout(() => {
        uploadConfirmed = false;
      }, 1000);
    }
  });
});

els.downloadOrderTemplate.addEventListener("click", () => {
  toast("Order template download ready");
});

els.orderUpload.addEventListener("change", (event) => {
  uploadConfirmed = false;
  announceUploadedFile(event.target.files[0]);
});

els.orderUpload.addEventListener("click", (event) => {
  if (uploadConfirmed) return;
  event.preventDefault();
  event.stopPropagation();
  openConfirmation({
    message: "You want to upload order?",
    onConfirm: () => {
      uploadConfirmed = true;
      els.orderUpload.click();
      window.setTimeout(() => {
        uploadConfirmed = false;
      }, 1000);
    }
  });
});

["dragenter", "dragover"].forEach((eventName) => {
  els.uploadOrderWidget.addEventListener(eventName, (event) => {
    event.preventDefault();
    els.uploadOrderWidget.classList.add("drag-over");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  els.uploadOrderWidget.addEventListener(eventName, (event) => {
    event.preventDefault();
    els.uploadOrderWidget.classList.remove("drag-over");
  });
});

els.uploadOrderWidget.addEventListener("drop", (event) => {
  const file = event.dataTransfer.files[0];
  if (!file) return;
  openConfirmation({
    message: `You want to upload ${file.name}?`,
    onConfirm: () => announceUploadedFile(file)
  });
});

els.basketFilter.addEventListener("input", (event) => {
  state.basketFilter = event.target.value;
  renderBasket();
});

els.searchResults.addEventListener("click", (event) => {
  const button = event.target.closest("[data-select-product]");
  if (!button) return;
  selectSearchProduct(button.dataset.selectProduct);
});

els.productList.addEventListener("click", (event) => {
  // The warning sign shows its message; it does not open Edit Product.
  const thresholdTag = event.target.closest(".product-tag--threshold");
  if (thresholdTag) {
    showHoverTooltip(thresholdTag);
    return;
  }

  // Cheaper alternative status, change details and Undo do not open Edit Product.
  const undoButton = event.target.closest("[data-equalisation-undo]");
  if (undoButton) {
    undoButton.disabled = true;
    undoEqualisation(undoButton.dataset.equalisationUndo).catch((error) => {
      undoButton.disabled = false;
      toast(error.message || "The product change could not be undone", "error");
    });
    return;
  }

  const equalisedDetails = event.target.closest("[data-equalised-details]");
  if (equalisedDetails) {
    const lineId = equalisedDetails.dataset.equalisedDetails;
    state.brand.equalisedPopoverLineId = state.brand.equalisedPopoverLineId === lineId ? null : lineId;
    renderBasket();
    return;
  }

  if (event.target.closest(".equalised-popover")) return;

  const brandIndicator = event.target.closest("[data-brand-opportunity]");
  if (brandIndicator) {
    openBrandDrawer(brandIndicator.dataset.brandOpportunity);
    return;
  }

  const sortButton = event.target.closest("[data-sort]");
  if (sortButton) {
    cycleBasketSort(sortButton.dataset.sort);
    return;
  }

  const favouriteButton = event.target.closest("[data-toggle-favourite]");
  if (favouriteButton) {
    toggleFavourite(favouriteButton.dataset.toggleFavourite);
    return;
  }

  const editButton = event.target.closest("[data-edit]");
  if (editButton) {
    openDrawer(editButton.dataset.edit);
    return;
  }

  if (event.target.closest("[data-select-line]")) return;

  const productRow = event.target.closest("[data-line-id]");
  if (productRow) openDrawer(productRow.dataset.lineId);
});

// Hover messages anywhere on the page (basket, Quick Order, Edit Product, popups, header).
document.addEventListener("mouseover", (event) => {
  const element = event.target.closest?.(HOVER_TOOLTIP_SELECTOR);
  if (element && element !== hoverTooltipAnchor) showHoverTooltip(element);
  // The element under the message may have been redrawn (for example after a quantity change).
  if (!element && hoverTooltipAnchor && !hoverTooltipAnchor.isConnected) hideHoverTooltip();
});

document.addEventListener("mouseout", (event) => {
  const element = event.target.closest?.(HOVER_TOOLTIP_SELECTOR);
  if (element && element === hoverTooltipAnchor && !element.contains(event.relatedTarget)) hideHoverTooltip();
});

document.addEventListener("focusin", (event) => {
  const element = event.target.closest?.(HOVER_TOOLTIP_SELECTOR);
  if (element) showHoverTooltip(element);
});

document.addEventListener("focusout", (event) => {
  if (event.target === hoverTooltipAnchor) hideHoverTooltip();
});

window.addEventListener("scroll", hideHoverTooltip, { capture: true, passive: true });
window.addEventListener("scroll", closeEqualisedPopover, { capture: true, passive: true });
window.addEventListener("resize", hideHoverTooltip);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && hoverTooltipAnchor) hideHoverTooltip();
});
document.addEventListener("click", (event) => {
  if (hoverTooltipAnchor && !event.target.closest(".product-tag--threshold")) hideHoverTooltip();
});

els.productList.addEventListener("change", (event) => {
  if (event.target.matches("[data-select-line]")) {
    toggleLineSelection(event.target.dataset.selectLine, event.target.checked);
  }

  if (event.target.matches("[data-select-all]")) {
    toggleVisibleSelection(event.target.checked);
  }
});

els.quickOrderPanel.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-quick-order-view]");
  if (viewButton) {
    setQuickOrderView(viewButton.dataset.quickOrderView);
    return;
  }

  const favouriteButton = event.target.closest("[data-toggle-favourite]");
  if (favouriteButton) {
    toggleFavourite(favouriteButton.dataset.toggleFavourite);
    return;
  }

  const addButton = event.target.closest("[data-quick-add]");
  if (addButton) {
    addQuickOrderProduct(addButton.dataset.quickAdd);
    return;
  }

  if (event.target.closest("[data-quick-order-more]")) {
    state.quickOrder.expanded = !state.quickOrder.expanded;
    renderQuickOrder();
  }
});

els.quickOrderPanel.addEventListener("input", (event) => {
  if (!event.target.matches("[data-quick-quantity]")) return;
  const pip = event.target.dataset.quickQuantity;
  const quantity = quickOrderData.normaliseQuantity(event.target.value);
  state.quickOrder.quantities[pip] = quantity;
  const addButton = event.target.closest(".quick-order-row")?.querySelector("[data-quick-add]");
  if (addButton) {
    addButton.disabled = quantity === 0;
    addButton.setAttribute("aria-disabled", String(quantity === 0));
    addButton.title = quantity === 0 ? "Enter a quantity to add" : "Add to basket";
  }
  if (event.target.value !== "" && String(quantity) !== event.target.value) {
    event.target.value = String(quantity);
  }
});

els.quickOrderSearch.addEventListener("input", (event) => {
  state.quickOrder.search = event.target.value;
  state.quickOrder.expanded = false;
  state.quickOrder.scrollPositions[state.quickOrder.activeView] = 0;
  els.quickOrderResults.scrollTop = 0;
  renderQuickOrder();
  els.quickOrderSearch.focus();
});

els.quickOrderResults.addEventListener("scroll", () => {
  state.quickOrder.scrollPositions[state.quickOrder.activeView] = els.quickOrderResults.scrollTop;
  els.quickOrderResults.classList.add("is-scrolling");
  window.clearTimeout(quickOrderScrollbarTimer);
  quickOrderScrollbarTimer = window.setTimeout(() => {
    els.quickOrderResults.classList.remove("is-scrolling");
  }, 1600);
}, { passive: true });

els.quickOrderPanel.addEventListener("change", (event) => {
  if (!event.target.matches("[data-quick-quantity]")) return;
  const pip = event.target.dataset.quickQuantity;
  const quantity = quickOrderData.normaliseQuantity(event.target.value);
  state.quickOrder.quantities[pip] = quantity;
  event.target.value = String(quantity);
});

els.quickOrderPanel.addEventListener("keydown", (event) => {
  const tab = event.target.closest("[data-quick-order-view]");
  if (!tab || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
  event.preventDefault();
  const nextView = tab.dataset.quickOrderView === "frequent" ? "favourites" : "frequent";
  setQuickOrderView(nextView);
  els.quickOrderTabs.find((item) => item.dataset.quickOrderView === nextView)?.focus();
});

els.drawerContent.addEventListener("change", (event) => {
  if (!state.editingId) return;
  if (event.target.matches("[data-supplier-choice]")) {
    selectSupplier(event.target.dataset.supplierChoice, event.target.value);
  }
  if (event.target.matches("[data-drawer-quantity]")) {
    updateQuantity(event.target.dataset.drawerQuantity, event.target.value);
  }
});

els.drawerContent.addEventListener("input", (event) => {
  if (state.editingId && event.target.matches("[data-drawer-quantity]")) {
    updateQuantity(event.target.dataset.drawerQuantity, event.target.value);
  }
});

els.drawerNavigation.addEventListener("click", (event) => {
  if (event.target.closest("[data-drawer-save]")) {
    saveDrawerProduct();
    return;
  }

  const navButton = event.target.closest("[data-drawer-nav]");
  if (navButton) {
    moveDrawerProduct(navButton.dataset.drawerNav === "next" ? 1 : -1);
    return;
  }

  const productResult = event.target.closest("[data-drawer-product-result]");
  if (productResult) {
    goToDrawerProduct(productResult.dataset.drawerProductResult);
    return;
  }
});

els.drawerNavigation.addEventListener("input", (event) => {
  if (event.target.matches("[data-drawer-product-search]")) {
    renderDrawerProductSearchResults(event.target.value);
  }
});

els.drawerNavigation.addEventListener("focusin", (event) => {
  if (event.target.matches("[data-drawer-product-search]")) {
    renderDrawerProductSearchResults(event.target.value, true);
  }
});

els.drawerNavigation.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.target.matches("[data-drawer-product-search]")) {
    event.preventDefault();
    const match = drawerProductSearchMatches(event.target.value, true)[0];
    if (match) goToDrawerProduct(match.lineId);
  }
});

els.drawerContent.addEventListener("click", (event) => {
  const productSection = event.target.closest("[data-drawer-product]");
  if (productSection) {
    state.editingId = productSection.dataset.drawerProduct;
    setActiveDrawerProduct(state.editingId);
  }

  if (event.target.closest("[data-drawer-close]")) {
    closeDrawer();
    return;
  }

  const quantityStep = event.target.closest("[data-drawer-quantity-step]");
  if (quantityStep) {
    const lineId = quantityStep.dataset.drawerQuantityStep;
    const product = state.basket.find((item) => item.lineId === lineId);
    if (!product) return;
    const draftProduct = drawerProductWithDraft(product);
    const nextQuantity = Math.max(1, draftProduct.quantity + Number(quantityStep.dataset.step || 0));
    updateQuantity(lineId, nextQuantity);
    const input = quantityStep.closest(".drawer-quantity-stepper")?.querySelector("[data-drawer-quantity]");
    if (input) input.value = nextQuantity;
    return;
  }

  const offerButton = event.target.closest("[data-select-supplier-offer]");
  if (offerButton) {
    const product = state.basket.find((item) => item.lineId === offerButton.dataset.lineId);
    if (product && drawerProductWithDraft(product).selectedOfferKey === offerButton.dataset.selectSupplierOffer) return;
    selectSupplier(offerButton.dataset.lineId, offerButton.dataset.selectSupplierOffer);
  }
});

els.drawerContent.addEventListener("keydown", (event) => {
  const row = event.target.closest("tr[data-select-supplier-offer]");
  if (!row || (event.key !== "Enter" && event.key !== " ")) return;
  event.preventDefault();
  const product = state.basket.find((item) => item.lineId === row.dataset.lineId);
  if (!(product && drawerProductWithDraft(product).selectedOfferKey === row.dataset.selectSupplierOffer)) {
    selectSupplier(row.dataset.lineId, row.dataset.selectSupplierOffer);
  }
  // Space only selects the supplier; Enter selects it and saves, like the Save button.
  if (event.key === "Enter") saveDrawerProduct();
});

// Enter in Edit Product saves the supplier and quantity changes, like clicking Save.
// The popup is modal, so this applies wherever focus is (it can stay on the page or the Edit button,
// or on the +/- buttons), except the controls with their own Enter action and other popups on top.
document.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || event.defaultPrevented || event.isComposing || !els.drawer.classList.contains("open")) return;
  const target = event.target;
  const otherPopup = target.closest("dialog, [role='dialog'], [aria-modal='true'], .active-user-overlay");
  if (otherPopup && otherPopup !== els.drawer) return;
  if (target.closest("[data-drawer-nav], [data-drawer-product-search], [data-drawer-product-result], #closeDrawer, [data-drawer-save]")) return;
  event.preventDefault();
  saveDrawerProduct();
});

els.orderModal.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeConfirmation();
});

document.addEventListener("click", (event) => {
  if (state.brand.equalisedPopoverLineId && !event.target.closest(".equalised-status-wrap")) {
    state.brand.equalisedPopoverLineId = null;
    renderBasket();
  }

  if (state.advancedSortPanelOpen && !event.target.closest(".advanced-sort-menu")) {
    closeAdvancedSortPanel();
  }

  if (state.editingId && !event.target.closest(".go-to-product")) {
    closeDrawerProductSearchResults();
  }

  const closeModalButton = event.target.closest("[data-close-modal]");
  if (closeModalButton) {
    const dialog = closeModalButton.closest("dialog");
    if (dialog === els.orderModal) {
      closeConfirmation({ reviewBasket: closeModalButton.dataset.reviewBasket === "true" });
    } else {
      dialog?.close();
    }
  }
});

els.confirmOrder.addEventListener("click", () => {
  if (orderSubmissionPending || typeof pendingConfirmationAction !== "function") return;
  const action = pendingConfirmationAction;
  pendingConfirmationAction = null;
  orderSubmissionPending = true;
  els.confirmOrder.disabled = true;
  els.orderModal.close();

  let result;
  try {
    result = action();
  } catch (error) {
    orderSubmissionPending = false;
    els.confirmOrder.disabled = false;
    throw error;
  }

  if (result && typeof result.finally === "function") {
    result.finally(() => {
      orderSubmissionPending = false;
      els.confirmOrder.disabled = false;
    });
    return;
  }

  orderSubmissionPending = false;
  els.confirmOrder.disabled = false;
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.advancedSortPanelOpen) {
    closeAdvancedSortPanel();
    return;
  }

  if (event.key === "Escape" && state.brand.drawerOpen && !els.brandSwitchModal.open) {
    closeBrandDrawer();
    return;
  }

  if (!state.editingId) return;

  if (event.key === "Escape") {
    closeDrawer();
    return;
  }

  if (event.target.matches("input, textarea, select")) return;

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    moveDrawerProduct(-1);
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    moveDrawerProduct(1);
  }
});

function syncFavouriteState() {
  const result = quickOrderData.readFavouritePips(window.localStorage, currentAccountId);
  state.quickOrder.favouritePips = new Set(result.pips);
  state.quickOrder.favouriteError = result.error;
  renderBasket();
  renderQuickOrder();
}

window.addEventListener("storage", (event) => {
  if (event.key === quickOrderData.favouriteStorageKey(currentAccountId)) {
    syncFavouriteState();
  }
});

window.addEventListener("cascade:favourites-changed", (event) => {
  if (event.detail?.source === "order-pad") return;
  if (event.detail?.accountId && event.detail.accountId !== currentAccountId) return;
  syncFavouriteState();
});

// Returning with Back/Forward can restore this page as it was left; show the warning signs for the saved thresholds
// and the saved supplier locks.
window.addEventListener("pageshow", (event) => {
  if (!event.persisted) return;
  refreshSupplierLocks();
  renderBasket();
});

// Basket chip: always shown and links to Settings; "DT Override Off" by default.
function renderOverrideChip() {
  const chip = document.querySelector("#overrideChip");
  if (!chip) return;
  chip.querySelector("#overrideChipLabel").textContent = dtOverridePercent ? `DT Override +${dtOverridePercent}%` : "DT Override Off";
  chip.classList.toggle("off", !dtOverridePercent);
}

// Basket chip next to DT Override: always shown and links to Supplier Lock in Settings; "Supplier Lock Off" (grey)
// when no supplier is locked. While one is locked, its hover message lists each locked supplier and until when.
function renderSupplierLockChip() {
  const chip = document.querySelector("#supplierLockChip");
  if (!chip) return;
  const count = lockedSupplierIds.length;
  chip.classList.toggle("off", !count);
  if (!count) {
    chip.querySelector("#supplierLockChipLabel").textContent = "Supplier Lock Off";
    chip.dataset.tip = "Change in Settings";
    chip.removeAttribute("aria-label");
    return;
  }
  chip.querySelector("#supplierLockChipLabel").textContent = `${count} Supplier${count === 1 ? "" : "s"} Locked`;
  const lines = lockedSupplierIds.map((id) => {
    const status = supplierLock.lockState(supplierLock.getLock(id));
    return `${supplierLabel(id)} – locked ${status.until ? `until ${supplierLock.formatDateTime(status.until)}` : "until switched off"}`;
  });
  chip.dataset.tip = `${lines.join("\n")}\nNot cascaded to. Change in Settings.`;
  chip.setAttribute("aria-label", `${count} supplier${count === 1 ? "" : "s"} locked. ${lines.join(". ")}. Change in Settings.`);
}

// A line on a supplier that is now locked moves to the cheapest selectable supplier (the same cascade as when a
// product is added). Returns how many lines moved.
function cascadeAwayFromLockedSuppliers() {
  let moved = 0;
  state.basket.forEach((product) => {
    if (!product.selectedSupplier || !isSupplierLocked(product.selectedSupplier)) return;
    const recommended = getRecommendedSupplier(product);
    if (recommended) {
      applySelectedOffer(product, recommended);
    } else {
      Object.assign(product, { selectedSupplier: null, selectedSupplierPip: null, selectedPrice: null, selectedOfferKey: null });
    }
    moved += 1;
  });
  // An unsaved Edit Product choice of a now-locked supplier is dropped.
  if (state.drawerDraft?.selectedSupplier && isSupplierLocked(state.drawerDraft.selectedSupplier)) state.drawerDraft = null;
  return moved;
}

// Scheduled locks start and end while the Order Pad is open: checked every 30 seconds, on Refresh prices and
// when the page is shown again.
function refreshSupplierLocks() {
  if (!supplierLock) return;
  const next = supplierLock.lockedSupplierIds();
  if (next.join() === lockedSupplierIds.join()) return;
  lockedSupplierIds = next;
  const moved = cascadeAwayFromLockedSuppliers();
  renderSupplierLockChip();
  render();
  if (moved) toast(`${moved} line${moved === 1 ? "" : "s"} moved from a locked supplier to the next best supplier`);
}

window.setInterval(refreshSupplierLocks, 30000);

// The admin site unlocked a supplier while the Order Pad is open: it can be selected and cascaded to again.
supplierLock?.onSharedChange((before) => {
  refreshSupplierLocks();
  const unlocked = before.filter((entry) => !supplierLock.getLock(entry.supplierId)).map((entry) => supplierLabel(entry.supplierId));
  if (unlocked.length) toast(`${unlocked.join(", ")} unlocked by ${supplierLock.ADMIN_USER} – available for cascade again`);
});

render();
renderOverrideChip();
renderSupplierLockChip();
renderBasketIconLegend();
focusAddProductSearch();
