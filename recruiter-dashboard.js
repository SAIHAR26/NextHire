const TOKEN_KEY = "nexthire_token";
const NAME_KEY = "nexthire_name";
const ROLE_KEY = "nexthire_role";
const EMAIL_KEY = "nexthire_email";
const COMPANY_KEY = "nexthire_company_name";
const VERIFICATION_STATUS_KEY = "nexthire_verification_status";
const API_BASE = "http://localhost:4000";
const RECRUITER_LOGIN_URL = "login.html?role=recruiter&redirect=recruiter-dashboard.html";

function getRole() {
  return String(localStorage.getItem(ROLE_KEY) || "").trim().toLowerCase();
}

function redirectRecruiterLogin() {
  window.location.href = RECRUITER_LOGIN_URL;
}

function clearRecruiterSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(NAME_KEY);
  localStorage.removeItem(ROLE_KEY);
}

const token = localStorage.getItem(TOKEN_KEY);
if (!token || getRole() !== "recruiter") {
  redirectRecruiterLogin();
}

const recruiterNameEl = document.getElementById("recruiter-name");
const recruiterCardNameEl = document.getElementById("recruiter-card-name");
const recruiterEmailEl = document.getElementById("recruiter-email");
const companyNameEl = document.getElementById("company-name");
const verificationStatusEl = document.getElementById("verification-status");

function decodeTokenPayload(tokenValue = "") {
  try {
    const parts = String(tokenValue || "").split(".");
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64));
  } catch {
    return null;
  }
}

function formatStatus(status = "") {
  const safeStatus = String(status || "").trim().toLowerCase();
  if (!safeStatus) return "Pending";
  return safeStatus[0].toUpperCase() + safeStatus.slice(1);
}

function renderRecruiterDetails(details = {}) {
  const payload = decodeTokenPayload(token) || {};
  const recruiterName = String(details.name || localStorage.getItem(NAME_KEY) || "Recruiter").trim();
  const recruiterEmail = String(details.email || localStorage.getItem(EMAIL_KEY) || payload.email || "Not added").trim();
  const companyName = String(details.companyName || localStorage.getItem(COMPANY_KEY) || "Not added").trim();
  const verificationStatus = formatStatus(
    details.verificationStatus || localStorage.getItem(VERIFICATION_STATUS_KEY) || "pending"
  );

  localStorage.setItem(NAME_KEY, recruiterName);
  if (recruiterEmail !== "Not added") localStorage.setItem(EMAIL_KEY, recruiterEmail);
  if (companyName !== "Not added") localStorage.setItem(COMPANY_KEY, companyName);
  localStorage.setItem(VERIFICATION_STATUS_KEY, verificationStatus.toLowerCase());

  if (recruiterNameEl) recruiterNameEl.textContent = recruiterName;
  if (recruiterCardNameEl) recruiterCardNameEl.textContent = recruiterName;
  if (recruiterEmailEl) recruiterEmailEl.textContent = recruiterEmail;
  if (companyNameEl) companyNameEl.textContent = companyName;
  if (verificationStatusEl) verificationStatusEl.textContent = verificationStatus;
}

renderRecruiterDetails();

fetch(`${API_BASE}/api/auth/me`, {
  headers: { Authorization: `Bearer ${token}` },
})
  .then((res) => (res.ok ? res.json() : null))
  .then((data) => {
    if (data?.user?.role === "recruiter") renderRecruiterDetails(data.user);
  })
  .catch(() => null);

document.getElementById("recruiter-logout-btn")?.addEventListener("click", () => {
  clearRecruiterSession();
  redirectRecruiterLogin();
});
