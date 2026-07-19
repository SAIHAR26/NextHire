const TOKEN_KEY = "nexthire_token";
const NAME_KEY = "nexthire_name";
const ROLE_KEY = "nexthire_role";
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
const recruiterName = localStorage.getItem(NAME_KEY) || "Recruiter";
if (recruiterNameEl) {
  recruiterNameEl.textContent = recruiterName;
}
if (recruiterCardNameEl) {
  recruiterCardNameEl.textContent = recruiterName;
}

document.getElementById("recruiter-logout-btn")?.addEventListener("click", () => {
  clearRecruiterSession();
  redirectRecruiterLogin();
});
