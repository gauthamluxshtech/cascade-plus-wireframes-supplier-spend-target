// Shared daily threshold settings (quantity per item per day).
// settings.html writes them; Order Pad (app.js) reads them and shows the warning sign on basket lines.
(function initialiseDailyThreshold(globalScope, factory) {
  const api = factory(globalScope);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (globalScope) {
    globalScope.CascadeDailyThreshold = api;
  }
})(typeof window !== "undefined" ? window : null, function createDailyThresholdApi(globalScope) {
  "use strict";

  const DEFAULT_QUANTITY = 100;
  const GENERIC_KEY = "cascadeDailyThresholdGeneric";
  const PRODUCTS_KEY = "cascadeDailyThresholdProducts";
  const ORDERS_KEY = "cascadeOrdersPlacedToday";
  const HISTORY_KEY = "cascadeDailyThresholdHistory";

  function storage() {
    try {
      return globalScope ? globalScope.sessionStorage : null;
    } catch (error) {
      return null;
    }
  }

  // Wireframe: these live in sessionStorage, so every new wireframe
  // session starts with the defaults, and refreshing a page returns to them.
  try {
    const store = storage();
    if (store && globalScope.performance?.getEntriesByType("navigation")[0]?.type === "reload") {
      store.removeItem(GENERIC_KEY);
      store.removeItem(PRODUCTS_KEY);
      store.removeItem(ORDERS_KEY);
      store.removeItem(HISTORY_KEY);
    }
  } catch (error) {
    // Storage is optional in the prototype.
  }

  function readJson(key, fallback) {
    try {
      const raw = storage()?.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      storage()?.setItem(key, JSON.stringify(value));
    } catch (error) {
      // Storage unavailable: the change applies to this page view only.
    }
  }

  function toPence(value) {
    return Math.round(Number(value) * 100);
  }

  function isValidQuantity(value) {
    return typeof value === "number" && Number.isInteger(value) && value >= 1;
  }

  // Default: the general threshold is on at 100 packs.
  function defaults() {
    return { enabled: true, quantity: DEFAULT_QUANTITY };
  }

  function getGeneric() {
    const saved = readJson(GENERIC_KEY, null);
    return saved && isValidQuantity(saved.quantity)
      ? { enabled: saved.enabled !== false, quantity: saved.quantity }
      : defaults();
  }

  function setGeneric({ enabled, quantity }) {
    writeJson(GENERIC_KEY, { enabled: Boolean(enabled), quantity });
  }

  function isDefaultGeneric(threshold = getGeneric()) {
    return threshold.enabled && threshold.quantity === DEFAULT_QUANTITY;
  }

  function getProductThresholds() {
    const list = readJson(PRODUCTS_KEY, []);
    return Array.isArray(list)
      ? list.filter((entry) => entry && entry.pip && isValidQuantity(entry.quantity))
      : [];
  }

  function getProductThreshold(pip) {
    const key = String(pip || "").trim();
    return getProductThresholds().find((entry) => entry.pip === key) || null;
  }

  // Adds or replaces the threshold for one product (matched by PIP code).
  function setProductThreshold(entry) {
    const pip = String(entry.pip || "").trim();
    const list = getProductThresholds().filter((item) => item.pip !== pip);
    list.push({ ...entry, pip });
    writeJson(PRODUCTS_KEY, list);
    return list;
  }

  function removeProductThreshold(pip) {
    const key = String(pip || "").trim();
    const list = getProductThresholds().filter((item) => item.pip !== key);
    writeJson(PRODUCTS_KEY, list);
    return list;
  }

  // Audit Log: one entry per saved change (general switched on / off or quantity changed,
  // product threshold added / updated / removed). Entries are only added, never changed.
  function getHistory() {
    const list = readJson(HISTORY_KEY, []);
    return Array.isArray(list) ? list.filter((entry) => entry && entry.type && entry.at) : [];
  }

  function addHistory(entry) {
    const list = getHistory();
    list.push({ ...entry, at: entry.at || Date.now() });
    writeJson(HISTORY_KEY, list);
    return list;
  }

  // The product-specific threshold when one is set, otherwise the general threshold.
  // Returns null when the product has no threshold of its own and the general threshold is off.
  function thresholdFor(pip) {
    const specific = getProductThreshold(pip);
    if (specific) return { quantity: specific.quantity, specific: true };
    const generic = getGeneric();
    return generic.enabled ? { quantity: generic.quantity, specific: false } : null;
  }

  // Wireframe "today": the date Order History treats as today (historyToday in history.html),
  // so the orders placed that day in orderhistory-data.js count as ordered today.
  const WIREFRAME_TODAY = "2026-10-15";

  // Keeps the lines of an order placed from the Order Pad, so they count towards today's totals.
  function recordPlacedOrder(lines, date = new Date()) {
    const today = WIREFRAME_TODAY;
    const orders = readJson(ORDERS_KEY, []);
    const kept = Array.isArray(orders) ? orders.filter((order) => order && order.day === today) : [];
    kept.push({
      day: today,
      placedAt: date.toISOString(),
      lines: (lines || [])
        .filter((line) => line && line.pip && Number(line.quantity) > 0)
        .map((line) => ({ pip: String(line.pip).trim(), quantity: Number(line.quantity), value: Number(line.value) || 0 }))
    });
    writeJson(ORDERS_KEY, kept);
  }

  // Quantity and value of one product ordered today: orders placed from the Order Pad in this session,
  // plus Order History orders dated today. Only quantities a supplier supplied count; out-of-stock lines do not.
  function orderedToday(pip, orderHistory, today = WIREFRAME_TODAY) {
    const key = String(pip || "").trim();
    let quantity = 0;
    let pence = 0;

    const placed = readJson(ORDERS_KEY, []);
    (Array.isArray(placed) ? placed : [])
      .filter((order) => order && order.day === today)
      .forEach((order) => (order.lines || []).forEach((line) => {
        if (line.pip !== key) return;
        quantity += Number(line.quantity) || 0;
        pence += toPence(line.value || 0);
      }));

    (Array.isArray(orderHistory) ? orderHistory : [])
      .filter((order) => String(order?.dateIso || "").slice(0, 10) === today)
      .forEach((order) => (order.products || []).forEach((product) => {
        if (String(product?.pip || "").trim() !== key) return;
        const outcomes = Array.isArray(product.outcomes) ? product.outcomes : [];
        if (!outcomes.length) {
          quantity += Number(product.receivedQty) || 0;
          return;
        }
        outcomes.forEach((outcome) => {
          const received = Number(outcome?.receivedQty) || 0;
          if (received <= 0) return;
          quantity += received;
          pence += toPence(received * (Number(outcome.price) || 0));
        });
      }));

    return { quantity, value: pence / 100 };
  }

  // Exceeded means above the threshold: exactly 100 packs shows no warning. No threshold (null) never warns.
  function evaluate({ ordered, inBasket, threshold }) {
    const totalQuantity = (ordered?.quantity || 0) + (inBasket?.quantity || 0);
    return {
      ordered: { quantity: ordered?.quantity || 0 },
      inBasket: { quantity: inBasket?.quantity || 0 },
      threshold,
      totalQuantity,
      quantityExceeded: Boolean(threshold) && totalQuantity > threshold.quantity
    };
  }

  // Hover message for the warning sign: today's quantity (ordered + in basket), the limit the pharmacy set
  // (General Limit or Product specific Limit), and that it is a warning only. The ordered part is shown only
  // when some was ordered earlier today.
  function warningText(result) {
    if (!result.quantityExceeded) return "";
    const split = result.ordered.quantity > 0
      ? `${result.ordered.quantity} ordered + ${result.inBasket.quantity} in basket`
      : `${result.inBasket.quantity} in basket`;
    const limitName = result.threshold.specific ? "Product specific Limit" : "General Limit";
    return `Quantity:${result.totalQuantity} (${split}). ${limitName} ${result.threshold.quantity} per day. Warning only, can be edited in Settings.`;
  }

  return {
    DEFAULT_QUANTITY,
    WIREFRAME_TODAY,
    addHistory,
    defaults,
    evaluate,
    getGeneric,
    getHistory,
    getProductThreshold,
    getProductThresholds,
    isDefaultGeneric,
    isValidQuantity,
    orderedToday,
    recordPlacedOrder,
    removeProductThreshold,
    setGeneric,
    setProductThreshold,
    thresholdFor,
    warningText
  };
});
