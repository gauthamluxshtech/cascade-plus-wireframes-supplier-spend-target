(function initialiseOrderPadCartFlags(globalScope, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (globalScope) {
    globalScope.CascadeOrderPadCartFlags = api;
  }
})(typeof window !== "undefined" ? window : null, function createOrderPadCartFlagsApi() {
  "use strict";

  const HIGH_VALUE_THRESHOLD = 100;

  function hasValidQuantity(quantity) {
    return typeof quantity === "number" && Number.isFinite(quantity) && quantity > 0;
  }

  function hasValidSelectedPrice(selectedUnitPrice) {
    return typeof selectedUnitPrice === "number"
      && Number.isFinite(selectedUnitPrice)
      && selectedUnitPrice >= 0;
  }

  function lineValue(quantity, selectedUnitPrice) {
    return hasValidQuantity(quantity) && hasValidSelectedPrice(selectedUnitPrice)
      ? quantity * selectedUnitPrice
      : 0;
  }

  function isHighValue(lineOrderValue) {
    return typeof lineOrderValue === "number"
      && Number.isFinite(lineOrderValue)
      && lineOrderValue > HIGH_VALUE_THRESHOLD;
  }

  function productFlags(product, lineOrderValue) {
    const storageType = String(product?.storageType || "").trim().toLowerCase();
    return {
      isControlledDrug: product?.isControlledDrug === true,
      isFridge: product?.isFridge === true
        || product?.requiresRefrigeration === true
        || storageType === "fridge",
      isHighValue: isHighValue(lineOrderValue)
    };
  }

  function countBasketFlags(basket, lineValueForProduct) {
    return (basket || []).reduce((counts, product) => {
      const flags = productFlags(product, lineValueForProduct(product));
      if (flags.isControlledDrug) counts.cdCount += 1;
      if (flags.isFridge) counts.fridgeCount += 1;
      if (flags.isHighValue) counts.highValueCount += 1;
      return counts;
    }, { cdCount: 0, fridgeCount: 0, highValueCount: 0 });
  }

  function attentionCategories(counts) {
    const categories = [
      {
        key: "cd",
        count: counts?.cdCount || 0,
        badge: "CD",
        text(count) {
          return `${count} Controlled Drug product${count === 1 ? "" : "s"}`;
        }
      },
      {
        key: "fridge",
        count: counts?.fridgeCount || 0,
        badge: "FRIDGE",
        text(count) {
          return `${count} Fridge product${count === 1 ? "" : "s"}`;
        }
      },
      {
        key: "high-value",
        count: counts?.highValueCount || 0,
        badge: "HIGH VALUE",
        text(count) {
          return `${count} High Value line${count === 1 ? "" : "s"} over \u00a3100`;
        }
      }
    ];

    return categories
      .filter((category) => category.count > 0)
      .map((category) => ({ ...category, label: category.text(category.count) }));
  }

  return {
    HIGH_VALUE_THRESHOLD,
    attentionCategories,
    countBasketFlags,
    hasValidQuantity,
    hasValidSelectedPrice,
    isHighValue,
    lineValue,
    productFlags
  };
});
