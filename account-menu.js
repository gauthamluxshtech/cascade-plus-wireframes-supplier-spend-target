function initAccountMenus() {
  const accountMenus = document.querySelectorAll(".account-menu");
  let resetPasswordModal;
  const activeUserStorageKey = "cascade.activeUser";
  const accountMenuIcons = {
    resetPassword: `
      <circle cx="7.5" cy="16.5" r="3"></circle>
      <path d="m10 14 7.5-7.5"></path>
      <path d="m15.5 8.5 2 2"></path>
      <path d="m18 6 2 2"></path>
    `,
    logOut: `
      <path d="M4 4.5 14 3v18L4 19.5z"></path>
      <path d="M14 6h5v4"></path>
      <path d="M19 14v4h-5"></path>
      <path d="M11 12h9"></path>
      <path d="m17.5 9.5 2.5 2.5-2.5 2.5"></path>
      <circle cx="11" cy="12" r=".65" fill="currentColor" stroke="none"></circle>
    `,
  };

  function loadResetPasswordStyles() {
    if (document.querySelector('link[data-reset-password-styles]')) return;

    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = "reset-password.css";
    stylesheet.dataset.resetPasswordStyles = "";
    document.head.appendChild(stylesheet);
  }

  function createResetPasswordModal() {
    if (resetPasswordModal) return resetPasswordModal;

    loadResetPasswordStyles();

    const wrapper = document.createElement("div");
    wrapper.className = "reset-password-overlay";
    wrapper.hidden = true;
    wrapper.innerHTML = `
      <section class="reset-password-dialog" role="dialog" aria-modal="true" aria-labelledby="resetPasswordTitle" aria-describedby="resetPasswordDescription">
        <div class="reset-password-heading">
          <div>
            <p class="reset-password-eyebrow">Account security</p>
            <h2 id="resetPasswordTitle">Reset password</h2>
            <p id="resetPasswordDescription">Create a new password for your Cascade account.</p>
          </div>
          <button class="reset-password-close" type="button" data-reset-password-close aria-label="Close reset password dialog">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18"></path>
            </svg>
          </button>
        </div>

        <form class="reset-password-form" novalidate>
          <label class="reset-password-field">
            <span>Current password <b aria-hidden="true">*</b></span>
            <span class="reset-password-input-wrap">
              <svg class="reset-password-lock" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="5" y="10" width="14" height="11" rx="2"></rect>
                <path d="M8 10V7a4 4 0 0 1 8 0v3"></path>
              </svg>
              <input name="currentPassword" type="password" autocomplete="current-password" required aria-describedby="currentPasswordError" />
              <button class="reset-password-visibility" type="button" data-password-toggle aria-label="Show current password">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path>
                  <circle cx="12" cy="12" r="2.5"></circle>
                </svg>
              </button>
            </span>
            <small class="reset-password-error" id="currentPasswordError" aria-live="polite"></small>
          </label>

          <label class="reset-password-field">
            <span>New password <b aria-hidden="true">*</b></span>
            <span class="reset-password-input-wrap">
              <svg class="reset-password-lock" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="5" y="10" width="14" height="11" rx="2"></rect>
                <path d="M8 10V7a4 4 0 0 1 8 0v3"></path>
              </svg>
              <input name="newPassword" type="password" autocomplete="new-password" required aria-describedby="newPasswordError passwordRequirements" />
              <button class="reset-password-visibility" type="button" data-password-toggle aria-label="Show new password">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path>
                  <circle cx="12" cy="12" r="2.5"></circle>
                </svg>
              </button>
            </span>
            <small class="reset-password-error" id="newPasswordError" aria-live="polite"></small>
          </label>

          <div class="password-strength" aria-live="polite">
            <div class="password-strength-bars" aria-hidden="true">
              <span></span><span></span><span></span><span></span>
            </div>
            <strong class="password-strength-label">Enter a password</strong>
          </div>

          <div class="password-requirements" id="passwordRequirements">
            <strong>Password must contain:</strong>
            <ul>
              <li data-requirement="length"><span aria-hidden="true">✓</span>At least 8 characters</li>
              <li data-requirement="uppercase"><span aria-hidden="true">✓</span>One uppercase letter</li>
              <li data-requirement="lowercase"><span aria-hidden="true">✓</span>One lowercase letter</li>
              <li data-requirement="numberSpecial"><span aria-hidden="true">✓</span>One number or special character</li>
            </ul>
          </div>

          <label class="reset-password-field">
            <span>Confirm new password <b aria-hidden="true">*</b></span>
            <span class="reset-password-input-wrap">
              <svg class="reset-password-lock" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="5" y="10" width="14" height="11" rx="2"></rect>
                <path d="M8 10V7a4 4 0 0 1 8 0v3"></path>
              </svg>
              <input name="confirmPassword" type="password" autocomplete="new-password" required aria-describedby="confirmPasswordError" />
              <button class="reset-password-visibility" type="button" data-password-toggle aria-label="Show confirmed password">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path>
                  <circle cx="12" cy="12" r="2.5"></circle>
                </svg>
              </button>
            </span>
            <small class="reset-password-error" id="confirmPasswordError" aria-live="polite"></small>
          </label>

          <p class="reset-password-status" role="status" aria-live="polite"></p>

          <div class="reset-password-actions">
            <button class="reset-password-cancel" type="button" data-reset-password-close>Cancel</button>
            <button class="reset-password-submit" type="submit">Update password</button>
          </div>
        </form>
      </section>
    `;

    document.body.appendChild(wrapper);

    const dialog = wrapper.querySelector(".reset-password-dialog");
    const form = wrapper.querySelector(".reset-password-form");
    const currentPassword = form.elements.currentPassword;
    const newPassword = form.elements.newPassword;
    const confirmPassword = form.elements.confirmPassword;
    const strengthBars = [...wrapper.querySelectorAll(".password-strength-bars span")];
    const strengthLabel = wrapper.querySelector(".password-strength-label");
    const status = wrapper.querySelector(".reset-password-status");
    const submitButton = wrapper.querySelector(".reset-password-submit");
    let returnFocus;

    const tests = {
      length: (value) => value.length >= 8,
      uppercase: (value) => /[A-Z]/.test(value),
      lowercase: (value) => /[a-z]/.test(value),
      numberSpecial: (value) => /[\d\W_]/.test(value),
    };

    function requirementsFor(value) {
      return Object.fromEntries(
        Object.entries(tests).map(([name, test]) => [name, test(value)])
      );
    }

    function clearFieldError(input) {
      const error = wrapper.querySelector(`#${input.getAttribute("aria-describedby").split(" ")[0]}`);
      input.removeAttribute("aria-invalid");
      if (error) error.textContent = "";
    }

    function setFieldError(input, message) {
      const error = wrapper.querySelector(`#${input.getAttribute("aria-describedby").split(" ")[0]}`);
      input.setAttribute("aria-invalid", "true");
      if (error) error.textContent = message;
    }

    function updateStrength() {
      const value = newPassword.value;
      const results = requirementsFor(value);
      const passed = Object.values(results).filter(Boolean).length;
      const strength = value ? passed : 0;
      const labels = ["Enter a password", "Weak", "Fair", "Good", "Strong"];

      strengthBars.forEach((bar, index) => {
        bar.classList.toggle("is-active", index < strength);
        bar.dataset.strength = String(strength);
      });
      strengthLabel.textContent = labels[strength];
      strengthLabel.dataset.strength = String(strength);

      Object.entries(results).forEach(([name, isValid]) => {
        const item = wrapper.querySelector(`[data-requirement="${name}"]`);
        item.classList.toggle("is-valid", isValid);
      });

      if (newPassword.hasAttribute("aria-invalid")) validateNewPassword();
      if (confirmPassword.value && confirmPassword.hasAttribute("aria-invalid")) {
        validateConfirmation();
      }
    }

    function validateNewPassword() {
      clearFieldError(newPassword);
      const results = requirementsFor(newPassword.value);

      if (!newPassword.value) {
        setFieldError(newPassword, "Enter a new password.");
        return false;
      }
      if (!Object.values(results).every(Boolean)) {
        setFieldError(newPassword, "Your password does not meet all requirements.");
        return false;
      }
      if (newPassword.value === currentPassword.value) {
        setFieldError(newPassword, "Your new password must be different from your current password.");
        return false;
      }
      return true;
    }

    function validateConfirmation() {
      clearFieldError(confirmPassword);
      if (!confirmPassword.value) {
        setFieldError(confirmPassword, "Confirm your new password.");
        return false;
      }
      if (confirmPassword.value !== newPassword.value) {
        setFieldError(confirmPassword, "The passwords do not match.");
        return false;
      }
      return true;
    }

    function resetForm() {
      form.reset();
      form.querySelectorAll("[aria-invalid]").forEach((input) => input.removeAttribute("aria-invalid"));
      form.querySelectorAll(".reset-password-error").forEach((error) => {
        error.textContent = "";
      });
      form.querySelectorAll('input[type="text"]').forEach((input) => {
        input.type = "password";
      });
      form.querySelectorAll("[data-password-toggle]").forEach((button) => {
        button.setAttribute("aria-label", button.getAttribute("aria-label").replace("Hide", "Show"));
        button.classList.remove("is-visible");
      });
      status.textContent = "";
      status.className = "reset-password-status";
      submitButton.disabled = false;
      submitButton.textContent = "Update password";
      updateStrength();
    }

    function openModal(trigger) {
      returnFocus = trigger;
      resetForm();
      wrapper.hidden = false;
      document.body.classList.add("has-reset-password-dialog");
      window.requestAnimationFrame(() => {
        wrapper.classList.add("is-open");
        currentPassword.focus();
      });
    }

    function closeModal() {
      wrapper.classList.remove("is-open");
      document.body.classList.remove("has-reset-password-dialog");
      window.setTimeout(() => {
        wrapper.hidden = true;
        resetForm();
        if (returnFocus) returnFocus.focus();
      }, 180);
    }

    wrapper.querySelectorAll("[data-reset-password-close]").forEach((button) => {
      button.addEventListener("click", closeModal);
    });

    wrapper.addEventListener("click", (event) => {
      if (event.target === wrapper) closeModal();
    });

    wrapper.querySelectorAll("[data-password-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const input = button.parentElement.querySelector("input");
        const isVisible = input.type === "text";
        input.type = isVisible ? "password" : "text";
        button.classList.toggle("is-visible", !isVisible);
        button.setAttribute(
          "aria-label",
          `${isVisible ? "Show" : "Hide"} ${input.name === "currentPassword" ? "current password" : "new password"}`
        );
      });
    });

    currentPassword.addEventListener("input", () => clearFieldError(currentPassword));
    currentPassword.addEventListener("blur", () => {
      if (!currentPassword.value) setFieldError(currentPassword, "Enter your current password.");
    });
    newPassword.addEventListener("input", updateStrength);
    newPassword.addEventListener("blur", validateNewPassword);
    confirmPassword.addEventListener("input", () => {
      if (confirmPassword.hasAttribute("aria-invalid")) validateConfirmation();
    });
    confirmPassword.addEventListener("blur", validateConfirmation);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      clearFieldError(currentPassword);

      const currentValid = Boolean(currentPassword.value);
      if (!currentValid) setFieldError(currentPassword, "Enter your current password.");
      const newValid = validateNewPassword();
      const confirmationValid = validateConfirmation();

      if (!currentValid || !newValid || !confirmationValid) {
        const firstInvalid = form.querySelector('[aria-invalid="true"]');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = "Updating…";
      status.textContent = "";

      window.setTimeout(() => {
        const resetEvent = new CustomEvent("cascade:password-reset", {
          cancelable: true,
          detail: {
            currentPassword: currentPassword.value,
            newPassword: newPassword.value,
          },
        });
        const shouldUsePrototypeSuccess = window.dispatchEvent(resetEvent);

        if (shouldUsePrototypeSuccess) {
          status.textContent = "Password updated successfully.";
          status.classList.add("is-success");
          submitButton.textContent = "Password updated";
          window.setTimeout(closeModal, 900);
        } else {
          submitButton.disabled = false;
          submitButton.textContent = "Update password";
        }
      }, 450);
    });

    dialog.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;
      const focusable = [...dialog.querySelectorAll("button:not(:disabled), input:not(:disabled)")];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    resetPasswordModal = { open: openModal, close: closeModal, element: wrapper };
    return resetPasswordModal;
  }

  function assignMenuIcon(item) {
    const icon = item.querySelector("svg");
    if (!icon) return;

    const label = item.textContent.trim().toLowerCase();
    if (label.includes("reset password")) {
      icon.innerHTML = accountMenuIcons.resetPassword;
    } else if (label.includes("log out") || label.includes("logout")) {
      icon.innerHTML = accountMenuIcons.logOut;
    }
  }

  function closeMenu(menu) {
    const button = menu.querySelector(".profile-button");
    menu.classList.remove("is-open");
    if (button) button.setAttribute("aria-expanded", "false");
  }

  function closeAllMenus(exceptMenu) {
    accountMenus.forEach((menu) => {
      if (menu !== exceptMenu) closeMenu(menu);
    });
  }

  accountMenus.forEach((menu) => {
    const button = menu.querySelector(".profile-button");
    if (!button) return;

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const isOpen = menu.classList.toggle("is-open");
      button.setAttribute("aria-expanded", String(isOpen));
      closeAllMenus(menu);
    });

    menu.querySelectorAll(".account-menu-item").forEach((item) => {
      assignMenuIcon(item);
      item.addEventListener("click", () => {
        const label = item.textContent.trim().toLowerCase();
        closeMenu(menu);
        if (label.includes("reset password")) {
          createResetPasswordModal().open(item);
        } else if (label.includes("log out") || label.includes("logout")) {
          try {
            window.sessionStorage.removeItem(activeUserStorageKey);
          } catch (error) {
            // Session storage is optional in the prototype environment.
          }
          window.location.href = "login-page-standalone.html";
        }
      });
    });
  });

  document.addEventListener("click", (event) => {
    accountMenus.forEach((menu) => {
      if (!menu.contains(event.target)) closeMenu(menu);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (resetPasswordModal && !resetPasswordModal.element.hidden) {
      resetPasswordModal.close();
    } else {
      closeAllMenus();
    }
  });
}

initAccountMenus();

function initActiveUserFlow() {
  /*
   * Real-system requirements:
   * - Re-check username and email uniqueness atomically on the server when a profile is saved.
   * - Keep wrong-try counts, reset/delete codes and code expiry on the server so refresh cannot reset them.
   * - Reject any order without a valid signed-in person, even when Order Pad opens directly.
   * - Take Order Placed By from the server session and copy it onto the order; never trust a browser-supplied name.
   * - Store PINs and verification codes as one-way hashes and never return either value to the browser.
   * - Each profile has an email used only for PIN reset codes; delete codes go to the pharmacy's registered email.
   * - Erase the email when a profile is deleted or removed.
   * - After a PIN reset, sign that profile out on every other computer.
   * - Deleting a signed-in profile ends its session on every computer.
   * - Store the signed-in person per browser, not per pharmacy account.
   * - Remove profiles unused for 90 days on the server, freeing their username and email while past orders keep the copied name.
   */
  // Prototype only: the real system stores a one-way hash of the PIN, never the PIN itself.
  const storageKey = "cascade.activeUser";
  const sinceKey = "cascade.activeUserSince";
  const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
  const PROFILE_EXPIRY_MS = 90 * 24 * 60 * 60 * 1000;
  const accountMenu = document.querySelector(".account-menu");
  if (!accountMenu || accountMenu.querySelector(".active-user-menu")) return;

  const profileButton = accountMenu.querySelector(".profile-button");
  const pharmacy = (profileButton?.textContent || "").replace(/^\s*HI,\s*/i, "").trim() || "Pharmacy";
  // Page headers use different capitalisation (for example dummy1 and DUMMY1).
  // Keep one case-insensitive key so the same wireframe profiles appear on every page.
  const pharmacyStorageName = pharmacy.toLocaleLowerCase();
  const usersKey = `cascade.shiftUsers.${pharmacyStorageName}`;
  const legacyUsersKey = `cascade.shiftUsers.${pharmacy}`;
  const reservedNames = new Set(["system", "admin", "administrator", "support", "not recorded", pharmacy.toLocaleLowerCase()]);
  const state = {
    view: "list", selectedName: "", fromSwitch: false, listCopy: "", message: "", notice: "", busy: false,
    idleTimer: null, historyGuard: false, pinDigits: ["", "", "", ""], pinInvalid: false,
    username: "", email: "", usernameTouched: false, emailTouched: false, emailPasteError: false,
    createPinDigits: ["", "", "", ""], confirmPinDigits: ["", "", "", ""], createPinTouched: false, confirmPinTouched: false,
    forgotStage: "send", codeDigits: ["", "", "", "", "", ""], resetPinDigits: ["", "", "", ""], resetConfirmDigits: ["", "", "", ""], resetPinTouched: false, resetConfirmTouched: false,
    deleteStage: "confirm", deleteCodeDigits: ["", "", "", "", "", ""], codeNotice: ""
  };

  function loadStyles() {
    if (document.querySelector('link[data-active-user-styles]')) return;
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = "active-user.css";
    stylesheet.dataset.activeUserStyles = "";
    document.head.appendChild(stylesheet);
  }
  function storageGet(key) { try { return window.sessionStorage.getItem(key) || ""; } catch (error) { return ""; } }
  function storageSet(key, value) { try { window.sessionStorage.setItem(key, value); } catch (error) { /* Storage is optional in the prototype. */ } }
  function storageRemove(key) { try { window.sessionStorage.removeItem(key); } catch (error) { /* Storage is optional in the prototype. */ } }
  function isReload() { try { return performance.getEntriesByType("navigation")[0]?.type === "reload"; } catch (error) { return false; } }
  if (isReload()) {
    storageRemove(storageKey);
    storageRemove(sinceKey);
    storageRemove(usersKey);
    if (legacyUsersKey !== usersKey) storageRemove(legacyUsersKey);
    // Remove records left by the earlier localStorage-based wireframe build.
    try {
      window.localStorage.removeItem(usersKey);
      window.localStorage.removeItem(legacyUsersKey);
    } catch (error) { /* Storage is optional in the prototype. */ }
  }
  // Wireframe default: keep Sam signed in so a refresh never drops back to the create/pick profile dialog.
  (function seedDefaultUser() {
    const defaultName = "Sam";
    let users = [];
    try { users = JSON.parse(storageGet(usersKey) || "[]"); if (!Array.isArray(users)) users = []; } catch (error) { users = []; }
    if (!users.some((user) => String(user.username || "").trim().toLocaleLowerCase() === defaultName.toLocaleLowerCase())) {
      users.push({ username: defaultName, email: "sam@example.com", pin: "4545", createdAt: Date.now(), lastUsedAt: Date.now(), failedTries: 0, lockedUntil: 0 });
      storageSet(usersKey, JSON.stringify(users));
    }
    if (!storageGet(storageKey)) { storageSet(storageKey, defaultName); storageSet(sinceKey, String(Date.now())); }
  })();

  function escapeHtml(value) { return String(value ?? "").replace(/[&<>\"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]); }
  function cleanDigits(value, length) { return String(value || "").replace(/\D/g, "").slice(0, length); }
  function cleanUsername(value) { return String(value || "").replace(/[^\p{L}\p{N} .'\-]/gu, "").replace(/\s{2,}/g, " ").slice(0, 12); }
  function normaliseUsername(value) { return String(value || "").trim().replace(/\s+/g, " ").replace(/\.+$/, "").trim(); }
  function comparableUsername(value) { return normaliseUsername(value).toLocaleLowerCase(); }
  function comparableEmail(value) { return String(value || "").trim().toLocaleLowerCase(); }
  function getUsers() { try { const users = JSON.parse(storageGet(usersKey) || "[]"); return Array.isArray(users) ? users : []; } catch (error) { return []; } }
  function saveUsers(users) { storageSet(usersKey, JSON.stringify(users)); }
  function findUser(name) { const key = comparableUsername(name); return getUsers().find((user) => comparableUsername(user.username) === key); }
  function selectedUser() { return findUser(state.selectedName); }
  function getActiveUser() { return storageGet(storageKey); }
  function activeSince() { return Number(storageGet(sinceKey)) || Date.now(); }
  function formatTime(value = Date.now()) { return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value)); }
  function digitsValue(property) { return state[property].join(""); }
  function isWeakPin(pin) {
    if (!/^\d{4}$/.test(pin)) return false;
    if (/^(\d)\1{3}$/.test(pin)) return true;
    const digits = [...pin].map(Number);
    return digits.every((digit, index) => !index || digit - digits[index - 1] === 1) || digits.every((digit, index) => !index || digit - digits[index - 1] === -1);
  }
  function isValidPin(pin) { return /^\d{4}$/.test(pin) && !isWeakPin(pin); }
  function isLocked(user) { return Boolean(user && Number(user.failedTries || 0) >= 5); }
  function maskEmail(email) {
    const [local = "", domain = ""] = String(email || "").split("@");
    const dot = domain.lastIndexOf(".");
    if (!local || dot < 1) return "the email saved on this profile";
    return `${escapeHtml(local[0])}\u2022\u2022\u2022@${escapeHtml(domain[0])}\u2022\u2022\u2022${escapeHtml(domain.slice(dot))}`;
  }
  function purgeInactiveProfiles() {
    const users = getUsers();
    const cutoff = Date.now() - PROFILE_EXPIRY_MS;
    const kept = users.filter((user) => Number(user.lastUsedAt || user.createdAt || 0) > cutoff);
    if (kept.length !== users.length) {
      saveUsers(kept);
      if (getActiveUser() && !kept.some((user) => comparableUsername(user.username) === comparableUsername(getActiveUser()))) {
        clearActiveUser();
        updateDisplay();
      }
    }
    return kept.sort((a, b) => Number(b.lastUsedAt || b.createdAt || 0) - Number(a.lastUsedAt || a.createdAt || 0));
  }
  function usernameStatus(value) {
    const name = normaliseUsername(cleanUsername(value));
    if (!name) return { kind: "help", text: "Start with a letter. Letters, numbers, spaces and . ' - only. 3\u201312 characters." };
    if (!/^\p{L}/u.test(name)) return { kind: "error", text: "Start your username with a letter." };
    if (name.length < 3) return { kind: "help", text: "At least 3 characters." };
    if (reservedNames.has(comparableUsername(name))) return { kind: "error", text: `"${name}" is reserved. Choose another username.` };
    if (findUser(name)) return { kind: "error", text: `Username already exists in ${pharmacy}. Choose another, or pick your profile.` };
    return { kind: "success", text: "\u2713 Username available" };
  }
  function emailStatus(value) {
    const email = String(value || "");
    if (state.emailPasteError) return { kind: "error", text: "Pasting is turned off here. Please type your email." };
    if (!email) return { kind: "help", text: "Type your email. The PIN reset code will be sent here." };
    if (email.length > 100) return { kind: "error", text: "Use 100 characters or fewer." };
    const atCount = (email.match(/@/g) || []).length;
    if (!atCount) return { kind: "error", text: "Add the @ symbol, like name@example.com." };
    if (atCount > 1) return { kind: "error", text: "Use only one @ symbol." };
    const [local, domain] = email.split("@");
    if (!local) return { kind: "error", text: "Add your name before the @, like name@example.com." };
    if (!domain) return { kind: "error", text: "Add the email provider after the @, like gmail.com." };
    if (!domain.includes(".")) return { kind: "error", text: "Add the ending after a dot, like .com or .co.uk." };
    if (local.startsWith(".") || local.endsWith(".") || domain.startsWith(".") || domain.endsWith(".") || email.includes("..")) return { kind: "error", text: "Check the dots in your email." };
    const ending = domain.slice(domain.lastIndexOf(".") + 1);
    if (!/^[A-Za-z]{2,}$/.test(ending)) return { kind: "error", text: "The ending must be letters, like .com or .co.uk." };
    if (!/^[A-Za-z0-9.-]+$/.test(domain)) return { kind: "error", text: "The part after the @ can only use letters, numbers, dots and hyphens." };
    if (getUsers().some((user) => comparableEmail(user.email) === comparableEmail(email))) return { kind: "error", text: `This email is already used by another profile in ${pharmacy}.` };
    return { kind: "success", text: "\u2713 Email looks good" };
  }
  function pinStatus(property) {
    const pin = digitsValue(property);
    if (!pin) return { kind: "help", text: "Exactly 4 digits." };
    if (pin.length < 4) return { kind: "help", text: `4 digits (${pin.length} of 4)` };
    if (isWeakPin(pin)) return { kind: "error", text: "Too easy to guess. Avoid 1234, 0000 and similar." };
    return { kind: "success", text: "\u2713 PIN looks good" };
  }
  function confirmStatus(pinProperty, confirmProperty) {
    const pin = digitsValue(pinProperty);
    const confirmation = digitsValue(confirmProperty);
    if (confirmation.length < 4) return { kind: "help", text: "" };
    if (pin !== confirmation) return { kind: "error", text: "PINs don't match" };
    return isValidPin(pin) ? { kind: "success", text: "\u2713 PINs match" } : { kind: "help", text: "" };
  }
  function setActiveUser(name) { storageSet(storageKey, name); storageSet(sinceKey, String(Date.now())); updateIdleTimer(); }
  function clearActiveUser() { storageRemove(storageKey); storageRemove(sinceKey); if (state.idleTimer) window.clearTimeout(state.idleTimer); state.idleTimer = null; }

  loadStyles();
  const menu = document.createElement("div");
  menu.className = "active-user-menu";
  menu.innerHTML = `<button class="active-user-button" type="button" aria-haspopup="true" aria-expanded="false"><span class="active-user-indicator" aria-hidden="true"></span><span class="active-user-label"></span><span class="active-user-chevron" aria-hidden="true"></span></button><div class="active-user-dropdown" role="menu"><div class="active-user-dropdown-copy"><div class="active-user-copy-text"><span>Active user</span><strong></strong><em></em></div></div><button class="active-user-change" type="button" role="menuitem" data-switch-user>Switch user</button><button class="active-user-change active-user-end" type="button" role="menuitem" data-end-session>End session</button></div>`;
  accountMenu.prepend(menu);
  // Settings shortcut, left of the active user.
  const settingsLink = document.createElement("a");
  settingsLink.className = "header-settings-link";
  settingsLink.href = "settings.html";
  settingsLink.title = "Settings";
  settingsLink.setAttribute("aria-label", "Settings");
  if (/(^|\/)settings\.html$/i.test(window.location.pathname)) settingsLink.setAttribute("aria-current", "page");
  settingsLink.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"></path></svg>`;
  accountMenu.prepend(settingsLink);
  const button = menu.querySelector(".active-user-button");
  const label = menu.querySelector(".active-user-label");
  const indicator = menu.querySelector(".active-user-indicator");
  const dropdownName = menu.querySelector(".active-user-dropdown strong");
  const dropdownSince = menu.querySelector(".active-user-dropdown em");
  const overlay = document.createElement("div");
  overlay.className = "active-user-overlay";
  overlay.hidden = true;
  document.body.appendChild(overlay);

  function updateDisplay() {
    const name = getActiveUser();
    const hasActiveUser = Boolean(name);
    label.textContent = name || "No operator";
    dropdownName.textContent = name || "No operator";
    dropdownSince.textContent = name ? `since ${formatTime(activeSince())} today` : "Sign in";
    indicator.classList.toggle("active-user-indicator-idle", !hasActiveUser);
    button.disabled = !hasActiveUser;
    button.setAttribute("aria-disabled", String(!hasActiveUser));
    button.setAttribute("aria-haspopup", hasActiveUser ? "true" : "false");
    button.setAttribute("aria-label", hasActiveUser ? `Active user: ${name}` : "No operator signed in");
    menu.querySelector("[data-switch-user]").disabled = !hasActiveUser;
    menu.querySelector("[data-end-session]").disabled = !hasActiveUser;
    if (!hasActiveUser) closeMenu();
  }
  function closeMenu() { menu.classList.remove("is-open"); button.setAttribute("aria-expanded", "false"); }
  function dialogHeader(title, copy = "") {
    return `<p class="active-user-eyebrow">Shift sign-in \u00b7 ${escapeHtml(pharmacy)}</p><h2 id="activeUserTitle">${title}</h2>${copy ? `<p class="active-user-dialog-copy" id="activeUserDescription">${copy}</p>` : '<span class="active-user-sr-only" id="activeUserDescription">Shift sign-in</span>'}`;
  }
  function avatar(sizeClass = "") {
    return `<span class="active-user-avatar ${sizeClass}" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8.6" r="4.1"></circle><path d="M4.6 20.4a7.4 7.4 0 0 1 14.8 0"></path></svg></span>`;
  }
  function lockIcon() { return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path></svg>'; }
  function binIcon() { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"></path></svg>'; }
  function backIcon() { return '<svg class="active-user-back-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6-6 6 6 6"></path></svg>'; }
  function infoBox(heading, copy, danger = false) { return `<div class="active-user-info ${danger ? "active-user-info-red" : "active-user-info-green"}"><span aria-hidden="true">${danger ? "!" : "i"}</span><p><strong>${heading}</strong>${copy ? `<small>${copy}</small>` : ""}</p></div>`; }
  function statusMarkup(status, id, emailField = false) {
    const kind = emailField && status.kind === "error" && !state.emailTouched && !state.emailPasteError ? "help" : status.kind;
    return `<p class="active-user-status active-user-${kind}" id="${id}" aria-live="polite">${escapeHtml(status.text)}</p>`;
  }
  function profileTile(user) {
    const locked = isLocked(user);
    const signedIn = state.fromSwitch && comparableUsername(user.username) === comparableUsername(getActiveUser());
    const line = locked ? "Reset PIN to unlock" : signedIn ? "Signed in" : "";
    const ariaState = locked ? ", PIN reset required" : signedIn ? ", Signed in" : "";
    return `<button class="active-user-profile-tile${locked ? " is-locked" : ""}${signedIn ? " is-signed-in" : ""}" type="button" data-profile="${escapeHtml(user.username)}" aria-label="${escapeHtml(user.username)}${ariaState}">${avatar()}${locked ? `<span class="active-user-tile-badge active-user-lock-badge">${lockIcon()}</span>` : ""}${signedIn ? '<span class="active-user-tile-badge active-user-signed-badge">\u2713</span>' : ""}<strong>${escapeHtml(user.username)}</strong>${line ? `<small>${line}</small>` : ""}</button>`;
  }
  function listMarkup() {
    const users = purgeInactiveProfiles();
    const empty = users.length === 0;
    const copy = state.listCopy || (empty ? "" : "Sign in with your own username and PIN. Orders are recorded under your name until you end the session or log out.");
    const hint = empty ? infoBox("No profiles yet.", "Choose Add user to set up your name and PIN.") : infoBox("First time here?", "Choose Add user to set up your name and PIN.");
    return `${dialogHeader("Who's on shift?", copy)}<div class="active-user-profile-label">${empty ? "No profiles yet" : "Users"}</div><div class="active-user-profile-grid" role="list" aria-label="User profiles">${users.map(profileTile).join("")}<button class="active-user-profile-tile active-user-add-tile" type="button" data-add-user aria-label="Add user"><span class="active-user-avatar" aria-hidden="true">+</span><strong>Add user</strong></button></div>${state.notice ? `<p class="active-user-list-notice" role="status" aria-live="polite">${escapeHtml(state.notice)}</p>` : ""}${hint}`;
  }
  function digitGroup(property, labelText, options = {}) {
    const length = state[property].length;
    const disabled = options.disabled ? " disabled" : "";
    const firstEmpty = state[property].findIndex((digit) => !digit);
    const inputs = state[property].map((digit, index) => {
      const sequenceLocked = !digit && firstEmpty !== -1 && index > firstEmpty;
      return `<input class="active-user-digit${digit ? " is-filled" : ""}${sequenceLocked ? " is-sequence-locked" : ""}" type="${options.unmasked ? "text" : "password"}" inputmode="numeric" pattern="[0-9]*" maxlength="1" value="${digit}" data-digit-group="${property}" data-digit-index="${index}" aria-label="${escapeHtml(options.boxLabel || labelText)}, digit ${index + 1} of ${length}"${sequenceLocked ? ' aria-disabled="true" title="Complete the previous box first"' : ""} autocomplete="${options.autocomplete || "one-time-code"}"${disabled}>`;
    }).join("");
    return `<div class="active-user-digit-field${options.invalid ? " is-invalid" : ""}${options.left ? " is-left" : ""}${options.code ? " is-code" : ""}${options.shake ? " active-user-shake" : ""}" role="group" aria-label="${escapeHtml(labelText)}"><span class="active-user-digit-legend">${labelText}${options.required === false ? "" : ' <b aria-hidden="true">*</b>'}</span><div class="active-user-digit-row">${inputs}</div></div>`;
  }
  function pinMarkup() {
    const user = selectedUser();
    if (!user) { state.view = "list"; return listMarkup(); }
    const locked = isLocked(user);
    const lockMessage = "Too many wrong PINs. Use Forgot PIN to reset and unlock it now.";
    const message = locked ? lockMessage : state.message;
    return `<div class="active-user-screen-links"><button class="active-user-link active-user-back-link" type="button" data-all-users>${backIcon()}<span>All users</span></button><button class="active-user-delete-link" type="button" data-delete-profile>${binIcon()}Delete</button></div><div class="active-user-pin-profile">${avatar("active-user-avatar-large")}<h2 id="activeUserTitle">${escapeHtml(user.username)}</h2><p id="activeUserDescription">Enter your 4-digit PIN</p></div><form class="active-user-pin-form" data-form="profile-pin" novalidate>${digitGroup("pinDigits", "4-digit PIN", { disabled: locked, invalid: state.pinInvalid || locked, shake: state.pinInvalid, boxLabel: "PIN" })}<p class="active-user-error active-user-centred-message" aria-live="polite">${escapeHtml(message)}</p><button class="active-user-submit active-user-full-submit" type="submit" ${digitsValue("pinDigits").length === 4 && !locked ? "" : "disabled"}>Sign in</button><button class="active-user-link active-user-centred-link" type="button" data-forgot-pin>Forgot PIN?</button></form>`;
  }
  function textField(id, property, labelText, options = {}) {
    return `<label class="active-user-field" for="${id}"><span>${labelText} <b aria-hidden="true">*</b></span><input class="active-user-input active-user-plain-input${options.success ? " active-user-success" : ""}" id="${id}" type="${options.type || "text"}" value="${escapeHtml(state[property])}" maxlength="${options.maxlength}" inputmode="${options.inputmode || "text"}" autocomplete="off" ${options.spellcheck === false ? 'spellcheck="false"' : ""} placeholder="${options.placeholder || ""}" aria-describedby="${options.describedBy}"${options.invalid ? ' aria-invalid="true"' : ""}></label>`;
  }
  function addMarkup() {
    const userStatus = usernameStatus(state.username);
    const mailStatus = emailStatus(state.email);
    const createStatus = pinStatus("createPinDigits");
    const confirm = confirmStatus("createPinDigits", "confirmPinDigits");
    const ready = userStatus.kind === "success" && mailStatus.kind === "success" && createStatus.kind === "success" && confirm.kind === "success";
    return `<button class="active-user-link active-user-top-back active-user-back-link" type="button" data-all-users>${backIcon()}<span>All users</span></button>${dialogHeader("Add user", "Create your username, add your email and choose a 4-digit PIN. If you forget your PIN, the reset code goes to this email.")}<form class="active-user-form active-user-add-form" data-form="add" novalidate>${textField("activeUserName", "username", "Username", { maxlength: 12, placeholder: "", describedBy: "activeUserNameStatus", invalid: state.usernameTouched && userStatus.kind !== "success", success: userStatus.kind === "success" })}${statusMarkup(userStatus, "activeUserNameStatus")}${textField("activeUserEmail", "email", "Email", { type: "email", inputmode: "email", maxlength: 100, spellcheck: false, placeholder: "Type your email, e.g. name@example.com", describedBy: "activeUserEmailStatus", invalid: (state.emailTouched || state.emailPasteError) && mailStatus.kind !== "success", success: mailStatus.kind === "success" })}${statusMarkup(mailStatus, "activeUserEmailStatus", true)}${digitGroup("createPinDigits", "Create 4-digit PIN", { left: true, invalid: state.createPinTouched && createStatus.kind !== "success", autocomplete: "new-password" })}${statusMarkup(createStatus, "activeCreatePinStatus")}${digitGroup("confirmPinDigits", "Confirm PIN", { left: true, invalid: state.confirmPinTouched && confirm.kind !== "success", autocomplete: "new-password" })}${statusMarkup(confirm, "activeConfirmPinStatus")}<p class="active-user-error" aria-live="polite">${escapeHtml(state.message)}</p><button class="active-user-submit active-user-full-submit" type="submit" ${ready ? "" : "disabled"}>Create user &amp; start shift</button><p class="active-user-help active-user-below-help">Your username appears as Order Placed By on every order you place. Your email is only used to send you a PIN reset code. Keep your PIN to yourself.</p></form>`;
  }
  function profileCard(user) { return `<div class="active-user-profile-card">${avatar("active-user-avatar-small")}<strong>${escapeHtml(user.username)}</strong></div>`; }
  function forgotMarkup() {
    const user = selectedUser();
    if (!user) { state.view = "list"; return listMarkup(); }
    const back = `<button class="active-user-link active-user-top-back active-user-back-link" type="button" data-back-to-pin>${backIcon()}<span>Back</span></button>`;
    if (state.forgotStage === "send") return `${back}${dialogHeader("Forgot your PIN?")}${profileCard(user)}${infoBox("", `We'll send a 6-digit code to the email saved on this profile: ${maskEmail(user.email)}.`)}<p class="active-user-error" aria-live="polite">${escapeHtml(state.message)}</p><button class="active-user-submit active-user-full-submit" type="button" data-send-reset-code>Send code</button>`;
    if (state.forgotStage === "code") return `${back}${dialogHeader("Enter the code")}${infoBox("", `${state.codeNotice ? `${state.codeNotice} ` : "Code sent to "}${maskEmail(user.email)}. It expires in 15 minutes.`)}<form class="active-user-form" data-form="reset-code" novalidate>${digitGroup("codeDigits", "6-digit code", { unmasked: true, code: true, boxLabel: "Code" })}<button class="active-user-link active-user-resend-link" type="button" data-resend-reset>Send a new code</button><p class="active-user-error active-user-centred-message" aria-live="polite">${escapeHtml(state.message)}</p><button class="active-user-submit active-user-full-submit" type="submit" ${digitsValue("codeDigits").length === 6 ? "" : "disabled"}>Verify code</button></form>`;
    const pinStatusValue = pinStatus("resetPinDigits");
    const confirm = confirmStatus("resetPinDigits", "resetConfirmDigits");
    const ready = pinStatusValue.kind === "success" && confirm.kind === "success";
    return `${back}${dialogHeader("Choose a new PIN")}${profileCard(user)}<form class="active-user-form" data-form="reset-pin" novalidate>${digitGroup("resetPinDigits", "New 4-digit PIN", { left: true, invalid: state.resetPinTouched && pinStatusValue.kind !== "success", autocomplete: "new-password" })}${statusMarkup(pinStatusValue, "activeResetPinStatus")}${digitGroup("resetConfirmDigits", "Confirm new PIN", { left: true, invalid: state.resetConfirmTouched && confirm.kind !== "success", autocomplete: "new-password" })}${statusMarkup(confirm, "activeResetConfirmStatus")}<p class="active-user-error" aria-live="polite">${escapeHtml(state.message)}</p><button class="active-user-submit active-user-full-submit" type="submit" ${ready ? "" : "disabled"}>Save PIN &amp; start shift</button></form>`;
  }
  function deleteMarkup() {
    const user = selectedUser();
    if (!user) { state.view = "list"; return listMarkup(); }
    const back = `<button class="active-user-link active-user-top-back active-user-back-link" type="button" data-back-to-pin>${backIcon()}<span>Back</span></button>`;
    if (state.deleteStage === "confirm") return `${back}${dialogHeader("Delete this profile?")}${profileCard(user)}${infoBox("", `This removes ${escapeHtml(user.username)} from ${escapeHtml(pharmacy)}. Past orders keep showing this name as Order Placed By. This can't be undone.`, true)}${infoBox("", `To confirm, we'll send a 6-digit code to ${escapeHtml(pharmacy)}'s registered email.`)}<p class="active-user-error" aria-live="polite">${escapeHtml(state.message)}</p><button class="active-user-submit active-user-danger-submit active-user-full-submit" type="button" data-send-delete-code>Send code</button>`;
    return `${back}${dialogHeader("Enter the code")}${infoBox("", `${state.codeNotice ? `${state.codeNotice} ` : "Code sent to "}${escapeHtml(pharmacy)}'s registered email to delete ${escapeHtml(user.username)}. It expires in 15 minutes.`)}<form class="active-user-form" data-form="delete-code" novalidate>${digitGroup("deleteCodeDigits", "6-digit code", { unmasked: true, code: true, boxLabel: "Code" })}<button class="active-user-link active-user-resend-link" type="button" data-resend-delete>Send a new code</button><p class="active-user-error active-user-centred-message" aria-live="polite">${escapeHtml(state.message)}</p><button class="active-user-submit active-user-danger-submit active-user-full-submit" type="submit" ${digitsValue("deleteCodeDigits").length === 6 ? "" : "disabled"}>Delete profile</button></form>`;
  }
  function endMarkup() { return `${dialogHeader("End your session?", "The next person must sign in with their own profile and PIN. Items in the cart stay, and whoever places the order is recorded.")}<div class="active-user-summary">Active user: <strong>${escapeHtml(getActiveUser())}</strong></div><div class="active-user-actions"><button class="active-user-clear" type="button" data-cancel-end>Cancel</button><button class="active-user-submit active-user-danger-submit" type="button" data-confirm-end>End session</button></div>`; }
  function successMarkup() { return `${dialogHeader("Shift started")}<div class="active-user-success-panel" role="status" aria-live="polite"><span aria-hidden="true">\u2713</span><strong>${escapeHtml(state.notice)}</strong></div>`; }
  function currentMarkup() {
    if (state.view === "list") return listMarkup();
    if (state.view === "pin") return pinMarkup();
    if (state.view === "add") return addMarkup();
    if (state.view === "forgot") return forgotMarkup();
    if (state.view === "delete") return deleteMarkup();
    if (state.view === "end") return endMarkup();
    return successMarkup();
  }
  function render(focusSelector) {
    overlay.innerHTML = `<section class="active-user-dialog${state.view === "end" ? " active-user-end-dialog" : ""}" role="dialog" aria-modal="true" aria-labelledby="activeUserTitle" aria-describedby="activeUserDescription">${currentMarkup()}</section>`;
    bindDialog();
    const placeCaretAtEnd = (target) => {
      if (!(target instanceof HTMLInputElement)) return;
      const caretPosition = target.value.length;
      try { target.setSelectionRange(caretPosition, caretPosition); } catch (error) { /* Some input types do not support selection ranges. */ }
    };
    const applyFocus = () => {
      let defaultFocusSelector = "";
      if (state.view === "pin" && !isLocked(selectedUser())) defaultFocusSelector = '[data-digit-group="pinDigits"][data-digit-index="0"]';
      else if (state.view === "add") defaultFocusSelector = "#activeUserName";
      else if (state.view === "forgot" && state.forgotStage === "code") defaultFocusSelector = '[data-digit-group="codeDigits"][data-digit-index="0"]';
      else if (state.view === "forgot" && state.forgotStage === "pin") defaultFocusSelector = '[data-digit-group="resetPinDigits"][data-digit-index="0"]';
      else if (state.view === "delete" && state.deleteStage === "code") defaultFocusSelector = '[data-digit-group="deleteCodeDigits"][data-digit-index="0"]';
      const target = ((focusSelector || defaultFocusSelector) && overlay.querySelector(focusSelector || defaultFocusSelector)) || overlay.querySelector("input:not(:disabled), button:not(:disabled)");
      target?.focus({ preventScroll: true });
      placeCaretAtEnd(target);
      return target;
    };
    const firstTarget = applyFocus();
    if (firstTarget instanceof HTMLInputElement) {
      window.setTimeout(() => {
        if (!overlay.hidden && document.contains(firstTarget)) {
          firstTarget.focus({ preventScroll: true });
          placeCaretAtEnd(firstTarget);
        }
      }, 0);
    }
    window.requestAnimationFrame(() => {
      const target = applyFocus();
      if (target instanceof HTMLInputElement) {
        window.setTimeout(() => {
          if (!overlay.hidden && document.contains(target)) {
            target.focus({ preventScroll: true });
            placeCaretAtEnd(target);
          }
        }, 0);
      }
    });
  }
  function resetScreenState() {
    state.message = ""; state.notice = ""; state.codeNotice = ""; state.pinDigits = ["", "", "", ""]; state.pinInvalid = false;
    state.username = ""; state.email = ""; state.usernameTouched = false; state.emailTouched = false; state.emailPasteError = false;
    state.createPinDigits = ["", "", "", ""]; state.confirmPinDigits = ["", "", "", ""]; state.createPinTouched = false; state.confirmPinTouched = false;
    state.forgotStage = "send"; state.codeDigits = ["", "", "", "", "", ""]; state.resetPinDigits = ["", "", "", ""]; state.resetConfirmDigits = ["", "", "", ""]; state.resetPinTouched = false; state.resetConfirmTouched = false;
    state.deleteStage = "confirm"; state.deleteCodeDigits = ["", "", "", "", "", ""];
  }
  function openDialog(view = "list", options = {}) {
    resetScreenState();
    state.view = view; state.fromSwitch = Boolean(options.fromSwitch); state.listCopy = options.copy || "";
    overlay.hidden = false; document.body.classList.add("has-active-user-dialog");
    if (!getActiveUser() && !state.historyGuard) { window.history.pushState({ cascadeShiftSignIn: true }, ""); state.historyGuard = true; }
    overlay.classList.add("is-open");
    render();
  }
  function closeDialog() { overlay.classList.remove("is-open"); document.body.classList.remove("has-active-user-dialog"); window.setTimeout(() => { overlay.hidden = true; }, 180); }
  function showList(copy = "", notice = "") { resetScreenState(); state.view = "list"; state.listCopy = copy; state.notice = notice; render(); }
  function withBusy(control, text, done) {
    if (state.busy || !control) return;
    state.busy = true; control.disabled = true; const oldText = control.textContent; control.textContent = text;
    window.setTimeout(() => { state.busy = false; control.textContent = oldText; done(); }, 450);
  }
  function saveUpdatedUser(user) { saveUsers(getUsers().map((item) => comparableUsername(item.username) === comparableUsername(user.username) ? user : item)); }
  function completeShift(user, message = "") {
    user.failedTries = 0; user.lockedUntil = 0; user.lastUsedAt = Date.now(); saveUpdatedUser(user); setActiveUser(user.username); updateDisplay();
    window.dispatchEvent(new CustomEvent("cascade:active-user-changed", { detail: { name: user.username } }));
    if (!message) { closeDialog(); return; }
    state.view = "success"; state.notice = message; render(); window.setTimeout(closeDialog, 850);
  }
  function requestCode(user, nextStage, control, resend = false) {
    if (!user) return;
    withBusy(control, "Sending\u2026", () => {
      state.codeNotice = resend ? "New code sent. The previous code no longer works." : "";
      if (state.view === "forgot") { state.forgotStage = nextStage; state.codeDigits = ["", "", "", "", "", ""]; }
      else { state.deleteStage = nextStage; state.deleteCodeDigits = ["", "", "", "", "", ""]; }
      state.message = ""; render();
    });
  }
  function validatePreceding(level) {
    let changed = false;
    if (level >= 1 && usernameStatus(state.username).kind !== "success" && !state.usernameTouched) { state.usernameTouched = true; changed = true; }
    if (level >= 2 && emailStatus(state.email).kind !== "success" && !state.emailTouched) { state.emailTouched = true; changed = true; }
    if (level >= 3 && pinStatus("createPinDigits").kind !== "success" && !state.createPinTouched) { state.createPinTouched = true; changed = true; }
    return changed;
  }
  function bindTextInputs() {
    const username = overlay.querySelector("#activeUserName");
    const email = overlay.querySelector("#activeUserEmail");
    function paintFieldState(input, statusElement, status, touched) {
      if (!input || !statusElement) return;
      const invalid = touched && status.kind !== "success";
      if (invalid) input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");
      input.classList.toggle("active-user-success", status.kind === "success");
      const kind = status.kind === "error" && !touched ? "help" : status.kind;
      statusElement.className = `active-user-status active-user-${kind}`;
      statusElement.textContent = status.text;
    }
    username?.addEventListener("input", () => { state.username = cleanUsername(username.value); state.message = ""; render("#activeUserName"); });
    username?.addEventListener("blur", () => {
      state.usernameTouched = true;
      paintFieldState(username, overlay.querySelector("#activeUserNameStatus"), usernameStatus(state.username), true);
    });
    username?.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); email?.focus(); } });
    email?.addEventListener("input", () => {
      const cleanedEmail = email.value.replace(/\s/g, "").slice(0, 100);
      if (email.value !== cleanedEmail) email.value = cleanedEmail;
      state.email = cleanedEmail;
      state.emailPasteError = false;
      state.emailTouched = false;
      state.message = "";
      paintFieldState(email, overlay.querySelector("#activeUserEmailStatus"), emailStatus(state.email), false);
      const submit = overlay.querySelector('[data-form="add"] .active-user-submit');
      if (submit) {
        const ready = usernameStatus(state.username).kind === "success" && emailStatus(state.email).kind === "success" && pinStatus("createPinDigits").kind === "success" && confirmStatus("createPinDigits", "confirmPinDigits").kind === "success";
        submit.disabled = !ready;
      }
    });
    email?.addEventListener("focus", () => { if (validatePreceding(1)) render("#activeUserEmail"); });
    email?.addEventListener("blur", () => {
      state.emailTouched = true;
      paintFieldState(email, overlay.querySelector("#activeUserEmailStatus"), emailStatus(state.email), true);
    });
    email?.addEventListener("paste", (event) => { event.preventDefault(); state.emailPasteError = true; state.emailTouched = true; render("#activeUserEmail"); });
    email?.addEventListener("drop", (event) => { event.preventDefault(); state.emailPasteError = true; state.emailTouched = true; render("#activeUserEmail"); });
    email?.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); overlay.querySelector('[data-digit-group="createPinDigits"][data-digit-index="0"]')?.focus(); } });
  }
  function bindDigitGroups() {
    const firstAvailableDigit = (property) => {
      const firstEmpty = state[property].findIndex((digit) => !digit);
      return firstEmpty === -1 ? state[property].length - 1 : firstEmpty;
    };
    const focusDigit = (property, index) => {
      const target = overlay.querySelector(`[data-digit-group="${property}"][data-digit-index="${index}"]`);
      if (!target) return;
      target.focus({ preventScroll: true });
      try { target.setSelectionRange(target.value.length, target.value.length); } catch (error) { /* Selection is optional. */ }
    };
    const canFocusDigit = (property, index) => Boolean(state[property][index]) || index <= firstAvailableDigit(property);
    overlay.querySelectorAll("[data-digit-group]").forEach((input) => {
      const property = input.dataset.digitGroup;
      const index = Number(input.dataset.digitIndex);
      const focusAt = (targetProperty, targetIndex) => `[data-digit-group="${targetProperty}"][data-digit-index="${targetIndex}"]`;
      input.addEventListener("pointerdown", (event) => {
        const allowedIndex = firstAvailableDigit(property);
        if (canFocusDigit(property, index)) return;
        event.preventDefault();
        focusDigit(property, allowedIndex);
      });
      input.addEventListener("focus", () => {
        const allowedIndex = firstAvailableDigit(property);
        if (!canFocusDigit(property, index)) {
          focusDigit(property, allowedIndex);
          return;
        }
        let changed = false;
        if (property === "createPinDigits") changed = validatePreceding(2);
        if (property === "confirmPinDigits") changed = validatePreceding(3);
        if (property === "resetConfirmDigits" && pinStatus("resetPinDigits").kind !== "success" && !state.resetPinTouched) { state.resetPinTouched = true; changed = true; }
        if (changed) render(focusAt(property, index));
      });
      input.addEventListener("input", () => {
        const digit = cleanDigits(input.value, 1);
        state[property][index] = digit;
        if (property === "pinDigits") { state.pinInvalid = false; state.message = ""; }
        if (property === "createPinDigits") state.createPinTouched = true;
        if (property === "confirmPinDigits") state.confirmPinTouched = true;
        if (property === "resetPinDigits") state.resetPinTouched = true;
        if (property === "resetConfirmDigits") state.resetConfirmTouched = true;
        let nextProperty = property;
        let nextIndex = digit ? Math.min(index + 1, state[property].length - 1) : index;
        if (digit && index === state[property].length - 1 && digitsValue(property).length === 4) {
          if (property === "createPinDigits" && pinStatus("createPinDigits").kind === "success") { nextProperty = "confirmPinDigits"; nextIndex = 0; }
          else if (property === "resetPinDigits" && pinStatus("resetPinDigits").kind === "success") { nextProperty = "resetConfirmDigits"; nextIndex = 0; }
        }
        render(focusAt(nextProperty, nextIndex));
      });
      input.addEventListener("paste", (event) => {
        event.preventDefault();
        const pasted = cleanDigits(event.clipboardData?.getData("text") || "", state[property].length - index);
        if (!pasted) return;
        [...pasted].forEach((digit, offset) => { state[property][index + offset] = digit; });
        if (property === "pinDigits") { state.pinInvalid = false; state.message = ""; }
        if (property === "createPinDigits") state.createPinTouched = true;
        if (property === "confirmPinDigits") state.confirmPinTouched = true;
        if (property === "resetPinDigits") state.resetPinTouched = true;
        if (property === "resetConfirmDigits") state.resetConfirmTouched = true;
        if (property === "createPinDigits" && digitsValue(property).length === 4 && pinStatus("createPinDigits").kind === "success") render(focusAt("confirmPinDigits", 0));
        else if (property === "resetPinDigits" && digitsValue(property).length === 4 && pinStatus("resetPinDigits").kind === "success") render(focusAt("resetConfirmDigits", 0));
        else render(focusAt(property, Math.min(index + pasted.length, state[property].length - 1)));
      });
      input.addEventListener("keydown", (event) => {
        if (event.key === "Backspace") {
          event.preventDefault();
          let target = index;
          if (state[property][index]) {
            const hasEarlierGap = state[property].slice(0, index).some((digit) => !digit);
            state[property][index] = "";
            if (hasEarlierGap) {
              target = -1;
              for (let previous = index - 1; previous >= 0; previous -= 1) {
                if (state[property][previous]) { target = previous; break; }
              }
              if (target < 0) target = firstAvailableDigit(property);
            }
          }
          else if (index > 0) { target = index - 1; state[property][target] = ""; }
          if (property === "pinDigits") { state.pinInvalid = false; state.message = ""; }
          render(focusAt(property, target));
        } else if (event.key === "ArrowLeft" && index > 0) { event.preventDefault(); overlay.querySelector(focusAt(property, index - 1))?.focus(); }
        else if (event.key === "ArrowRight" && index < state[property].length - 1) { event.preventDefault(); overlay.querySelector(focusAt(property, index + 1))?.focus(); }
        else if (event.key === "Enter") { const form = input.closest("form"); if (form && digitsValue(property).length === state[property].length) form.requestSubmit(); }
      });
    });
  }
  function bindDialog() {
    overlay.querySelectorAll("[data-profile]").forEach((tile) => tile.addEventListener("click", () => {
      state.selectedName = tile.dataset.profile;
      if (state.fromSwitch && comparableUsername(state.selectedName) === comparableUsername(getActiveUser())) { state.notice = `Still signed in as ${state.selectedName}.`; render(); window.setTimeout(closeDialog, 850); return; }
      state.view = "pin"; state.pinDigits = ["", "", "", ""]; state.pinInvalid = false; state.message = ""; render();
    }));
    overlay.querySelector("[data-add-user]")?.addEventListener("click", () => { resetScreenState(); state.view = "add"; render(); });
    overlay.querySelectorAll("[data-all-users]").forEach((control) => control.addEventListener("click", () => showList()));
    overlay.querySelector("[data-forgot-pin]")?.addEventListener("click", () => { state.view = "forgot"; state.forgotStage = "send"; state.message = ""; render(); });
    overlay.querySelector("[data-delete-profile]")?.addEventListener("click", () => { state.view = "delete"; state.deleteStage = "confirm"; state.message = ""; render(); });
    overlay.querySelector("[data-back-to-pin]")?.addEventListener("click", () => { state.view = "pin"; state.message = ""; state.pinDigits = ["", "", "", ""]; render(); });
    overlay.querySelector("[data-send-reset-code]")?.addEventListener("click", (event) => requestCode(selectedUser(), "code", event.currentTarget));
    overlay.querySelector("[data-resend-reset]")?.addEventListener("click", (event) => requestCode(selectedUser(), "code", event.currentTarget, true));
    overlay.querySelector("[data-send-delete-code]")?.addEventListener("click", (event) => requestCode(selectedUser(), "code", event.currentTarget));
    overlay.querySelector("[data-resend-delete]")?.addEventListener("click", (event) => requestCode(selectedUser(), "code", event.currentTarget, true));
    overlay.querySelector("[data-cancel-end]")?.addEventListener("click", closeDialog);
    overlay.querySelector("[data-confirm-end]")?.addEventListener("click", () => {
      const name = getActiveUser(); const endedAt = formatTime(); clearActiveUser(); updateDisplay();
      window.dispatchEvent(new CustomEvent("cascade:active-user-changed", { detail: { name: "" } }));
      showList(`${name} ended their session at ${endedAt}. Pick your profile to continue placing orders from ${pharmacy}.`);
    });
    bindTextInputs(); bindDigitGroups(); overlay.querySelector("form")?.addEventListener("submit", submitCurrentForm);
  }
  function submitCurrentForm(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (form.dataset.form === "profile-pin") {
      const user = selectedUser(); const pin = digitsValue("pinDigits");
      if (!user || isLocked(user) || pin.length !== 4) return;
      if (user.pin !== pin) {
        user.failedTries = Number(user.failedTries || 0) + 1;
        if (user.failedTries >= 5) { user.failedTries = 5; user.lockedUntil = 0; state.message = "Too many wrong PINs. Use Forgot PIN to reset and unlock it now."; }
        else { const tries = 5 - user.failedTries; state.message = `Incorrect PIN. ${tries} ${tries === 1 ? "try" : "tries"} left.`; }
        saveUpdatedUser(user); state.pinDigits = ["", "", "", ""]; state.pinInvalid = true; render('[data-digit-group="pinDigits"][data-digit-index="0"]'); return;
      }
      withBusy(form.querySelector(".active-user-submit"), "Signing in\u2026", () => completeShift(user)); return;
    }
    if (form.dataset.form === "add") {
      state.usernameTouched = true; state.emailTouched = true; state.createPinTouched = true; state.confirmPinTouched = true;
      const username = normaliseUsername(state.username); const email = state.email; const pin = digitsValue("createPinDigits");
      if (usernameStatus(username).kind !== "success" || emailStatus(email).kind !== "success" || !isValidPin(pin) || digitsValue("confirmPinDigits") !== pin) { render(); return; }
      const control = form.querySelector(".active-user-submit");
      withBusy(control, "Saving\u2026", () => {
        if (findUser(username)) { state.message = "Someone just created this username. Choose another."; render(); return; }
        if (getUsers().some((user) => comparableEmail(user.email) === comparableEmail(email))) { state.message = "Someone just used this email for another profile. Use a different email."; render(); return; }
        const user = { username, email, pin, createdAt: Date.now(), lastUsedAt: Date.now(), failedTries: 0, lockedUntil: 0 };
        saveUsers([...getUsers(), user]); completeShift(user, `${username} added. Shift started.`);
      }); return;
    }
    if (form.dataset.form === "reset-code") {
      if (digitsValue("codeDigits").length !== 6) { state.message = "Enter the 6-digit code from the email."; render(); return; }
      withBusy(form.querySelector(".active-user-submit"), "Checking\u2026", () => { state.forgotStage = "pin"; state.message = ""; render(); }); return;
    }
    if (form.dataset.form === "reset-pin") {
      const user = selectedUser(); const pin = digitsValue("resetPinDigits"); state.resetPinTouched = true; state.resetConfirmTouched = true;
      if (!user || !isValidPin(pin) || digitsValue("resetConfirmDigits") !== pin) { render(); return; }
      withBusy(form.querySelector(".active-user-submit"), "Saving\u2026", () => { user.pin = pin; user.failedTries = 0; user.lockedUntil = 0; completeShift(user, `PIN reset for ${user.username}. Shift started.`); }); return;
    }
    if (form.dataset.form === "delete-code") {
      const user = selectedUser();
      if (!user || digitsValue("deleteCodeDigits").length !== 6) return;
      withBusy(form.querySelector(".active-user-submit"), "Deleting\u2026", () => {
        const active = comparableUsername(user.username) === comparableUsername(getActiveUser());
        saveUsers(getUsers().filter((item) => comparableUsername(item.username) !== comparableUsername(user.username)));
        if (active) {
          clearActiveUser(); updateDisplay(); window.dispatchEvent(new CustomEvent("cascade:active-user-changed", { detail: { name: "" } }));
          showList(`${user.username}'s profile was deleted and their session ended. Pick your profile to continue placing orders from ${pharmacy}.`, `${user.username}'s profile was deleted and the session ended.`);
        } else showList("", `${user.username}'s profile was deleted.`);
      });
    }
  }
  function updateIdleTimer() {
    if (!IDLE_TIMEOUT_MS || !getActiveUser()) return;
    if (state.idleTimer) window.clearTimeout(state.idleTimer);
    state.idleTimer = window.setTimeout(() => {
      if (!getActiveUser()) return;
      const name = getActiveUser(); clearActiveUser(); updateDisplay(); window.dispatchEvent(new CustomEvent("cascade:active-user-changed", { detail: { name: "" } }));
      openDialog("list", { copy: `${name}'s session ended after 30 minutes with no activity. Pick your profile to continue placing orders from ${pharmacy}.` });
    }, IDLE_TIMEOUT_MS);
  }

  button.addEventListener("click", (event) => { if (button.disabled) return; event.stopPropagation(); const isOpen = menu.classList.toggle("is-open"); button.setAttribute("aria-expanded", String(isOpen)); });
  menu.querySelector("[data-switch-user]").addEventListener("click", () => { closeMenu(); openDialog("list", { fromSwitch: true }); });
  menu.querySelector("[data-end-session]").addEventListener("click", () => { closeMenu(); openDialog("end", { fromSwitch: true }); });
  document.addEventListener("click", (event) => { if (!menu.contains(event.target)) closeMenu(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !overlay.hidden) { event.preventDefault(); if (getActiveUser()) closeDialog(); else overlay.querySelector("input:not(:disabled), button:not(:disabled)")?.focus(); } });
  overlay.addEventListener("click", (event) => { if (event.target === overlay) { if (getActiveUser()) closeDialog(); else overlay.querySelector("input:not(:disabled), button:not(:disabled)")?.focus(); } });
  overlay.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const focusable = [...overlay.querySelectorAll("input:not(:disabled), button:not(:disabled)")]; const first = focusable[0]; const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
  window.addEventListener("popstate", () => { if (overlay.hidden) return; if (getActiveUser()) { closeDialog(); return; } window.history.pushState({ cascadeShiftSignIn: true }, ""); state.historyGuard = true; overlay.querySelector("input:not(:disabled), button:not(:disabled)")?.focus(); });
  if (IDLE_TIMEOUT_MS) ["mousemove", "keydown"].forEach((type) => document.addEventListener(type, () => { if (getActiveUser()) updateIdleTimer(); }, { passive: true }));
  updateDisplay(); updateIdleTimer(); if (!getActiveUser()) openDialog("list");
}

initActiveUserFlow();
