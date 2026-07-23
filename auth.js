const API_BASE = "http://localhost:4000";
const TOKEN_KEY = "nexthire_token";
const NAME_KEY = "nexthire_name";
const ROLE_KEY = "nexthire_role";
const EMAIL_KEY = "nexthire_email";
const COMPANY_KEY = "nexthire_company_name";
const COMPANY_WEBSITE_KEY = "nexthire_company_website";
const COMPANY_INDUSTRY_KEY = "nexthire_company_industry";
const COMPANY_SIZE_KEY = "nexthire_company_size";
const COMPANY_LOCATION_KEY = "nexthire_company_location";
const COMPANY_DESCRIPTION_KEY = "nexthire_company_description";
const COMPANY_VERIFICATION_STATUS_KEY = "nexthire_company_verification_status";
const VERIFICATION_STATUS_KEY = "nexthire_verification_status";
const RECRUITER_DASHBOARD_PATH = "recruiter-dashboard.html";

const authStatusEl = document.getElementById("auth-status");
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");

const signupNameInput = document.getElementById("signup-name");
const signupRoleInput = document.getElementById("signup-role");
const signupCompanyRow = document.getElementById("signup-company-row");
const signupCompanyInput = document.getElementById("signup-company");
const signupCompanyWebsiteRow = document.getElementById("signup-company-website-row");
const signupCompanyWebsiteInput = document.getElementById("signup-company-website");
const signupCompanyIndustryRow = document.getElementById("signup-company-industry-row");
const signupCompanyIndustryInput = document.getElementById("signup-company-industry");
const signupCompanySizeRow = document.getElementById("signup-company-size-row");
const signupCompanySizeInput = document.getElementById("signup-company-size");
const signupCompanyLocationRow = document.getElementById("signup-company-location-row");
const signupCompanyLocationInput = document.getElementById("signup-company-location");
const signupCompanyDescriptionRow = document.getElementById("signup-company-description-row");
const signupCompanyDescriptionInput = document.getElementById("signup-company-description");
const signupEmailInput = document.getElementById("signup-email");
const signupPasswordInput = document.getElementById("signup-password");
const signupOtpInput = document.getElementById("signup-otp");
const requestOtpBtn = document.getElementById("request-otp-btn");
const verifyOtpBtn = document.getElementById("verify-otp-btn");
const verifyBadge = document.getElementById("verify-badge");

const REQUEST_TIMEOUT_MS = 12000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

let signupVerifyToken = "";
let verifiedEmail = "";

function setAuthStatus(type, message) {
  if (!authStatusEl) return;
  authStatusEl.className = `status ${type || ""}`.trim();
  authStatusEl.textContent = message;
}

function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function setName(name) {
  if (name) localStorage.setItem(NAME_KEY, name);
  else localStorage.removeItem(NAME_KEY);
}

function setRole(role) {
  const safeRole = String(role || "").trim().toLowerCase();
  if (safeRole) localStorage.setItem(ROLE_KEY, safeRole);
  else localStorage.removeItem(ROLE_KEY);
}

function setOptionalStorage(key, value = "") {
  const safeValue = String(value || "").trim();
  if (safeValue) localStorage.setItem(key, safeValue);
  else localStorage.removeItem(key);
}

function setUserDetails({
  email = "",
  companyName = "",
  companyWebsite = "",
  companyIndustry = "",
  companySize = "",
  companyLocation = "",
  companyDescription = "",
  companyVerificationStatus = "",
  verificationStatus = "",
} = {}) {
  const safeEmail = normalizeEmail(email);
  const safeStatus = String(verificationStatus || "").trim().toLowerCase();
  if (safeEmail) localStorage.setItem(EMAIL_KEY, safeEmail);
  setOptionalStorage(COMPANY_KEY, companyName);
  setOptionalStorage(COMPANY_WEBSITE_KEY, companyWebsite);
  setOptionalStorage(COMPANY_INDUSTRY_KEY, companyIndustry);
  setOptionalStorage(COMPANY_SIZE_KEY, companySize);
  setOptionalStorage(COMPANY_LOCATION_KEY, companyLocation);
  setOptionalStorage(COMPANY_DESCRIPTION_KEY, companyDescription);
  setOptionalStorage(COMPANY_VERIFICATION_STATUS_KEY, companyVerificationStatus);
  if (safeStatus) localStorage.setItem(VERIFICATION_STATUS_KEY, safeStatus);
}

function getRole() {
  return String(localStorage.getItem(ROLE_KEY) || "").trim().toLowerCase();
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function guessNameFromEmail(email) {
  if (!email) return "";
  const local = email.split("@")[0] || "";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function redirectHome() {
  const role = String(localStorage.getItem(ROLE_KEY) || "").toLowerCase();
  window.location.href = role === "admin" ? "admin.html" : "index.html";
}

function redirectRecruiterDashboard() {
  window.location.href = RECRUITER_DASHBOARD_PATH;
}

function getLoginIntent() {
  const params = new URLSearchParams(window.location.search || "");
  return {
    role: String(params.get("role") || "").trim().toLowerCase(),
    redirect: String(params.get("redirect") || "").trim(),
    email: normalizeEmail(params.get("email") || ""),
    companyName: String(params.get("companyName") || "").trim(),
    companyWebsite: String(params.get("companyWebsite") || "").trim(),
    companyIndustry: String(params.get("companyIndustry") || "").trim(),
    companySize: String(params.get("companySize") || "").trim(),
    companyLocation: String(params.get("companyLocation") || "").trim(),
    companyDescription: String(params.get("companyDescription") || "").trim(),
    companyVerificationStatus: String(params.get("companyVerificationStatus") || "").trim(),
  };
}

function getRecruiterLoginUrl(email = "") {
  const params = new URLSearchParams({
    role: "recruiter",
    redirect: RECRUITER_DASHBOARD_PATH,
  });
  if (email) params.set("email", email);
  return `login.html?${params.toString()}`;
}

function getRedirectForAuthRole(role, intent = {}) {
  const safeRole = String(role || "").trim().toLowerCase();
  const safeRedirect = String(intent.redirect || "").trim();
  if (safeRole === "recruiter" && safeRedirect === RECRUITER_DASHBOARD_PATH) {
    return redirectRecruiterDashboard;
  }
  return safeRole === "recruiter"
    ? redirectRecruiterDashboard
    : redirectHome;
}

function applyLoginIntent() {
  const intent = getLoginIntent();
  const emailInput = document.getElementById("login-email");
  if (emailInput && intent.email) {
    emailInput.value = intent.email;
  }
  if (loginForm && getRole() === "recruiter" && localStorage.getItem(TOKEN_KEY)) {
    redirectRecruiterDashboard();
  }
  if (signupForm && getRole() === "recruiter" && localStorage.getItem(TOKEN_KEY)) {
    redirectRecruiterDashboard();
  }
  return intent;
}

function renderVerifyBadge(ok, message = "") {
  if (!verifyBadge) return;
  verifyBadge.classList.toggle("verified", Boolean(ok));
  verifyBadge.textContent = message || (ok ? "Verified" : "Not verified");
}

function resetVerificationState() {
  signupVerifyToken = "";
  verifiedEmail = "";
  renderVerifyBadge(false, "Not verified");
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function pingBackend() {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/health`);
    if (!res.ok) throw new Error("Backend not healthy.");
    setAuthStatus("ok", "Backend connected. You can continue.");
  } catch {
    setAuthStatus("err", "Backend not reachable. Start server on http://localhost:4000.");
  }
}

const loginIntent = applyLoginIntent();
pingBackend();

function syncSignupRoleFields() {
  const isRecruiter = String(signupRoleInput?.value || "").toLowerCase() === "recruiter";
  [
    signupCompanyRow,
    signupCompanyWebsiteRow,
    signupCompanyIndustryRow,
    signupCompanySizeRow,
    signupCompanyLocationRow,
    signupCompanyDescriptionRow,
  ].forEach((row) => row?.classList.toggle("hidden", !isRecruiter));
  [
    signupCompanyInput,
    signupCompanyWebsiteInput,
    signupCompanyIndustryInput,
    signupCompanySizeInput,
    signupCompanyLocationInput,
  ].forEach((input) => {
    if (input) input.required = isRecruiter;
  });
}

signupRoleInput?.addEventListener("change", syncSignupRoleFields);
syncSignupRoleFields();

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setAuthStatus("warn", "Logging in...");
    try {
      const payload = {
        email: normalizeEmail(document.getElementById("login-email")?.value || ""),
        password: document.getElementById("login-password")?.value || "",
      };
      const res = await fetchWithTimeout(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        throw new Error(msg.error || "Login failed.");
      }
      const data = await res.json();
      setToken(data.token);
      const name = (data.name || "").trim() || guessNameFromEmail(payload.email) || "";
      setName(name);
      setRole(data.role || "candidate");
      setUserDetails({
        email: payload.email,
        companyName: data.companyName || loginIntent.companyName,
        companyWebsite: data.companyWebsite || loginIntent.companyWebsite,
        companyIndustry: data.companyIndustry || loginIntent.companyIndustry,
        companySize: data.companySize || loginIntent.companySize,
        companyLocation: data.companyLocation || loginIntent.companyLocation,
        companyDescription: data.companyDescription || loginIntent.companyDescription,
        companyVerificationStatus:
          data.companyVerificationStatus || loginIntent.companyVerificationStatus,
        verificationStatus: data.verificationStatus || "",
      });
      setAuthStatus("ok", "Logged in. Redirecting...");
      setTimeout(getRedirectForAuthRole(data.role, loginIntent), 400);
    } catch (err) {
      const message =
        err.name === "AbortError"
          ? "Login timed out. Check backend and try again."
          : err.message === "Failed to fetch"
            ? "Cannot reach backend. Start server on http://localhost:4000."
            : err.message;
      setAuthStatus("err", message);
    }
  });
}

if (signupForm) {
  resetVerificationState();

  signupEmailInput?.addEventListener("input", () => {
    const email = normalizeEmail(signupEmailInput.value);
    if (!email || email !== verifiedEmail) {
      resetVerificationState();
    }
  });

  requestOtpBtn?.addEventListener("click", async () => {
    const email = normalizeEmail(signupEmailInput?.value || "");
    const name = String(signupNameInput?.value || "").trim();
    if (!EMAIL_REGEX.test(email)) {
      setAuthStatus("err", "Enter a valid email before requesting code.");
      return;
    }
    requestOtpBtn.disabled = true;
    setAuthStatus("warn", "Sending verification code...");
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/auth/verification/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not send verification code.");
      if (data?.devMode) {
        const devCode = String(data.devCode || "").trim();
        setAuthStatus(
          "warn",
          devCode
            ? `Dev email mode active. Use verification code ${devCode}.`
            : "Dev email mode active. Configure SMTP to receive real emails."
        );
      } else {
        setAuthStatus("ok", "Verification code sent. Check your email inbox/spam.");
      }
      renderVerifyBadge(false, "Code sent");
      signupOtpInput?.focus();
    } catch (err) {
      const message =
        err.name === "AbortError"
          ? "Verification request timed out. Try again."
          : err.message === "Failed to fetch"
            ? "Cannot reach backend. Start server on http://localhost:4000."
            : err.message;
      setAuthStatus("err", message);
    } finally {
      requestOtpBtn.disabled = false;
    }
  });

  verifyOtpBtn?.addEventListener("click", async () => {
    const email = normalizeEmail(signupEmailInput?.value || "");
    const code = String(signupOtpInput?.value || "").trim();
    if (!EMAIL_REGEX.test(email)) {
      setAuthStatus("err", "Enter a valid email first.");
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setAuthStatus("err", "Enter the 6-digit verification code.");
      return;
    }
    verifyOtpBtn.disabled = true;
    setAuthStatus("warn", "Verifying email...");
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/auth/verification/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Email verification failed.");
      signupVerifyToken = String(data.verifyToken || "");
      verifiedEmail = email;
      renderVerifyBadge(true, "Verified");
      setAuthStatus("ok", "Email verified. You can create account now.");
    } catch (err) {
      resetVerificationState();
      const message =
        err.name === "AbortError"
          ? "Verification timed out. Try again."
          : err.message === "Failed to fetch"
            ? "Cannot reach backend. Start server on http://localhost:4000."
            : err.message;
      setAuthStatus("err", message);
    } finally {
      verifyOtpBtn.disabled = false;
    }
  });

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = normalizeEmail(signupEmailInput?.value || "");
    if (!EMAIL_REGEX.test(email)) {
      setAuthStatus("err", "Enter a valid email.");
      return;
    }
    if (!signupVerifyToken || email !== verifiedEmail) {
      setAuthStatus("err", "Verify your email before creating account.");
      return;
    }
    setAuthStatus("warn", "Creating account...");
    try {
      const payload = {
        name: signupNameInput?.value.trim() || "",
        role: String(signupRoleInput?.value || "candidate").toLowerCase(),
        companyName: signupCompanyInput?.value.trim() || "",
        companyWebsite: signupCompanyWebsiteInput?.value.trim() || "",
        companyIndustry: signupCompanyIndustryInput?.value.trim() || "",
        companySize: signupCompanySizeInput?.value.trim() || "",
        companyLocation: signupCompanyLocationInput?.value.trim() || "",
        companyDescription: signupCompanyDescriptionInput?.value.trim() || "",
        email,
        password: signupPasswordInput?.value || "",
        verifyToken: signupVerifyToken,
      };
      const res = await fetchWithTimeout(`${API_BASE}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        throw new Error(msg.error || "Signup failed.");
      }
      if (payload.role === "recruiter") {
        setAuthStatus("warn", "Account created. Opening recruiter dashboard...");
        try {
          const loginRes = await fetchWithTimeout(`${API_BASE}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: payload.email, password: payload.password }),
          });
          if (!loginRes.ok) throw new Error("Recruiter auto-login unavailable.");
          const data = await loginRes.json();
          if (String(data.role || "").toLowerCase() !== "recruiter") {
            throw new Error("Recruiter account was not returned by login.");
          }
          setToken(data.token);
          setName((data.name || "").trim() || payload.name || guessNameFromEmail(payload.email));
          setRole("recruiter");
          setUserDetails({
            email: payload.email,
            companyName: data.companyName || payload.companyName,
            companyWebsite: data.companyWebsite || payload.companyWebsite,
            companyIndustry: data.companyIndustry || payload.companyIndustry,
            companySize: data.companySize || payload.companySize,
            companyLocation: data.companyLocation || payload.companyLocation,
            companyDescription: data.companyDescription || payload.companyDescription,
            companyVerificationStatus: data.companyVerificationStatus || "submitted",
            verificationStatus: data.verificationStatus || "pending",
          });
          resetVerificationState();
          setTimeout(redirectRecruiterDashboard, 400);
          return;
        } catch {
          resetVerificationState();
          setAuthStatus("ok", "Account created. Redirecting to recruiter login...");
          setTimeout(() => {
            window.location.href = getRecruiterLoginUrl(payload.email);
          }, 600);
          return;
        }
      }
      setAuthStatus("ok", "Account created. Redirecting to login...");
      resetVerificationState();
      setTimeout(() => {
        window.location.href = "login.html";
      }, 600);
    } catch (err) {
      const message =
        err.name === "AbortError"
          ? "Signup timed out. Check backend and try again."
          : err.message === "Failed to fetch"
            ? "Cannot reach backend. Start server on http://localhost:4000."
            : err.message;
      setAuthStatus("err", message);
    }
  });
}
