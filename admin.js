const API_BASE = "http://localhost:4000";
const TOKEN_KEY = "nexthire_token";
const ROLE_KEY = "nexthire_role";

const metricsEl = document.getElementById("admin-metrics");
const recruiterQueueEl = document.getElementById("recruiter-queue");
const recruiterCountEl = document.getElementById("recruiter-count");
const userCountEl = document.getElementById("user-count");
const pageCountEl = document.getElementById("page-count");
const pageGridEl = document.getElementById("page-grid");
const contentStatsEl = document.getElementById("content-stats");
const recentUserBodyEl = document.getElementById("recent-user-table");
const adminNameEl = document.getElementById("admin-name");
const adminEmailEl = document.getElementById("admin-email");
const statusTextEl = document.getElementById("status-text");
const refreshBtn = document.getElementById("admin-refresh");
const logoutBtn = document.getElementById("admin-logout");
const serviceHealthEl = document.getElementById("service-health");
const healthUpdatedEl = document.getElementById("health-updated");

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setStatus(text, kind = "muted") {
  if (!statusTextEl) return;
  statusTextEl.className = `admin-status ${kind}`.trim();
  statusTextEl.textContent = text;
}

function formatDate(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function metricCard(title, value, detail, tone = "") {
  return `
    <article class="metric-card ${tone}">
      <span class="metric-title">${escapeHtml(title)}</span>
      <strong>${escapeHtml(value)}</strong>
      <span class="metric-detail">${escapeHtml(detail)}</span>
    </article>
  `;
}

function healthCard(service) {
  const status = service.status === "ok" ? "ok" : service.status === "warn" ? "warn" : "err";
  const statusLabel = status === "ok" ? "Working" : status === "warn" ? "Protected" : "Needs check";
  const code = service.code ? `HTTP ${service.code}` : "No code";
  const timing = service.responseMs !== undefined ? `${service.responseMs} ms` : "Live";
  const link = service.link
    ? `<a class="health-link" href="${escapeHtml(service.link)}">${escapeHtml(service.display || service.link)}</a>`
    : service.display
      ? `<span class="health-link readonly">${escapeHtml(service.display)}</span>`
      : "";
  return `
    <article class="health-card ${status}">
      <div class="health-card-head">
        <strong>${escapeHtml(service.name || "Service")}</strong>
        <span class="pill ${status === "ok" ? "success" : status === "warn" ? "warning" : "danger"}">${statusLabel}</span>
      </div>
      <p>${escapeHtml(service.detail || code)}</p>
      <div class="health-meta">
        <span>${escapeHtml(code)}</span>
        <span>${escapeHtml(timing)}</span>
      </div>
      ${link}
    </article>
  `;
}

function frontendHealthCard() {
  return {
    name: "Frontend",
    status: document.readyState === "loading" ? "down" : "ok",
    detail: "Admin dashboard loaded in browser",
    code: 200,
    responseMs: 0,
    display: window.location.origin || "Local file",
  };
}

function pageCard(pageName) {
  const safePage = String(pageName || "");
  const label = safePage.replace(/\.html$/i, "").replace(/[-_]/g, " ");
  return `<a class="page-card" href="${encodeURIComponent(safePage)}">${escapeHtml(label)}</a>`;
}

function profileDetailItems(item) {
  const profile = item.profile || {};
  return [
    ["Company", profile.companyName || profile.currentCompany || "Not submitted"],
    ["Role", profile.role || profile.title || "Recruiter"],
    ["Joined", formatDate(item.createdAt)],
  ];
}

function recruiterCard(item) {
  const status = item.status || "pending";
  const details = profileDetailItems(item)
    .map(
      ([label, value]) => `
        <span><strong>${escapeHtml(label)}</strong>${escapeHtml(value)}</span>
      `
    )
    .join("");
  return `
    <article class="queue-card">
      <div class="queue-card-head">
        <div>
          <h3>${escapeHtml(item.name || "Recruiter")}</h3>
          <p class="muted small">${escapeHtml(item.email || "No email")}</p>
        </div>
        <span class="pill warning">${escapeHtml(status)}</span>
      </div>
      <div class="queue-info">${details}</div>
      <div class="queue-actions">
        <button class="primary approve-btn" type="button" data-id="${escapeHtml(item.id)}">Verify recruiter</button>
        <button class="ghost reject-btn" type="button" data-id="${escapeHtml(item.id)}">Reject</button>
      </div>
    </article>
  `;
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
    const error = new Error(data.error || "Request failed.");
    error.status = res.status;
    throw error;
  }
  return data;
}

function renderMetrics(counts) {
  if (!metricsEl) return;
  metricsEl.innerHTML = [
    metricCard("Users", counts.users ?? 0, `${counts.candidates ?? 0} candidates / ${counts.adminUsers ?? 0} admins`, "accent"),
    metricCard("Recruiters", counts.recruiters ?? 0, `${counts.verifiedRecruiters ?? 0} verified / ${counts.pendingRecruiters ?? 0} pending`, "accent-2"),
    metricCard("Jobs", counts.jobRecords ?? 0, "Dataset-backed records", "accent-3"),
    metricCard("Pages", counts.pages ?? 0, "Live app screens", "neutral"),
    metricCard("Profiles", counts.publicProfiles ?? 0, "Public candidate pages", "neutral"),
  ].join("");
}

function renderRecruiters(recruiters) {
  if (!recruiterQueueEl) return;
  recruiterQueueEl.innerHTML = recruiters.length
    ? recruiters.map(recruiterCard).join("")
    : `<div class="empty-state"><strong>Queue clear</strong><span>No recruiters are waiting for verification.</span></div>`;
  if (recruiterCountEl) {
    recruiterCountEl.textContent = `${recruiters.length} pending`;
  }
  recruiterQueueEl.querySelectorAll(".approve-btn").forEach((button) => {
    button.addEventListener("click", () => handleDecision(button.dataset.id, "approve"));
  });
  recruiterQueueEl.querySelectorAll(".reject-btn").forEach((button) => {
    button.addEventListener("click", () => handleDecision(button.dataset.id, "reject"));
  });
}

function renderUsers(users) {
  if (!recentUserBodyEl) return;
  recentUserBodyEl.innerHTML = users.length
    ? users
        .map((user) => {
          const status = user.status || "verified";
          const statusClass = status === "verified" ? "success" : status === "rejected" ? "danger" : "warning";
          return `
            <tr>
              <td><strong>${escapeHtml(user.name || "User")}</strong></td>
              <td>${escapeHtml(user.email || "Not available")}</td>
              <td><span class="pill role-pill">${escapeHtml(user.role || "candidate")}</span></td>
              <td><span class="pill ${statusClass}">${escapeHtml(status)}</span></td>
              <td>${escapeHtml(formatDate(user.createdAt))}</td>
            </tr>
          `;
        })
        .join("")
    : `<tr><td colspan="5" class="empty-cell">No users found.</td></tr>`;
  if (userCountEl) {
    userCountEl.textContent = `${users.length} users`;
  }
}

function renderPages(pages) {
  if (!pageGridEl) return;
  pageGridEl.innerHTML = pages.length
    ? pages.map(pageCard).join("")
    : `<div class="empty-state"><strong>No pages detected</strong><span>The app root did not return any HTML screens.</span></div>`;
  if (pageCountEl) {
    pageCountEl.textContent = `${pages.length} pages`;
  }
}

function renderContentStats(counts) {
  if (!contentStatsEl) return;
  const stats = [
    ["Pending approvals", `${counts.pendingRecruiters ?? 0}`],
    ["Verified recruiters", `${counts.verifiedRecruiters ?? 0}`],
    ["Candidate accounts", `${counts.candidates ?? 0}`],
    ["Stored analyses", `${counts.analyses ?? 0}`],
  ];
  contentStatsEl.innerHTML = stats
    .map(
      ([label, value]) => `
      <div class="content-stat">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </div>
    `
    )
    .join("");
}

async function loadHealth() {
  if (!serviceHealthEl) return;
  serviceHealthEl.innerHTML = healthCard(frontendHealthCard());
  if (healthUpdatedEl) healthUpdatedEl.textContent = "Checking";
  try {
    const data = await fetchJson("/api/admin/health");
    const services = [frontendHealthCard(), ...(data.services || [])];
    serviceHealthEl.innerHTML = services.map(healthCard).join("");
    if (healthUpdatedEl) {
      healthUpdatedEl.textContent = `Checked ${new Date(data.checkedAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
  } catch (err) {
    serviceHealthEl.innerHTML = [
      frontendHealthCard(),
      { name: "Backend API", status: "down", detail: err.message || "Health check failed", code: null },
    ].map(healthCard).join("");
    if (healthUpdatedEl) healthUpdatedEl.textContent = "Health error";
  }
}

async function handleDecision(id, action) {
  if (!id) return;
  try {
    setStatus(`${action === "approve" ? "Verifying" : "Rejecting"} recruiter...`, "warn");
    await fetchJson(`/api/admin/recruiters/${encodeURIComponent(id)}/${action === "approve" ? "approve" : "reject"}`, {
      method: "POST",
    });
    await loadOverview();
  } catch (err) {
    setStatus(err.message || "Could not update recruiter.", "err");
  }
}

async function loadOverview() {
  setStatus("Loading admin data...", "warn");
  refreshBtn?.setAttribute("disabled", "disabled");
  try {
    const data = await fetchJson("/api/admin/overview");
    const counts = data.counts || {};
    if (adminNameEl) adminNameEl.textContent = data.admin?.name || "Admin";
    if (adminEmailEl) adminEmailEl.textContent = data.admin?.email || "admin@nexthire.local";
    renderMetrics(counts);
    renderRecruiters(data.recruiterQueue || []);
    renderUsers(data.recentUsers || []);
    renderPages(data.pages || []);
    renderContentStats(counts);
    await loadHealth();
    setStatus(`Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`, "ok");
  } catch (err) {
    if (err.status === 403 || err.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(ROLE_KEY);
      window.location.href = "login.html";
      return;
    }
    setStatus(err.message || "Unable to load admin data.", "err");
  } finally {
    refreshBtn?.removeAttribute("disabled");
  }
}

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  window.location.href = "login.html";
}

refreshBtn?.addEventListener("click", loadOverview);
logoutBtn?.addEventListener("click", logout);

loadOverview();
