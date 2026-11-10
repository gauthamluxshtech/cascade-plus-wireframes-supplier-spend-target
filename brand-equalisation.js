// Brand / Generic optimisation (cheaper alternatives) for the Order Pad.
// Approved Product Mapping graph, opportunity calculation, API adapter and audit fallback.
(function initialiseBrandEqualisation(global) {
  "use strict";

  const ADMIN_STORAGE_KEY = "cascade-products-admin-phase-1";
  const HISTORY_STORAGE_KEY = "cascade-brand-equalisation-history-v1";
  const VALID_STATUS = "valid";
  const API_ROOT = "/api/order-pad/brand-equalisation";
  let apiState = /^https?:$/i.test(global.location?.protocol || "") ? "unknown" : "offline";

  // Compact server-snapshot stand-in for the wireframe. In production this shape is
  // returned by the Product Mapping endpoint and refreshed when Admin mappings change.
  const approvedMappingSnapshot = [
    { sourceProductId: "147768", replacementProductId: "80872", status: "Valid", mappingType: "brand" },
    { sourceProductId: "900101", replacementProductId: "900111", status: "Valid", mappingType: "brand" },
    { sourceProductId: "900102", replacementProductId: "900112", status: "Valid", mappingType: "brand" },
    { sourceProductId: "900103", replacementProductId: "900113", status: "Valid", mappingType: "brand" },
    { sourceProductId: "101067", replacementProductId: "89728", status: "Valid", mappingType: "brand" },
    { sourceProductId: "103758", replacementProductId: "104666", status: "Valid", mappingType: "brand" }
  ];

  function readAdminMappings() {
    try {
      const saved = JSON.parse(global.localStorage.getItem(ADMIN_STORAGE_KEY) || "null");
      return saved && saved.mappings && typeof saved.mappings === "object"
        ? saved.mappings
        : null;
    } catch (_error) {
      return null;
    }
  }

  // Valid approved links, expanded both ways: every member of a connected group can replace every other member.
  function approvedMappings() {
    const bySource = new Map();
    approvedMappingSnapshot.forEach((mapping) => {
      const sourceId = String(mapping.sourceProductId);
      if (!bySource.has(sourceId)) bySource.set(sourceId, []);
      bySource.get(sourceId).push({ ...mapping });
    });

    // A source present in Admin storage is authoritative, so an Admin unlink or status
    // downgrade cannot be reintroduced by the compact fallback snapshot.
    const adminMappings = readAdminMappings();
    if (adminMappings) {
      Object.entries(adminMappings).forEach(([sourceProductId, mappingGroups]) => {
        const brandMappings = Array.isArray(mappingGroups?.brand) ? mappingGroups.brand : [];
        bySource.set(String(sourceProductId), brandMappings.map((mapping) => ({
          sourceProductId: String(sourceProductId),
          replacementProductId: String(mapping.id),
          status: String(mapping.status || ""),
          mappingType: "brand",
          linkedOn: mapping.linkedOn || "",
          createdBy: mapping.createdBy || ""
        })));
      });
    }

    const validPairs = Array.from(bySource.values())
      .flat()
      .filter((mapping) => mapping.mappingType === "brand"
        && String(mapping.status).trim().toLowerCase() === VALID_STATUS);
    const graph = new Map();
    validPairs.forEach((mapping) => {
      const source = String(mapping.sourceProductId);
      const replacement = String(mapping.replacementProductId);
      if (!graph.has(source)) graph.set(source, new Set());
      if (!graph.has(replacement)) graph.set(replacement, new Set());
      graph.get(source).add(replacement);
      graph.get(replacement).add(source);
    });

    const visited = new Set();
    const expanded = [];
    for (const start of graph.keys()) {
      if (visited.has(start)) continue;
      const stack = [start];
      const members = [];
      while (stack.length) {
        const current = stack.pop();
        if (visited.has(current)) continue;
        visited.add(current);
        members.push(current);
        (graph.get(current) || []).forEach((next) => stack.push(next));
      }
      const equivalentGroupId = `LOCAL-EQ-${members.slice().sort().join("-")}`;
      members.forEach((sourceProductId) => members
        .filter((replacementProductId) => replacementProductId !== sourceProductId)
        .forEach((replacementProductId) => expanded.push({
          sourceProductId, replacementProductId, mappingType: "brand", status: "Valid", equivalentGroupId
        })));
    }
    return expanded;
  }

  function money(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  function readHistory() {
    try {
      const records = JSON.parse(global.localStorage.getItem(HISTORY_STORAGE_KEY) || "[]");
      return Array.isArray(records) ? records : [];
    } catch (_error) {
      return [];
    }
  }

  function writeHistory(records) {
    try {
      global.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(records));
    } catch (_error) {
      // Switching remains available if storage is unavailable; the API adapter can
      // persist the same record shape when a backend is connected.
    }
  }

  async function apiRequest(path, body, user) {
    if (apiState === "offline") return null;
    let response;
    try {
      response = await global.fetch(`${API_ROOT}/${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(user ? { "x-authenticated-user": user } : {})
        },
        body: JSON.stringify(body)
      });
    } catch (_error) {
      apiState = "offline";
      return null;
    }
    if (response.status === 404 || response.status === 405) {
      apiState = "offline";
      return null;
    }
    apiState = "online";
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error?.message || "Cheaper alternatives could not complete the request.");
      error.status = response.status;
      error.code = payload.error?.code;
      throw error;
    }
    return payload.data;
  }

  function createClient(adapters) {
    const required = ["getProductById", "getSelectedPrice", "getBestOffer", "getSupplierLabel"];
    required.forEach((name) => {
      if (typeof adapters[name] !== "function") throw new Error(`Brand Equalisation adapter ${name} is required.`);
    });

    function mappingIndex(mappingList) {
      return mappingList.reduce((index, mapping) => {
        if (!index.has(mapping.sourceProductId)) index.set(mapping.sourceProductId, []);
        index.get(mapping.sourceProductId).push(mapping);
        return index;
      }, new Map());
    }

    function isEligiblePair(current, replacement, mapping) {
      if (!current || !replacement || String(current.productId) === String(replacement.id)) return false;
      if (typeof adapters.isEligiblePair === "function"
        && !adapters.isEligiblePair(current, replacement, mapping)) return false;
      return true;
    }

    // One best (lowest replacement pack price) opportunity per basket line.
    function calculateOpportunities(basket) {
      const approved = approvedMappings();
      const mappings = mappingIndex(approved);
      const mappingOrder = new Map(approved.map((mapping, index) => [
        `${mapping.sourceProductId}:${mapping.replacementProductId}`,
        index
      ]));
      const opportunities = basket.flatMap((current) => {
        const currentPrice = adapters.getSelectedPrice(current);
        const currentMappings = mappings.get(String(current.productId)) || [];
        if (typeof currentPrice !== "number" || !Number.isFinite(currentPrice) || !currentMappings.length) return [];

        const candidates = currentMappings.flatMap((mapping) => {
          const replacement = adapters.getProductById(mapping.replacementProductId);
          if (!isEligiblePair(current, replacement, mapping)) return [];
          const recommendedOffer = adapters.getBestOffer(replacement);
          if (!recommendedOffer || typeof recommendedOffer.price !== "number") return [];
          const drugTariffPrice = Number(replacement.tariff);
          if (!Number.isFinite(drugTariffPrice) || recommendedOffer.price > drugTariffPrice) return [];
          if (!(recommendedOffer.price < currentPrice)) return [];

          const savingPerPack = currentPrice - recommendedOffer.price;
          const currentTotalCost = currentPrice * current.quantity;
          const totalSaving = savingPerPack * current.quantity;
          if (!(money(totalSaving) > 0) || !(currentTotalCost > 0)) return [];

          return [{
            lineId: current.lineId,
            mapping,
            equivalentGroupId: mapping.equivalentGroupId || "",
            currentProductId: String(current.productId),
            currentName: current.name,
            currentPip: current.pip,
            currentType: current.productType || "Product",
            currentPackSize: current.packSize || "",
            currentSupplierId: current.selectedSupplier,
            currentSupplier: adapters.getSupplierLabel(current.selectedSupplier),
            currentPrice,
            quantity: current.quantity,
            replacementProductId: String(replacement.id),
            replacementName: replacement.name,
            replacementPip: replacement.pip,
            replacementType: replacement.productType || "Product",
            replacementPackSize: replacement.packSize || "",
            recommendedOffer: { ...recommendedOffer },
            recommendedSupplier: recommendedOffer.supplierLabel,
            recommendedPrice: recommendedOffer.price,
            savingPerPack: money(savingPerPack),
            totalSaving: money(totalSaving)
          }];
        });

        const best = candidates.sort((a, b) => a.recommendedPrice - b.recommendedPrice
          || a.replacementProductId.localeCompare(b.replacementProductId))[0];
        return best ? [best] : [];
      });
      return opportunities.sort((a, b) => {
        const aOrder = mappingOrder.get(`${a.currentProductId}:${a.replacementProductId}`) ?? Number.MAX_SAFE_INTEGER;
        const bOrder = mappingOrder.get(`${b.currentProductId}:${b.replacementProductId}`) ?? Number.MAX_SAFE_INTEGER;
        return aOrder - bOrder;
      });
    }

    function basketPayload(basket) {
      return basket.map((line) => ({
        lineId: line.lineId,
        productId: String(line.productId),
        name: line.name,
        pip: line.pip,
        productType: line.productType || "Product",
        packSize: line.packSize || "",
        quantity: line.quantity,
        currentPrice: adapters.getSelectedPrice(line),
        currentSupplierId: line.selectedSupplier || "",
        currentSupplier: adapters.getSupplierLabel(line.selectedSupplier)
      }));
    }

    function summaryFrom(opportunities) {
      return {
        hasBrandOpportunity: opportunities.length > 0,
        opportunityCount: opportunities.length,
        totalPotentialSaving: money(opportunities.reduce((sum, item) => sum + item.totalSaving, 0)),
        opportunityLineIds: opportunities.map((item) => item.lineId),
        opportunityKey: opportunityKey(opportunities)
      };
    }

    async function getSummary(basket) {
      const remote = await apiRequest("summary", { basket: basketPayload(basket) });
      if (remote) return remote;
      return summaryFrom(calculateOpportunities(basket));
    }

    async function getOpportunities(basket) {
      const remote = await apiRequest("details", { basket: basketPayload(basket) });
      if (remote) return remote;
      return calculateOpportunities(basket);
    }

    async function recordSwitch(opportunity, context = {}) {
      const line = {
        lineId: opportunity.lineId,
        productId: opportunity.currentProductId,
        name: opportunity.currentName,
        pip: opportunity.currentPip,
        productType: opportunity.currentType,
        packSize: opportunity.currentPackSize || "",
        quantity: opportunity.quantity,
        currentPrice: opportunity.currentPrice,
        currentSupplierId: opportunity.currentSupplierId,
        currentSupplier: opportunity.currentSupplier
      };
      const remote = await apiRequest("switch", {
        line,
        replacementProductId: opportunity.replacementProductId,
        context
      }, context.user);
      const record = remote ? {
        id: remote.id,
        originalProductId: remote.currentProductId,
        originalProductName: remote.currentName,
        originalPipCode: remote.currentPip,
        originalProductType: remote.currentType,
        replacementProductId: remote.replacementProductId,
        replacementProductName: remote.replacementName,
        replacementPipCode: remote.replacementPip,
        replacementProductType: remote.replacementType,
        originalSupplier: remote.currentSupplier,
        replacementSupplier: remote.recommendedSupplier,
        originalPrice: money(remote.currentPrice),
        replacementPrice: money(remote.recommendedPrice),
        quantity: remote.quantity,
        estimatedSaving: money(remote.totalSaving),
        user: remote.user,
        customer: remote.customer,
        dateTime: remote.dateTime,
        orderReference: remote.orderReference,
        orderId: remote.orderId || remote.orderReference,
        customerId: remote.customerId || context.customerId || remote.customer,
        switchSource: remote.switchSource || context.switchSource || "Individual",
        action: remote.action || "Equalised"
      } : {
        id: global.crypto?.randomUUID?.() || `brand-switch-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        originalProductId: opportunity.currentProductId,
        originalProductName: opportunity.currentName,
        originalPipCode: opportunity.currentPip,
        originalProductType: opportunity.currentType,
        replacementProductId: opportunity.replacementProductId,
        replacementProductName: opportunity.replacementName,
        replacementPipCode: opportunity.replacementPip,
        replacementProductType: opportunity.replacementType,
        originalSupplier: opportunity.currentSupplier,
        replacementSupplier: opportunity.recommendedSupplier,
        originalPrice: money(opportunity.currentPrice),
        replacementPrice: money(opportunity.recommendedPrice),
        quantity: opportunity.quantity,
        estimatedSaving: money(opportunity.totalSaving),
        user: context.user || "Unknown user",
        customer: context.customer || "Unknown customer",
        dateTime: new Date().toISOString(),
        orderReference: context.orderReference || null,
        orderId: context.orderId || context.orderReference || null,
        customerId: context.customerId || context.customer || "Unknown customer",
        switchSource: context.switchSource || "Individual",
        action: "Equalised"
      };
      const history = readHistory();
      history.unshift(record);
      writeHistory(history.slice(0, 500));
      return record;
    }

    // Undo is its own audit action; the original switch record is never changed.
    async function recordUndo(equalisation, context = {}) {
      const remote = await apiRequest("undo", {
        switchId: equalisation.auditId,
        context
      }, context.user);
      const record = remote ? {
        ...remote,
        originalProductId: equalisation.originalProductId,
        originalProductName: equalisation.originalName,
        originalPipCode: equalisation.originalPip,
        replacementProductId: equalisation.replacementProductId,
        replacementProductName: equalisation.replacementName,
        replacementPipCode: equalisation.replacementPip,
        estimatedSaving: equalisation.estimatedSaving
      } : {
        id: global.crypto?.randomUUID?.() || `brand-undo-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        action: "Undo",
        parentSwitchId: equalisation.auditId,
        undoBy: context.user || "Unknown user",
        undoAt: new Date().toISOString(),
        orderId: context.orderId || context.orderReference || null,
        customerId: context.customerId || context.customer || "Unknown customer",
        originalProductId: equalisation.originalProductId,
        originalProductName: equalisation.originalName,
        originalPipCode: equalisation.originalPip,
        replacementProductId: equalisation.replacementProductId,
        replacementProductName: equalisation.replacementName,
        replacementPipCode: equalisation.replacementPip,
        estimatedSaving: equalisation.estimatedSaving
      };
      const history = readHistory();
      history.unshift(record);
      writeHistory(history.slice(0, 500));
      return record;
    }

    return {
      getSummary,
      getOpportunities,
      recordSwitch,
      recordUndo,
      getHistory: readHistory
    };
  }

  // Changes when a line, replacement, quantity or saving changes (used to reset a dismissed banner).
  function opportunityKey(opportunities) {
    return opportunities
      .map((item) => `${item.lineId}:${item.replacementProductId}:${item.quantity}:${item.totalSaving}`)
      .join("|");
  }

  global.CascadeBrandEqualisation = {
    createClient,
    getApprovedMappings: approvedMappings,
    getHistory: readHistory,
    opportunityKey,
    money,
    storageKeys: { admin: ADMIN_STORAGE_KEY, history: HISTORY_STORAGE_KEY }
  };
})(window);
