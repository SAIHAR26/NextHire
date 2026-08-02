const TOKEN_KEY = "nexthire_token";
const NAME_KEY = "nexthire_name";
const ROLE_KEY = "nexthire_role";
const EMAIL_KEY = "nexthire_email";
const COMPANY_KEY = "nexthire_company_name";
const COMPANY_PHONE_KEY = "nexthire_company_phone";
const COMPANY_WEBSITE_KEY = "nexthire_company_website";
const COMPANY_INDUSTRY_KEY = "nexthire_company_industry";
const COMPANY_SIZE_KEY = "nexthire_company_size";
const COMPANY_LOCATION_KEY = "nexthire_company_location";
const COMPANY_DESCRIPTION_KEY = "nexthire_company_description";
const COMPANY_VERIFICATION_STATUS_KEY = "nexthire_company_verification_status";
const VERIFICATION_STATUS_KEY = "nexthire_verification_status";
const API_BASE = window.location.origin.startsWith("http") ? window.location.origin : "http://localhost:4000";
const RECRUITER_LOGIN_URL = "login.html?role=recruiter&redirect=recruiter-dashboard.html";

let dashboardState = { user: {}, profile: {}, stats: {}, opportunities: [], applications: [] };
let rankingsSearchTimer = null;

function $(id) {
  return document.getElementById(id);
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getRole() {
  return String(localStorage.getItem(ROLE_KEY) || "").trim().toLowerCase();
}

function redirectRecruiterLogin() {
  window.location.href = RECRUITER_LOGIN_URL;
}

function clearRecruiterSession() {
  [TOKEN_KEY, NAME_KEY, ROLE_KEY, EMAIL_KEY, COMPANY_KEY, COMPANY_PHONE_KEY, COMPANY_WEBSITE_KEY, COMPANY_INDUSTRY_KEY, COMPANY_SIZE_KEY, COMPANY_LOCATION_KEY, COMPANY_DESCRIPTION_KEY, COMPANY_VERIFICATION_STATUS_KEY, VERIFICATION_STATUS_KEY].forEach((key) => localStorage.removeItem(key));
}

function escapeHtml(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatStatus(status = "") {
  const safeStatus = String(status || "pending").trim().toLowerCase();
  return safeStatus ? safeStatus[0].toUpperCase() + safeStatus.slice(1) : "Pending";
}

function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function splitList(value = "") {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function setStatus(message, kind = "muted") {
  const el = $("recruiter-status");
  if (!el) return;
  el.className = `status ${kind}`.trim();
  el.textContent = message;
}

async function fetchJson(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "Request failed.");
    err.status = res.status;
    throw err;
  }
  return data;
}

function updateText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

function updateInput(id, value) {
  const el = $(id);
  if (el) el.value = value || "";
}

function displayValue(value = "") {
  const safe = String(value || "").trim();
  return safe || "Not added";
}

function setCompanyFormOpen(open) {
  const form = $("company-form");
  const button = $("company-edit-toggle");
  if (!form) return;
  form.classList.toggle("hidden", !open);
  if (button) button.textContent = open ? "Hide Details Form" : "Change Details";
}

function renderCompanyView(user = {}) {
  updateText("company-view-name", displayValue(user.companyName));
  updateText("company-view-phone", displayValue(user.companyPhone));
  updateText("company-view-website", displayValue(user.companyWebsite));
  updateText("company-view-industry", displayValue(user.companyIndustry));
  updateText("company-view-size", displayValue(user.companySize));
  updateText("company-view-location", displayValue(user.companyLocation));
  updateText("company-view-description", displayValue(user.companyDescription));
  updateText("company-db-status", user.companyVerificationStatus ? `Company ${formatStatus(user.companyVerificationStatus)}` : "MongoDB synced");
}


function persistUser(user = {}) {
  if (user.name) localStorage.setItem(NAME_KEY, user.name);
  if (user.email) localStorage.setItem(EMAIL_KEY, user.email);
  localStorage.setItem(ROLE_KEY, "recruiter");
  localStorage.setItem(COMPANY_KEY, user.companyName || "");
  localStorage.setItem(COMPANY_PHONE_KEY, user.companyPhone || "");
  localStorage.setItem(COMPANY_WEBSITE_KEY, user.companyWebsite || "");
  localStorage.setItem(COMPANY_INDUSTRY_KEY, user.companyIndustry || "");
  localStorage.setItem(COMPANY_SIZE_KEY, user.companySize || "");
  localStorage.setItem(COMPANY_LOCATION_KEY, user.companyLocation || "");
  localStorage.setItem(COMPANY_DESCRIPTION_KEY, user.companyDescription || "");
  localStorage.setItem(COMPANY_VERIFICATION_STATUS_KEY, user.companyVerificationStatus || "");
  localStorage.setItem(VERIFICATION_STATUS_KEY, user.verificationStatus || "");
}

function renderUser(user = {}, profile = {}) {
  const name = user.name || localStorage.getItem(NAME_KEY) || "Recruiter";
  const email = user.email || localStorage.getItem(EMAIL_KEY) || "Not added";
  const companyName = user.companyName || localStorage.getItem(COMPANY_KEY) || "Not added";
  persistUser(user);

  updateText("recruiter-name", name);
  updateText("recruiter-card-name", name);
  updateText("recruiter-email", email);
  updateText("company-name", companyName);
    renderCompanyView(user);
  updateText("verification-status", formatStatus(user.verificationStatus || "pending"));
  updateText("profile-completion", `${profile.completion || 0}%`);
  updateText("recruiter-score", profile.score || 0);
  updateText("recruiter-summary", `${formatStatus(user.verificationStatus)} recruiter at ${companyName}. Manage jobs and candidate applications from this workspace.`);

  updateInput("company-input-name", user.companyName || "");
  updateInput("company-input-phone", user.companyPhone || "");
  updateInput("company-input-website", user.companyWebsite || "");
  updateInput("company-input-industry", user.companyIndustry || "");
  updateInput("company-input-size", user.companySize || "");
  updateInput("company-input-location", user.companyLocation || "");
  updateInput("company-input-description", user.companyDescription || "");
}

function renderStats(stats = {}) {
  updateText("hero-active-jobs", stats.activeJobs || 0);
  updateText("hero-total-jobs", stats.totalJobs || 0);
  updateText("hero-closed-jobs", stats.closedJobs || 0);
  updateText("hero-applications", stats.applications || 0);
  updateText("hero-shortlisted", stats.shortlisted || 0);
  updateText("hero-interviews", stats.interviews || 0);
  updateText("stat-active-jobs", stats.activeJobs || 0);
  updateText("stat-total-jobs", stats.totalJobs || 0);
  updateText("stat-applications", stats.applications || 0);
  updateText("stat-shortlisted", stats.shortlisted || 0);
  updateText("stat-interviews", stats.interviews || 0);
  updateText("stat-hired", stats.hired || 0);
}

function jobCard(item = {}) {
  const job = item.job || {};
  return `
    <article class="posted-card recruiter-job-card">
      <div class="posted-card-head">
        <div><span class="pill">${escapeHtml(formatStatus(item.status || "published"))}</span><h3>${escapeHtml(item.title || "Untitled job")}</h3></div>
        <span class="muted small">${escapeHtml(formatDate(item.createdAt))}</span>
      </div>
      <p>${escapeHtml(item.description || "No description added.")}</p>
      <div class="posted-meta">
        <span>${escapeHtml(job.role || item.title || "Role")}</span>
        <span>${escapeHtml(job.employmentType || "Full time")}</span>
        <span>${escapeHtml(item.location || "Remote")}</span>
        <span>${escapeHtml(`${item.applicationCount || 0} applications`)}</span>
      </div>
      <div class="queue-actions">
        <button class="ghost edit-job-btn" type="button" data-id="${escapeHtml(item.id)}">Edit</button>
        <button class="ghost archive-job-btn" type="button" data-id="${escapeHtml(item.id)}">Archive</button>
      </div>
    </article>
  `;
}

function renderJobs(opportunities = []) {
  const jobs = opportunities.filter((item) => item.type === "job");
  const list = $("recruiter-job-list");
  if (list) {
    list.innerHTML = jobs.length ? jobs.map(jobCard).join("") : `<div class="empty-state"><strong>No jobs yet</strong><span>Post your first job to start receiving applications.</span></div>`;
    list.querySelectorAll(".edit-job-btn").forEach((button) => button.addEventListener("click", () => fillJobForm(button.dataset.id)));
    list.querySelectorAll(".archive-job-btn").forEach((button) => button.addEventListener("click", () => archiveJob(button.dataset.id)));
  }
  updateText("job-count", `${jobs.length} jobs`);
}

function appId(row = {}) {
  return String(row.id || row._id || "");
}

function applicationCard(row = {}) {
  const id = appId(row);
  return `
    <article class="posted-card recruiter-application-card">
      <div class="posted-card-head">
        <div><span class="pill">${escapeHtml(formatStatus(row.status || "applied"))}</span><h3>${escapeHtml(row.name || "Candidate")}</h3></div>
        <span class="muted small">${escapeHtml(formatDate(row.appliedAt))}</span>
      </div>
      <p>${escapeHtml(row.opportunityTitle || "Job application")}</p>
      <div class="posted-meta">
        <span>${escapeHtml(row.email || "No email")}</span>
        <span>${escapeHtml(row.phone || "No phone")}</span>
        <span>${escapeHtml(row.college || "No college")}</span>
      </div>
      <div class="application-actions">
        ${row.resumeFileDataUrl ? `<a class="ghost" href="${escapeHtml(row.resumeFileDataUrl)}" download="${escapeHtml(row.resumeFileName || "resume.pdf")}">Download Resume</a>` : ""}
        ${row.resumeLink ? `<a class="ghost" href="${escapeHtml(row.resumeLink)}" target="_blank" rel="noopener noreferrer">Resume Link</a>` : ""}
        <select class="application-status" data-id="${escapeHtml(id)}">
          ${["applied", "reviewed", "shortlisted", "interview", "rejected", "hired"].map((status) => `<option value="${status}" ${String(row.status || "applied").toLowerCase() === status ? "selected" : ""}>${formatStatus(status)}</option>`).join("")}
        </select>
      </div>
    </article>
  `;
}

function renderApplications(applications = []) {
  const list = $("recruiter-application-list");
  if (list) {
    list.innerHTML = applications.length ? applications.map(applicationCard).join("") : `<div class="empty-state"><strong>No applications yet</strong><span>Applications for your jobs will appear here.</span></div>`;
    list.querySelectorAll(".application-status").forEach((select) => select.addEventListener("change", () => updateApplicationStatus(select.dataset.id, select.value)));
  }
  updateText("application-count", `${applications.length} applications`);
}

function resetJobForm() {
  $("job-form")?.reset();
  updateInput("job-id", "");
  const submit = $("job-submit-btn");
  if (submit) submit.textContent = "Publish Job";
}

function fillJobForm(id) {
  const item = dashboardState.opportunities.find((job) => String(job.id) === String(id));
  if (!item) return;
  const job = item.job || {};
  updateInput("job-id", item.id);
  updateInput("job-title", item.title || "");
  updateInput("job-role", job.role || "");
  updateInput("job-employment", job.employmentType || "");
  updateInput("job-salary", job.salary || "");
  updateInput("job-location", item.location || "");
  updateInput("job-mode", item.mode || "Online");
  updateInput("job-deadline", item.deadline || "");
  updateInput("job-skills", (item.skills || []).join(", "));
  updateInput("job-eligibility", job.eligibility || "");
  updateInput("job-description", item.description || "");
  updateInput("job-instructions", job.applyInstructions || "");
  const submit = $("job-submit-btn");
  if (submit) submit.textContent = "Update Job";
  $("post-job")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function buildJobPayload() {
  return {
    title: $("job-title")?.value || "",
    name: $("job-title")?.value || "",
    role: $("job-role")?.value || $("job-title")?.value || "",
    employmentType: $("job-employment")?.value || "Full time",
    salary: $("job-salary")?.value || "",
    location: $("job-location")?.value || "Remote",
    mode: $("job-mode")?.value || "Online",
    deadline: $("job-deadline")?.value || "",
    skills: splitList($("job-skills")?.value || ""),
    eligibility: $("job-eligibility")?.value || "",
    description: $("job-description")?.value || "",
    applyInstructions: $("job-instructions")?.value || "Apply with your latest profile and resume.",
  };
}

function setRecruiterRankingsStatus(message, kind = "muted") {
  const el = $("recruiter-rankings-status");
  if (!el) return;
  el.className = `status ${kind}`.trim();
  el.textContent = message;
}

function rankingProfileCell(row = {}) {
  if (row?.isPublic === false) return "Private";
  if (row?.publicUrl) {
    return `<a class="ghost" href="${escapeHtml(row.publicUrl)}" target="_blank" rel="noopener noreferrer">View</a>`;
  }
  return "No public profile";
}

function renderRecruiterRankings(rows = []) {
  const body = $("recruiter-rankings-body");
  if (!body) return;
  if (!Array.isArray(rows) || !rows.length) {
    body.innerHTML = `<tr><td colspan="9" class="rankings-empty">No ranked students found.</td></tr>`;
    updateText("recruiter-rankings-count", "0 students");
    return;
  }
  body.innerHTML = rows.map((row) => `
    <tr>
      <td><strong>#${Number(row.rank || 0)}</strong></td>
      <td>${escapeHtml(row.name || "Student")}</td>
      <td>${escapeHtml(row.roleFit || "-")}</td>
      <td>${Number(row.jobReadiness || 0)}%</td>
      <td>${Number(row.rankScore || 0)}</td>
      <td>${Number(row.totalPrograms || 0)}</td>
      <td>${Number(row.projectsDone || 0)}</td>
      <td>${Number(row.contestsDone || 0)}</td>
      <td>${rankingProfileCell(row)}</td>
    </tr>
  `).join("");
  updateText("recruiter-rankings-count", `${rows.length} students`);
}

async function loadRecruiterRankings(query = "") {
  if (!$("recruiter-rankings-body")) return;
  setRecruiterRankingsStatus("Loading student rankings...", "warn");
  try {
    const data = await fetchJson(`/api/rankings?limit=300&q=${encodeURIComponent(String(query || "").trim())}`);
    const rows = Array.isArray(data.rankings) ? data.rankings : [];
    renderRecruiterRankings(rows);
    const timeText = data.updatedAt ? new Date(data.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "now";
    setRecruiterRankingsStatus(`Student rankings synced at ${timeText}.`, "ok");
  } catch (err) {
    renderRecruiterRankings([]);
    setRecruiterRankingsStatus(err.message || "Could not load student rankings.", "err");
  }
}
async function loadDashboard() {
  setStatus("Loading recruiter dashboard...", "warn");
  try {
    const data = await fetchJson("/api/recruiter/dashboard");
    dashboardState = data;
    renderUser(data.user || {}, data.profile || {});
    renderStats(data.stats || {});
    renderJobs(data.opportunities || []);
    renderApplications(data.applications || []);
    await loadRecruiterRankings($("recruiter-rankings-search")?.value || "");
    setStatus("Recruiter dashboard synced with database.", "ok");
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      clearRecruiterSession();
      window.location.href = `${RECRUITER_LOGIN_URL}&message=${encodeURIComponent(err.message || "Please log in after admin approval.")}`;
      return;
    }
    setStatus(err.message || "Could not load recruiter dashboard.", "err");
  }
}

async function saveCompanyProfile(event) {
  event.preventDefault();
  setStatus("Saving company profile...", "warn");
  try {
    const data = await fetchJson("/api/recruiter/company-profile", {
      method: "PUT",
      body: JSON.stringify({
        companyName: $("company-input-name")?.value || "",
        companyPhone: $("company-input-phone")?.value || "",
        companyWebsite: $("company-input-website")?.value || "",
        companyIndustry: $("company-input-industry")?.value || "",
        companySize: $("company-input-size")?.value || "",
        companyLocation: $("company-input-location")?.value || "",
        companyDescription: $("company-input-description")?.value || "",
      }),
    });
    renderUser(data.user || {}, dashboardState.profile || {});
    await loadDashboard();
    setStatus("Company profile saved.", "ok");
  } catch (err) {
    setStatus(err.message || "Could not save company profile.", "err");
  }
}

async function saveJob(event) {
  event.preventDefault();
  const id = $("job-id")?.value || "";
  setStatus(id ? "Updating job..." : "Publishing job...", "warn");
  try {
    await fetchJson(id ? `/api/recruiter/opportunities/${encodeURIComponent(id)}` : "/api/recruiter/opportunities", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(buildJobPayload()),
    });
    resetJobForm();
    await loadDashboard();
    setStatus(id ? "Job updated." : "Job published for candidates.", "ok");
  } catch (err) {
    setStatus(err.message || "Could not save job.", "err");
  }
}

async function archiveJob(id) {
  if (!id) return;
  setStatus("Archiving job...", "warn");
  try {
    await fetchJson(`/api/recruiter/opportunities/${encodeURIComponent(id)}`, { method: "DELETE" });
    await loadDashboard();
    setStatus("Job archived.", "ok");
  } catch (err) {
    setStatus(err.message || "Could not archive job.", "err");
  }
}

async function updateApplicationStatus(id, status) {
  if (!id) return;
  setStatus("Updating application status...", "warn");
  try {
    await fetchJson(`/api/recruiter/applications/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await loadDashboard();
    setStatus("Application status updated.", "ok");
  } catch (err) {
    setStatus(err.message || "Could not update application.", "err");
  }
}

if (!getToken() || getRole() !== "recruiter") {
  redirectRecruiterLogin();
} else {
  $("company-form")?.addEventListener("submit", saveCompanyProfile);
  $("company-edit-toggle")?.addEventListener("click", () => setCompanyFormOpen($("company-form")?.classList.contains("hidden")));
  $("company-edit-cancel")?.addEventListener("click", () => setCompanyFormOpen(false));
  $("job-form")?.addEventListener("submit", saveJob);
  $("job-reset-btn")?.addEventListener("click", resetJobForm);
  $("recruiter-refresh-btn")?.addEventListener("click", loadDashboard);
  $("recruiter-rankings-refresh")?.addEventListener("click", () => loadRecruiterRankings($("recruiter-rankings-search")?.value || ""));
  $("recruiter-rankings-search")?.addEventListener("input", () => {
    if (rankingsSearchTimer) clearTimeout(rankingsSearchTimer);
    rankingsSearchTimer = setTimeout(() => loadRecruiterRankings($("recruiter-rankings-search")?.value || ""), 250);
  });
  $("recruiter-logout-btn")?.addEventListener("click", () => {
    clearRecruiterSession();
    redirectRecruiterLogin();
  });
  loadDashboard();
}