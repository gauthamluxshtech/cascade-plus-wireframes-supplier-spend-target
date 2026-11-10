// Shared supplier lock settings.
// settings.html writes them; Order Pad (app.js) reads them, so a locked supplier is never cascaded to
// and shows as "Locked" (and cannot be selected) in Edit Product. The admin site (Supplier Locks - Admin,
// customers.js) reads the shared localStorage copy to show the customer's locks against Dummy1.
//
// A saved lock is one of:
//   { mode: "always" }                                   locked from the save until switched off
//   { mode: "range", range: { startDate, startTime, endDate, endTime } }
//   { mode: "recurring", recurring: { startDate, startTime, endTime, days: [0..6 Mon-Sun], until } }
// Dates are "YYYY-MM-DD", times "HH:MM" (pharmacy local time). A recurring end time at or before the start
// time ends the next day (e.g. 22:00 - 06:00). An empty `until` repeats with no end date.
(function initialiseSupplierLock(globalScope, factory) {
  const api = factory(globalScope);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (globalScope) {
    globalScope.CascadeSupplierLock = api;
  }
})(typeof window !== "undefined" ? window : null, function createSupplierLockApi(globalScope) {
  "use strict";

  const LOCKS_KEY = "cascadeSupplierLocks";
  const HISTORY_KEY = "cascadeSupplierLockHistory";
  // A copy of the locks and history in localStorage for the admin site (Supplier Locks - Admin), so its
  // Customers > Suppliers tab shows what this pharmacy locked. Both sites must be opened from the same origin.
  const SHARED_LOCKS_KEY = "cascadeCustomerSupplierLocks";
  const SHARED_HISTORY_KEY = "cascadeCustomerSupplierLockHistory";
  // The admin site can unlock a supplier the customer locked: it updates the shared copy, and this
  // site adopts it (see adoptSharedChanges). Its Audit Log entries show this as the user.
  // The pharmacy this wireframe is signed in as (the admin customer of the same name).
  const PHARMACY = "Dummy1";
  const ADMIN_USER = "Admin";
  const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

  function storage() {
    try {
      return globalScope ? globalScope.sessionStorage : null;
    } catch (error) {
      return null;
    }
  }

  function sharedStorage() {
    try {
      return globalScope ? globalScope.localStorage : null;
    } catch (error) {
      return null;
    }
  }

  // The admin site loads this script with data-shared-reader: it only reads the shared copy and must
  // not reset the customer's session when it is refreshed.
  const isSharedReader = typeof document !== "undefined" && Boolean(document.currentScript?.hasAttribute("data-shared-reader"));

  // Wireframe: like the other settings, locks live in sessionStorage, so every new wireframe
  // session starts with no supplier locked, and refreshing a page returns to that.
  try {
    const store = storage();
    if (store && !isSharedReader && globalScope.performance?.getEntriesByType("navigation")[0]?.type === "reload") {
      // Resetting a session that saved locks also withdraws the copy it shared; a session that never
      // saved one leaves another tab's shared copy alone.
      if (store.getItem(LOCKS_KEY) !== null || store.getItem(HISTORY_KEY) !== null) {
        sharedStorage()?.removeItem(SHARED_LOCKS_KEY);
        sharedStorage()?.removeItem(SHARED_HISTORY_KEY);
      }
      store.removeItem(LOCKS_KEY);
      store.removeItem(HISTORY_KEY);
    }
  } catch (error) {
    // Storage is optional in the prototype.
  }

  function readJson(key, fallback, store = storage()) {
    try {
      const raw = store?.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value, store = storage()) {
    try {
      store?.setItem(key, JSON.stringify(value));
    } catch (error) {
      // Storage unavailable: the change applies to this page view only.
    }
  }

  /* ---------- Dates ---------- */
  const pad = (n) => String(n).padStart(2, "0");

  function isoDay(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function hhmm(date) {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  // Local date from "YYYY-MM-DD" and "HH:MM"; null when either is missing or malformed.
  function toDate(day, time = "00:00") {
    const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(day || ""));
    const t = /^(\d{2}):(\d{2})$/.exec(String(time || ""));
    if (!d || !t) return null;
    return new Date(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(t[1]), Number(t[2]));
  }

  function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  // Monday = 0 ... Sunday = 6.
  function weekdayIndex(date) {
    return (date.getDay() + 6) % 7;
  }

  function formatDate(date) {
    return date ? `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}` : "";
  }

  function formatDateTime(date) {
    return date ? `${formatDate(date)} ${hhmm(date)}` : "";
  }

  function formatDay(day) {
    return formatDate(toDate(day));
  }

  // "Mon, Wed, Fri", "Weekdays", "Weekends" or "Every day".
  function daysText(days) {
    const sorted = [...new Set(days || [])].sort((a, b) => a - b);
    const key = sorted.join(",");
    if (key === "0,1,2,3,4,5,6") return "Every day";
    if (key === "0,1,2,3,4") return "Weekdays";
    if (key === "5,6") return "Weekends";
    return sorted.map((day) => DAY_SHORT[day]).join(", ");
  }

  function crossesMidnight(startTime, endTime) {
    return String(endTime) <= String(startTime);
  }

  /* ---------- Validation ---------- */
  // Returns an error message for a lock schedule, or "" when it can be saved.
  function validate(lock, now = new Date()) {
    if (!lock || lock.mode === "always") return "";
    if (lock.mode === "range") {
      const { startDate, startTime, endDate, endTime } = lock.range || {};
      const start = toDate(startDate, startTime);
      const end = toDate(endDate, endTime);
      if (!start || !end) return "Choose a start and end date and time.";
      if (end <= start) return "The end must be after the start.";
      if (end <= now) return "The end is in the past. Choose a later end date or time.";
      return "";
    }
    if (lock.mode === "recurring") {
      const { startDate, startTime, endTime, days, until } = lock.recurring || {};
      if (!toDate(startDate, startTime) || !toDate(startDate, endTime)) return "Choose a start date, start time and end time.";
      if (startTime === endTime) return "The end time must be different from the start time.";
      if (!Array.isArray(days) || !days.length) return "Choose at least one day.";
      if (until && !toDate(until)) return "Choose a valid end date, or remove it.";
      if (until && until < startDate) return "The end date must be on or after the start date.";
      if (until && toDate(until) < toDate(isoDay(now))) return "The end date is in the past. Choose a later date, or remove it.";
      return "";
    }
    return "Choose how the supplier is locked.";
  }

  /* ---------- Lock state ---------- */
  // The recurring lock window that starts on `day` (a local midnight), or null when none starts that day.
  function recurringWindowOn(recurring, day) {
    const dayIso = isoDay(day);
    if (dayIso < recurring.startDate) return null;
    if (recurring.until && dayIso > recurring.until) return null;
    if (!recurring.days.includes(weekdayIndex(day))) return null;
    const start = toDate(dayIso, recurring.startTime);
    let end = toDate(dayIso, recurring.endTime);
    if (crossesMidnight(recurring.startTime, recurring.endTime)) end = addDays(end, 1);
    return { start, end };
  }

  // status: "locked" (locked now), "scheduled" (a lock starts later), "ended" (no lock left) or "off".
  // until: when the current lock ends (null = until switched off); next: when the next lock starts.
  function lockState(lock, now = new Date()) {
    if (!lock || !lock.enabled) return { status: "off", until: null, next: null };
    if (lock.mode === "always") return { status: "locked", until: null, next: null };

    if (lock.mode === "range") {
      const start = toDate(lock.range.startDate, lock.range.startTime);
      const end = toDate(lock.range.endDate, lock.range.endTime);
      if (!start || !end || now >= end) return { status: "ended", until: null, next: null, ended: end };
      if (now < start) return { status: "scheduled", until: null, next: start, nextEnd: end };
      return { status: "locked", until: end, next: null };
    }

    if (lock.mode === "recurring") {
      const recurring = lock.recurring;
      const today = toDate(isoDay(now));
      // A window that began yesterday can still be running (e.g. 22:00 - 06:00).
      for (const offset of [-1, 0]) {
        const slot = recurringWindowOn(recurring, addDays(today, offset));
        if (slot && now >= slot.start && now < slot.end) return { status: "locked", until: slot.end, next: null };
      }
      const from = toDate(recurring.startDate) > today ? toDate(recurring.startDate) : today;
      for (let offset = 0; offset < 8; offset += 1) {
        const slot = recurringWindowOn(recurring, addDays(from, offset));
        if (slot && slot.start > now) return { status: "scheduled", until: null, next: slot.start, nextEnd: slot.end };
      }
      return { status: "ended", until: null, next: null, ended: recurring.until ? toDate(recurring.until, recurring.endTime) : null };
    }

    return { status: "off", until: null, next: null };
  }

  /* ---------- Descriptions ---------- */
  // One line for the schedule (Settings button, confirmation, Audit Log).
  function scheduleSummary(lock) {
    if (!lock || lock.mode === "always") return "Until switched off";
    if (lock.mode === "range") {
      const { startDate, startTime, endDate, endTime } = lock.range;
      return `${formatDay(startDate)} ${startTime} to ${formatDay(endDate)} ${endTime}`;
    }
    const { startTime, endTime, days, until } = lock.recurring;
    const nextDay = crossesMidnight(startTime, endTime) ? " (next day)" : "";
    return `${daysText(days)}, ${startTime} to ${endTime}${nextDay}${until ? `, until ${formatDay(until)}` : ""}`;
  }

  // Audit Log columns: when the lock starts, when it ends and how it repeats.
  function auditPeriod(lock, savedAt) {
    if (!lock || lock.mode === "always") {
      return { from: formatDateTime(savedAt), until: "Until switched off", repeat: "Does not repeat" };
    }
    if (lock.mode === "range") {
      const { startDate, startTime, endDate, endTime } = lock.range;
      return { from: `${formatDay(startDate)} ${startTime}`, until: `${formatDay(endDate)} ${endTime}`, repeat: "Does not repeat" };
    }
    const { startDate, startTime, endTime, days, until } = lock.recurring;
    const nextDay = crossesMidnight(startTime, endTime) ? " (next day)" : "";
    return {
      from: `${formatDay(startDate)} ${startTime}`,
      until: until ? `${formatDay(until)} ${endTime}${nextDay}` : "No end date",
      repeat: `${daysText(days)}, ${startTime} to ${endTime}${nextDay}`
    };
  }

  /* ---------- Saved locks ---------- */
  function enabledLocks(list) {
    return Array.isArray(list) ? list.filter((entry) => entry && entry.supplierId && entry.enabled) : [];
  }

  function getLocks() {
    return enabledLocks(readJson(LOCKS_KEY, []));
  }

  function getLock(supplierId) {
    return getLocks().find((entry) => entry.supplierId === supplierId) || null;
  }

  // Replaces every saved lock (Settings saves all suppliers together).
  function setLocks(list) {
    const locks = enabledLocks(list || []);
    writeJson(LOCKS_KEY, locks);
    writeJson(SHARED_LOCKS_KEY, locks, sharedStorage());
  }

  // The locks the customer site last saved, read from the shared copy (admin site).
  function getCustomerLocks() {
    return enabledLocks(readJson(SHARED_LOCKS_KEY, [], sharedStorage()));
  }

  function isLocked(supplierId, now = new Date()) {
    return lockState(getLock(supplierId), now).status === "locked";
  }

  function lockedSupplierIds(now = new Date()) {
    return getLocks().filter((entry) => lockState(entry, now).status === "locked").map((entry) => entry.supplierId);
  }

  // Hover message for a locked supplier in the Order Pad.
  function lockMessage(supplierId, now = new Date()) {
    const state = lockState(getLock(supplierId), now);
    if (state.status !== "locked") return "";
    return state.until
      ? `Supplier locked in Settings until ${formatDateTime(state.until)}. It cannot be selected or cascaded to.`
      : "Supplier locked in Settings until switched off. It cannot be selected or cascaded to.";
  }

  /* ---------- Audit Log ---------- */
  // One entry per supplier changed in a save; entries are only added, never changed.
  function historyEntries(list) {
    return Array.isArray(list) ? list.filter((entry) => entry && entry.supplierId && entry.at) : [];
  }

  function getHistory() {
    return historyEntries(readJson(HISTORY_KEY, []));
  }

  function addHistory(entries) {
    const list = getHistory();
    (Array.isArray(entries) ? entries : [entries]).forEach((entry) => list.push({ ...entry, at: entry.at || Date.now() }));
    writeJson(HISTORY_KEY, list);
    writeJson(SHARED_HISTORY_KEY, list, sharedStorage());
    return list;
  }

  // The customer site's lock history, read from the shared copy (admin site).
  function getCustomerHistory() {
    return historyEntries(readJson(SHARED_HISTORY_KEY, [], sharedStorage()));
  }

  // Same format as the Settings Audit Log ("DD-MM-YYYY - HH:MM:SS").
  function auditTimestamp(date) {
    return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} - ${hhmm(date)}:${pad(date.getSeconds())}`;
  }

  // Admin site: turns off the customer's lock on a supplier, schedule and all, so it is cascaded to again.
  // Returns false when the customer has no lock on it.
  function adminUnlock(supplierId, { adminUser = "", reason = "" } = {}, now = new Date()) {
    const locks = getCustomerLocks();
    const lock = locks.find((entry) => entry.supplierId === supplierId);
    if (!lock) return false;
    writeJson(SHARED_LOCKS_KEY, locks.filter((entry) => entry !== lock), sharedStorage());
    writeJson(SHARED_HISTORY_KEY, [...getCustomerHistory(), {
      at: now.getTime(),
      day: isoDay(now),
      when: auditTimestamp(now),
      user: ADMIN_USER,
      adminUser,
      reason,
      supplierId,
      supplier: lock.supplier,
      action: "unlocked",
      mode: null,
      from: "–",
      until: "–",
      repeat: "–"
    }], sharedStorage());
    return true;
  }

  // Customer site: takes on what the admin site changed in the shared copy. Only a session that has saved
  // locks of its own does, so a new session still starts with no supplier locked.
  function adoptSharedChanges() {
    try {
      const store = storage();
      const shared = sharedStorage();
      if (isSharedReader || !store || !shared) return false;
      if (store.getItem(LOCKS_KEY) === null && store.getItem(HISTORY_KEY) === null) return false;
      let changed = false;
      [[SHARED_LOCKS_KEY, LOCKS_KEY], [SHARED_HISTORY_KEY, HISTORY_KEY]].forEach(([from, to]) => {
        const value = shared.getItem(from);
        if (value !== null && value !== store.getItem(to)) {
          store.setItem(to, value);
          changed = true;
        }
      });
      return changed;
    } catch (error) {
      return false;
    }
  }

  // Called with the locks as they were before, when an admin change arrives while a page is open.
  const sharedChangeListeners = [];
  function onSharedChange(listener) {
    sharedChangeListeners.push(listener);
  }

  if (globalScope && !isSharedReader) {
    adoptSharedChanges();
    globalScope.addEventListener("storage", (event) => {
      if (event.key !== null && event.key !== SHARED_LOCKS_KEY && event.key !== SHARED_HISTORY_KEY) return;
      const before = getLocks();
      if (adoptSharedChanges()) sharedChangeListeners.forEach((listener) => listener(before));
    });
    // Registered before the pages' own pageshow handlers, so they read the adopted locks.
    globalScope.addEventListener("pageshow", (event) => {
      if (event.persisted) adoptSharedChanges();
    });
  }

  return {
    ADMIN_USER,
    DAY_LETTERS,
    DAY_NAMES,
    PHARMACY,
    SHARED_KEYS: [SHARED_LOCKS_KEY, SHARED_HISTORY_KEY],
    addDays,
    addHistory,
    adminUnlock,
    auditPeriod,
    crossesMidnight,
    daysText,
    formatDate,
    formatDateTime,
    formatDay,
    getCustomerHistory,
    getCustomerLocks,
    getHistory,
    getLock,
    getLocks,
    hhmm,
    isLocked,
    isoDay,
    lockMessage,
    lockState,
    lockedSupplierIds,
    onSharedChange,
    scheduleSummary,
    setLocks,
    toDate,
    validate,
    weekdayIndex
  };
});
