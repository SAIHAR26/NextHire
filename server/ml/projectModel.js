import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, "..", "..", "data");
const repoRoot = path.resolve(__dirname, "..", "..");

const MAX_ROWS = 10000;

const projectCatalog = [
  { name: "Component-driven UI kit", tags: ["frontend", "react", "css", "ui"] },
  { name: "Responsive dashboard UI", tags: ["frontend", "dashboard", "chart", "api"] },
  { name: "Portfolio website", tags: ["frontend", "html", "css", "javascript"] },
  { name: "JWT auth + RBAC service", tags: ["backend", "node", "express", "jwt"] },
  { name: "Caching-enabled REST API", tags: ["backend", "node", "redis", "api"] },
  { name: "Authentication service", tags: ["backend", "node", "mongodb", "bcrypt"] },
  { name: "Fullstack job tracker", tags: ["fullstack", "react", "node", "mongodb"] },
  { name: "Portfolio analytics platform", tags: ["fullstack", "analytics", "react", "node"] },
  { name: "Resume analyzer", tags: ["fullstack", "nlp", "parser", "node"] },
  { name: "Placement prediction dashboard", tags: ["fullstack", "ml", "dashboard", "api"] },
  { name: "Interview prep tracker", tags: ["fullstack", "dsa", "analytics", "react"] },
  { name: "Campus project collaboration portal", tags: ["fullstack", "collaboration", "node", "react"] },
];

function readFile(fileName, maxBytes = null) {
  const fullPath = path.join(dataDir, fileName);
  if (!fs.existsSync(fullPath)) return null;
  if (maxBytes) {
    const fd = fs.openSync(fullPath, "r");
    const buffer = Buffer.alloc(maxBytes);
    const bytes = fs.readSync(fd, buffer, 0, maxBytes, 0);
    fs.closeSync(fd);
    return buffer.slice(0, bytes).toString("utf8");
  }
  return fs.readFileSync(fullPath, "utf8");
}

function readArchiveFile(archiveFile, entryFile, maxBytes = null) {
  const archivePath = path.resolve(repoRoot, archiveFile);
  if (!fs.existsSync(archivePath)) return null;
  try {
    const out = execSync(`tar -xOf "${archivePath}" "${entryFile}"`, {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: maxBytes ? Math.max(10 * 1024 * 1024, maxBytes * 2) : 80 * 1024 * 1024,
    });
    const text = out.toString("utf8");
    return maxBytes ? text.slice(0, maxBytes) : text;
  } catch {
    return null;
  }
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
    if (ch === "\"") {
      if (inQuotes && next === "\"") {
        value += "\"";
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

function toNumber(value) {
  const num = parseFloat(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(num) ? num : null;
}

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function roleKey(inputRole) {
  const role = String(inputRole || "").toLowerCase();
  if (role.includes("front")) return "frontend";
  if (role.includes("back")) return "backend";
  return "fullstack";
}

function inferRoleFromText(text) {
  const t = String(text || "").toLowerCase();
  if (/(frontend|front end|ui|ux|web|react|angular|vue)/.test(t)) return "frontend";
  if (/(backend|back end|api|server|java|node|django|spring|devops)/.test(t))
    return "backend";
  return "fullstack";
}

function keywordToTags(tokens) {
  const tags = new Set();
  const has = (word) => tokens.includes(word);

  if (has("react") || has("angular") || has("vue")) tags.add("react");
  if (has("html") || has("css") || has("bootstrap")) {
    tags.add("frontend");
    tags.add("ui");
    tags.add("css");
  }
  if (has("javascript")) tags.add("javascript");
  if (has("node") || has("express")) {
    tags.add("backend");
    tags.add("node");
    tags.add("api");
  }
  if (has("jwt") || has("auth") || has("authentication")) tags.add("jwt");
  if (has("mongodb") || has("mysql") || has("postgresql") || has("sql")) tags.add("mongodb");
  if (has("redis") || has("cache") || has("caching")) tags.add("redis");
  if (has("dashboard") || has("tableau") || has("powerbi") || has("analytics")) {
    tags.add("dashboard");
    tags.add("analytics");
  }
  if (has("machine") || has("learning") || has("nlp")) tags.add("ml");
  if (has("dsa") || has("algorithm") || has("algorithms")) tags.add("dsa");
  if (has("collaboration") || has("team") || has("leadership")) tags.add("collaboration");

  return [...tags];
}

function buildRolePriors() {
  const priors = {
    frontend: new Map(),
    backend: new Map(),
    fullstack: new Map(),
  };

  const bump = (role, tag, value = 1) => {
    const bucket = priors[role];
    bucket.set(tag, (bucket.get(tag) || 0) + value);
  };

  // archive 4 -> Resume Screening.csv
  const screeningRows = parseCsv(readFile("Resume Screening.csv", 8 * 1024 * 1024));
  const screeningHeader = screeningRows[0] || [];
  const categoryIdx = screeningHeader.indexOf("Category");
  const resumeIdx = screeningHeader.indexOf("Resume");

  screeningRows.slice(1, MAX_ROWS + 1).forEach((row) => {
    const category = row[categoryIdx] || "";
    const resume = row[resumeIdx] || "";
    const role = inferRoleFromText(category);
    const tokens = tokenize(`${category} ${resume}`);
    const tags = keywordToTags(tokens);

    bump(role, role, 1.2);
    tags.forEach((tag) => bump(role, tag, 1));
  });

  // archive 5 -> resume_data_for_ranking.csv
  const rankRows = parseCsv(readFile("resume_data_for_ranking.csv", 8 * 1024 * 1024));
  const rankHeader = rankRows[0] || [];
  const positionIdx = rankHeader.indexOf("job_position_name");
  const skillsReqIdx = rankHeader.indexOf("skills_required");
  const relatedSkillsIdx = rankHeader.indexOf("related_skils_in_job");
  const skillsIdx = rankHeader.indexOf("skills");
  const scoreIdx = rankHeader.indexOf("matched_score");

  rankRows.slice(1, MAX_ROWS + 1).forEach((row) => {
    const position = row[positionIdx] || "";
    const skillsReq = row[skillsReqIdx] || "";
    const relatedSkills = row[relatedSkillsIdx] || "";
    const skills = row[skillsIdx] || "";
    const matched = toNumber(row[scoreIdx]);
    const weight = Number.isFinite(matched) ? Math.max(0.4, matched * 1.8) : 1;

    const role = inferRoleFromText(`${position} ${skillsReq}`);
    const tokens = tokenize(`${position} ${skillsReq} ${relatedSkills} ${skills}`);
    const tags = keywordToTags(tokens);

    bump(role, role, 1.2 * weight);
    tags.forEach((tag) => bump(role, tag, weight));
  });

  // archive 3 -> recruitment_data.csv (behavioral/technical weight)
  const recruitmentRows = parseCsv(readFile("recruitment_data.csv", 6 * 1024 * 1024));
  recruitmentRows.slice(1, MAX_ROWS + 1).forEach((row) => {
    const interview = toNumber(row[6]) || 0;
    const skill = toNumber(row[7]) || 0;
    const personality = toNumber(row[8]) || 0;
    const decision = (toNumber(row[10]) || 0) === 1;
    if (!decision) return;

    // Strong technical profiles lean backend/fullstack;
    // communication-heavy profiles lean frontend collaboration projects.
    const backendWeight = (skill + interview) / 180;
    const frontendWeight = personality / 120;
    const fullstackWeight = (skill + personality) / 200;

    bump("backend", "api", backendWeight);
    bump("backend", "node", backendWeight);
    bump("backend", "jwt", interview >= 70 ? 0.8 : 0.2);

    bump("frontend", "ui", frontendWeight);
    bump("frontend", "dashboard", frontendWeight);
    bump("frontend", "collaboration", personality >= 70 ? 0.8 : 0.2);

    bump("fullstack", "fullstack", fullstackWeight);
    bump("fullstack", "react", fullstackWeight * 0.8);
    bump("fullstack", "node", fullstackWeight * 0.8);
    bump("fullstack", "analytics", fullstackWeight * 0.7);
  });

  // archive 7 -> stackoverflow_full.csv (skills + branch driven priors)
  const stackRows = parseCsv(readFile("stackoverflow_full.csv", 8 * 1024 * 1024));
  const stackHeader = stackRows[0] || [];
  const workedWithIdx = stackHeader.indexOf("HaveWorkedWith");
  const branchIdx = stackHeader.indexOf("MainBranch");
  const employedIdx = stackHeader.indexOf("Employed");

  stackRows.slice(1, MAX_ROWS + 1).forEach((row) => {
    const workedWith = row[workedWithIdx] || "";
    const branch = row[branchIdx] || "";
    const employed = (toNumber(row[employedIdx]) || 0) === 1;
    const role = inferRoleFromText(`${branch} ${workedWith}`);
    const tokens = tokenize(workedWith);
    const tags = keywordToTags(tokens);
    const weight = employed ? 1.1 : 0.7;

    bump(role, role, 0.8 * weight);
    tags.forEach((tag) => bump(role, tag, weight));
  });

  // archive 8 -> recruitment_data.csv (incremental light pass)
  recruitmentRows.slice(1, MAX_ROWS + 1).forEach((row) => {
    const interview = toNumber(row[6]) || 0;
    const skill = toNumber(row[7]) || 0;
    const decision = (toNumber(row[10]) || 0) === 1;
    if (!decision) return;

    const technicalWeight = (skill + interview) / 200;
    bump("backend", "api", technicalWeight * 0.5);
    bump("backend", "node", technicalWeight * 0.5);
    bump("fullstack", "node", technicalWeight * 0.4);
    bump("fullstack", "react", technicalWeight * 0.3);
  });

  // archive 9 -> job_dataset.csv (title/skills/keywords priors)
  const jobRows = parseCsv(readFile("job_dataset.csv", 8 * 1024 * 1024));
  const jobHeader = jobRows[0] || [];
  const titleIdx = jobHeader.indexOf("Title");
  const expLevelIdx = jobHeader.indexOf("ExperienceLevel");
  const skillsIdx2 = jobHeader.indexOf("Skills");
  const keywordsIdx = jobHeader.indexOf("Keywords");

  jobRows.slice(1, MAX_ROWS + 1).forEach((row) => {
    const title = row[titleIdx] || "";
    const expLevel = String(row[expLevelIdx] || "").toLowerCase();
    const skills = row[skillsIdx2] || "";
    const keywords = row[keywordsIdx] || "";

    const role = inferRoleFromText(`${title} ${skills} ${keywords}`);
    const tags = keywordToTags(tokenize(`${title} ${skills} ${keywords}`));
    const weight = expLevel.includes("experienced") ? 1.3 : 0.9;

    bump(role, role, 1.1 * weight);
    tags.forEach((tag) => bump(role, tag, weight));
  });

  // archive 10 -> job_recommendation_dataset.csv
  const recText =
    readFile("job_recommendation_dataset.csv", 8 * 1024 * 1024) ||
    readArchiveFile("archive 10.zip", "job_recommendation_dataset.csv", 8 * 1024 * 1024);
  const recRows = parseCsv(recText);
  const recHeader = recRows[0] || [];
  const recTitleIdx = recHeader.indexOf("Job Title");
  const recIndustryIdx = recHeader.indexOf("Industry");
  const recSkillsIdx = recHeader.indexOf("Required Skills");
  const recExpIdx = recHeader.indexOf("Experience Level");

  recRows.slice(1, MAX_ROWS + 1).forEach((row) => {
    const title = row[recTitleIdx] || "";
    const industry = row[recIndustryIdx] || "";
    const skills = row[recSkillsIdx] || "";
    const expLevel = String(row[recExpIdx] || "").toLowerCase();
    const role = inferRoleFromText(`${title} ${industry} ${skills}`);
    const tags = keywordToTags(tokenize(`${title} ${industry} ${skills}`));
    const weight = expLevel.includes("senior") ? 1.25 : expLevel.includes("mid") ? 1.05 : 0.85;

    bump(role, role, 0.9 * weight);
    tags.forEach((tag) => bump(role, tag, weight));
  });

  // archive 11 -> people/abilities/experience/person_skills tables
  const pSkillsText = readArchiveFile("archive 11.zip", "05_person_skills.csv", 8 * 1024 * 1024);
  const abilitiesText = readArchiveFile("archive 11.zip", "02_abilities.csv", 8 * 1024 * 1024);
  const peopleText = readArchiveFile("archive 11.zip", "01_people.csv", 8 * 1024 * 1024);
  const expText = readArchiveFile("archive 11.zip", "04_experience.csv", 8 * 1024 * 1024);

  const personSkillTokens = new Map();
  parseCsv(pSkillsText)
    .slice(1, MAX_ROWS + 1)
    .forEach((row) => {
      const personId = String(row[0] || "").trim();
      const skill = String(row[1] || "");
      if (!personId || !skill) return;
      const list = personSkillTokens.get(personId) || [];
      list.push(...tokenize(skill));
      personSkillTokens.set(personId, list);
    });

  const personAbilityTokens = new Map();
  parseCsv(abilitiesText)
    .slice(1, MAX_ROWS + 1)
    .forEach((row) => {
      const personId = String(row[0] || "").trim();
      const ability = String(row[1] || "");
      if (!personId || !ability) return;
      const list = personAbilityTokens.get(personId) || [];
      list.push(...tokenize(ability));
      personAbilityTokens.set(personId, list);
    });

  const personTitle = new Map();
  parseCsv(peopleText)
    .slice(1, MAX_ROWS + 1)
    .forEach((row) => {
      const personId = String(row[0] || "").trim();
      const nameOrTitle = String(row[1] || "");
      if (!personId || !nameOrTitle) return;
      personTitle.set(personId, nameOrTitle);
    });

  const personExpCount = new Map();
  parseCsv(expText)
    .slice(1, MAX_ROWS + 1)
    .forEach((row) => {
      const personId = String(row[0] || "").trim();
      if (!personId) return;
      personExpCount.set(personId, (personExpCount.get(personId) || 0) + 1);
    });

  const personIds = new Set([
    ...personSkillTokens.keys(),
    ...personAbilityTokens.keys(),
    ...personTitle.keys(),
    ...personExpCount.keys(),
  ]);

  personIds.forEach((personId) => {
    const title = personTitle.get(personId) || "";
    const tokens = [
      ...tokenize(title),
      ...(personSkillTokens.get(personId) || []),
      ...(personAbilityTokens.get(personId) || []),
    ];
    if (!tokens.length) return;
    const role = inferRoleFromText(tokens.join(" "));
    const tags = keywordToTags(tokens);
    const expCount = personExpCount.get(personId) || 0;
    const weight = Math.min(1.5, 0.7 + expCount * 0.18);

    bump(role, role, 0.8 * weight);
    tags.forEach((tag) => bump(role, tag, weight));
  });

  // archive 1 -> Sample.csv
  const sampleRows = parseCsv(readFile("Sample.csv", 6 * 1024 * 1024));
  const sampleHeader = sampleRows[0] || [];
  const streamIdx = sampleHeader.indexOf("Stream");
  const internshipIdx = sampleHeader.indexOf("Internships(Y/N)");
  const trainingIdx = sampleHeader.indexOf("Training(Y/N)");
  const innovativeIdx = sampleHeader.indexOf("Innovative Project(Y/N)");
  const techCourseIdx = sampleHeader.indexOf("Technical Course(Y/N)");
  const placementIdx = sampleHeader.indexOf("Placement(Y/N)?");
  const commIdx = sampleHeader.indexOf("Communication level");

  sampleRows.slice(1, MAX_ROWS + 1).forEach((row) => {
    const stream = String(row[streamIdx] || "");
    const role = inferRoleFromText(stream);
    const internship = String(row[internshipIdx] || "").toLowerCase() === "yes";
    const training = String(row[trainingIdx] || "").toLowerCase() === "yes";
    const innovative = String(row[innovativeIdx] || "").toLowerCase() === "yes";
    const techCourse = String(row[techCourseIdx] || "").toLowerCase() === "yes";
    const placed = String(row[placementIdx] || "").toLowerCase().includes("placed");
    const comm = toNumber(row[commIdx]) || 0;

    let weight = 0.6;
    if (placed) weight += 0.5;
    if (internship) weight += 0.3;
    if (training) weight += 0.3;
    if (innovative) weight += 0.25;
    if (techCourse) weight += 0.25;
    weight += Math.min(0.4, comm / 10);

    bump(role, role, weight);
    if (internship || training) {
      bump(role, "fullstack", 0.35 * weight);
      bump(role, "api", 0.25 * weight);
    }
    if (innovative) {
      bump(role, "analytics", 0.35 * weight);
      bump(role, "dashboard", 0.25 * weight);
      bump(role, "ml", 0.2 * weight);
    }
    if (techCourse) {
      bump(role, "react", 0.25 * weight);
      bump(role, "node", 0.25 * weight);
      bump(role, "javascript", 0.2 * weight);
    }
  });

  // archive 2 -> placementdata.csv
  const placementRows = parseCsv(readFile("placementdata.csv", 6 * 1024 * 1024));
  const placementHeader = placementRows[0] || [];
  const cgpaIdx = placementHeader.indexOf("CGPA");
  const internshipsIdx = placementHeader.indexOf("Internships");
  const projectsIdx = placementHeader.indexOf("Projects");
  const workshopsIdx = placementHeader.indexOf("Workshops/Certifications");
  const aptIdx = placementHeader.indexOf("AptitudeTestScore");
  const softIdx = placementHeader.indexOf("SoftSkillsRating");
  const extraIdx = placementHeader.indexOf("ExtracurricularActivities");
  const trainIdx = placementHeader.indexOf("PlacementTraining");
  const statusIdx = placementHeader.indexOf("PlacementStatus");

  placementRows.slice(1, MAX_ROWS + 1).forEach((row) => {
    const cgpa = toNumber(row[cgpaIdx]) || 0;
    const internships = toNumber(row[internshipsIdx]) || 0;
    const projects = toNumber(row[projectsIdx]) || 0;
    const workshops = toNumber(row[workshopsIdx]) || 0;
    const aptitude = toNumber(row[aptIdx]) || 0;
    const softSkills = toNumber(row[softIdx]) || 0;
    const extracurricular = String(row[extraIdx] || "").toLowerCase() === "yes";
    const training = String(row[trainIdx] || "").toLowerCase() === "yes";
    const placed = String(row[statusIdx] || "").toLowerCase().includes("placed");

    // infer role tendency from numeric mix: comm+portfolio => frontend/fullstack, aptitude+projects => backend/fullstack
    const frontendSignal = softSkills * 0.6 + (extracurricular ? 2 : 0);
    const backendSignal = aptitude * 0.55 + projects * 1.2;
    const fullstackSignal = (frontendSignal + backendSignal) / 2 + internships * 0.8;
    const role =
      fullstackSignal >= Math.max(frontendSignal, backendSignal)
        ? "fullstack"
        : frontendSignal >= backendSignal
          ? "frontend"
          : "backend";

    let weight = 0.6 + Math.min(0.6, cgpa / 20);
    if (placed) weight += 0.5;
    if (training) weight += 0.25;
    weight += Math.min(0.4, internships * 0.15 + projects * 0.08 + workshops * 0.06);

    bump(role, role, weight);
    if (projects >= 2) {
      bump(role, "fullstack", 0.35 * weight);
      bump(role, "dashboard", 0.25 * weight);
      bump(role, "analytics", 0.2 * weight);
    }
    if (internships >= 1 || training) {
      bump(role, "api", 0.25 * weight);
      bump(role, "node", 0.25 * weight);
    }
    if (softSkills >= 4) {
      bump(role, "ui", 0.2 * weight);
      bump(role, "collaboration", 0.25 * weight);
    }
  });

  return priors;
}

let cachedRolePriors = null;

function getRolePriors() {
  if (!cachedRolePriors) cachedRolePriors = buildRolePriors();
  return cachedRolePriors;
}

export function retrainProjectModel() {
  cachedRolePriors = buildRolePriors();
  const roleKeys = ["frontend", "backend", "fullstack"];
  const roleTagCounts = {};
  roleKeys.forEach((key) => {
    roleTagCounts[key] = cachedRolePriors[key]?.size || 0;
  });
  return {
    roles: roleKeys.length,
    roleTagCounts,
  };
}

export function recommendProjects({ role, jobSkills, missingSkills }) {
  const normalizedRole = roleKey(role);
  const priors = getRolePriors()[normalizedRole] || new Map();
  const skillSet = new Set(
    [...(jobSkills || []), ...(missingSkills || [])]
      .map((s) => String(s).toLowerCase())
      .filter(Boolean)
  );

  const scored = projectCatalog.map((project) => {
    let score = 0;

    project.tags.forEach((tag) => {
      if (skillSet.has(tag)) score += 3;
      if (priors.has(tag)) score += Math.min(6, priors.get(tag) / 40);
      if (normalizedRole === "frontend" && ["frontend", "react", "ui"].includes(tag))
        score += 1.2;
      if (normalizedRole === "backend" && ["backend", "node", "api", "jwt"].includes(tag))
        score += 1.2;
      if (normalizedRole === "fullstack" && ["fullstack", "react", "node"].includes(tag))
        score += 1.2;
    });

    return { name: project.name, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((item) => item.name);
}
