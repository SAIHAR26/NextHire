const API_BASE = window.location.origin.startsWith("http") ? window.location.origin : "http://localhost:4000";
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
const addToggleBtn = document.getElementById("admin-add-toggle");
const createOptionsEl = document.getElementById("admin-create-options");
const postForm = document.getElementById("admin-post-form");
const postTypeInput = document.getElementById("post-type");
const postFormTitle = document.getElementById("post-form-title");
const jobFields = document.getElementById("job-fields");
const eventFields = document.getElementById("event-fields");
const quizFields = document.getElementById("quiz-fields");
const questionListEl = document.getElementById("question-list");
const addQuestionBtn = document.getElementById("add-question-btn");
const postResetBtn = document.getElementById("post-reset");
const postedListEl = document.getElementById("posted-list");
const postedCountEl = document.getElementById("posted-count");
const analyticsModal = document.getElementById("analytics-modal");
const analyticsCloseBtn = document.getElementById("analytics-close");
const analyticsTitleEl = document.getElementById("analytics-title");
const analyticsSummaryEl = document.getElementById("analytics-summary");
const analyticsTableEl = document.getElementById("analytics-table");
let activeAnalyticsId = "";

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
    ["Phone", profile.companyPhone || "Not submitted"],
    ["Website", profile.companyWebsite || "Not submitted"],
    ["Industry", profile.companyIndustry || "Not submitted"],
    ["Location", profile.companyLocation || "Not submitted"],
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
    metricCard("Jobs", counts.postedJobs ?? 0, `${counts.postedEvents ?? 0} events / ${counts.postedQuizzes ?? 0} quizzes`, "accent-3"),
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
    ["Published posts", `${counts.postedOpportunities ?? 0}`],
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

function splitList(value = "") {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getInput(id) {
  return document.getElementById(id);
}

function showPostForm(type = "job") {
  const safeType = ["job", "event", "quiz"].includes(type) ? type : "job";
  if (postTypeInput) postTypeInput.value = safeType;
  if (postFormTitle) postFormTitle.textContent = safeType === "job" ? "Add Job" : safeType === "event" ? "Add Event / Contest" : "Add Quiz";
  postForm?.classList.remove("hidden");
  createOptionsEl?.classList.remove("hidden");
  jobFields?.classList.toggle("hidden", safeType !== "job");
  eventFields?.classList.toggle("hidden", safeType !== "event");
  quizFields?.classList.toggle("hidden", !(safeType === "quiz" || safeType === "event"));
  if ((safeType === "quiz" || safeType === "event") && questionListEl && !questionListEl.children.length) addQuestionRow();
  postForm?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function addQuestionRow(data = {}) {
  if (!questionListEl) return;
  const idx = questionListEl.children.length + 1;
  const row = document.createElement("article");
  row.className = "question-row";
  row.innerHTML = `
    <div class="question-row-head"><strong>Question ${idx}</strong><button type="button" class="ghost remove-question-btn">Remove</button></div>
    <label class="full">Question<textarea class="question-text" rows="2" placeholder="Write the question">${escapeHtml(data.question || "")}</textarea></label>
    <label>Options<input class="question-options" type="text" placeholder="A, B, C, D" value="${escapeHtml((data.options || []).join(", "))}" /></label>
    <label>Correct Answer<input class="question-answer" type="text" placeholder="Exact answer" value="${escapeHtml(data.answer || "")}" /></label>
    <label>Points<input class="question-points" type="number" min="1" value="${escapeHtml(data.points || 1)}" /></label>
    <label class="full">Description / Hint<textarea class="question-desc" rows="2" placeholder="Optional explanation">${escapeHtml(data.description || "")}</textarea></label>
  `;
  row.querySelector(".remove-question-btn")?.addEventListener("click", () => row.remove());
  questionListEl.appendChild(row);
}

function collectQuestions() {
  return Array.from(questionListEl?.querySelectorAll(".question-row") || [])
    .map((row, idx) => ({
      id: `q_${idx + 1}`,
      question: row.querySelector(".question-text")?.value || "",
      options: splitList(row.querySelector(".question-options")?.value || ""),
      answer: row.querySelector(".question-answer")?.value || "",
      points: Number(row.querySelector(".question-points")?.value || 1) || 1,
      description: row.querySelector(".question-desc")?.value || "",
    }))
    .filter((item) => item.question.trim());
}

function collectAttachments() {
  return Array.from(getInput("job-attachments")?.files || []).map((file) => ({
    name: file.name,
    type: file.type,
    size: file.size,
  }));
}

function buildPostPayload() {
  const type = postTypeInput?.value || "job";
  const payload = {
    type,
    title: getInput("post-title")?.value || "",
    name: getInput("post-title")?.value || "",
    organization: getInput("post-organization")?.value || "",
    description: getInput("post-description")?.value || "",
    location: getInput("post-location")?.value || "",
    mode: getInput("post-mode")?.value || "Online",
    deadline: getInput("post-deadline")?.value || "",
    skills: splitList(getInput("post-skills")?.value || ""),
  };
  if (type === "job") {
    payload.role = getInput("job-role")?.value || payload.title;
    payload.employmentType = getInput("job-employment")?.value || "Full time";
    payload.salary = getInput("job-salary")?.value || "";
    payload.eligibility = getInput("job-eligibility")?.value || "";
    payload.applyInstructions = getInput("job-instructions")?.value || "";
    payload.attachments = collectAttachments();
  }
  if (type === "event") {
    payload.category = getInput("event-category")?.value || "Contest";
    payload.startAt = getInput("event-start")?.value || "";
    payload.endAt = getInput("event-end")?.value || "";
    payload.registrationLink = getInput("event-link")?.value || "";
    payload.rules = getInput("event-rules")?.value || "";
    payload.questions = collectQuestions();
  }
  if (type === "quiz") {
    payload.durationMinutes = Number(getInput("quiz-duration")?.value || 30) || 30;
    payload.instructions = getInput("quiz-instructions")?.value || "";
    payload.questions = collectQuestions();
  }
  return payload;
}

function resetPostForm() {
  postForm?.reset();
  if (questionListEl) questionListEl.innerHTML = "";
  showPostForm(postTypeInput?.value || "job");
}

function postCard(item) {
  const typeLabel = item.type === "event" ? "Event / Contest" : item.type === "quiz" ? "Quiz" : "Job";
  const metric = item.type === "quiz" ? `${item.submissionCount || 0} submissions` : `${item.applicationCount || 0} applications`;
  return `
    <article class="posted-card">
      <div class="posted-card-head">
        <div><span class="pill">${escapeHtml(typeLabel)}</span><h3>${escapeHtml(item.title || item.name)}</h3></div>
        <span class="muted small">${escapeHtml(formatDate(item.createdAt))}</span>
      </div>
      <p>${escapeHtml(item.description || "No description.")}</p>
      <div class="posted-meta">
        <span>${escapeHtml(item.organization || "NextHire")}</span>
        <span>${escapeHtml(item.location || "Remote")}</span>
        <span>${escapeHtml(metric)}</span>
      </div>
      <div class="queue-actions">
        <button class="ghost analytics-btn" type="button" data-id="${escapeHtml(item.id)}">View Analytics</button>
      </div>
    </article>
  `;
}

function renderPosts(opportunities = []) {
  if (!postedListEl) return;
  postedListEl.innerHTML = opportunities.length
    ? opportunities.map(postCard).join("")
    : `<div class="empty-state"><strong>No posts yet</strong><span>Click + and publish a job, event, or quiz.</span></div>`;
  if (postedCountEl) postedCountEl.textContent = `${opportunities.length} posts`;
  postedListEl.querySelectorAll(".analytics-btn").forEach((button) => {
    button.addEventListener("click", () => loadAnalytics(button.dataset.id));
  });
}

async function loadAdminPosts() {
  const data = await fetchJson("/api/admin/opportunities");
  renderPosts(data.opportunities || []);
  return data.opportunities || [];
}

function renderResumeCell(row = {}) {
  if (row.resumeFileDataUrl) {
    const fileName = row.resumeFileName || "resume.pdf";
    return `<a href="${escapeHtml(row.resumeFileDataUrl)}" download="${escapeHtml(fileName)}">${escapeHtml(fileName)}</a>`;
  }
  if (row.resumeLink) {
    return `<a href="${escapeHtml(row.resumeLink)}" target="_blank" rel="noopener noreferrer">Resume link</a>`;
  }
  return `<span class="muted">Not added</span>`;
}

function renderAnalyticsTable(applications = [], submissions = []) {
  const rows = applications.length
    ? applications.map((row) => `
      <tr><td>${escapeHtml(row.name || "Candidate")}</td><td>${escapeHtml(row.email || "")}</td><td>${escapeHtml(row.phone || "")}</td><td>${escapeHtml(row.college || "")}</td><td>${renderResumeCell(row)}</td><td>${escapeHtml(row.status || "applied")}</td><td>${escapeHtml(formatDate(row.appliedAt))}</td></tr>
    `).join("")
    : `<tr><td colspan="7" class="empty-cell">No applications yet.</td></tr>`;
  const submissionRows = submissions.length
    ? submissions.map((row) => `
      <tr><td>${escapeHtml(row.name || "Candidate")}</td><td>${escapeHtml(row.email || "")}</td><td>${escapeHtml(`${row.score || 0}/${row.total || 0}`)}</td><td>${escapeHtml(`${row.percentage || 0}%`)}</td><td>${escapeHtml(formatDate(row.submittedAt))}</td></tr>
    `).join("")
    : `<tr><td colspan="5" class="empty-cell">No quiz submissions yet.</td></tr>`;
  analyticsTableEl.innerHTML = `
    <h4>Applicants</h4>
    <table class="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>College</th><th>Resume</th><th>Status</th><th>Applied</th></tr></thead><tbody>${rows}</tbody></table>
    <h4>Quiz / Contest Submissions</h4>
    <table class="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Score</th><th>Percent</th><th>Submitted</th></tr></thead><tbody>${submissionRows}</tbody></table>
  `;
}

async function loadAnalytics(id) {
  if (!id) return;
  activeAnalyticsId = id;
  const data = await fetchJson(`/api/admin/opportunities/${encodeURIComponent(id)}/analytics`);
  const opp = data.opportunity || {};
  analyticsTitleEl.textContent = `${opp.title || "Post"} Analytics`;
  analyticsSummaryEl.innerHTML = `
    <div><strong>${(data.applications || []).length}</strong><span>Applications</span></div>
    <div><strong>${(data.submissions || []).length}</strong><span>Submissions</span></div>
    <div><strong>${escapeHtml(opp.creatorRole || "admin")}</strong><span>Posted by</span></div>
  `;
  renderAnalyticsTable(data.applications || [], data.submissions || []);
  analyticsModal?.classList.remove("hidden");
}

async function downloadAnalytics(format) {
  if (!activeAnalyticsId) return;
  const token = getToken();
  const res = await fetch(`${API_BASE}/api/admin/opportunities/${encodeURIComponent(activeAnalyticsId)}/export?format=${encodeURIComponent(format)}`, {
    headers: { Authorization: token ? `Bearer ${token}` : "" },
  });
  if (!res.ok) throw new Error("Download failed.");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `analytics.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
    await loadAdminPosts();
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

function setCreatePanelOpen(open = true) {
  createOptionsEl?.classList.toggle("hidden", !open);
  addToggleBtn?.setAttribute("aria-expanded", open ? "true" : "false");
  if (addToggleBtn) addToggleBtn.textContent = open ? "x" : "+";
}

function prepareNextJobPost() {
  resetPostForm();
  showPostForm("job");
  setCreatePanelOpen(true);
}
function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  window.location.href = "login.html";
}

addToggleBtn?.addEventListener("click", () => {
  const isOpen = createOptionsEl?.classList.contains("hidden");
  setCreatePanelOpen(isOpen);
  if (isOpen) {
    createOptionsEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

createOptionsEl?.querySelectorAll(".create-option").forEach((button) => {
  button.addEventListener("click", () => showPostForm(button.dataset.type || "job"));
});

addQuestionBtn?.addEventListener("click", () => addQuestionRow());
postResetBtn?.addEventListener("click", resetPostForm);
analyticsCloseBtn?.addEventListener("click", () => analyticsModal?.classList.add("hidden"));
analyticsModal?.addEventListener("click", (event) => {
  if (event.target === analyticsModal) analyticsModal.classList.add("hidden");
});

document.querySelectorAll(".export-btn").forEach((button) => {
  button.addEventListener("click", async () => {
    try {
      await downloadAnalytics(button.dataset.format || "csv");
    } catch (err) {
      setStatus(err.message || "Could not download analytics.", "err");
    }
  });
});

postForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    setStatus("Publishing post...", "warn");
    await fetchJson("/api/admin/opportunities", {
      method: "POST",
      body: JSON.stringify(buildPostPayload()),
    });
    await loadOverview();
    prepareNextJobPost();
    setStatus("Post published. Add another job when ready.", "ok");
  } catch (err) {
    setStatus(err.message || "Could not publish post.", "err");
  }
});

refreshBtn?.addEventListener("click", loadOverview);
logoutBtn?.addEventListener("click", logout);

loadOverview();