(function initialiseQuickOrderData(globalScope, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (globalScope) {
    globalScope.CascadeOrderPadQuickOrder = api;
  }
})(typeof window !== "undefined" ? window : null, function createQuickOrderDataApi() {
  "use strict";

  function productIdentity(product) {
    if (!product) return "";
    return String(product.pip || product.productId || product.id || "").trim();
  }

  function findBasketItem(basket, product) {
    const pip = String(product?.pip || "").trim();
    const productId = String(product?.productId || product?.id || "").trim();

    return (basket || []).find((item) => {
      const itemPip = String(item?.pip || "").trim();
      const itemProductId = String(item?.productId || item?.id || "").trim();
      return (pip && itemPip === pip) || (productId && itemProductId === productId);
    }) || null;
  }

  function normaliseQuantity(value) {
    if (value === "" || value === null || value === undefined) return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
  }

  function mergeBasketProduct(basket, product, quantity, createItem) {
    const safeQuantity = normaliseQuantity(quantity);
    if (safeQuantity === 0) return { status: "invalid", item: null };

    const existing = findBasketItem(basket, product);
    if (existing) {
      existing.quantity = normaliseQuantity(existing.quantity) + safeQuantity;
      return { status: "updated", item: existing };
    }

    const item = createItem(product, safeQuantity);
    basket.unshift(item);
    return { status: "added", item };
  }

  function supplierIdFor(label, suppliers) {
    const normalised = String(label || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!normalised) return null;

    const exact = (suppliers || []).find((supplier) => {
      const id = String(supplier.id || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const supplierLabel = String(supplier.label || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      return normalised === id || normalised === supplierLabel;
    });
    if (exact) return exact.id;

    const aliases = {
      aah: "aah",
      alliance: "alliance",
      alliancehealthcare: "alliance",
      bs: "bs",
      bsdistribution: "bs",
      ethigen: "ethigen",
      otc: "otcd",
      otcd: "otcd",
      otcdirect: "otcd",
      phoenix: "phoenix",
      phoenixhealthcare: "phoenix",
      trident: "trident",
      lexon: "lexon"
    };
    return aliases[normalised] || null;
  }

  function buildFrequentlyOrdered(orderHistory, catalogue, suppliers) {
    if (!Array.isArray(orderHistory)) {
      throw new TypeError("Order history is unavailable");
    }

    const catalogueByPip = new Map((catalogue || []).map((product) => [String(product.pip), product]));
    const ranking = new Map();

    orderHistory.forEach((order) => {
      const orderedAt = String(order?.dateIso || "");
      const pipsInOrder = new Set();

      (order?.products || []).forEach((orderedProduct) => {
        const pip = String(orderedProduct?.pip || "").trim();
        if (!pip) return;

        let ranked = ranking.get(pip);
        if (!ranked) {
          ranked = {
            pip,
            name: String(orderedProduct.description || `Product ${pip}`),
            orderCount: 0,
            lastOrderedAt: "",
            selectedSupplier: null,
            offers: new Map()
          };
          ranking.set(pip, ranked);
        }

        if (!pipsInOrder.has(pip)) {
          ranked.orderCount += 1;
          pipsInOrder.add(pip);
        }

        if (orderedAt >= ranked.lastOrderedAt) {
          ranked.lastOrderedAt = orderedAt;
          ranked.name = String(orderedProduct.description || ranked.name);
          ranked.selectedSupplier = supplierIdFor(orderedProduct.fulfilledBy, suppliers) || ranked.selectedSupplier;
        }

        (orderedProduct.outcomes || []).forEach((outcome) => {
          const supplierId = supplierIdFor(outcome?.supplier, suppliers);
          const price = Number(outcome?.price);
          if (!supplierId || !Number.isFinite(price) || price <= 0) return;

          const current = ranked.offers.get(supplierId);
          if (!current || orderedAt >= current.orderedAt) {
            ranked.offers.set(supplierId, {
              supplierId,
              supplier: (suppliers || []).find((supplier) => supplier.id === supplierId)?.label || outcome.supplier,
              supplierPip: String(outcome.pip || pip),
              price,
              orderedAt
            });
          }
        });
      });
    });

    return Array.from(ranking.values())
      .map((ranked) => {
        const catalogueProduct = catalogueByPip.get(ranked.pip);
        if (catalogueProduct) {
          return {
            ...catalogueProduct,
            prices: { ...catalogueProduct.prices },
            supplierPipMappings: catalogueProduct.supplierPipMappings
              ? catalogueProduct.supplierPipMappings.map((mapping) => ({ ...mapping }))
              : null,
            orderCount: ranked.orderCount,
            lastOrderedAt: ranked.lastOrderedAt
          };
        }

        const supplierPipMappings = Array.from(ranked.offers.values()).map(({ orderedAt, ...offer }) => offer);
        const prices = Object.fromEntries((suppliers || []).map((supplier) => [supplier.id, null]));
        supplierPipMappings.forEach((offer) => {
          prices[offer.supplierId] = offer.price;
        });

        return {
          id: `history-${ranked.pip}`,
          name: ranked.name,
          pip: ranked.pip,
          tariff: null,
          concessionPrice: false,
          selectedSupplier: ranked.selectedSupplier,
          prices,
          supplierPipMappings,
          orderCount: ranked.orderCount,
          lastOrderedAt: ranked.lastOrderedAt
        };
      })
      .sort((left, right) => right.orderCount - left.orderCount
        || right.lastOrderedAt.localeCompare(left.lastOrderedAt)
        || left.name.localeCompare(right.name));
  }

  function favouriteStorageKey(accountId) {
    const scopedAccount = String(accountId || "anonymous").trim().toLowerCase().replace(/\s+/g, "-");
    return `cascade-plus:favourites:${scopedAccount}`;
  }

  function readFavouritePips(storage, accountId) {
    try {
      const stored = JSON.parse(storage.getItem(favouriteStorageKey(accountId)) || "[]");
      const pips = Array.isArray(stored)
        ? Array.from(new Set(stored.map((pip) => String(pip).trim()).filter(Boolean)))
        : [];
      return { pips, error: null };
    } catch (error) {
      return { pips: [], error };
    }
  }

  function writeFavouritePips(storage, accountId, pips) {
    try {
      const uniquePips = Array.from(new Set(Array.from(pips || []).map((pip) => String(pip).trim()).filter(Boolean)));
      storage.setItem(favouriteStorageKey(accountId), JSON.stringify(uniquePips));
      return { pips: uniquePips, error: null };
    } catch (error) {
      return { pips: Array.from(pips || []), error };
    }
  }

  return {
    buildFrequentlyOrdered,
    favouriteStorageKey,
    findBasketItem,
    mergeBasketProduct,
    normaliseQuantity,
    productIdentity,
    readFavouritePips,
    writeFavouritePips
  };
});
