import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, "..", "..", "data");

const ROLE_LABELS = ["Frontend", "Backend", "Fullstack"];
const MAX_ROWS = 6000;
const MAX_BYTES = 8 * 1024 * 1024;

let cachedModel = null;

function readFile(fileName, maxBytes = MAX_BYTES) {
  const fullPath = path.join(dataDir, fileName);
  if (!fs.existsSync(fullPath)) return "";
  const stats = fs.statSync(fullPath);
  if (stats.size > maxBytes) {
    const fd = fs.openSync(fullPath, "r");
    const buffer = Buffer.alloc(maxBytes);
    const bytes = fs.readSync(fd, buffer, 0, maxBytes, 0);
    fs.closeSync(fd);
    return buffer.slice(0, bytes).toString("utf8");
  }
  return fs.readFileSync(fullPath, "utf8");
}

function parseCsv(text) {
  if (!text) return [];
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (value.length || row.length) {
        row.push(value);
        rows.push(row);
        row = [];
        value = "";
      }
      continue;
    }

    value += ch;
  }

  if (value.length || row.length) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9+.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeRole(value = "") {
  const text = normalizeText(value);
  if (text.includes("front") || text.includes("react") || text.includes("ui")) return "Frontend";
  if (text.includes("back") || text.includes("node") || text.includes("api") || text.includes("server")) return "Backend";
  if (text.includes("full")) return "Fullstack";
  return "Fullstack";
}

function normalizeSkill(value = "") {
  const text = normalizeText(value);
  if (!text) return "";
  const aliases = {
    javascript: "JavaScript",
    js: "JavaScript",
    typescript: "TypeScript",
    react: "React",
    html: "HTML",
    css: "CSS",
    node: "Node.js",
    "node.js": "Node.js",
    express: "Express",
    "rest api": "REST API",
    "api integration": "API Integration",
    apiintegration: "API Integration",
    api: "API Integration",
    mongodb: "MongoDB",
    mongo: "MongoDB",
    sql: "SQL",
    authentication: "Authentication",
    auth: "Authentication",
    testing: "Testing",
    git: "Git",
    deployment: "Deployment",
    dsa: "DSA",
    algorithm: "DSA",
    project: "Projects",
    communication: "Communication",
    aptitude: "Aptitude",
    internship: "Internship",
  };
  if (aliases[text]) return aliases[text];
  return text
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function unique(list) {
  return [...new Set((list || []).filter(Boolean))];
}

function toNumber(value) {
  const num = parseFloat(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(num) ? num : null;
}

function addSkill(bucket, role, skill, weight = 1) {
  const safeRole = ROLE_LABELS.includes(role) ? role : "Fullstack";
  const safeSkill = normalizeSkill(skill);
  if (!safeSkill) return;
  const roleBucket = bucket.get(safeRole);
  roleBucket.set(safeSkill, (roleBucket.get(safeSkill) || 0) + weight);
}

const STOP_TOKENS = new Set([
  "and",
  "for",
  "the",
  "with",
  "from",
  "that",
  "this",
  "your",
  "role",
  "roles",
  "skill",
  "skills",
  "project",
  "projects",
  "experience",
  "responsibilities",
  "requirement",
  "requirements",
  "required",
  "using",
  "build",
  "building",
  "create",
  "created",
  "work",
  "worked",
  "data",
  "development",
  "developer",
  "application",
  "applications",
  "team",
  "basic",
  "basics",
  "advanced",
  "good",
  "strong",
  "able",
  "manage",
  "support",
  "assist",
]);

function accumulateRoleSkills() {
  const counts = new Map(ROLE_LABELS.map((role) => [role, new Map()]));
  const sampleCounts = new Map(ROLE_LABELS.map((role) => [role, 0]));

  const accumulateRow = (role, fields, weight = 1) => {
    if (!ROLE_LABELS.includes(role)) return;
    sampleCounts.set(role, sampleCounts.get(role) + weight);
    fields.forEach((field) => {
      String(field || "")
        .split(/[,;|\/]/)
        .map((part) => part.trim())
        .filter(Boolean)
        .forEach((skill) => addSkill(counts, role, skill, weight));
      tokenize(field).forEach((token) => {
        if (STOP_TOKENS.has(token)) return;
        addSkill(counts, role, token, weight * 0.35);
      });
    });
  };

  const gptRows = parseCsv(readFile("gpt_dataset.csv", 6 * 1024 * 1024));
  const gptHeader = gptRows[0] || [];
  const gptCategoryIdx = gptHeader.indexOf("Category");
  const gptResumeIdx = gptHeader.indexOf("Resume");
  gptRows.slice(1, MAX_ROWS + 1).forEach((row) => {
    const role = normalizeRole(row[gptCategoryIdx] || "");
    accumulateRow(role, [row[gptResumeIdx] || ""], 0.2);
  });

  const jobRows = parseCsv(readFile("job_dataset.csv", 8 * 1024 * 1024));
  const jobHeader = jobRows[0] || [];
  const jobTitleIdx = jobHeader.indexOf("Title");
  const jobSkillsIdx = jobHeader.indexOf("Skills");
  const jobKeywordsIdx = jobHeader.indexOf("Keywords");
  const jobRespIdx = jobHeader.indexOf("Responsibilities");
  jobRows.slice(1, MAX_ROWS + 1).forEach((row) => {
    const role = normalizeRole(`${row[jobTitleIdx] || ""} ${row[jobKeywordsIdx] || ""}`);
    accumulateRow(role, [row[jobTitleIdx] || "", row[jobSkillsIdx] || "", row[jobKeywordsIdx] || "", row[jobRespIdx] || ""], 1);
  });

  const jobRecRows = parseCsv(readFile("job_recommendation_dataset.csv", 8 * 1024 * 1024));
  const jobRecHeader = jobRecRows[0] || [];
  const jobRecTitleIdx = jobRecHeader.indexOf("Job Title");
  const jobRecSkillsIdx = jobRecHeader.indexOf("Required Skills");
  jobRecRows.slice(1, MAX_ROWS + 1).forEach((row) => {
    const role = normalizeRole(row[jobRecTitleIdx] || "");
    accumulateRow(role, [row[jobRecTitleIdx] || "", row[jobRecSkillsIdx] || ""], 1);
  });

  const resumeRows = parseCsv(readFile("Resume Screening.csv", 6 * 1024 * 1024));
  const resumeHeader = resumeRows[0] || [];
  const resumeCategoryIdx = resumeHeader.indexOf("Category");
  const resumeTextIdx = resumeHeader.indexOf("Resume");
  resumeRows.slice(1, MAX_ROWS + 1).forEach((row) => {
    const role = normalizeRole(row[resumeCategoryIdx] || "");
    accumulateRow(role, [row[resumeTextIdx] || ""], 0.5);
  });

  const rankingRows = parseCsv(readFile("resume_data_for_ranking.csv", 8 * 1024 * 1024));
  const rankingHeader = rankingRows[0] || [];
  const rankingRoleIdx = rankingHeader.indexOf("job_position_name");
  const rankingSkillsIdx = rankingHeader.indexOf("skills");
  const rankingRelatedIdx = rankingHeader.indexOf("related_skils_in_job");
  const rankingReqIdx = rankingHeader.indexOf("skills_required");
  const rankingRespIdx = rankingHeader.indexOf("responsibilities");
  rankingRows.slice(1, MAX_ROWS + 1).forEach((row) => {
    const role = normalizeRole(row[rankingRoleIdx] || "");
    accumulateRow(role, [row[rankingSkillsIdx] || "", row[rankingRelatedIdx] || "", row[rankingReqIdx] || "", row[rankingRespIdx] || ""], 1.1);
  });

  const roleSkills = {};
  ROLE_LABELS.forEach((role) => {
    roleSkills[role] = Array.from(counts.get(role).entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 16)
      .map(([skill]) => skill);
  });

  return { roleSkills, sampleCounts };
}

function buildPlacementSignals() {
  const signals = [];

  const collRows = parseCsv(readFile("college_student_placement_dataset.csv", 4 * 1024 * 1024));
  if (collRows.length > 1) {
    const header = collRows[0] || [];
    const placementIdx = header.indexOf("Placement");
    const numericColumns = ["IQ", "Prev_Sem_Result", "CGPA", "Academic_Performance", "Communication_Skills", "Projects_Completed", "Extra_Curricular_Score"]
      .map((name) => ({ name, idx: header.indexOf(name) }))
      .filter((item) => item.idx >= 0);
    const buckets = new Map(numericColumns.map((item) => [item.name, { placed: [], notPlaced: [] }]));
    collRows.slice(1, MAX_ROWS + 1).forEach((row) => {
      const placed = String(row[placementIdx] || "").toLowerCase().startsWith("y");
      numericColumns.forEach((item) => {
        const value = toNumber(row[item.idx]);
        if (!Number.isFinite(value)) return;
        const bucket = buckets.get(item.name);
        bucket[placed ? "placed" : "notPlaced"].push(value);
      });
    });
    numericColumns.forEach((item) => {
      const bucket = buckets.get(item.name);
      const placedAvg = bucket.placed.reduce((sum, value) => sum + value, 0) / Math.max(bucket.placed.length, 1);
      const notAvg = bucket.notPlaced.reduce((sum, value) => sum + value, 0) / Math.max(bucket.notPlaced.length, 1);
      const delta = placedAvg - notAvg;
      if (Number.isFinite(delta)) {
        signals.push({
          source: "college_student_placement_dataset",
          label: item.name,
          delta: Number(delta.toFixed(2)),
        });
      }
    });
  }

  const placementRows = parseCsv(readFile("Placement_Data_Full_Class.csv", 4 * 1024 * 1024));
  if (placementRows.length > 1) {
    const header = placementRows[0] || [];
    const statusIdx = header.indexOf("status");
    const tracked = ["workex", "etest_p", "degree_p", "mba_p", "ssc_p", "hsc_p"]
      .map((name) => ({ name, idx: header.indexOf(name) }))
      .filter((item) => item.idx >= 0);
    const buckets = new Map(tracked.map((item) => [item.name, { placed: [], notPlaced: [] }]));
    placementRows.slice(1, MAX_ROWS + 1).forEach((row) => {
      const placed = String(row[statusIdx] || "").toLowerCase().startsWith("placed");
      tracked.forEach((item) => {
        const value = toNumber(row[item.idx]);
        if (!Number.isFinite(value)) return;
        const bucket = buckets.get(item.name);
        bucket[placed ? "placed" : "notPlaced"].push(value);
      });
    });
    tracked.forEach((item) => {
      const bucket = buckets.get(item.name);
      const placedAvg = bucket.placed.reduce((sum, value) => sum + value, 0) / Math.max(bucket.placed.length, 1);
      const notAvg = bucket.notPlaced.reduce((sum, value) => sum + value, 0) / Math.max(bucket.notPlaced.length, 1);
      const delta = placedAvg - notAvg;
      if (Number.isFinite(delta)) {
        signals.push({
          source: "Placement_Data_Full_Class",
          label: item.name,
          delta: Number(delta.toFixed(2)),
        });
      }
    });
  }

  return signals.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

function getModel() {
  if (!cachedModel) {
    cachedModel = {
      ...accumulateRoleSkills(),
      placementSignals: buildPlacementSignals(),
    };
  }
  return cachedModel;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roleDefaults(role) {
  if (role === "Frontend") {
    return ["React", "JavaScript", "HTML", "CSS", "API Integration", "Git"];
  }
  if (role === "Backend") {
    return ["Node.js", "Express", "REST API", "MongoDB", "SQL", "Authentication"];
  }
  return ["JavaScript", "React", "Node.js", "REST API", "MongoDB", "Deployment"];
}

const ROLE_RELEVANT_SKILLS = {
  Frontend: new Set([
    "javascript",
    "typescript",
    "react",
    "html",
    "css",
    "api integration",
    "git",
    "testing",
    "deployment",
    "accessibility",
    "ui",
  ]),
  Backend: new Set([
    "node.js",
    "express",
    "rest api",
    "mongodb",
    "sql",
    "authentication",
    "git",
    "testing",
    "deployment",
    "docker",
  ]),
  Fullstack: new Set([
    "javascript",
    "typescript",
    "react",
    "node.js",
    "express",
    "rest api",
    "mongodb",
    "sql",
    "authentication",
    "git",
    "testing",
    "deployment",
    "docker",
  ]),
};

function skillKey(value = "") {
  return normalizeText(value).replace(/\s+/g, " ");
}

function buildPlanText({ role, focusSkills, dsaNeed, projectNeed, resumeNeed, placementNeed, contestNeed }) {
  const primary = focusSkills[0] || roleDefaults(role)[0] || "core fundamentals";
  const secondary = focusSkills[1] || roleDefaults(role)[1] || primary;
  const tertiary = focusSkills[2] || roleDefaults(role)[2] || secondary;
  const placementDriver = formatPlacementLabel(placementNeed?.label || "communication and interview readiness");
  const roleName = role.toLowerCase();

  const week1 = dsaNeed >= projectNeed
    ? `Week 1: strengthen ${primary} and solve 10 medium ${roleName} problems.`
    : `Week 1: build a small ${roleName} feature using ${primary} and publish it on GitHub.`;

  const week2 = projectNeed >= dsaNeed
    ? `Week 2: ship a ${secondary} project milestone with README, screenshots, and deployment.`
    : `Week 2: deepen ${secondary} with one guided project and one API integration exercise.`;

  const week3 = `Week 3: turn your work into proof. Add 2 quantified resume bullets, one portfolio update, and review ${tertiary}.`;
  const week4 = `Week 4: mock interview + ${contestNeed > 0.5 ? "contest upsolve" : "application sprint"} with emphasis on ${placementDriver}.`;

  const studyPlan = [
    `DSA: 2 medium problems/day focused on ${primary}.`,
    `Project: ship one ${secondary} feature with tests and README notes.`,
    `Resume: add deployment links, results, and impact bullets.`,
    `Interview: practice ${placementDriver} and 1 mock interview this week.`,
  ];

  if (resumeNeed > 0.7) {
    studyPlan[2] = "Resume: add stronger metrics, better project descriptions, and a GitHub README refresh.";
  }

  return { week1, week2, week3, week4, studyPlan };
}

function formatPlacementLabel(value = "") {
  const mapping = {
    ssc_p: "10th marks",
    hsc_p: "12th marks",
    degree_p: "degree percentage",
    etest_p: "aptitude test score",
    mba_p: "MBA marks",
    workex: "work experience",
    iq: "IQ / aptitude",
    academic_performance: "academic performance",
    communication_skills: "communication skills",
    projects_completed: "projects completed",
    extra_curricular_score: "extra curricular activity",
    prev_sem_result: "previous semester result",
  };
  const key = normalizeText(value).replace(/\s+/g, "_");
  return mapping[key] || String(value || "").replace(/_/g, " ");
}

export function retrainWeeklyPlanModel() {
  cachedModel = {
    ...accumulateRoleSkills(),
    placementSignals: buildPlacementSignals(),
  };
  return {
    roles: ROLE_LABELS.length,
    roleSamples: Object.fromEntries(
      Array.from(cachedModel.sampleCounts.entries()).map(([role, count]) => [role, Math.round(count)])
    ),
    placementSignals: cachedModel.placementSignals.length,
  };
}

export function getWeeklyPlanModel() {
  return getModel();
}

export function buildWeeklyPlan(profile = {}) {
  const model = getModel();
  const role = normalizeRole(profile.role || profile.targetRole || "Fullstack");
  const relevant = ROLE_RELEVANT_SKILLS[role] || ROLE_RELEVANT_SKILLS.Fullstack;
  const targetSkills = unique([
    ...(Array.isArray(profile.targetSkills) ? profile.targetSkills : []),
    ...(Array.isArray(profile.missingSkills) ? profile.missingSkills : []),
    ...(model.roleSkills[role] || []).slice(0, 6),
    ...roleDefaults(role),
  ].map(normalizeSkill)).filter((skill) => relevant.has(skillKey(skill))).slice(0, 8);

  const leetcodeTotal = Number(profile?.leetcode?.total) || 0;
  const leetcodeMedium = Number(profile?.leetcode?.medium) || 0;
  const codechefSolved = Number(profile?.codechef?.solved) || 0;
  const githubRepos = Number(profile?.github?.repos) || 0;
  const githubStars = Number(profile?.github?.stars) || 0;
  const hackerrankBadges = Number(profile?.hackerrank?.badges) || 0;
  const hackerrankCerts = Number(profile?.hackerrank?.certs) || 0;
  const readmeQuality = String(profile?.github?.readmeQuality || "").toLowerCase();

  const dsaNeed = clamp(1 - Math.min(1, (leetcodeTotal / 250) * 0.6 + (codechefSolved / 350) * 0.4), 0, 1);
  const projectNeed = clamp(1 - Math.min(1, (githubRepos / 6) * 0.85 + (githubStars / 50) * 0.15), 0, 1);
  const resumeNeed = clamp(readmeQuality === "good" ? 0.35 : 0.85, 0, 1);
  const placementNeed = model.placementSignals[0] || { label: "communication and interview readiness", delta: 0 };
  const contestNeed = clamp(1 - Math.min(1, ((leetcodeMedium / 150) * 0.7 + ((hackerrankBadges + hackerrankCerts) / 10) * 0.3)), 0, 1);

  const focusSkills = unique([
    ...(Array.isArray(profile.missingSkills) ? profile.missingSkills : []),
    ...targetSkills,
    ...(model.roleSkills[role] || []),
  ])
    .filter((skill) => relevant.has(skillKey(skill)))
    .slice(0, 5);

  const plan = buildPlanText({
    role,
    focusSkills,
    dsaNeed,
    projectNeed,
    resumeNeed,
    placementNeed,
    contestNeed,
  });

  return {
    role,
    focus: focusSkills.slice(0, 4),
    targetSkills: focusSkills.slice(0, 5),
    week1: plan.week1,
    week2: plan.week2,
    week3: plan.week3,
    week4: plan.week4,
    plan: {
      week1: plan.week1,
      week2: plan.week2,
      week3: plan.week3,
      week4: plan.week4,
    },
    studyPlan: plan.studyPlan,
    signals: {
      dsaNeed: Number(dsaNeed.toFixed(2)),
      projectNeed: Number(projectNeed.toFixed(2)),
      resumeNeed: Number(resumeNeed.toFixed(2)),
      contestNeed: Number(contestNeed.toFixed(2)),
      placementDriver: placementNeed,
    },
    sourceSummary: {
      roleSamples: Object.fromEntries(Array.from(model.sampleCounts.entries())),
      placementSignals: model.placementSignals.slice(0, 5),
    },
  };
}
