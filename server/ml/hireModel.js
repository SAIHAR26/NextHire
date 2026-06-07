import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, "..", "..", "data");
const repoRoot = path.resolve(__dirname, "..", "..");

const MAX_ROWS = 10000;
const BIN_COUNT = 10;

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

function clamp100(value) {
  return Math.max(0, Math.min(100, value));
}

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function computeArchiveBins() {
  const bins = Array.from({ length: BIN_COUNT }, () => ({ count: 0, hired: 0 }));

  const pushScore = (score, hired, weight = 1) => {
    if (!Number.isFinite(score)) return;
    const idx = Math.min(9, Math.max(0, Math.floor(score / 10)));
    bins[idx].count += weight;
    bins[idx].hired += hired ? weight : 0;
  };

  // archive 3 -> recruitment_data.csv (strong labels)
  const recruitmentText = readFile("recruitment_data.csv", 6 * 1024 * 1024);
  const recruitmentRows = parseCsv(recruitmentText).slice(1, MAX_ROWS + 1);
  recruitmentRows.forEach((row) => {
    const expYears = toNumber(row[3]) || 0;
    const interview = toNumber(row[6]) || 0;
    const skill = toNumber(row[7]) || 0;
    const personality = toNumber(row[8]) || 0;
    const distance = toNumber(row[5]) || 0;
    const hired = (toNumber(row[10]) || 0) === 1;

    const score = clamp100(
      skill * 0.45 + interview * 0.35 + personality * 0.15 + expYears * 0.8 - distance * 0.1
    );
    pushScore(score, hired, 1);
  });

  // archive 5 -> resume_data_for_ranking.csv (matched_score as proxy label)
  const rankText = readFile("resume_data_for_ranking.csv", 8 * 1024 * 1024);
  const rankRows = parseCsv(rankText);
  const rankHeader = rankRows[0] || [];
  const scoreIdx = rankHeader.indexOf("matched_score");
  const skillsIdx = rankHeader.indexOf("skills");
  const relatedSkillsIdx = rankHeader.indexOf("related_skils_in_job");
  const expReqIdx = rankHeader.indexOf("experiencere_requirement");
  const roleIdx = rankHeader.indexOf("job_position_name");

  rankRows.slice(1, MAX_ROWS + 1).forEach((row) => {
    const matched = toNumber(row[scoreIdx]);
    if (!Number.isFinite(matched)) return;

    const skillsTokens = tokenize(`${row[skillsIdx] || ""} ${row[relatedSkillsIdx] || ""}`);
    const roleTokens = tokenize(row[roleIdx] || "");
    const expReq = toNumber(row[expReqIdx]) || 0;

    const score = clamp100(
      matched * 100 + Math.min(15, skillsTokens.length * 0.25) + Math.min(8, roleTokens.length)
      + Math.min(8, expReq * 1.5)
    );
    const hired = matched >= 0.75;
    pushScore(score, hired, 1);
  });

  // archive 4 -> Resume Screening.csv (weak pseudo labels to influence calibration)
  const screeningText = readFile("Resume Screening.csv", 8 * 1024 * 1024);
  const screeningRows = parseCsv(screeningText);
  const screeningHeader = screeningRows[0] || [];
  const categoryIdx = screeningHeader.indexOf("Category");
  const resumeIdx = screeningHeader.indexOf("Resume");

  screeningRows.slice(1, MAX_ROWS + 1).forEach((row) => {
    const category = String(row[categoryIdx] || "").toLowerCase();
    const resume = String(row[resumeIdx] || "");
    const tokens = tokenize(resume);
    if (!tokens.length) return;

    const coreHits = [
      "python",
      "java",
      "javascript",
      "sql",
      "react",
      "node",
      "docker",
      "aws",
      "machine",
      "learning",
    ].reduce((acc, key) => acc + (tokens.includes(key) ? 1 : 0), 0);

    const categoryBoost = /(data|software|developer|engineer|web|devops|testing)/.test(category)
      ? 12
      : 5;
    const score = clamp100(Math.min(70, tokens.length * 0.22) + coreHits * 4 + categoryBoost);
    const hired = score >= 62;
    pushScore(score, hired, 0.35);
  });

  // archive 7 -> stackoverflow_full.csv (strong label: Employed)
  const stackText = readFile("stackoverflow_full.csv", 8 * 1024 * 1024);
  const stackRows = parseCsv(stackText);
  const stackHeader = stackRows[0] || [];
  const employedIdx = stackHeader.indexOf("Employed");
  const yearsProIdx = stackHeader.indexOf("YearsCodePro");
  const previousSalaryIdx = stackHeader.indexOf("PreviousSalary");
  const compSkillsIdx = stackHeader.indexOf("ComputerSkills");
  const workedWithIdx = stackHeader.indexOf("HaveWorkedWith");
  const branchIdx = stackHeader.indexOf("MainBranch");
  const edLevelIdx = stackHeader.indexOf("EdLevel");

  stackRows.slice(1, MAX_ROWS + 1).forEach((row) => {
    const employed = (toNumber(row[employedIdx]) || 0) === 1;
    const yearsPro = toNumber(row[yearsProIdx]) || 0;
    const prevSalary = toNumber(row[previousSalaryIdx]) || 0;
    const compSkills = toNumber(row[compSkillsIdx]) || 0;
    const workedWith = tokenize(row[workedWithIdx] || "");
    const mainBranch = String(row[branchIdx] || "").toLowerCase();
    const edLevel = String(row[edLevelIdx] || "").toLowerCase();

    const score = clamp100(
      compSkills * 4.5 +
        yearsPro * 1.8 +
        Math.min(18, workedWith.length * 0.45) +
        (mainBranch.includes("dev") ? 8 : 3) +
        (/master|phd/.test(edLevel) ? 6 : 3) +
        Math.min(14, prevSalary / 12000)
    );

    pushScore(score, employed, 0.9);
  });

  // archive 8 -> recruitment_data.csv (already used above from previous datasets)
  // Keep additive behavior by adding a second light pass as incremental weight.
  recruitmentRows.forEach((row) => {
    const interview = toNumber(row[6]) || 0;
    const skill = toNumber(row[7]) || 0;
    const decision = (toNumber(row[10]) || 0) === 1;
    const score = clamp100(skill * 0.5 + interview * 0.4);
    pushScore(score, decision, 0.25);
  });

  // archive 9 -> job_dataset.csv (weak pseudo labels from experience bands)
  const jobsText = readFile("job_dataset.csv", 8 * 1024 * 1024);
  const jobsRows = parseCsv(jobsText);
  const jobsHeader = jobsRows[0] || [];
  const expLevelIdx = jobsHeader.indexOf("ExperienceLevel");
  const yearsIdx = jobsHeader.indexOf("YearsOfExperience");
  const skillsIdx2 = jobsHeader.indexOf("Skills");
  const keywordsIdx = jobsHeader.indexOf("Keywords");

  jobsRows.slice(1, MAX_ROWS + 1).forEach((row) => {
    const expLevel = String(row[expLevelIdx] || "").toLowerCase();
    const yearsText = String(row[yearsIdx] || "");
    const years = toNumber(yearsText) || (yearsText.includes("3+") ? 3 : 0);
    const tokens = tokenize(`${row[skillsIdx2] || ""} ${row[keywordsIdx] || ""}`);
    const score = clamp100(Math.min(40, tokens.length * 0.9) + years * 6);
    const hiredProxy = expLevel.includes("experienced") || years >= 2;
    pushScore(score, hiredProxy, 0.2);
  });

  // archive 10 -> job_recommendation_dataset.csv (additional weak pseudo labels)
  const recText =
    readFile("job_recommendation_dataset.csv", 8 * 1024 * 1024) ||
    readArchiveFile("archive 10.zip", "job_recommendation_dataset.csv", 8 * 1024 * 1024);
  const recRows = parseCsv(recText);
  const recHeader = recRows[0] || [];
  const recExpIdx = recHeader.indexOf("Experience Level");
  const recSalaryIdx = recHeader.indexOf("Salary");
  const recSkillsIdx = recHeader.indexOf("Required Skills");
  const recTitleIdx = recHeader.indexOf("Job Title");

  recRows.slice(1, MAX_ROWS + 1).forEach((row) => {
    const expLevel = String(row[recExpIdx] || "").toLowerCase();
    const salary = toNumber(row[recSalaryIdx]) || 0;
    const tokens = tokenize(`${row[recSkillsIdx] || ""} ${row[recTitleIdx] || ""}`);
    const score = clamp100(
      Math.min(35, tokens.length * 1.4) +
        (expLevel.includes("senior") ? 22 : expLevel.includes("mid") ? 12 : 6) +
        Math.min(25, salary / 6000)
    );
    const hiredProxy = salary >= 90000 || expLevel.includes("senior");
    pushScore(score, hiredProxy, 0.3);
  });

  // archive 11 -> people/abilities/experience/skills tables (resume-like weak supervision)
  const pSkillsText = readArchiveFile("archive 11.zip", "05_person_skills.csv", 8 * 1024 * 1024);
  const abilitiesText = readArchiveFile("archive 11.zip", "02_abilities.csv", 8 * 1024 * 1024);
  const expText = readArchiveFile("archive 11.zip", "04_experience.csv", 8 * 1024 * 1024);

  const skillCount = new Map();
  parseCsv(pSkillsText)
    .slice(1, MAX_ROWS + 1)
    .forEach((row) => {
      const personId = String(row[0] || "").trim();
      const skill = String(row[1] || "").trim();
      if (!personId || !skill) return;
      skillCount.set(personId, (skillCount.get(personId) || 0) + 1);
    });

  const abilityCount = new Map();
  parseCsv(abilitiesText)
    .slice(1, MAX_ROWS + 1)
    .forEach((row) => {
      const personId = String(row[0] || "").trim();
      const ability = String(row[1] || "").trim();
      if (!personId || !ability) return;
      abilityCount.set(personId, (abilityCount.get(personId) || 0) + 1);
    });

  const expCount = new Map();
  parseCsv(expText)
    .slice(1, MAX_ROWS + 1)
    .forEach((row) => {
      const personId = String(row[0] || "").trim();
      if (!personId) return;
      expCount.set(personId, (expCount.get(personId) || 0) + 1);
    });

  const ids = new Set([...skillCount.keys(), ...abilityCount.keys(), ...expCount.keys()]);
  ids.forEach((id) => {
    const s = skillCount.get(id) || 0;
    const a = abilityCount.get(id) || 0;
    const e = expCount.get(id) || 0;
    const score = clamp100(Math.min(50, s * 1.4) + Math.min(30, a * 0.8) + e * 8);
    const hiredProxy = s >= 12 || e >= 2;
    pushScore(score, hiredProxy, 0.35);
  });

  // archive 1 -> Sample.csv (placement label available)
  const sampleText = readFile("Sample.csv", 6 * 1024 * 1024);
  const sampleRows = parseCsv(sampleText);
  const sampleHeader = sampleRows[0] || [];
  const s10Idx = sampleHeader.indexOf("10th marks");
  const s12Idx = sampleHeader.indexOf("12th marks");
  const streamIdx = sampleHeader.indexOf("Stream");
  const cgpaIdx = sampleHeader.indexOf("Cgpa");
  const internshipIdx = sampleHeader.indexOf("Internships(Y/N)");
  const trainingIdx = sampleHeader.indexOf("Training(Y/N)");
  const backlogIdx = sampleHeader.indexOf("Backlog in 5th sem");
  const innovativeIdx = sampleHeader.indexOf("Innovative Project(Y/N)");
  const commIdx = sampleHeader.indexOf("Communication level");
  const techCourseIdx = sampleHeader.indexOf("Technical Course(Y/N)");
  const placementIdx = sampleHeader.indexOf("Placement(Y/N)?");

  sampleRows.slice(1, MAX_ROWS + 1).forEach((row) => {
    const m10 = toNumber(row[s10Idx]) || 0;
    const m12 = toNumber(row[s12Idx]) || 0;
    const cgpa = toNumber(row[cgpaIdx]) || 0;
    const comm = toNumber(row[commIdx]) || 0;
    const stream = String(row[streamIdx] || "").toLowerCase();
    const internship = String(row[internshipIdx] || "").toLowerCase() === "yes" ? 1 : 0;
    const training = String(row[trainingIdx] || "").toLowerCase() === "yes" ? 1 : 0;
    const innovative = String(row[innovativeIdx] || "").toLowerCase() === "yes" ? 1 : 0;
    const techCourse = String(row[techCourseIdx] || "").toLowerCase() === "yes" ? 1 : 0;
    const backlog = String(row[backlogIdx] || "").toLowerCase() === "yes" ? 1 : 0;
    const placed = String(row[placementIdx] || "").toLowerCase().includes("placed");

    const streamBoost = /(computer|it|software|information)/.test(stream) ? 8 : 3;
    const score = clamp100(
      m10 * 0.18 +
        m12 * 0.15 +
        cgpa * 6 +
        comm * 7 +
        internship * 8 +
        training * 7 +
        innovative * 6 +
        techCourse * 7 +
        streamBoost -
        backlog * 8
    );
    pushScore(score, placed, 1);
  });

  // archive 2 -> placementdata.csv (placement status label available)
  const placement2Text = readFile("placementdata.csv", 6 * 1024 * 1024);
  const placement2Rows = parseCsv(placement2Text);
  const placement2Header = placement2Rows[0] || [];
  const pCgpaIdx = placement2Header.indexOf("CGPA");
  const pInternIdx = placement2Header.indexOf("Internships");
  const pProjectsIdx = placement2Header.indexOf("Projects");
  const pWorkshopsIdx = placement2Header.indexOf("Workshops/Certifications");
  const pAptIdx = placement2Header.indexOf("AptitudeTestScore");
  const pSoftIdx = placement2Header.indexOf("SoftSkillsRating");
  const pExtraIdx = placement2Header.indexOf("ExtracurricularActivities");
  const pTrainIdx = placement2Header.indexOf("PlacementTraining");
  const pSscIdx = placement2Header.indexOf("SSC_Marks");
  const pHscIdx = placement2Header.indexOf("HSC_Marks");
  const pStatusIdx = placement2Header.indexOf("PlacementStatus");

  placement2Rows.slice(1, MAX_ROWS + 1).forEach((row) => {
    const cgpa = toNumber(row[pCgpaIdx]) || 0;
    const internships = toNumber(row[pInternIdx]) || 0;
    const projects = toNumber(row[pProjectsIdx]) || 0;
    const workshops = toNumber(row[pWorkshopsIdx]) || 0;
    const aptitude = toNumber(row[pAptIdx]) || 0;
    const softSkills = toNumber(row[pSoftIdx]) || 0;
    const ssc = toNumber(row[pSscIdx]) || 0;
    const hsc = toNumber(row[pHscIdx]) || 0;
    const extra = String(row[pExtraIdx] || "").toLowerCase() === "yes" ? 1 : 0;
    const training = String(row[pTrainIdx] || "").toLowerCase() === "yes" ? 1 : 0;
    const placed = String(row[pStatusIdx] || "").toLowerCase().includes("placed");

    const score = clamp100(
      cgpa * 7 +
        aptitude * 0.28 +
        softSkills * 8 +
        ssc * 0.12 +
        hsc * 0.12 +
        internships * 4 +
        projects * 3 +
        workshops * 2 +
        extra * 3 +
        training * 5
    );
    pushScore(score, placed, 1);
  });

  return bins;
}

let cachedBins = null;
let cachedGlobalHireRate = null;

export function getHireBins() {
  if (!cachedBins) cachedBins = computeArchiveBins();
  return cachedBins;
}

export function retrainHireModel() {
  cachedBins = computeArchiveBins();
  cachedGlobalHireRate = null;
  const totals = cachedBins.reduce(
    (acc, b) => ({ count: acc.count + b.count, hired: acc.hired + b.hired }),
    { count: 0, hired: 0 }
  );
  return {
    bins: BIN_COUNT,
    samples: Math.round(totals.count),
    hiredSamples: Math.round(totals.hired),
  };
}

export function estimateHireProbability(profile) {
  const bins = getHireBins();
  const leetTotal = Math.min(100, (profile.leetcode.total / 600) * 100);
  const leetRating = Math.min(100, (profile.leetcode.rating / 2000) * 100);
  const ccSolved = Math.min(100, (profile.codechef.solved / 800) * 100);
  const ghRepos = Math.min(100, (profile.github.repos / 10) * 100);
  const hr = Math.min(
    100,
    ((profile.hackerrank.badges + profile.hackerrank.certs) / 20) * 100
  );

  const score =
    leetTotal * 0.35 +
    leetRating * 0.25 +
    ccSolved * 0.15 +
    ghRepos * 0.15 +
    hr * 0.1;

  const idx = Math.min(9, Math.max(0, Math.floor(score / 10)));
  const bin = bins[idx];

  if (cachedGlobalHireRate === null) {
    const totals = bins.reduce(
      (acc, b) => ({ count: acc.count + b.count, hired: acc.hired + b.hired }),
      { count: 0, hired: 0 }
    );
    cachedGlobalHireRate = totals.count > 0 ? (totals.hired / totals.count) * 100 : 50;
  }

  const calibrated =
    !bin || bin.count < 15
      ? score * 0.6 + cachedGlobalHireRate * 0.4
      : (bin.hired / bin.count) * 100 * 0.7 + score * 0.3;

  return Math.round(clamp100(calibrated));
}
