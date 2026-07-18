import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, "..", "..", "data");

const ROLE_LABELS = ["Frontend", "Backend", "Fullstack"];
const MAX_SURVEY_ROWS = 5000;
const MAX_JOBPOST_ROWS = 5000;
const MAX_JOBDESC_ROWS = 8000;
const MAX_JOBREC_ROWS = 8000;

const DATASET_WEIGHTS = {
  gpt: 0.6,
  job: 1.6,
  jobPost: 1.5,
  jobDesc: 1.4,
  jobRec: 1.3,
  survey: 0,
};

let cachedModel = null;

function readFile(fileName, maxBytes = null) {
  const fullPath = path.join(dataDir, fileName);
  if (maxBytes) {
    const fd = fs.openSync(fullPath, "r");
    const buffer = Buffer.alloc(maxBytes);
    const bytes = fs.readSync(fd, buffer, 0, maxBytes, 0);
    fs.closeSync(fd);
    return buffer.slice(0, bytes).toString("utf8");
  }
  return fs.readFileSync(fullPath, "utf8");
}

function parseCsv(text) {
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

function tokenize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9+.#\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function labelFromText(text) {
  const lower = (text || "").toLowerCase();
  if (
    lower.includes("fullstack") ||
    lower.includes("full stack") ||
    lower.includes("mern") ||
    lower.includes("mean")
  ) {
    return "Fullstack";
  }
  if (
    lower.includes("frontend") ||
    lower.includes("front end") ||
    lower.includes("ui") ||
    lower.includes("react")
  ) {
    return "Frontend";
  }
  if (
    lower.includes("backend") ||
    lower.includes("back end") ||
    lower.includes("api") ||
    lower.includes("server")
  ) {
    return "Backend";
  }
  return null;
}

function addTrainingExample({ classCounts, tokenCounts, totalTokens, skillBuckets, label, text, skills = [], weight = 1 }) {
  if (!label || !ROLE_LABELS.includes(label) || !weight) return;
  classCounts.set(label, classCounts.get(label) + weight);

  const tokens = tokenize(text);
  tokens.forEach((token) => {
    const bucket = tokenCounts.get(label);
    bucket.set(token, (bucket.get(token) || 0) + weight);
    totalTokens.set(label, totalTokens.get(label) + weight);
  });

  skills
    .filter(Boolean)
    .forEach((skill) => {
      const map = skillBuckets.get(label);
      map.set(skill, (map.get(skill) || 0) + weight);
    });
}

function buildModel() {
  const classCounts = new Map();
  const tokenCounts = new Map();
  const totalTokens = new Map();
  const vocab = new Set();
  const skillBuckets = new Map();

  ROLE_LABELS.forEach((label) => {
    classCounts.set(label, 0);
    tokenCounts.set(label, new Map());
    totalTokens.set(label, 0);
    skillBuckets.set(label, new Map());
  });

  const gptCsv = parseCsv(readFile("gpt_dataset.csv"));
  const gptHeader = gptCsv[0] || [];
  const categoryIdx = gptHeader.indexOf("Category");
  const resumeIdx = gptHeader.indexOf("Resume");

  gptCsv.slice(1).forEach((row) => {
    const category = row[categoryIdx] || "";
    const resume = row[resumeIdx] || "";
    const label = labelFromText(category);
    if (!label) return;
    const weight = DATASET_WEIGHTS.gpt;
    classCounts.set(label, classCounts.get(label) + weight);
    const tokens = tokenize(resume);
    tokens.forEach((token) => {
      vocab.add(token);
      const bucket = tokenCounts.get(label);
      bucket.set(token, (bucket.get(token) || 0) + weight);
      totalTokens.set(label, totalTokens.get(label) + weight);
    });
  });

  const jobCsv = parseCsv(readFile("job_dataset.csv"));
  const jobHeader = jobCsv[0] || [];
  const titleIdx = jobHeader.indexOf("Title");
  const skillsIdx = jobHeader.indexOf("Skills");
  const keywordsIdx = jobHeader.indexOf("Keywords");
  const respIdx = jobHeader.indexOf("Responsibilities");

  jobCsv.slice(1).forEach((row) => {
    const title = row[titleIdx] || "";
    const skills = row[skillsIdx] || "";
    const keywords = row[keywordsIdx] || "";
    const resp = row[respIdx] || "";
    const label = labelFromText(`${title} ${keywords}`);
    if (!label) return;
    const weight = DATASET_WEIGHTS.job;
    classCounts.set(label, classCounts.get(label) + weight);
    const tokens = tokenize(`${title} ${skills} ${keywords} ${resp}`);
    tokens.forEach((token) => {
      vocab.add(token);
      const bucket = tokenCounts.get(label);
      bucket.set(token, (bucket.get(token) || 0) + weight);
      totalTokens.set(label, totalTokens.get(label) + weight);
    });

    skills
      .split(/[,;|]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((skill) => {
        const map = skillBuckets.get(label);
        map.set(skill, (map.get(skill) || 0) + weight);
      });
  });

  const jobPostFile = path.join(dataDir, "data job posts.csv");
  if (fs.existsSync(jobPostFile)) {
    const jobStats = fs.statSync(jobPostFile);
    const jobText =
      jobStats.size > 20 * 1024 * 1024
        ? readFile("data job posts.csv", 5 * 1024 * 1024)
        : readFile("data job posts.csv");
    const jobPostCsv = parseCsv(jobText).slice(0, MAX_JOBPOST_ROWS + 1);
    const jobHeader = jobPostCsv[0] || [];
    const titleIdx = jobHeader.indexOf("Title");
    const descIdx = jobHeader.indexOf("JobDescription");
    const reqIdx = jobHeader.indexOf("JobRequirment");
    const qualIdx = jobHeader.indexOf("RequiredQual");
    const itIdx = jobHeader.indexOf("IT");

    jobPostCsv.slice(1).forEach((row) => {
      const itFlag = itIdx >= 0 ? String(row[itIdx] || "").trim() : "";
      if (itFlag && itFlag !== "1" && itFlag.toLowerCase() !== "true") return;
      const title = row[titleIdx] || "";
      const desc = row[descIdx] || "";
      const req = row[reqIdx] || "";
      const qual = row[qualIdx] || "";
      const label = labelFromText(`${title} ${desc} ${req}`);
      if (!label) return;
      const weight = DATASET_WEIGHTS.jobPost;
      classCounts.set(label, classCounts.get(label) + weight);
      const tokens = tokenize(`${title} ${desc} ${req} ${qual}`);
      tokens.forEach((token) => {
        vocab.add(token);
        const bucket = tokenCounts.get(label);
        bucket.set(token, (bucket.get(token) || 0) + weight);
        totalTokens.set(label, totalTokens.get(label) + weight);
      });
      const skills = `${req} ${qual}`
        .split(/[,;|]/)
        .map((s) => s.trim())
        .filter(Boolean);
      skills.forEach((skill) => {
        const map = skillBuckets.get(label);
          map.set(skill, (map.get(skill) || 0) + weight);
      });
    });
  }

  const jobDescFile = path.join(dataDir, "job_descriptions.csv");
  if (fs.existsSync(jobDescFile)) {
    const descStats = fs.statSync(jobDescFile);
    const descText =
      descStats.size > 25 * 1024 * 1024
        ? readFile("job_descriptions.csv", 6 * 1024 * 1024)
        : readFile("job_descriptions.csv");
    const descCsv = parseCsv(descText).slice(0, MAX_JOBDESC_ROWS + 1);
    const descHeader = descCsv[0] || [];
    const titleIdx = descHeader.indexOf("Job Title");
    const roleIdx = descHeader.indexOf("Role");
    const descIdx = descHeader.indexOf("Job Description");
    const skillsIdx = descHeader.indexOf("skills");
    const respIdx = descHeader.indexOf("Responsibilities");

    descCsv.slice(1).forEach((row) => {
      const title = row[titleIdx] || "";
      const role = row[roleIdx] || "";
      const desc = row[descIdx] || "";
      const skills = row[skillsIdx] || "";
      const resp = row[respIdx] || "";
      const label = labelFromText(`${title} ${role}`);
      if (!label) return;
      const weight = DATASET_WEIGHTS.jobDesc;
      classCounts.set(label, classCounts.get(label) + weight);
      const tokens = tokenize(`${title} ${role} ${desc} ${skills} ${resp}`);
      tokens.forEach((token) => {
        vocab.add(token);
        const bucket = tokenCounts.get(label);
        bucket.set(token, (bucket.get(token) || 0) + weight);
        totalTokens.set(label, totalTokens.get(label) + weight);
      });
      const skillList = skills
        .split(/[,;|]/)
        .map((s) => s.trim())
        .filter(Boolean);
      skillList.forEach((skill) => {
        const map = skillBuckets.get(label);
          map.set(skill, (map.get(skill) || 0) + weight);
      });
    });
  }

  const jobRecFile = path.join(dataDir, "job_recommendation_dataset.csv");
  if (fs.existsSync(jobRecFile)) {
    const recStats = fs.statSync(jobRecFile);
    const recText =
      recStats.size > 25 * 1024 * 1024
        ? readFile("job_recommendation_dataset.csv", 6 * 1024 * 1024)
        : readFile("job_recommendation_dataset.csv");
    const recCsv = parseCsv(recText).slice(0, MAX_JOBREC_ROWS + 1);
    const recHeader = recCsv[0] || [];
    const titleIdx = recHeader.indexOf("Job Title");
    const skillsIdx = recHeader.indexOf("Required Skills");

    recCsv.slice(1).forEach((row) => {
      const title = row[titleIdx] || "";
      const skills = row[skillsIdx] || "";
      const label = labelFromText(title);
      if (!label) return;
      const weight = DATASET_WEIGHTS.jobRec;
      classCounts.set(label, classCounts.get(label) + weight);
      const tokens = tokenize(`${title} ${skills}`);
      tokens.forEach((token) => {
        vocab.add(token);
        const bucket = tokenCounts.get(label);
        bucket.set(token, (bucket.get(token) || 0) + weight);
        totalTokens.set(label, totalTokens.get(label) + weight);
      });
      skills
        .split(/[,;|]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((skill) => {
          const map = skillBuckets.get(label);
          map.set(skill, (map.get(skill) || 0) + weight);
        });
    });
  }

  const surveyFile = path.join(dataDir, "survey_results_public.csv");
  const surveyStats = fs.statSync(surveyFile);
  const surveyText =
    surveyStats.size > 20 * 1024 * 1024
      ? readFile("survey_results_public.csv", 5 * 1024 * 1024)
      : readFile("survey_results_public.csv");
  const surveyCsv = parseCsv(surveyText).slice(0, MAX_SURVEY_ROWS + 1);
  const surveyHeader = surveyCsv[0] || [];
  const devTypeIdx = surveyHeader.indexOf("DevType");
  const langIdx = surveyHeader.indexOf("LanguageHaveWorkedWith");
  const webIdx = surveyHeader.indexOf("WebframeHaveWorkedWith");

  const mapDevType = (value) => {
    const text = (value || "").toLowerCase();
    const roles = [];
    if (text.includes("developer, front-end")) roles.push("Frontend");
    if (text.includes("developer, back-end")) roles.push("Backend");
    if (text.includes("developer, full-stack")) roles.push("Fullstack");
    return roles;
  };

  surveyCsv.slice(1).forEach((row) => {
    const devType = row[devTypeIdx] || "";
    const roles = mapDevType(devType);
    if (!roles.length) return;
    const langs = (row[langIdx] || "").split(";").map((s) => s.trim());
    const webs = (row[webIdx] || "").split(";").map((s) => s.trim());
    const tokens = tokenize(`${langs.join(" ")} ${webs.join(" ")}`);
    const weight = DATASET_WEIGHTS.survey;
    roles.forEach((label) => {
      classCounts.set(label, classCounts.get(label) + weight);
      tokens.forEach((token) => {
        vocab.add(token);
        const bucket = tokenCounts.get(label);
        bucket.set(token, (bucket.get(token) || 0) + weight);
        totalTokens.set(label, totalTokens.get(label) + weight);
      });
      const skills = [...langs, ...webs].filter(Boolean);
      skills.forEach((skill) => {
        const map = skillBuckets.get(label);
        map.set(skill, (map.get(skill) || 0) + weight);
      });
    });
  });

  const vocabSize = vocab.size || 1;
  const totalDocs = ROLE_LABELS.reduce(
    (sum, label) => sum + classCounts.get(label),
    0
  );

  const priors = new Map();
  ROLE_LABELS.forEach((label) => {
    priors.set(label, Math.log((classCounts.get(label) + 1) / (totalDocs + 3)));
  });

  const roleSkills = {};
  ROLE_LABELS.forEach((label) => {
    const entries = Array.from(skillBuckets.get(label).entries()).sort(
      (a, b) => b[1] - a[1]
    );
    roleSkills[label] = entries.slice(0, 20).map(([skill]) => skill);
  });

  return {
    vocabSize,
    priors,
    tokenCounts,
    totalTokens,
    roleSkills,
  };
}

function softmax(scores, temperature = 1.4) {
  const max = Math.max(...scores);
  const exps = scores.map((s) => Math.exp((s - max) / temperature));
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  return exps.map((e) => e / sum);
}

export function getRoleModel() {
  if (!cachedModel) {
    cachedModel = buildModel();
  }
  return cachedModel;
}

export function retrainRoleModel() {
  cachedModel = buildModel();
  return {
    labels: ROLE_LABELS.length,
    vocabSize: cachedModel.vocabSize,
  };
}

export function predictRoles(text) {
  const model = getRoleModel();
  const tokens = tokenize(text);
  const scores = ROLE_LABELS.map((label) => {
    let score = model.priors.get(label);
    const bucket = model.tokenCounts.get(label);
    const total = model.totalTokens.get(label);
    tokens.forEach((token) => {
      const count = bucket.get(token) || 0;
      score += Math.log((count + 1) / (total + model.vocabSize));
    });
    return score;
  });
  const probs = softmax(scores);
  const smoothed = probs.map((p) => p * 0.9 + 0.05);
  const sum = smoothed.reduce((a, b) => a + b, 0) || 1;
  const normalized = smoothed.map((p) => (p / sum) * 100);
  return ROLE_LABELS.map((role, idx) => ({
    role,
    score: Math.round(normalized[idx]),
  })).sort((a, b) => b.score - a.score);
}

export function getRoleSkills(role) {
  const model = getRoleModel();
  return model.roleSkills[role] || [];
}
