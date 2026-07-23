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
  localStorage.removeItem(EMAIL_KEY);
  localStorage.removeItem(COMPANY_KEY);
  localStorage.removeItem(COMPANY_WEBSITE_KEY);
  localStorage.removeItem(COMPANY_INDUSTRY_KEY);
  localStorage.removeItem(COMPANY_SIZE_KEY);
  localStorage.removeItem(COMPANY_LOCATION_KEY);
  localStorage.removeItem(COMPANY_DESCRIPTION_KEY);
  localStorage.removeItem(COMPANY_VERIFICATION_STATUS_KEY);
  localStorage.removeItem(VERIFICATION_STATUS_KEY);
}

const token = localStorage.getItem(TOKEN_KEY);
if (!token || getRole() !== "recruiter") {
  redirectRecruiterLogin();
}

const recruiterNameEl = document.getElementById("recruiter-name");
const recruiterCardNameEl = document.getElementById("recruiter-card-name");
const recruiterEmailEl = document.getElementById("recruiter-email");
const companyNameEl = document.getElementById("company-name");
const companyProfileNameEl = document.getElementById("company-profile-name");
const companyWebsiteEl = document.getElementById("company-website");
const companyIndustryEl = document.getElementById("company-industry");
const companySizeEl = document.getElementById("company-size");
const companyLocationEl = document.getElementById("company-location");
const companyDescriptionEl = document.getElementById("company-description");
const companyVerificationStatusEl = document.getElementById("company-verification-status");
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
  const companyWebsite = String(details.companyWebsite || localStorage.getItem(COMPANY_WEBSITE_KEY) || "Not added").trim();
  const companyIndustry = String(details.companyIndustry || localStorage.getItem(COMPANY_INDUSTRY_KEY) || "Not added").trim();
  const companySize = String(details.companySize || localStorage.getItem(COMPANY_SIZE_KEY) || "Not added").trim();
  const companyLocation = String(details.companyLocation || localStorage.getItem(COMPANY_LOCATION_KEY) || "Not added").trim();
  const companyDescription = String(details.companyDescription || localStorage.getItem(COMPANY_DESCRIPTION_KEY) || "Not added").trim();
  const companyVerificationStatus = formatStatus(
    details.companyVerificationStatus || localStorage.getItem(COMPANY_VERIFICATION_STATUS_KEY) || "pending"
  );
  const verificationStatus = formatStatus(
    details.verificationStatus || localStorage.getItem(VERIFICATION_STATUS_KEY) || "pending"
  );

  localStorage.setItem(NAME_KEY, recruiterName);
  if (recruiterEmail !== "Not added") localStorage.setItem(EMAIL_KEY, recruiterEmail);
  if (companyName !== "Not added") localStorage.setItem(COMPANY_KEY, companyName);
  if (companyWebsite !== "Not added") localStorage.setItem(COMPANY_WEBSITE_KEY, companyWebsite);
  if (companyIndustry !== "Not added") localStorage.setItem(COMPANY_INDUSTRY_KEY, companyIndustry);
  if (companySize !== "Not added") localStorage.setItem(COMPANY_SIZE_KEY, companySize);
  if (companyLocation !== "Not added") localStorage.setItem(COMPANY_LOCATION_KEY, companyLocation);
  if (companyDescription !== "Not added") localStorage.setItem(COMPANY_DESCRIPTION_KEY, companyDescription);
  localStorage.setItem(COMPANY_VERIFICATION_STATUS_KEY, companyVerificationStatus.toLowerCase());
  localStorage.setItem(VERIFICATION_STATUS_KEY, verificationStatus.toLowerCase());

  if (recruiterNameEl) recruiterNameEl.textContent = recruiterName;
  if (recruiterCardNameEl) recruiterCardNameEl.textContent = recruiterName;
  if (recruiterEmailEl) recruiterEmailEl.textContent = recruiterEmail;
  if (companyNameEl) companyNameEl.textContent = companyName;
  if (companyProfileNameEl) companyProfileNameEl.textContent = companyName;
  if (companyWebsiteEl) companyWebsiteEl.textContent = companyWebsite;
  if (companyIndustryEl) companyIndustryEl.textContent = companyIndustry;
  if (companySizeEl) companySizeEl.textContent = companySize;
  if (companyLocationEl) companyLocationEl.textContent = companyLocation;
  if (companyDescriptionEl) companyDescriptionEl.textContent = companyDescription;
  if (companyVerificationStatusEl) companyVerificationStatusEl.textContent = companyVerificationStatus;
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
