// Shared supplier spend targets (a maximum spend cap per supplier).
// settings.html writes them; the Supplier Target Report (supplier-target-report.html) and the Dashboard
// card read them.
// Targets only inform: they never block an order or change the cascade.
//
// A saved target:
//   { supplierId, supplier, amount, frequency, startDate, until, endDate, savedAt, savedAtText, savedBy }
//   frequency "week" | "month" | "quarter": the cap starts again every week, month or quarter from startDate;
//     until ("YYYY-MM-DD" or "") is the last day a new period can start ("" repeats with no end date).
//   frequency "range": one cap from startDate to endDate ("Specific dates").
// Spend = received quantity x price of each supplier outcome in Order History, the same rule as the Daily
// Threshold; out-of-stock lines add nothing.
(function initialiseSupplierTargets(globalScope, factory) {
  const api = factory(globalScope);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (globalScope) {
    globalScope.CascadeSupplierTargets = api;
  }
})(typeof window !== "undefined" ? window : null, function createSupplierTargetsApi(globalScope) {
  "use strict";

  const TARGETS_KEY = "cascadeSupplierTargets";
  const HISTORY_KEY = "cascadeSupplierTargetHistory";
  const REPORT_URL = "supplier-target-report.html";
  // Wireframe "today": the same date as WIREFRAME_TODAY in daily-threshold.js and historyToday in
  // history.html, so the orders in orderhistory-data.js count towards the current period.
  const TODAY = "2026-10-15";
  const MAX_AMOUNT = 10000000;
  const FREQUENCIES = [
    { value: "week", label: "Weekly", word: "week" },
    { value: "month", label: "Monthly", word: "month" },
    { value: "quarter", label: "Quarterly", word: "quarter" },
    { value: "range", label: "Specific dates", word: "" }
  ];
  // Three statuses, from where spend is heading. Nothing is red, because nothing is blocked.
  const STATUSES = {
    track: { label: "On track", tone: "good", rank: 0 },
    exceed: { label: "Will exceed", tone: "warn", rank: 1 },
    reached: { label: "Cap reached", tone: "over", rank: 2 }
  };

  function storage() {
    try {
      return globalScope ? globalScope.sessionStorage : null;
    } catch (error) {
      return null;
    }
  }

  // Wireframe: like the other settings, targets live in sessionStorage, so every new wireframe
  // session starts with no target set, and refreshing a page returns to that.
  try {
    const store = storage();
    if (store && globalScope.performance?.getEntriesByType("navigation")[0]?.type === "reload") {
      store.removeItem(TARGETS_KEY);
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

  /* ---------- Dates ---------- */
  const pad = (n) => String(n).padStart(2, "0");

  function isoDay(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  // Local midnight from "YYYY-MM-DD"; null when missing or malformed.
  function toDate(day) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(day || ""));
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return date.getMonth() === Number(match[2]) - 1 ? date : null;
  }

  function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  // Same day of the month, kept within shorter months (31 Jan + 1 month = 28/29 Feb).
  function addMonths(date, months) {
    const year = date.getFullYear();
    const month = date.getMonth() + months;
    const lastDay = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(date.getDate(), lastDay));
  }

  function daysBetween(from, to) {
    return Math.round((to - from) / 86400000);
  }

  function formatDate(date) {
    return date ? `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}` : "";
  }

  function formatDay(day) {
    return formatDate(toDate(day));
  }

  function today() {
    return toDate(TODAY);
  }

  function monthStart(day = TODAY) {
    const date = toDate(day) || today();
    return isoDay(new Date(date.getFullYear(), date.getMonth(), 1));
  }

  function monthEnd(day = TODAY) {
    const date = toDate(day) || today();
    return isoDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
  }

  // A recurring end date six months on (the user can change or remove it).
  function defaultUntil(startDate) {
    const start = toDate(startDate) || today();
    return isoDay(addDays(addMonths(start, 6), -1));
  }

  /* ---------- Money ---------- */
  const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const gbpWhole = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 0, maximumFractionDigits: 0 });

  // Whole pounds without pence (£5,000), otherwise two decimals (£5,000.50).
  function formatMoney(value) {
    const amount = Number(value) || 0;
    return Number.isInteger(Math.round(amount * 100) / 100) ? gbpWhole.format(amount) : gbp.format(amount);
  }

  function formatMoney2(value) {
    return gbp.format(Number(value) || 0);
  }

  function cleanAmountText(text) {
    return String(text ?? "").replace(/[£,\s]/g, "");
  }

  // The cap as typed: a number above £0, up to £10,000,000 with at most two decimals; null otherwise.
  function parseAmount(text) {
    const clean = cleanAmountText(text);
    if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
    const amount = Number(clean);
    return amount > 0 && amount <= MAX_AMOUNT ? amount : null;
  }

  function amountError(text) {
    const clean = cleanAmountText(text);
    if (clean === "") return "Enter a maximum cap.";
    if (!/^\d+(\.\d{1,2})?$/.test(clean)) return "Enter an amount in pounds, for example 5000 or 5000.50.";
    const amount = Number(clean);
    if (!(amount > 0)) return "Enter a cap above £0.";
    if (amount > MAX_AMOUNT) return "Enter £10,000,000 or less.";
    return "";
  }

  /* ---------- Schedules ---------- */
  function frequencyLabel(frequency) {
    return FREQUENCIES.find((item) => item.value === frequency)?.label || "";
  }

  function isRecurring(target) {
    return target && target.frequency !== "range";
  }

  // Start of the nth period of a recurring target (n = 0 is the start date).
  function periodStart(target, start, n) {
    if (target.frequency === "week") return addDays(start, 7 * n);
    return addMonths(start, (target.frequency === "quarter" ? 3 : 1) * n);
  }

  // Returns an error message for a target's schedule, or "" when it can be saved.
  function scheduleError(target, asOf = TODAY) {
    if (!target) return "";
    const day = toDate(asOf);
    const start = toDate(target.startDate);
    if (target.frequency === "range") {
      const end = toDate(target.endDate);
      if (!start || !end) return "Choose a start date and an end date.";
      if (end < start) return "The end date must be on or after the start date.";
      if (end < day) return "The end date is in the past. Choose a later date.";
      return "";
    }
    if (!FREQUENCIES.some((item) => item.value === target.frequency)) return "Choose a frequency.";
    if (!start) return "Choose a start date.";
    if (target.until) {
      const until = toDate(target.until);
      if (!until) return "Choose a valid end date, or remove it.";
      if (until < start) return "The end date must be on or after the start date.";
      if (until < day) return "The end date is in the past. Choose a later date, or remove it.";
    }
    return "";
  }

  // Where a target is on `asOf`: "active" (with its current period), "scheduled" (starts later) or "ended".
  function periodState(target, asOf = TODAY) {
    const day = toDate(asOf);
    const start = toDate(target?.startDate);
    if (!target || !start || !day) return { status: "ended" };
    if (target.frequency === "range") {
      const end = toDate(target.endDate);
      if (!end) return { status: "ended" };
      if (day < start) return { status: "scheduled", next: start };
      if (day > end) return { status: "ended", ended: end };
      return { status: "active", period: { start, end } };
    }
    if (day < start) return { status: "scheduled", next: start };
    let n = 0;
    while (n < 5000 && periodStart(target, start, n + 1) <= day) n += 1;
    const current = periodStart(target, start, n);
    const until = toDate(target.until);
    if (until && current > until) return { status: "ended", ended: until };
    return { status: "active", period: { start: current, end: addDays(periodStart(target, start, n + 1), -1) } };
  }

  function periodText(period) {
    return period ? `${formatDate(period.start)} – ${formatDate(period.end)}` : "";
  }

  // One line for the schedule (Settings, confirmation and history).
  function scheduleSummary(target) {
    if (!target) return "";
    if (target.frequency === "range") return `${formatDay(target.startDate)} to ${formatDay(target.endDate)}`;
    return `${frequencyLabel(target.frequency)} from ${formatDay(target.startDate)}${target.until ? ` to ${formatDay(target.until)}` : ""}`;
  }

  // Plain sentence under the scheduler, e.g. "AAH is capped at £5,000 every month from 01/10/2026, with no end date."
  function sentence(name, target, asOf = TODAY) {
    const amount = Number(target.amount) > 0 ? formatMoney(target.amount) : "the cap you enter";
    let text;
    if (target.frequency === "range") {
      text = `${name} is capped at ${amount} from ${formatDay(target.startDate)} to ${formatDay(target.endDate)}.`;
    } else {
      const word = FREQUENCIES.find((item) => item.value === target.frequency)?.word || "month";
      text = `${name} is capped at ${amount} every ${word} from ${formatDay(target.startDate)}${target.until ? `, until ${formatDay(target.until)}` : ", with no end date"}.`;
    }
    const state = periodState(target, asOf);
    if (state.status === "active") text += ` Current period: ${periodText(state.period)}.`;
    else if (state.status === "scheduled") text += ` It starts on ${formatDate(state.next)}.`;
    return text;
  }

  /* ---------- Saved targets ---------- */
  function validTargets(list) {
    return Array.isArray(list) ? list.filter((entry) => entry && entry.supplierId && Number(entry.amount) > 0) : [];
  }

  function getTargets() {
    return validTargets(readJson(TARGETS_KEY, []));
  }

  function getTarget(supplierId) {
    return getTargets().find((entry) => entry.supplierId === supplierId) || null;
  }

  // Replaces every saved target (Settings saves all suppliers together).
  function setTargets(list) {
    writeJson(TARGETS_KEY, validTargets(list || []));
  }

  /* ---------- History ---------- */
  // One entry per supplier changed in a save; entries are only added, never changed.
  function getHistory() {
    const list = readJson(HISTORY_KEY, []);
    return Array.isArray(list) ? list.filter((entry) => entry && entry.supplierId && entry.at) : [];
  }

  function addHistory(entries) {
    const list = getHistory();
    (Array.isArray(entries) ? entries : [entries]).forEach((entry) => list.push({ ...entry, at: entry.at || Date.now() }));
    writeJson(HISTORY_KEY, list);
    return list;
  }

  /* ---------- Spend ---------- */
  function orders() {
    return Array.isArray(globalScope?.orderHistoryData) ? globalScope.orderHistoryData : [];
  }

  // Spend in pence per "supplier|YYYY-MM-DD", worked out once per Order History list.
  let spendCache = { source: null, byDay: null };
  function spendByDay() {
    const list = orders();
    if (spendCache.source === list && spendCache.byDay) return spendCache.byDay;
    const byDay = new Map();
    list.forEach((order) => {
      const day = String(order?.dateIso || "").slice(0, 10);
      (order?.products || []).forEach((product) => (product?.outcomes || []).forEach((outcome) => {
        const received = Number(outcome?.receivedQty) || 0;
        if (received <= 0) return;
        const key = `${outcome.supplier}|${day}`;
        byDay.set(key, (byDay.get(key) || 0) + Math.round(received * (Number(outcome.price) || 0) * 100));
      }));
    });
    spendCache = { source: list, byDay };
    return byDay;
  }

  function spendOn(supplier, date) {
    return (spendByDay().get(`${supplier}|${isoDay(date)}`) || 0) / 100;
  }

  function spendBetween(supplier, from, to) {
    let pence = 0;
    for (let day = new Date(from); day <= to; day = addDays(day, 1)) pence += Math.round(spendOn(supplier, day) * 100);
    return pence / 100;
  }

  /* ---------- Progress ---------- */
  // Progress of a target in its current period on `asOf`; null when it is not running then.
  // Projected = spend so far / days gone x days in the period (a straight-line estimate).
  function evaluate(target, asOf = TODAY) {
    const state = periodState(target, asOf);
    if (state.status !== "active") return null;
    const { start, end } = state.period;
    const day = toDate(asOf);
    const last = day < end ? day : end;
    const totalDays = daysBetween(start, end) + 1;
    const elapsed = Math.max(1, daysBetween(start, last) + 1);
    const spend = spendBetween(target.supplier, start, last);
    const amount = Number(target.amount) || 0;
    const ended = elapsed >= totalDays;
    const projected = ended ? spend : spend / elapsed * totalDays;
    const key = spend >= amount ? "reached" : projected > amount ? "exceed" : "track";
    return {
      target,
      supplierId: target.supplierId,
      supplier: target.supplier,
      frequency: target.frequency,
      period: state.period,
      amount,
      spend,
      remaining: Math.max(0, amount - spend),
      percent: amount ? spend / amount * 100 : 0,
      daysLeft: totalDays - elapsed,
      projected,
      projectedPercent: amount ? projected / amount * 100 : 0,
      status: key,
      statusLabel: STATUSES[key].label,
      tone: STATUSES[key].tone,
      rank: STATUSES[key].rank
    };
  }

  // Every target running on `asOf`, in the saved (supplier) order.
  function currentProgress(asOf = TODAY) {
    return getTargets().map((target) => evaluate(target, asOf)).filter(Boolean);
  }

  // Targets saved but not running on `asOf`, e.g. "Lexon (starts 01/01/2027)".
  function notRunning(asOf = TODAY) {
    return getTargets().map((target) => {
      const state = periodState(target, asOf);
      if (state.status === "scheduled") return { target, text: `${target.supplier} (starts ${formatDate(state.next)})` };
      if (state.status === "ended") return { target, text: `${target.supplier} (ended${state.ended ? ` ${formatDate(state.ended)}` : ""})` };
      return null;
    }).filter(Boolean);
  }

  // The report, optionally opened on one supplier (the Dashboard card links each row this way).
  function reportUrl(supplierId) {
    return supplierId ? `${REPORT_URL}?supplier=${encodeURIComponent(supplierId)}` : REPORT_URL;
  }

  return {
    FREQUENCIES,
    MAX_AMOUNT,
    REPORT_URL,
    STATUSES,
    TODAY,
    addHistory,
    amountError,
    cleanAmountText,
    currentProgress,
    defaultUntil,
    evaluate,
    formatDate,
    formatDay,
    formatMoney,
    formatMoney2,
    frequencyLabel,
    getHistory,
    getTarget,
    getTargets,
    isRecurring,
    isoDay,
    monthEnd,
    monthStart,
    notRunning,
    parseAmount,
    periodState,
    periodText,
    reportUrl,
    scheduleError,
    scheduleSummary,
    sentence,
    setTargets,
    toDate
  };
});
