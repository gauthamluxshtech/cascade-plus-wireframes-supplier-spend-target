// Shared Drug Tariff price override setting.
// settings.html writes it; Order Pad (app.js) reads it.
(function initPriceOverride() {
  const STORAGE_KEY = "cascadeDtOverridePercent";
  const AUDIT_KEY = "cascadeDtOverrideAudit";
  const PRESETS = [0, 5, 10, 15, 20];
  const CUSTOM_MIN = 1;
  const CUSTOM_MAX = 50;

  // Wireframe: like the shift sign-in profiles, the setting lives in sessionStorage, so every new
  // wireframe session starts with the override Off, and refreshing a page returns it to Off.
  try {
    // Remove values left by the earlier localStorage-based build.
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(AUDIT_KEY);
    if (performance.getEntriesByType("navigation")[0]?.type === "reload") {
      window.sessionStorage.removeItem(STORAGE_KEY);
      window.sessionStorage.removeItem(AUDIT_KEY);
    }
  } catch (error) {
    // Storage is optional in the prototype.
  }

  function isValidPercent(value) {
    return value === 0
      || (Number.isFinite(value) && value >= CUSTOM_MIN && value <= CUSTOM_MAX && Number.isInteger(value * 2));
  }

  function getPercent() {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      const value = Number(raw);
      return raw !== null && isValidPercent(value) ? value : 0;
    } catch (error) {
      return 0;
    }
  }

  function setPercent(percent) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, String(percent));
    } catch (error) {
      // Storage unavailable: the setting applies to this page view only.
    }
  }

  function getAudit() {
    try {
      const list = JSON.parse(window.sessionStorage.getItem(AUDIT_KEY) || "[]");
      return Array.isArray(list) ? list : [];
    } catch (error) {
      return [];
    }
  }

  function addAudit(entry) {
    const list = [entry, ...getAudit()];
    try {
      window.sessionStorage.setItem(AUDIT_KEY, JSON.stringify(list));
    } catch (error) {
      // Storage unavailable: the entry is shown for this page view only.
    }
    return list;
  }

  // Drug Tariff + override %, rounded down to the penny. Returns null when there is no tariff.
  function maxAllowedPrice(tariff, percent = getPercent()) {
    if (typeof tariff !== "number") return null;
    return Math.floor(Math.round(tariff * 100) * (100 + percent) / 100) / 100;
  }

  function isAboveMaxAllowed(tariff, price, percent = getPercent()) {
    const max = maxAllowedPrice(tariff, percent);
    return max !== null && typeof price === "number" && Math.round(price * 100) > Math.round(max * 100);
  }

  window.cascadePriceOverride = {
    PRESETS, CUSTOM_MIN, CUSTOM_MAX,
    isValidPercent, getPercent, setPercent, getAudit, addAudit, maxAllowedPrice, isAboveMaxAllowed
  };
})();
