(function initialiseOrderReport(global) {
  "use strict";

  const SUBMITTED_ORDERS_STORAGE_KEY = "cascade-submitted-orders-v1";
  const DEFAULT_FROM = "2026-10-09";
  const DEFAULT_TO = "2026-10-15";
  const DEFAULT_SUPPLIER = "--Select Supplier--";
  const DEFAULT_PHARMACY = "Dummy";
  const DEFAULT_OPTIMISATION = "All";
  const EMPTY_VALUE = "—";
  const OPTIMISATION_TYPES = {
    brand: "Brand ↔ Generic",
    generic: "Brand ↔ Generic",
    "brand generic": "Brand ↔ Generic",
    "brand generic switch": "Brand ↔ Generic",
    "brand ↔ generic": "Brand ↔ Generic",
    "brand <-> generic": "Brand ↔ Generic",
    equalisation: "Brand ↔ Generic",
    equalised: "Brand ↔ Generic",
    "pack size": "Pack Size",
    pack: "Pack Size",
    pi: "PI",
    "parallel import": "PI"
  };

  const body = document.querySelector("#orderReportBody");
  if (!body) return;

  const controls = {
    from: document.querySelector('input[aria-label="From date"]'),
    to: document.querySelector('input[aria-label="To date"]'),
    orderId: document.querySelector('input[aria-label="Order ID"]'),
    product: document.querySelector('input[aria-label="Product"]'),
    supplier: document.querySelector('select[aria-label="Supplier"]'),
    pharmacy: document.querySelector('select[aria-label="Pharmacy"]'),
    optimisation: document.querySelector('select[aria-label="Change Type"]'),
    entries: document.querySelector("#entriesPerPage"),
    requestedTotal: document.querySelector("#requestedQtyTotal"),
    receivedTotal: document.querySelector("#receivedQtyTotal"),
    footerCount: document.querySelector(".table-footer > span"),
    pagination: document.querySelector(".pagination"),
    search: document.querySelector(".green-button"),
    reset: document.querySelector(".soft-button"),
    download: document.querySelector(".download-toggle")
  };

  function numberOrNull(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function money(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatCurrency(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return EMPTY_VALUE;
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(value));
  }

  function canonicalOptimisationType(value, hasChangeMetadata = false) {
    const key = String(value || "").trim().toLowerCase();
    if (/^no optimi[sz]ation$/.test(key)) return "";
    if (key.includes("brand") && key.includes("generic")) return "Brand ↔ Generic";
    if (OPTIMISATION_TYPES[key]) return OPTIMISATION_TYPES[key];
    return hasChangeMetadata ? "Brand ↔ Generic" : "";
  }

  function productChangeMetadata(product) {
    return product?.optimisation || product?.optimization || product?.equalisation || null;
  }

  function packUnits(value) {
    const direct = numberOrNull(value);
    if (direct && direct > 0) return direct;
    const text = String(value || "").trim();
    const namedPack = text.match(/(?:\bx\s*|\()(\d+(?:\.\d+)?)\)?\s*$/i);
    if (namedPack) return Number(namedPack[1]);
    const match = text.match(/(\d+(?:\.\d+)?)\s*(?:tablets?|tabs?|capsules?|caps?|units?|inhalers?|ml|g)?\s*$/i);
    return match ? Number(match[1]) : null;
  }

  function isSuccessfulOutcome(outcome) {
    const receivedQty = numberOrNull(outcome?.receivedQty) || 0;
    if (receivedQty <= 0) return false;
    const status = String(outcome?.status || "").trim().toLowerCase();
    return !/(out of stock|cannot supply|not fulfilled|failed|rejected|cancelled|manufacturer unable|unavailable)/.test(status);
  }

  function confirmedSaving(product, outcome) {
    const change = productChangeMetadata(product);
    if (!change || !isSuccessfulOutcome(outcome)) return null;

    const originalPrice = numberOrNull(
      change.originalComparisonPrice ?? change.originalPrice ?? change.comparisonPriceSnapshot
    );
    const acceptedPrice = numberOrNull(
      outcome.acceptedPrice ?? outcome.finalAcceptedPrice ?? outcome.price ?? product.finalAcceptedPrice
    );
    const receivedQty = numberOrNull(outcome.receivedQty) || 0;
    if (originalPrice === null || acceptedPrice === null || receivedQty <= 0) return null;

    const optimisationType = canonicalOptimisationType(
      change.optimisationType ?? change.optimizationType ?? change.type,
      true
    );
    let originalEquivalentQuantity = receivedQty;
    if (optimisationType === "Pack Size") {
      const originalUnits = packUnits(
        change.originalUnitsPerPack
          ?? change.originalPackQuantity
          ?? change.originalPackSize
          ?? change.originalProductName
          ?? change.originalName
      );
      const finalUnits = packUnits(
        change.finalUnitsPerPack
          ?? change.replacementUnitsPerPack
          ?? change.finalPackSize
          ?? change.replacementPackSize
          ?? change.replacementProductName
          ?? change.replacementName
          ?? product.finalProductName
          ?? product.description
      );
      if (originalUnits && finalUnits) {
        originalEquivalentQuantity = receivedQty * (finalUnits / originalUnits);
      }
    }

    return money((originalPrice * originalEquivalentQuantity) - (acceptedPrice * receivedQty));
  }

  function dateKeyFromReportDate(value) {
    const match = String(value || "").match(/^(\d{1,2})\s+([A-Z][a-z]{2})\s+(\d{4})/);
    if (!match) return "";
    const months = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };
    return `${match[3]}-${months[match[2]] || "01"}-${String(match[1]).padStart(2, "0")}`;
  }

  function formatReportDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(date).replace(" at ", ", ");
  }

  function signedInUser() {
    try {
      return global.sessionStorage.getItem("cascade.activeUser") || "";
    } catch (_error) {
      return "";
    }
  }

  function seedOperator(orderId, dateText, existingValue) {
    const cutoff = new Date(2026, 6, 14, 11, 58);
    const dateKey = dateKeyFromReportDate(dateText);
    const timeMatch = String(dateText).match(/,\s*(\d{2}):(\d{2})$/);
    const date = dateKey && timeMatch
      ? new Date(`${dateKey}T${timeMatch[1]}:${timeMatch[2]}:00`)
      : new Date(0);
    if (date <= cutoff) return "Not Recorded";
    return ({ "336291": "sam", "336278": "chris" })[orderId]
      || signedInUser()
      || existingValue
      || "Not Recorded";
  }

  function parseSeedRows() {
    return [...body.querySelectorAll("tr")].flatMap((row) => {
      const cells = [...row.children].map((cell) => cell.textContent.trim());
      if (cells.length < 9) return [];
      const time = String(cells[1]).match(/,\s*(\d{2}:\d{2})$/)?.[1] || "00:00";
      const dateKey = dateKeyFromReportDate(cells[1]);
      return [{
        orderId: cells[0],
        date: cells[1],
        dateKey,
        dateSort: `${dateKey}T${time}`,
        pip: cells[2],
        originallyRequestedProduct: "",
        product: cells[3],
        optimisationType: "",
        supplier: cells[4],
        receivedQty: numberOrNull(cells[5]) || 0,
        requestedQty: numberOrNull(cells[6]) || 0,
        comment: cells[7],
        confirmedSaving: null,
        orderPlacedBy: seedOperator(cells[0], cells[1], cells[8]),
        pharmacy: DEFAULT_PHARMACY,
        category: ""
      }];
    });
  }

  function readSubmittedOrders() {
    try {
      const stored = JSON.parse(global.localStorage.getItem(SUBMITTED_ORDERS_STORAGE_KEY) || "[]");
      // Numeric order IDs only: orders saved before them (e.g. "OPMVQIWT8V") are not shown.
      return Array.isArray(stored) ? stored.filter((order) => /^\d+$/.test(String(order?.id))) : [];
    } catch (_error) {
      return [];
    }
  }

  function orderRows(order) {
    const orderDate = formatReportDate(order.dateIso);
    const dateKey = String(order.dateIso || "").slice(0, 10);
    return (order.products || []).flatMap((product) => {
      const change = productChangeMetadata(product);
      const optimisationType = change
        ? canonicalOptimisationType(change.optimisationType ?? change.optimizationType ?? change.type, true)
        : "";
      const outcomes = Array.isArray(product.outcomes) && product.outcomes.length
        ? product.outcomes
        : [{
          supplier: product.finalSupplier || product.fulfilledBy || "",
          requestedQty: product.requestedQty,
          receivedQty: product.receivedQty,
          status: product.status,
          comment: "",
          price: product.finalAcceptedPrice
        }];
      return outcomes.map((outcome) => ({
        orderId: String(order.id || ""),
        orderLineId: product.orderLineId || product.lineId || "",
        date: orderDate,
        dateKey,
        dateSort: String(order.dateIso || dateKey),
        pip: String(product.finalPipCode || outcome.pip || product.pip || ""),
        originallyRequestedProduct: change
          ? String(change.originalProductName || change.originalName || "")
          : "",
        product: String(product.finalProductName || product.description || product.name || ""),
        optimisationType,
        supplier: String(outcome.supplier || product.finalSupplier || product.fulfilledBy || ""),
        receivedQty: numberOrNull(outcome.receivedQty) || 0,
        requestedQty: numberOrNull(outcome.requestedQty ?? product.requestedQty) || 0,
        comment: String(outcome.comment || outcome.status || ""),
        confirmedSaving: confirmedSaving(product, outcome),
        orderPlacedBy: String(order.orderedBy || "Not Recorded"),
        pharmacy: String(order.customer || DEFAULT_PHARMACY),
        category: String(product.category || "")
      }));
    });
  }

  function historyReportRows(seedRows) {
    const submitted = readSubmittedOrders();
    const fixtures = Array.isArray(global.orderHistoryData) ? global.orderHistoryData : [];
    const submittedIds = new Set(submitted.map((order) => String(order?.id || "")));
    const seedIds = new Set(seedRows.map((row) => row.orderId));
    return [
      ...submitted,
      ...fixtures.filter((order) => !submittedIds.has(String(order?.id || "")))
    ]
      .filter((order) => order && !seedIds.has(String(order.id || "")))
      .flatMap(orderRows);
  }

  const seedRows = parseSeedRows();
  const reportRows = [...seedRows, ...historyReportRows(seedRows)];
  let filteredReportRows = reportRows;
  let currentPage = 1;
  let sortState = { key: "", direction: "ascending" };

  function appendPharmacyOptions(rows) {
    const current = controls.pharmacy.value;
    const known = new Set([...controls.pharmacy.options].map((option) => option.value));
    rows.map((row) => row.pharmacy).filter(Boolean).sort().forEach((pharmacy) => {
      if (known.has(pharmacy)) return;
      controls.pharmacy.add(new Option(pharmacy, pharmacy));
      known.add(pharmacy);
    });
    controls.pharmacy.value = current;
  }

  function cell(value, className = "") {
    const display = value === null || value === undefined || value === "" ? EMPTY_VALUE : String(value);
    return `<td${className ? ` class="${className}"` : ""} title="${escapeHtml(display)}">${escapeHtml(display)}</td>`;
  }

  function productChangeCell(row) {
    const originalProduct = String(row.originallyRequestedProduct || "").trim();
    const finalProduct = String(row.product || "").trim();
    const title = originalProduct
      ? `${originalProduct} → ${finalProduct}`
      : finalProduct || EMPTY_VALUE;
    const content = originalProduct
      ? `<div class="product-change">
          <span class="product-name">${escapeHtml(originalProduct)}</span>
          <span class="product-change-final"><span class="product-change-arrow" aria-hidden="true">→</span><span class="product-name">${escapeHtml(finalProduct || EMPTY_VALUE)}</span></span>
        </div>`
      : `<span class="product-name">${escapeHtml(finalProduct || EMPTY_VALUE)}</span>`;
    return `<td class="product-change-cell" title="${escapeHtml(title)}">${content}</td>`;
  }

  function supplierCommentCell(value) {
    const display = value === null || value === undefined || value === "" ? EMPTY_VALUE : String(value);
    return `<td class="supplier-comment-cell" title="${escapeHtml(display)}"><span class="supplier-comment">${escapeHtml(display)}</span></td>`;
  }

  function displayedChangeType(value) {
    return value === "Pack Size" || value === "PI" ? "" : value;
  }

  function rowTemplate(row) {
    return `<tr>
      ${cell(row.orderId)}
      ${cell(row.date)}
      ${cell(row.pip)}
      ${productChangeCell(row)}
      ${cell(displayedChangeType(row.optimisationType))}
      ${cell(row.supplier)}
      ${cell(row.requestedQty)}
      ${cell(row.receivedQty)}
      ${supplierCommentCell(row.comment)}
      ${cell(row.confirmedSaving === null ? "" : formatCurrency(row.confirmedSaving), "confirmed-saving")}
      ${cell(row.orderPlacedBy)}
    </tr>`;
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString("en-GB");
  }

  function currentFilters() {
    return {
      from: controls.from.value,
      to: controls.to.value,
      orderId: controls.orderId.value.trim(),
      product: controls.product.value.trim().toLowerCase(),
      supplier: controls.supplier.value,
      pharmacy: controls.pharmacy.value,
      optimisation: controls.optimisation.value
    };
  }

  function rowMatchesFilters(row, filters) {
    const matchesFrom = !filters.from || row.dateKey >= filters.from;
    const matchesTo = !filters.to || row.dateKey <= filters.to;
    const matchesOrderId = !filters.orderId || row.orderId === filters.orderId;
    const searchableProduct = `${row.originallyRequestedProduct} ${row.product} ${row.pip}`.toLowerCase();
    const matchesProduct = !filters.product || searchableProduct.includes(filters.product);
    const matchesSupplier = filters.supplier === DEFAULT_SUPPLIER || row.supplier === filters.supplier;
    const matchesPharmacy = !filters.pharmacy || row.pharmacy === filters.pharmacy;
    const matchesOptimisation = filters.optimisation === "All"
      || (filters.optimisation === "Product Changes Only" && Boolean(row.optimisationType))
      || (filters.optimisation === "No Optimisation" && !row.optimisationType)
      || row.optimisationType === filters.optimisation;
    return matchesFrom && matchesTo && matchesOrderId && matchesProduct
      && matchesSupplier && matchesPharmacy && matchesOptimisation;
  }

  function orderLineKey(row) {
    return row.orderLineId
      ? `${row.orderId}|${row.orderLineId}`
      : `${row.orderId}|${row.pip}|${row.product}|${row.originallyRequestedProduct}`;
  }

  function renderQuantityTotals(rows) {
    const requestedByLine = new Map();
    rows.forEach((row) => {
      const key = orderLineKey(row);
      requestedByLine.set(key, Math.max(requestedByLine.get(key) || 0, row.requestedQty));
    });
    const requested = [...requestedByLine.values()].reduce((sum, quantity) => sum + quantity, 0);
    const received = rows.reduce((sum, row) => sum + row.receivedQty, 0);
    controls.requestedTotal.textContent = formatNumber(requested);
    controls.receivedTotal.textContent = formatNumber(received);
  }

  function sortedRows(rows) {
    if (!sortState.key) return [...rows];
    const numericKeys = new Set(["receivedQty", "requestedQty", "confirmedSaving"]);
    const direction = sortState.direction === "ascending" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const aValue = a[sortState.key];
      const bValue = b[sortState.key];
      if (numericKeys.has(sortState.key)) {
        const aNumber = numberOrNull(aValue) ?? Number.NEGATIVE_INFINITY;
        const bNumber = numberOrNull(bValue) ?? Number.NEGATIVE_INFINITY;
        return (aNumber - bNumber) * direction;
      }
      return String(aValue || "").localeCompare(String(bValue || ""), "en-GB", {
        numeric: true,
        sensitivity: "base"
      }) * direction;
    });
  }

  function renderPagination(totalRows, pageSize) {
    if (!totalRows) {
      controls.pagination.innerHTML = "";
      return;
    }
    const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
    currentPage = Math.min(Math.max(1, currentPage), pageCount);
    const firstPage = Math.max(1, Math.min(currentPage - 2, pageCount - 4));
    const lastPage = Math.min(pageCount, firstPage + 4);
    const pageButtons = Array.from({ length: lastPage - firstPage + 1 }, (_, index) => firstPage + index)
      .map((page) => `<button class="page-button${page === currentPage ? " active" : ""}" type="button" data-page="${page}" ${page === currentPage ? 'aria-current="page"' : ""}>${page}</button>`)
      .join("");
    controls.pagination.innerHTML = `
      <button class="page-button" type="button" data-page="${currentPage - 1}" aria-label="Previous" ${currentPage === 1 ? "disabled" : ""}>&lsaquo;</button>
      ${pageButtons}
      <button class="page-button" type="button" data-page="${currentPage + 1}" aria-label="Next" ${currentPage === pageCount ? "disabled" : ""}>&rsaquo;</button>
    `;
  }

  function renderRows(rows) {
    const pageSize = Number(controls.entries.value) || 10;
    const orderedRows = sortedRows(rows);
    const pageCount = Math.max(1, Math.ceil(orderedRows.length / pageSize));
    currentPage = Math.min(Math.max(1, currentPage), pageCount);
    const startIndex = (currentPage - 1) * pageSize;
    const visibleRows = orderedRows.slice(startIndex, startIndex + pageSize);
    body.innerHTML = visibleRows.length
      ? visibleRows.map(rowTemplate).join("")
      : '<tr><td colspan="11">No order report lines match the selected filters.</td></tr>';
    const end = Math.min(orderedRows.length, startIndex + visibleRows.length);
    controls.footerCount.textContent = orderedRows.length
      ? `Showing ${startIndex + 1} to ${end} of ${formatNumber(orderedRows.length)} entries`
      : "Showing 0 to 0 of 0 entries";
    renderPagination(orderedRows.length, pageSize);
  }

  function applyReportFilters() {
    const filters = currentFilters();
    filteredReportRows = reportRows.filter((row) => rowMatchesFilters(row, filters));
    currentPage = 1;
    renderRows(filteredReportRows);
    renderQuantityTotals(filteredReportRows);
  }

  function ensureOption(select, value) {
    if (!value) return;
    if (![...select.options].some((option) => option.value === value)) {
      select.add(new Option(value, value));
    }
    select.value = value;
  }

  function applyNavigationFilters() {
    const params = new URLSearchParams(global.location.search);
    const orderId = params.get("orderId") || "";
    if (!orderId) return false;

    controls.orderId.value = orderId;
    ensureOption(controls.pharmacy, params.get("pharmacy") || DEFAULT_PHARMACY);
    controls.optimisation.value = params.get("optimisation") === "product-changes"
      ? "Product Changes Only"
      : DEFAULT_OPTIMISATION;
    const matchingDate = params.get("orderDate")
      || reportRows.find((row) => row.orderId === orderId)?.dateKey
      || "";
    if (matchingDate) {
      controls.from.value = matchingDate;
      controls.to.value = matchingDate;
    }
    return true;
  }

  function resetFilters() {
    controls.from.value = DEFAULT_FROM;
    controls.to.value = DEFAULT_TO;
    controls.orderId.value = "";
    controls.product.value = "";
    controls.supplier.value = DEFAULT_SUPPLIER;
    ensureOption(controls.pharmacy, DEFAULT_PHARMACY);
    controls.optimisation.value = DEFAULT_OPTIMISATION;
    try {
      global.history.replaceState(null, "", global.location.pathname);
    } catch (_error) {
      // Filter reset still works when history state is unavailable (for example, local file previews).
    }
    applyReportFilters();
  }

  function csvValue(value) {
    return `"${String(value ?? "").replaceAll('"', '""')}"`;
  }

  function downloadCsv() {
    const headers = [
      "Order ID", "Date", "PIP Code", "Pre-Change Product", "Final Product",
      "Change Type", "Supplier Name", "Req. Qty", "Rec. Qty", "Supplier Comment",
      "Confirmed Saving", "Order Placed By"
    ];
    const lines = [headers, ...sortedRows(filteredReportRows).map((row) => [
      row.orderId,
      row.date,
      row.pip,
      row.originallyRequestedProduct,
      row.product,
      displayedChangeType(row.optimisationType),
      row.supplier,
      row.requestedQty,
      row.receivedQty,
      row.comment,
      row.confirmedSaving === null ? "" : formatCurrency(row.confirmedSaving),
      row.orderPlacedBy
    ])].map((values) => values.map(csvValue).join(","));
    const url = URL.createObjectURL(new Blob([`\ufeff${lines.join("\r\n")}`], { type: "text/csv;charset=utf-8" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: "order-report.csv" });
    link.click();
    URL.revokeObjectURL(url);
  }

  document.querySelectorAll('input[type="date"]').forEach((input) => {
    const openDatePicker = () => {
      if (typeof input.showPicker !== "function") return;
      try {
        input.showPicker();
      } catch (_error) {
        input.focus();
      }
    };
    input.addEventListener("focus", openDatePicker);
    input.addEventListener("click", openDatePicker);
  });

  controls.search.addEventListener("click", applyReportFilters);
  controls.reset.addEventListener("click", resetFilters);
  controls.entries.addEventListener("change", applyReportFilters);
  controls.download.addEventListener("click", downloadCsv);
  controls.pagination.addEventListener("click", (event) => {
    const button = event.target.closest("[data-page]");
    if (!button || button.disabled) return;
    currentPage = Number(button.dataset.page) || 1;
    renderRows(filteredReportRows);
  });
  document.querySelectorAll("th[data-sort-key]").forEach((header) => {
    const trigger = header.querySelector(".sort");
    const activateSort = () => {
      const key = header.dataset.sortKey;
      sortState = {
        key,
        direction: sortState.key === key && sortState.direction === "ascending"
          ? "descending"
          : "ascending"
      };
      document.querySelectorAll("th[data-sort-key]").forEach((item) => item.removeAttribute("aria-sort"));
      header.setAttribute("aria-sort", sortState.direction);
      currentPage = 1;
      renderRows(filteredReportRows);
    };
    trigger.addEventListener("click", activateSort);
    trigger.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      activateSort();
    });
  });
  controls.orderId.addEventListener("keydown", (event) => {
    if (event.key === "Enter") applyReportFilters();
  });
  global.addEventListener("cascade:active-user-changed", () => {
    seedRows.forEach((row) => {
      row.orderPlacedBy = seedOperator(row.orderId, row.date, row.orderPlacedBy);
    });
    applyReportFilters();
  });

  appendPharmacyOptions(reportRows);
  applyNavigationFilters();
  applyReportFilters();

  global.CascadeOrderReport = {
    canonicalOptimisationType,
    confirmedSaving,
    productChangeMetadata,
    orderRows,
    applyReportFilters,
    getFilteredRows: () => [...filteredReportRows],
    getVisibleRows: () => sortedRows(filteredReportRows).slice(
      (currentPage - 1) * (Number(controls.entries.value) || 10),
      currentPage * (Number(controls.entries.value) || 10)
    )
  };
})(window);
