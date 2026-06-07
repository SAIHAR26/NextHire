import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import { load as loadHtml } from "cheerio";
import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { predictRoles, getRoleSkills, retrainRoleModel } from "./ml/roleModel.js";
import { estimateHireProbability, retrainHireModel } from "./ml/hireModel.js";
import { recommendProjects, retrainProjectModel } from "./ml/projectModel.js";
import { scoreResumeReadiness } from "./ml/resumeModel.js";

dotenv.config({ path: new URL(".env", import.meta.url) });

// Warm up ML models at startup to avoid first-request timeouts.
try {
  retrainRoleModel();
  retrainHireModel();
  retrainProjectModel();
  getRoleSkills("Frontend");
} catch {
  // ignore warmup errors; model will lazily rebuild on demand
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 4000;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const GITHUB_CACHE_TTL_MS = 10 * 60 * 1000;
const PLATFORM_TIMEOUT_MS = 9000;
const contestCache = { contests: [], fetchedAt: 0 };
const hackathonCache = { hackathons: [], fetchedAt: 0 };
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const EMAIL_VERIFICATION_REQUIRED = process.env.EMAIL_VERIFICATION_REQUIRED !== "0";
const EMAIL_VERIFICATION_TTL_MS = Math.max(
  60_000,
  (parseInt(process.env.EMAIL_VERIFICATION_TTL_MIN || "10", 10) || 10) * 60_000
);
const EMAIL_VERIFICATION_COOLDOWN_MS = Math.max(
  15_000,
  (parseInt(process.env.EMAIL_VERIFICATION_COOLDOWN_SEC || "45", 10) || 45) * 1000
);
const EMAIL_VERIFY_JWT_SECRET = process.env.EMAIL_VERIFY_JWT_SECRET || JWT_SECRET;
const EMAIL_VERIFY_MAX_ATTEMPTS = 8;
const EMAIL_VERIFICATION_DEV_FALLBACK =
  String(process.env.EMAIL_VERIFICATION_DEV_FALLBACK || "").trim() === "1";

let dbClient;
let dbFailedAt = 0;
const memoryUsers = [];
const memoryAnalyses = [];
const memoryActivity = [];
const memoryProfiles = [];
const memoryEmailVerifications = [];
const githubCache = new Map();
let mailTransportPromise = null;

function sanitizeSlug(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function normalizeEmail(value = "") {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value = "") {
  return EMAIL_REGEX.test(normalizeEmail(value));
}

function createVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getMemoryVerification(email = "") {
  const safeEmail = normalizeEmail(email);
  return memoryEmailVerifications.find((entry) => entry.email === safeEmail) || null;
}

function upsertMemoryVerification(email = "", data = {}) {
  const safeEmail = normalizeEmail(email);
  const idx = memoryEmailVerifications.findIndex((entry) => entry.email === safeEmail);
  const next = { email: safeEmail, ...data };
  if (idx >= 0) {
    memoryEmailVerifications[idx] = { ...memoryEmailVerifications[idx], ...next };
    return memoryEmailVerifications[idx];
  }
  memoryEmailVerifications.push(next);
  return next;
}

function deleteMemoryVerification(email = "") {
  const safeEmail = normalizeEmail(email);
  const idx = memoryEmailVerifications.findIndex((entry) => entry.email === safeEmail);
  if (idx >= 0) memoryEmailVerifications.splice(idx, 1);
}

async function getMailTransport() {
  const host = String(process.env.SMTP_HOST || "").trim();
  const port = parseInt(process.env.SMTP_PORT || "587", 10) || 587;
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "").trim();
  if (!host || !user || !pass) return null;

  if (!mailTransportPromise) {
    mailTransportPromise = (async () => {
      try {
        const nodemailerMod = await import("nodemailer");
        const nodemailer = nodemailerMod?.default || nodemailerMod;
        const transporter = nodemailer.createTransport({
          host,
          port,
          secure: String(process.env.SMTP_SECURE || "0") === "1",
          auth: { user, pass },
        });
        await transporter.verify();
        return transporter;
      } catch {
        return null;
      }
    })();
  }
  return mailTransportPromise;
}

async function sendVerificationEmail({ email, code, name }) {
  const host = String(process.env.SMTP_HOST || "").trim();
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "").trim();
  const missing = [];
  if (!host) missing.push("SMTP_HOST");
  if (!user) missing.push("SMTP_USER");
  if (!pass) missing.push("SMTP_PASS");

  if (missing.length > 0) {
    if (EMAIL_VERIFICATION_DEV_FALLBACK) {
      return { ok: true, devCode: code, devMode: true };
    }
    return {
      ok: false,
      error: `Email service is not configured. Missing: ${missing.join(", ")} in server/.env.`,
    };
  }

  const transporter = await getMailTransport();
  if (!transporter) {
    if (EMAIL_VERIFICATION_DEV_FALLBACK) {
      return { ok: true, devCode: code, devMode: true };
    }
    return {
      ok: false,
      error: "SMTP auth/connection failed. Check SMTP_HOST/PORT, SMTP_USER, SMTP_PASS and restart backend.",
    };
  }
  const smtpUser = user;
  const from =
    String(process.env.SMTP_FROM || "").trim() ||
    (smtpUser ? `NextHire NoReply <${smtpUser}>` : "");
  if (!from) {
    return { ok: false, error: "SMTP_FROM or SMTP_USER is missing." };
  }

  try {
    await transporter.sendMail({
      from,
      to: email,
      subject: "NextHire Email Verification Code",
      text: `Hi ${name || "there"}, your NextHire verification code is ${code}. It expires in ${Math.round(
        EMAIL_VERIFICATION_TTL_MS / 60000
      )} minutes.`,
      html: `<p>Hi ${name || "there"},</p><p>Your <b>NextHire</b> verification code is:</p><h2 style="letter-spacing:2px;">${code}</h2><p>This code expires in ${Math.round(
        EMAIL_VERIFICATION_TTL_MS / 60000
      )} minutes.</p>`,
    });
    return { ok: true, devMode: false };
  } catch {
    return { ok: false, error: "Failed to send verification email." };
  }
}

function buildPublicUrl(req, slug) {
  if (!slug) return "";
  const originHeader = String(req.get("origin") || "").trim();
  const safeOrigin = originHeader && originHeader !== "null" ? originHeader : "";
  if (safeOrigin) {
    return `${safeOrigin.replace(/\/$/, "")}/public-profile.html?u=${encodeURIComponent(slug)}`;
  }
  const referer = String(req.get("referer") || "").trim();
  if (referer) {
    try {
      const url = new URL(referer);
      return `${url.origin}/public-profile.html?u=${encodeURIComponent(slug)}`;
    } catch {
      // fallback below
    }
  }
  const host = req.get("host") || `localhost:${PORT}`;
  const proto = req.protocol || "http";
  return `${proto}://${host}/public-profile.html?u=${encodeURIComponent(slug)}`;
}

function upsertMemoryProfile(userId, profileDoc) {
  const idx = memoryProfiles.findIndex((p) => p.userId === userId);
  if (idx >= 0) {
    memoryProfiles[idx] = { ...memoryProfiles[idx], ...profileDoc };
  } else {
    memoryProfiles.push({ userId, ...profileDoc });
  }
  return memoryProfiles.find((p) => p.userId === userId) || null;
}
async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;
  const now = Date.now();
  if (dbFailedAt && now - dbFailedAt < 30000) {
    return null;
  }
  if (!dbClient) {
    try {
      dbClient = new MongoClient(uri, {
        serverSelectionTimeoutMS: 3000,
        connectTimeoutMS: 3000,
      });
      await dbClient.connect();
    } catch {
      dbClient = null;
      dbFailedAt = now;
      return null;
    }
  }
  try {
    return dbClient.db();
  } catch {
    dbClient = null;
    dbFailedAt = now;
    return null;
  }
}

async function ensureActivityCollection(db) {
  if (!db) return false;
  try {
    const exists = await db
      .listCollections({ name: "NextHire" }, { nameOnly: true })
      .hasNext();
    if (exists) return true;
    await db.createCollection("NextHire", {
      timeseries: {
        timeField: "timestamp",
        metaField: "userId",
        granularity: "hours",
      },
      expireAfterSeconds: 60 * 60 * 24 * 365 * 2,
    });
    return true;
  } catch {
    return false;
  }
}

function sanitizeActivityLog(doc) {
  const ts = doc?.timestamp instanceof Date
    ? doc.timestamp.getTime()
    : new Date(doc?.timestamp || Date.now()).getTime();
  return {
    type: String(doc?.type || "event"),
    at: Number.isFinite(ts) ? ts : Date.now(),
    payload: doc?.payload && typeof doc.payload === "object" ? doc.payload : {},
    source: String(doc?.source || "web"),
    sessionId: String(doc?.sessionId || ""),
  };
}

function computeActivityStats(logs) {
  const safeLogs = Array.isArray(logs) ? logs : [];
  const dayMap = new Map();
  let firstLoginAt = 0;
  let lastLoginAt = 0;

  safeLogs.forEach((log) => {
    const at = Number(log?.at || 0);
    if (!at) return;
    const d = new Date(at);
    d.setHours(0, 0, 0, 0);
    const dayKey = d.toISOString().slice(0, 10);
    dayMap.set(dayKey, (dayMap.get(dayKey) || 0) + 1);
    if (log?.type === "login") {
      if (!firstLoginAt || at < firstLoginAt) firstLoginAt = at;
      if (!lastLoginAt || at > lastLoginAt) lastLoginAt = at;
    }
  });

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisWeekStart = new Date(now);
  thisWeekStart.setHours(0, 0, 0, 0);
  thisWeekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));

  let activeDaysThisMonth = 0;
  let activeDaysThisWeek = 0;
  dayMap.forEach((_, key) => {
    if (key.slice(0, 7) === thisMonth) activeDaysThisMonth += 1;
    const dayTs = new Date(`${key}T00:00:00Z`).getTime();
    if (Number.isFinite(dayTs) && dayTs >= thisWeekStart.getTime()) activeDaysThisWeek += 1;
  });

  return {
    totalEvents: safeLogs.length,
    activeDays: dayMap.size,
    activeDaysThisWeek,
    activeDaysThisMonth,
    firstLoginAt: firstLoginAt || null,
    lastLoginAt: lastLoginAt || null,
  };
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Missing auth token." });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token." });
  }
}

async function fetchGitHub(username) {
  if (!username) {
    return { repos: 0, stars: 0, languages: [], readmeQuality: "Unknown" };
  }

  // Accept "username", "@username", and full profile URLs.
  let normalized = String(username).trim();
  normalized = normalized.replace(/^@+/, "");
  normalized = normalized.replace(/^https?:\/\/(www\.)?github\.com\//i, "");
  normalized = normalized.split("/")[0];
  normalized = normalized.replace(/[^a-zA-Z0-9-]/g, "");

  if (!normalized) {
    return { repos: 0, stars: 0, languages: [], readmeQuality: "Unknown" };
  }

  const cacheKey = normalized.toLowerCase();
  const now = Date.now();
  const cached = githubCache.get(cacheKey);
  if (cached && now - cached.at < GITHUB_CACHE_TTL_MS) {
    return cached.value;
  }

  const baseHeaders = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "NextHireApp",
  };

  const withToken = GITHUB_TOKEN
    ? { ...baseHeaders, Authorization: `Bearer ${GITHUB_TOKEN}` }
    : baseHeaders;

  const withoutToken = baseHeaders;

  const request = async (headers) => {
    const [userRes, reposRes] = await Promise.all([
      axios.get(`https://api.github.com/users/${normalized}`, {
        headers,
        timeout: 10000,
      }),
      axios.get(`https://api.github.com/users/${normalized}/repos?per_page=100`, {
        headers,
        timeout: 10000,
      }),
    ]);
    return { userRes, reposRes };
  };

  let reposRes;
  try {
    ({ reposRes } = await request(withToken));
  } catch (err) {
    const status = err?.response?.status;
    // Fallback when token is invalid/rate-limited/forbidden.
    if (status === 401 || status === 403) {
      try {
        ({ reposRes } = await request(withoutToken));
      } catch (fallbackErr) {
        const fbStatus = fallbackErr?.response?.status;
        if (fbStatus === 404) throw new Error("GitHub user not found");
        if (fbStatus === 403) throw new Error("GitHub API rate limit exceeded");
        throw new Error("GitHub API request failed");
      }
    } else if (status === 404) {
      throw new Error("GitHub user not found");
    } else if (status === 429) {
      throw new Error("GitHub API rate limit exceeded");
    } else {
      throw new Error("GitHub API request failed");
    }
  }

  const repos = reposRes.data || [];
  const stars = repos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
  const languages = {};
  repos.forEach((repo) => {
    if (repo.language) languages[repo.language] = (languages[repo.language] || 0) + 1;
  });
  const topLanguages = Object.keys(languages)
    .sort((a, b) => languages[b] - languages[a])
    .slice(0, 4);

  const readmeQuality = repos.length >= 5 ? "Good" : "Low";

  const value = {
    repos: repos.length,
    stars,
    languages: topLanguages,
    readmeQuality,
    deployments: 0,
  };

  githubCache.set(cacheKey, { value, at: now });
  return value;
}

async function fetchLeetCode(username) {
  if (!username) {
    return {
      total: 0,
      easy: 0,
      medium: 0,
      hard: 0,
      rating: 0,
      rank: "-",
      contestsParticipated: 0,
    };
  }
  const query = `
    query userProfile($username: String!) {
      matchedUser(username: $username) {
        submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
          }
        }
        profile {
          ranking
        }
      }
      userContestRanking(username: $username) {
        rating
        attendedContestsCount
      }
      userContestRankingHistory(username: $username) {
        attended
        ranking
        rating
        problemsSolved
        totalProblems
      }
    }
  `;
  const res = await axios.post(
    "https://leetcode.com/graphql",
    {
      query,
      variables: { username },
    },
    { timeout: PLATFORM_TIMEOUT_MS }
  );
  const stats = res.data?.data?.matchedUser?.submitStatsGlobal?.acSubmissionNum;
  const ranking = res.data?.data?.matchedUser?.profile?.ranking ?? "-";
  const rating = res.data?.data?.userContestRanking?.rating ?? 0;
  const attendedFromRanking =
    res.data?.data?.userContestRanking?.attendedContestsCount ?? 0;
  const history = Array.isArray(res.data?.data?.userContestRankingHistory)
    ? res.data.data.userContestRankingHistory
    : [];
  const attendedFromHistory = history.filter((h) => Boolean(h?.attended)).length;
  const attendedFromHistoryStats = history.filter((h) => {
    const ranking = Number(h?.ranking) || 0;
    const rating = Number(h?.rating) || 0;
    const solved = Number(h?.problemsSolved) || 0;
    const total = Number(h?.totalProblems) || 0;
    return ranking > 0 || rating > 0 || solved > 0 || total > 0;
  }).length;
  const contestsParticipated = Math.max(
    Number(attendedFromRanking) || 0,
    Number(attendedFromHistory) || 0,
    Number(attendedFromHistoryStats) || 0
  );

  const counts = { Easy: 0, Medium: 0, Hard: 0, All: 0 };
  if (Array.isArray(stats)) {
    stats.forEach((item) => {
      counts[item.difficulty] = item.count;
    });
  }

  return {
    total: counts.All || 0,
    easy: counts.Easy || 0,
    medium: counts.Medium || 0,
    hard: counts.Hard || 0,
    rating: Math.round(rating),
    rank: ranking,
    contestsParticipated: Number(contestsParticipated) || 0,
  };
}

async function fetchCodeChef(username) {
  if (!username) {
    return { stars: 0, rank: "-", solved: 0, contestsParticipated: 0 };
  }
  const normalize = (value) => (Number.isFinite(value) ? value : 0);
  const pickNumber = (value) => {
    if (value === null || value === undefined) return null;
    const num = parseInt(String(value).replace(/,/g, ""), 10);
    return Number.isFinite(num) ? num : null;
  };
  const extractContestCountFromText = (text = "") => {
    const patterns = [
      /"contestCount"\s*:\s*"?(\d[\d,]*)"?/i,
      /"contestsParticipated"\s*:\s*"?(\d[\d,]*)"?/i,
      /"contests"\s*:\s*"?(\d[\d,]*)"?/i,
      /contest(?:s)?\s*participated\s*[:\-]?\s*([\d,]+)/i,
      /total\s*contests\s*[:\-]?\s*([\d,]+)/i,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        const num = parseInt(String(match[1]).replace(/,/g, ""), 10);
        if (Number.isFinite(num)) return num;
      }
    }
    return 0;
  };
  const pickSolvedFromObject = (obj) => {
    if (!obj || typeof obj !== "object") return 0;
    const keys = [
      "problemsSolved",
      "totalSolved",
      "fullySolved",
      "fully_solved",
      "solved",
      "solvedCount",
      "total_solved",
    ];
    for (const key of keys) {
      if (obj[key] !== undefined) {
        const num = pickNumber(obj[key]);
        if (num !== null) return num;
      }
    }
    const found = Object.entries(obj)
      .filter(([k]) => /solved/i.test(k))
      .map(([, v]) => pickNumber(v))
      .filter((v) => v !== null);
    return found.length ? Math.max(...found) : 0;
  };
  const pickRankFromObject = (obj) => {
    if (!obj || typeof obj !== "object") return "-";
    const keys = ["globalRank", "global_rank", "rank"];
    for (const key of keys) {
      if (obj[key] !== undefined) {
        const num = pickNumber(obj[key]);
        if (num !== null) return num;
      }
    }
    return "-";
  };
  try {
    const profileUrl = `https://www.codechef.com/users/${username}`;
    const res = await axios.get(profileUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 8000,
    });
    const $ = loadHtml(res.data);
    const pageText = $.text();

    const starsRaw =
      $(".rating-star").first().text().trim() ||
      $(".rating-number").first().text().trim();
    let stars = 0;
    if (starsRaw.includes("★")) {
      stars = starsRaw.split("★").length - 1;
    } else {
      stars = parseInt(starsRaw, 10) || 0;
    }

    const rankCandidate = $(".rating-ranks strong")
      .map((_, el) => $(el).text().trim())
      .get()
      .find((text) => /\d/.test(text));
    const rankText = (rankCandidate || "").replace(/,/g, "");
    const rank = rankText ? parseInt(rankText, 10) : "-";

    const solvedText =
      $(".problems-solved h5").text() || $(".content h5").text();
    const solvedMatch =
      solvedText.match(/\((\d+)\)/) ||
      pageText.match(/Total Problems Solved:\s*([\d,]+)/i);
    const solved = solvedMatch ? parseInt(solvedMatch[1].replace(/,/g, ""), 10) : 0;
    const contestsParticipated = extractContestCountFromText(res.data) || extractContestCountFromText(pageText);

    let rankFromText = rank;
    if (rank === "-" && pageText) {
      const rankTextMatch = pageText.match(/Global Rank:\s*([\d,]+)/i);
      if (rankTextMatch) {
        rankFromText = parseInt(rankTextMatch[1].replace(/,/g, ""), 10);
      }
    }

    if (stars || solved || rankFromText !== "-") {
      return {
        stars: normalize(stars),
        rank: rankFromText,
        solved: normalize(solved),
        contestsParticipated: normalize(contestsParticipated),
      };
    }
  } catch {
    // fall through to API fallback
  }

  try {
    const apiRes = await axios.get(
      `https://cp-rating-api.vercel.app/codechef/${username}`,
      { timeout: 8000 }
    );
    const data = apiRes.data || {};
    const stars = parseInt(data.stars, 10) || 0;
    const solved = pickSolvedFromObject(data);
    const rank = pickRankFromObject(data);
    const contestsParticipated =
      pickNumber(data.contests) ||
      pickNumber(data.contestsParticipated) ||
      pickNumber(data.contest_count) ||
      pickNumber(data.contestCount) ||
      0;
    return {
      stars: normalize(stars),
      rank,
      solved: normalize(solved),
      contestsParticipated: normalize(contestsParticipated),
    };
  } catch {
    // fall through to secondary API fallback
  }

  try {
    const apiRes = await axios.get(
      `https://competitive-coding-api.herokuapp.com/api/codechef/${username}`,
      { timeout: 8000 }
    );
    const data = apiRes.data || {};
    const stars = parseInt(data.stars, 10) || 0;
    const solved = pickSolvedFromObject(data);
    const rank = pickRankFromObject(data);
    const contestsParticipated =
      pickNumber(data.contests) ||
      pickNumber(data.contestsParticipated) ||
      pickNumber(data.contest_count) ||
      pickNumber(data.contestCount) ||
      0;
    return {
      stars: normalize(stars),
      rank,
      solved: normalize(solved),
      contestsParticipated: normalize(contestsParticipated),
    };
  } catch {
    // fall through to tertiary API fallback
  }

  try {
    const apiRes = await axios.get(
      `https://codechef-api.vercel.app/handle/${username}`,
      { timeout: 8000 }
    );
    const body = apiRes.data || {};
    const data = Array.isArray(body) ? body[0] : body;
    const stars = parseInt(data.stars, 10) || 0;
    const solved = pickSolvedFromObject(data);
    const rank = pickRankFromObject(data);
    const contestsParticipated =
      pickNumber(data.contests) ||
      pickNumber(data.contestsParticipated) ||
      pickNumber(data.contest_count) ||
      pickNumber(data.contestCount) ||
      0;
    return {
      stars: normalize(stars),
      rank,
      solved: normalize(solved),
      contestsParticipated: normalize(contestsParticipated),
    };
  } catch {
    return {
      stars: 0,
      rank: "-",
      solved: 0,
      contestsParticipated: 0,
      warning: "CodeChef unavailable",
    };
  }
}

async function fetchHackerRank(username) {
  if (!username) {
    return { badges: 0, certs: 0, badgeDetails: [], certDetails: [] };
  }
  const safeUser = encodeURIComponent(username.trim());
  const badgeDetails = [];
  const certDetails = [];

  try {
    const badgeRes = await axios.get(
      `https://www.hackerrank.com/rest/hackers/${safeUser}/badges`,
      {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
        timeout: PLATFORM_TIMEOUT_MS,
      }
    );
    const models = Array.isArray(badgeRes.data?.models) ? badgeRes.data.models : [];
    models.forEach((row) => {
      const name = row.badge_name || row.name || row.topic || row.subject || "Badge";
      const stars =
        Number(row.stars) ||
        Number(row.stars_count) ||
        Number(row.star_count) ||
        0;
      const level =
        row.grade ||
        row.level ||
        row.medal ||
        (stars > 0 ? `${stars} star` : "Earned");
      badgeDetails.push({
        name: String(name),
        level: String(level),
        stars: Number(stars) || 0,
        solved: Number(row.solved) || 0,
        totalChallenges: Number(row.total_challenges) || 0,
        url: row.url ? `https://www.hackerrank.com${row.url}` : "",
      });
    });
  } catch {
    // continue with HTML fallback
  }

  try {
    const certRes = await axios.get(
      `https://www.hackerrank.com/rest/hackers/${safeUser}/certificates`,
      {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
        timeout: PLATFORM_TIMEOUT_MS,
      }
    );
    const models = Array.isArray(certRes.data?.models) ? certRes.data.models : [];
    models.forEach((row) => {
      const name =
        row.name || row.certificate_name || row.title || row.skill_name || "Certificate";
      const url =
        row.url || row.certificate_url || row.permalink || row.short_url || "";
      certDetails.push({
        name: String(name),
        url: String(url),
      });
    });
  } catch {
    // continue with HTML fallback
  }

  if (!badgeDetails.length || !certDetails.length) {
    try {
      const profileUrl = `https://www.hackerrank.com/${safeUser}`;
      const res = await axios.get(profileUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
        timeout: PLATFORM_TIMEOUT_MS,
      });
      const $ = loadHtml(res.data);

      if (!badgeDetails.length) {
        const htmlBadges = $(".badge-title")
          .map((_, el) => $(el).text().trim())
          .get()
          .filter(Boolean)
          .slice(0, 10)
          .map((name) => ({ name, level: "Earned", stars: 0, solved: 0, totalChallenges: 0, url: "" }));
        badgeDetails.push(...htmlBadges);
      }

      if (!certDetails.length) {
        const htmlCerts = $("a[href*='certificate'], a[href*='certificates']")
          .map((_, el) => {
            const name = $(el).text().trim() || "HackerRank Certificate";
            const href = $(el).attr("href") || "";
            const url = href.startsWith("http")
              ? href
              : href
                ? `https://www.hackerrank.com${href}`
                : "";
            return { name, url };
          })
          .get()
          .filter((row) => row.name)
          .slice(0, 8);
        certDetails.push(...htmlCerts);
      }
    } catch {
      // if HTML also fails, keep what we have
    }
  }

  return {
    badges: badgeDetails.length,
    certs: certDetails.length,
    badgeDetails: badgeDetails.slice(0, 12),
    certDetails: certDetails.slice(0, 8),
  };
}

function buildAchievements({ leetcode, codechef, github, hackerrank }) {
  const items = [];

  (hackerrank?.badgeDetails || []).forEach((badge) => {
    items.push({
      platform: "HackerRank",
      type: "Badge",
      title: badge.name || "Badge",
      detail:
        badge.stars || badge.solved
          ? `${badge.stars ? `${badge.stars} star` : "Earned"}${badge.solved ? ` | Solved ${badge.solved}` : ""}`
          : badge.level || "Earned",
      url: badge.url || "",
    });
  });

  (hackerrank?.certDetails || []).forEach((cert) => {
    items.push({
      platform: "HackerRank",
      type: "Certificate",
      title: cert.name || "Certificate",
      detail: "Verified",
      url: cert.url || "",
    });
  });

  if ((leetcode?.total || 0) > 0) {
    items.push({
      platform: "LeetCode",
      type: "Solved",
      title: `${leetcode.total} problems solved`,
      detail: `Easy ${leetcode.easy || 0} | Medium ${leetcode.medium || 0} | Hard ${leetcode.hard || 0}`,
    });
  }
  if ((leetcode?.rating || 0) > 0) {
    items.push({
      platform: "LeetCode",
      type: "Contest",
      title: `Contest rating ${leetcode.rating}`,
      detail: `Rank ${leetcode.rank || "-"}`,
    });
  }

  if ((codechef?.stars || 0) > 0) {
    items.push({
      platform: "CodeChef",
      type: "Rating",
      title: `${codechef.stars} star profile`,
      detail: `Solved ${codechef.solved || 0} | Rank ${codechef.rank || "-"}`,
    });
  }

  if ((github?.repos || 0) > 0) {
    items.push({
      platform: "GitHub",
      type: "Portfolio",
      title: `${github.repos} public repositories`,
      detail: `${github.stars || 0} stars | ${(github.languages || []).join(", ") || "No language data"}`,
    });
  }

  return items.slice(0, 18);
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/ml/train-career-engine", authMiddleware, (req, res) => {
  try {
    const roleStats = retrainRoleModel();
    const hireStats = retrainHireModel();
    const projectStats = retrainProjectModel();
    return res.json({
      ok: true,
      trainedAt: new Date().toISOString(),
      models: {
        roleModel: roleStats,
        hireModel: hireStats,
        projectModel: projectStats,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Career engine training failed." });
  }
});

app.post("/api/auth/verification/request", async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const email = normalizeEmail(req.body?.email || "");
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }

  const db = await getDb();
  let exists = false;
  if (db) {
    try {
      const existing = await db.collection("users").findOne({ email });
      exists = Boolean(existing);
    } catch {
      dbClient = null;
      dbFailedAt = Date.now();
    }
  } else {
    exists = memoryUsers.some((u) => normalizeEmail(u.email) === email);
  }
  if (exists) return res.status(409).json({ error: "Email already in use." });

  let existingVerification = null;
  if (db) {
    try {
      existingVerification = await db.collection("email_verifications").findOne({ email });
    } catch {
      existingVerification = null;
    }
  }
  if (!existingVerification) existingVerification = getMemoryVerification(email);

  const now = Date.now();
  const lastRequestedAt = new Date(existingVerification?.requestedAt || 0).getTime();
  const waitMs = EMAIL_VERIFICATION_COOLDOWN_MS - (now - lastRequestedAt);
  if (waitMs > 0) {
    return res.status(429).json({
      error: `Please wait ${Math.ceil(waitMs / 1000)} seconds before requesting another code.`,
    });
  }

  const code = createVerificationCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);
  const doc = {
    email,
    name,
    codeHash,
    verified: false,
    attempts: 0,
    requestedAt: new Date(),
    expiresAt,
  };

  if (db) {
    try {
      await db.collection("email_verifications").updateOne(
        { email },
        { $set: doc },
        { upsert: true }
      );
    } catch {
      dbClient = null;
      dbFailedAt = Date.now();
      upsertMemoryVerification(email, doc);
    }
  } else {
    upsertMemoryVerification(email, doc);
  }

  const sent = await sendVerificationEmail({ email, code, name });
  if (!sent.ok) {
    return res.status(503).json({ error: sent.error || "Verification email failed." });
  }

  return res.json({
    ok: true,
    message: sent.devMode
      ? "Dev mode active: verification code generated locally."
      : "Verification code sent to your email.",
    expiresInSec: Math.floor(EMAIL_VERIFICATION_TTL_MS / 1000),
    devMode: Boolean(sent.devMode),
    devCode: sent.devCode ? String(sent.devCode) : undefined,
  });
});

app.post("/api/auth/verification/confirm", async (req, res) => {
  const email = normalizeEmail(req.body?.email || "");
  const code = String(req.body?.code || "").trim();
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: "Enter the 6-digit verification code." });
  }

  const db = await getDb();
  let verification = null;
  let fromDb = false;
  if (db) {
    try {
      verification = await db.collection("email_verifications").findOne({ email });
      fromDb = Boolean(verification);
    } catch {
      dbClient = null;
      dbFailedAt = Date.now();
    }
  }
  if (!verification) verification = getMemoryVerification(email);
  if (!verification) {
    return res.status(404).json({ error: "No verification request found for this email." });
  }

  if (new Date(verification.expiresAt).getTime() < Date.now()) {
    if (fromDb && db) {
      try {
        await db.collection("email_verifications").deleteOne({ email });
      } catch {
        // ignore
      }
    }
    deleteMemoryVerification(email);
    return res.status(410).json({ error: "Verification code expired. Request a new code." });
  }

  if (Number(verification.attempts || 0) >= EMAIL_VERIFY_MAX_ATTEMPTS) {
    return res.status(429).json({ error: "Too many wrong attempts. Request a new code." });
  }

  const isMatch = await bcrypt.compare(code, String(verification.codeHash || ""));
  if (!isMatch) {
    const nextAttempts = Number(verification.attempts || 0) + 1;
    if (fromDb && db) {
      try {
        await db.collection("email_verifications").updateOne(
          { email },
          { $set: { attempts: nextAttempts } }
        );
      } catch {
        // ignore
      }
    }
    upsertMemoryVerification(email, { attempts: nextAttempts });
    return res.status(401).json({ error: "Incorrect verification code." });
  }

  const verifiedAt = Date.now();
  const verifyToken = jwt.sign(
    { type: "email_verify", email, verifiedAt },
    EMAIL_VERIFY_JWT_SECRET,
    { expiresIn: "30m" }
  );

  if (fromDb && db) {
    try {
      await db.collection("email_verifications").updateOne(
        { email },
        { $set: { verified: true, verifiedAt: new Date(verifiedAt), attempts: Number(verification.attempts || 0) } }
      );
    } catch {
      // ignore
    }
  }
  upsertMemoryVerification(email, { verified: true, verifiedAt: new Date(verifiedAt) });

  return res.json({ ok: true, verifyToken });
});

app.post("/api/auth/signup", async (req, res) => {
  const { name, password, verifyToken } = req.body || {};
  const roleRaw = String(req.body?.role || "candidate").toLowerCase();
  const role = roleRaw === "recruiter" ? "recruiter" : "candidate";
  const email = normalizeEmail(req.body?.email || "");
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, password required." });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }
  if (EMAIL_VERIFICATION_REQUIRED) {
    if (!verifyToken) {
      return res.status(400).json({ error: "Verify your email before creating account." });
    }
    try {
      const decoded = jwt.verify(String(verifyToken), EMAIL_VERIFY_JWT_SECRET);
      if (decoded?.type !== "email_verify" || normalizeEmail(decoded?.email) !== email) {
        return res.status(400).json({ error: "Email verification is invalid for this email." });
      }
    } catch {
      return res.status(400).json({ error: "Email verification expired. Verify again." });
    }
  }
  const db = await getDb();
  if (!db) {
    const exists = memoryUsers.find((u) => normalizeEmail(u.email) === email);
    if (exists) return res.status(409).json({ error: "Email already in use." });
    const passwordHash = await bcrypt.hash(password, 10);
    memoryUsers.push({
      id: `mem_${Date.now()}`,
      name,
      role,
      email,
      passwordHash,
      createdAt: new Date(),
    });
    deleteMemoryVerification(email);
    return res.json({ ok: true, storage: "memory" });
  }
  try {
    const existing = await db.collection("users").findOne({ email });
    if (existing) return res.status(409).json({ error: "Email already in use." });
    const passwordHash = await bcrypt.hash(password, 10);
    await db.collection("users").insertOne({
      name,
      role,
      email,
      passwordHash,
      createdAt: new Date(),
    });
    await db.collection("email_verifications").deleteOne({ email }).catch(() => null);
    deleteMemoryVerification(email);
    return res.json({ ok: true });
  } catch {
    dbClient = null;
    dbFailedAt = Date.now();
    const exists = memoryUsers.find((u) => normalizeEmail(u.email) === email);
    if (exists) return res.status(409).json({ error: "Email already in use." });
    const passwordHash = await bcrypt.hash(password, 10);
    memoryUsers.push({
      id: `mem_${Date.now()}`,
      name,
      role,
      email,
      passwordHash,
      createdAt: new Date(),
    });
    deleteMemoryVerification(email);
    return res.json({ ok: true, storage: "memory" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const email = normalizeEmail(req.body?.email || "");
  const { password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required." });
  }
  const db = await getDb();
  if (!db) {
    const user = memoryUsers.find((u) => normalizeEmail(u.email) === email);
    if (!user) return res.status(401).json({ error: "Invalid credentials." });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials." });
    const token = jwt.sign({ id: user.id, email }, JWT_SECRET, {
      expiresIn: "7d",
    });
    return res.json({ token, name: user.name, role: user.role || "candidate", storage: "memory" });
  }
  try {
    const user = await db.collection("users").findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials." });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials." });
    const token = jwt.sign({ id: user._id.toString(), email }, JWT_SECRET, {
      expiresIn: "7d",
    });
    return res.json({ token, name: user.name, role: user.role || "candidate" });
  } catch {
    dbClient = null;
    dbFailedAt = Date.now();
    const user = memoryUsers.find((u) => normalizeEmail(u.email) === email);
    if (!user) return res.status(401).json({ error: "Invalid credentials." });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials." });
    const token = jwt.sign({ id: user.id, email }, JWT_SECRET, {
      expiresIn: "7d",
    });
    return res.json({ token, name: user.name, role: user.role || "candidate", storage: "memory" });
  }
});

app.get("/api/profile", authMiddleware, async (req, res) => {
  const db = await getDb();
  if (!db) {
    const mem = memoryProfiles.find((p) => p.userId === req.user?.id) || null;
    if (!mem) return res.json({ profile: null, storage: "memory" });
    return res.json({
      profile: {
        userId: mem.userId,
        profile: mem.profile || {},
        isPublic: mem?.isPublic !== false,
        publicSlug: mem.publicSlug || "",
        publicUrl: mem?.isPublic !== false && mem.publicSlug ? buildPublicUrl(req, mem.publicSlug) : "",
        updatedAt: mem.updatedAt || null,
      },
      storage: "memory",
    });
  }
  try {
    const profile = await db.collection("profiles").findOne({ userId: req.user?.id });
    if (!profile) return res.json({ profile: null });
    return res.json({
      profile: {
        ...profile,
        isPublic: profile?.isPublic !== false,
        publicSlug: profile?.publicSlug || "",
        publicUrl: profile?.isPublic !== false && profile?.publicSlug ? buildPublicUrl(req, profile.publicSlug) : "",
      },
    });
  } catch {
    dbClient = null;
    dbFailedAt = Date.now();
    const mem = memoryProfiles.find((p) => p.userId === req.user?.id) || null;
    if (!mem) return res.json({ profile: null, storage: "memory" });
    return res.json({
      profile: {
        userId: mem.userId,
        profile: mem.profile || {},
        isPublic: mem?.isPublic !== false,
        publicSlug: mem.publicSlug || "",
        publicUrl: mem?.isPublic !== false && mem.publicSlug ? buildPublicUrl(req, mem.publicSlug) : "",
        updatedAt: mem.updatedAt || null,
      },
      storage: "memory",
    });
  }
});

app.put("/api/profile", authMiddleware, async (req, res) => {
  const { profile = {} } = req.body || {};
  const requestedPublic = profile?.isPublic === undefined ? true : Boolean(profile?.isPublic);
  const incomingSlug = sanitizeSlug(profile?.publicSlug || "");
  const profileToStore = { ...profile };
  delete profileToStore.isPublic;
  delete profileToStore.publicSlug;
  delete profileToStore.publicUrl;

  let existingSlug = "";
  const db = await getDb();
  if (db) {
    try {
      const existing = await db.collection("profiles").findOne({ userId: req.user?.id });
      existingSlug = sanitizeSlug(existing?.publicSlug || "");
      const defaultSlug = sanitizeSlug(`user-${String(req.user?.id || "")}`);
      const publicSlug = incomingSlug || existingSlug || defaultSlug;

      await db.collection("profiles").updateOne(
        { userId: req.user?.id },
        {
          $set: {
            userId: req.user?.id,
            profile: profileToStore,
            isPublic: requestedPublic,
            publicSlug,
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
      return res.json({
        ok: true,
        isPublic: requestedPublic,
        publicSlug,
        publicUrl: requestedPublic ? buildPublicUrl(req, publicSlug) : "",
      });
    } catch {
      dbClient = null;
      dbFailedAt = Date.now();
    }
  }

  const existingMem = memoryProfiles.find((p) => p.userId === req.user?.id) || null;
  const defaultSlug = sanitizeSlug(`user-${String(req.user?.id || "")}`);
  const publicSlug =
    incomingSlug ||
    sanitizeSlug(existingMem?.publicSlug || "") ||
    existingSlug ||
    defaultSlug;
  upsertMemoryProfile(req.user?.id, {
    profile: profileToStore,
    isPublic: requestedPublic,
    publicSlug,
    updatedAt: new Date(),
  });
  return res.json({
    ok: true,
    isPublic: requestedPublic,
    publicSlug,
    publicUrl: requestedPublic ? buildPublicUrl(req, publicSlug) : "",
    storage: "memory",
  });
});

app.put("/api/profile/visibility", authMiddleware, async (req, res) => {
  const requestedPublic = req.body?.isPublic === undefined ? true : Boolean(req.body?.isPublic);
  const incomingSlug = sanitizeSlug(req.body?.publicSlug || "");

  let existingSlug = "";
  const db = await getDb();
  if (db) {
    try {
      const existing = await db.collection("profiles").findOne({ userId: req.user?.id });
      existingSlug = sanitizeSlug(existing?.publicSlug || "");
      const defaultSlug = sanitizeSlug(`user-${String(req.user?.id || "")}`);
      const publicSlug = incomingSlug || existingSlug || defaultSlug;

      await db.collection("profiles").updateOne(
        { userId: req.user?.id },
        {
          $set: {
            userId: req.user?.id,
            isPublic: requestedPublic,
            publicSlug,
            updatedAt: new Date(),
          },
          $setOnInsert: { profile: {} },
        },
        { upsert: true }
      );

      return res.json({
        ok: true,
        isPublic: requestedPublic,
        publicSlug,
        publicUrl: requestedPublic ? buildPublicUrl(req, publicSlug) : "",
      });
    } catch {
      dbClient = null;
      dbFailedAt = Date.now();
    }
  }

  const existingMem = memoryProfiles.find((p) => p.userId === req.user?.id) || null;
  const defaultSlug = sanitizeSlug(`user-${String(req.user?.id || "")}`);
  const publicSlug = incomingSlug || sanitizeSlug(existingMem?.publicSlug || "") || existingSlug || defaultSlug;
  upsertMemoryProfile(req.user?.id, {
    profile: existingMem?.profile || {},
    isPublic: requestedPublic,
    publicSlug,
    updatedAt: new Date(),
  });
  return res.json({
    ok: true,
    isPublic: requestedPublic,
    publicSlug,
    publicUrl: requestedPublic ? buildPublicUrl(req, publicSlug) : "",
    storage: "memory",
  });
});

app.get("/api/profile/public/:slug", async (req, res) => {
  const slug = sanitizeSlug(req.params?.slug || "");
  if (!slug) return res.status(400).json({ error: "Invalid profile link." });
  const db = await getDb();
  if (!db) {
    const mem = memoryProfiles.find((p) => sanitizeSlug(p?.publicSlug || "") === slug && Boolean(p?.isPublic));
    if (!mem) return res.status(404).json({ error: "Public profile not found." });
    return res.json({
      name: "User",
      publicSlug: slug,
      profile: mem.profile || {},
      metrics: null,
      updatedAt: mem.updatedAt || null,
      storage: "memory",
    });
  }
  try {
    const profileDoc = await db.collection("profiles").findOne({ publicSlug: slug, isPublic: true });
    if (!profileDoc) return res.status(404).json({ error: "Public profile not found." });
    let user = null;
    try {
      user = await db
        .collection("users")
        .findOne({ _id: new ObjectId(profileDoc.userId) }, { projection: { name: 1 } });
    } catch {
      user = null;
    }
    const latestAnalysis = await db
      .collection("analyses")
      .find({ userId: profileDoc.userId })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();
    const payload = latestAnalysis?.[0]?.payload || null;
    return res.json({
      name: user?.name || "User",
      publicSlug: slug,
      profile: profileDoc.profile || {},
      metrics: payload
        ? {
            jobReadiness: Number(payload?.ml?.readiness || 0) || 0,
            profileStrength: Number(payload?.ml?.profileStrength || 0) || 0,
            hireProbability: Number(payload?.ml?.hireProbability || 0) || 0,
            leetcodeSolved: Number(payload?.leetcode?.total || 0) || 0,
            codechefSolved: Number(payload?.codechef?.solved || 0) || 0,
            githubRepos: Number(payload?.github?.repos || 0) || 0,
          }
        : null,
      updatedAt: profileDoc.updatedAt || null,
    });
  } catch {
    dbClient = null;
    dbFailedAt = Date.now();
    return res.status(503).json({ error: "Public profile unavailable right now." });
  }
});

app.get("/api/weekly", authMiddleware, async (req, res) => {
  const db = await getDb();
  if (!db) return res.json({ weekly: null, storage: "memory" });
  try {
    const weekly = await db.collection("weekly").findOne({ userId: req.user?.id });
    return res.json({ weekly: weekly || null });
  } catch {
    dbClient = null;
    dbFailedAt = Date.now();
    return res.json({ weekly: null, storage: "memory" });
  }
});

app.put("/api/weekly", authMiddleware, async (req, res) => {
  const { weekly = {} } = req.body || {};
  const db = await getDb();
  if (!db) return res.json({ ok: true, storage: "memory" });
  try {
    await db.collection("weekly").updateOne(
      { userId: req.user?.id },
      { $set: { userId: req.user?.id, ...weekly, updatedAt: new Date() } },
      { upsert: true }
    );
    return res.json({ ok: true });
  } catch {
    dbClient = null;
    dbFailedAt = Date.now();
    return res.json({ ok: true, storage: "memory" });
  }
});

app.post("/api/activity/log", authMiddleware, async (req, res) => {
  const { type = "event", payload = {}, at = null, sessionId = "", source = "web" } = req.body || {};
  const eventType = String(type || "").trim();
  if (!eventType) {
    return res.status(400).json({ error: "Activity type is required." });
  }

  const timestamp = at ? new Date(at) : new Date();
  if (Number.isNaN(timestamp.getTime())) {
    return res.status(400).json({ error: "Invalid activity timestamp." });
  }

  const doc = {
    userId: req.user?.id,
    timestamp,
    type: eventType,
    payload: payload && typeof payload === "object" ? payload : {},
    sessionId: String(sessionId || ""),
    source: String(source || "web"),
    createdAt: new Date(),
  };

  const db = await getDb();
  if (db) {
    try {
      await ensureActivityCollection(db);
      await db.collection("NextHire").insertOne(doc);
      return res.json({ ok: true, log: sanitizeActivityLog(doc) });
    } catch {
      dbClient = null;
      dbFailedAt = Date.now();
    }
  }

  memoryActivity.push(doc);
  if (memoryActivity.length > 10000) {
    memoryActivity.splice(0, memoryActivity.length - 10000);
  }
  return res.json({ ok: true, log: sanitizeActivityLog(doc), storage: "memory" });
});

app.get("/api/activity/logs", authMiddleware, async (req, res) => {
  const limitRaw = parseInt(String(req.query?.limit || "2000"), 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 5000) : 2000;
  const from = req.query?.from ? new Date(String(req.query.from)) : null;
  const to = req.query?.to ? new Date(String(req.query.to)) : null;
  const hasFrom = from instanceof Date && !Number.isNaN(from.getTime());
  const hasTo = to instanceof Date && !Number.isNaN(to.getTime());

  const query = { userId: req.user?.id };
  if (hasFrom || hasTo) {
    query.timestamp = {};
    if (hasFrom) query.timestamp.$gte = from;
    if (hasTo) query.timestamp.$lte = to;
  }

  const db = await getDb();
  if (db) {
    try {
      await ensureActivityCollection(db);
      const docs = await db
        .collection("NextHire")
        .find(query)
        .sort({ timestamp: 1 })
        .limit(limit)
        .toArray();
      const logs = docs.map(sanitizeActivityLog);
      return res.json({ logs, stats: computeActivityStats(logs) });
    } catch {
      dbClient = null;
      dbFailedAt = Date.now();
    }
  }

  const logs = memoryActivity
    .filter((doc) => {
      if (doc?.userId !== req.user?.id) return false;
      const ts = new Date(doc?.timestamp || 0).getTime();
      if (!Number.isFinite(ts)) return false;
      if (hasFrom && ts < from.getTime()) return false;
      if (hasTo && ts > to.getTime()) return false;
      return true;
    })
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .slice(-limit)
    .map(sanitizeActivityLog);

  return res.json({ logs, stats: computeActivityStats(logs), storage: "memory" });
});

function clampScore(value) {
  const n = Number(value) || 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function buildRankEntry(analysisDoc, userName = "User", visibility = null) {
  const payload = analysisDoc?.payload || {};
  const ml = payload?.ml || {};
  const leet = payload?.leetcode || {};
  const cc = payload?.codechef || {};
  const gh = payload?.github || {};

  const jobReadiness = clampScore(ml?.readiness);
  const profileStrength = clampScore(ml?.profileStrength);
  const hireProbability = clampScore(ml?.hireProbability);
  const totalPrograms =
    Math.max(0, Number(leet?.total) || 0) + Math.max(0, Number(cc?.solved) || 0);
  const leetcodeSolved = Math.max(0, Number(leet?.total) || 0);
  const codechefSolved = Math.max(0, Number(cc?.solved) || 0);
  const projectsDone = Math.max(0, Number(gh?.repos) || 0);
  const contestsDone =
    Math.max(0, Number(leet?.contestsParticipated) || 0) +
    Math.max(0, Number(cc?.contestsParticipated) || 0);

  const programScore = clampScore(Math.sqrt(totalPrograms) * 5);
  const projectScore = clampScore(projectsDone * 10);
  const contestScore = clampScore(contestsDone * 4);

  const rankScore = clampScore(
    jobReadiness * 0.35 +
      profileStrength * 0.2 +
      hireProbability * 0.2 +
      programScore * 0.15 +
      projectScore * 0.05 +
      contestScore * 0.05
  );

  return {
    userId: String(analysisDoc?.userId || ""),
    name: String(userName || "User"),
    isPublic: visibility?.isPublic !== false,
    publicSlug: String(visibility?.publicSlug || ""),
    publicUrl:
      visibility?.isPublic !== false && visibility?.publicSlug
        ? `/public-profile.html?u=${encodeURIComponent(String(visibility.publicSlug || ""))}`
        : "",
    rankScore,
    jobReadiness,
    profileStrength,
    hireProbability,
    roleFit: String(ml?.ranked?.[0]?.role || "-"),
    leetcodeSolved,
    codechefSolved,
    publicBasics: {
      role: String(visibility?.role || ""),
      skills: Array.isArray(visibility?.skills) ? visibility.skills.slice(0, 8) : [],
      profileImage: String(visibility?.profileImage || ""),
    },
    totalPrograms,
    projectsDone,
    contestsDone,
    updatedAt:
      analysisDoc?.createdAt instanceof Date
        ? analysisDoc.createdAt.toISOString()
        : new Date(analysisDoc?.createdAt || Date.now()).toISOString(),
  };
}

app.get("/api/rankings", authMiddleware, async (req, res) => {
  const query = String(req.query?.q || "").trim().toLowerCase();
  const limitRaw = parseInt(String(req.query?.limit || "200"), 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 200;

  const db = await getDb();
  if (db) {
    try {
      const [latestAnalyses, users, profiles] = await Promise.all([
        db
          .collection("analyses")
          .aggregate([
            { $sort: { createdAt: -1 } },
            {
              $group: {
                _id: "$userId",
                userId: { $first: "$userId" },
                createdAt: { $first: "$createdAt" },
                payload: { $first: "$payload" },
              },
            },
          ])
          .toArray(),
        db.collection("users").find({}, { projection: { name: 1 } }).toArray(),
        db
          .collection("profiles")
          .find({}, { projection: { userId: 1, isPublic: 1, publicSlug: 1, profile: 1 } })
          .toArray(),
      ]);

      const userNameMap = new Map(
        users.map((u) => [String(u?._id || ""), String(u?.name || "User")])
      );
      const visibilityMap = new Map(
        profiles.map((p) => [
          String(p?.userId || ""),
          {
            isPublic: p?.isPublic !== false,
            publicSlug: String(p?.publicSlug || ""),
            role: String(p?.profile?.role || ""),
            skills: Array.isArray(p?.profile?.jobSkills) ? p.profile.jobSkills : [],
            profileImage: String(p?.profile?.profileImage || ""),
          },
        ])
      );

      const rows = latestAnalyses
        .map((doc) =>
          buildRankEntry(
            doc,
            userNameMap.get(String(doc?.userId)) || "User",
            visibilityMap.get(String(doc?.userId)) || { isPublic: true, publicSlug: "" }
          )
        )
        .filter((row) => (query ? row.name.toLowerCase().includes(query) : true))
        .sort((a, b) => b.rankScore - a.rankScore || b.jobReadiness - a.jobReadiness)
        .slice(0, limit)
        .map((row, idx) => ({ ...row, rank: idx + 1 }));

      return res.json({
        rankings: rows,
        updatedAt: new Date().toISOString(),
        count: rows.length,
      });
    } catch {
      dbClient = null;
      dbFailedAt = Date.now();
    }
  }

  const userNameMap = new Map(memoryUsers.map((u) => [String(u?.id || ""), String(u?.name || "User")]));
  const latestByUser = new Map();
  memoryAnalyses.forEach((doc) => {
    const userId = String(doc?.userId || "");
    if (!userId) return;
    const prev = latestByUser.get(userId);
    const prevTs = new Date(prev?.createdAt || 0).getTime();
    const currTs = new Date(doc?.createdAt || 0).getTime();
    if (!prev || currTs > prevTs) {
      latestByUser.set(userId, doc);
    }
  });

  const rows = Array.from(latestByUser.values())
    .map((doc) =>
      buildRankEntry(
        doc,
        userNameMap.get(String(doc?.userId)) || "User",
        { isPublic: true, publicSlug: "" }
      )
    )
    .filter((row) => (query ? row.name.toLowerCase().includes(query) : true))
    .sort((a, b) => b.rankScore - a.rankScore || b.jobReadiness - a.jobReadiness)
    .slice(0, limit)
    .map((row, idx) => ({ ...row, rank: idx + 1 }));

  return res.json({
    rankings: rows,
    updatedAt: new Date().toISOString(),
    count: rows.length,
    storage: "memory",
  });
});

app.get("/api/contests/today", authMiddleware, async (req, res) => {
  const emergencyContestLinks = [
    { platform: "CodeForces", name: "Open Codeforces Contests", url: "https://codeforces.com/contests" },
    { platform: "CodeChef", name: "Open CodeChef Contests", url: "https://www.codechef.com/contests" },
    { platform: "LeetCode", name: "Open LeetCode Contests", url: "https://leetcode.com/contest/" },
    { platform: "AtCoder", name: "Open AtCoder Contests", url: "https://atcoder.jp/contests/" },
    { platform: "HackerRank", name: "Open HackerRank Contests", url: "https://www.hackerrank.com/contests" },
  ].map((item) => ({
    ...item,
    startTime: null,
    endTime: null,
    status: "LINK",
  }));
  const allowedPlatforms = new Set([
    "CodeForces",
    "CodeChef",
    "LeetCode",
    "HackerRank",
    "HackerEarth",
    "AtCoder",
    "TopCoder",
    "GeeksforGeeks",
  ]);

  const isSameLocalDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const withinNextDays = (date, from, days) => {
    const delta = date.getTime() - from.getTime();
    return delta >= 0 && delta <= days * 24 * 60 * 60 * 1000;
  };
  const now = new Date();
  const mapKontestsRows = (rows) => {
    const normalized = rows
      .filter((row) => allowedPlatforms.has(String(row.site || "").trim()))
      .map((row) => {
        const startDate = new Date(row.start_time);
        return {
          platform: row.site || "Platform",
          name: row.name || "Contest",
          startTime: row.start_time || null,
          endTime: row.end_time || null,
          status: row.status || "",
          startDate,
          url: row.url || "",
        };
      })
      .filter((row) => !Number.isNaN(row.startDate.getTime()))
      .sort((a, b) => a.startDate - b.startDate);

    const todays = normalized.filter((row) => isSameLocalDay(row.startDate, now));
    if (todays.length > 0) {
      return { scope: "today", contests: todays.map(({ startDate, ...row }) => row) };
    }

    const upcoming = normalized
      .filter((row) => withinNextDays(row.startDate, now, 7))
      .slice(0, 10);
    return { scope: "upcoming", contests: upcoming.map(({ startDate, ...row }) => row) };
  };

  try {
    const feedRes = await axios.get("https://kontests.net/api/v1/all", {
      timeout: PLATFORM_TIMEOUT_MS,
      headers: { "User-Agent": "NextHireApp" },
    });
    const rows = Array.isArray(feedRes.data) ? feedRes.data : [];
    const mapped = mapKontestsRows(rows);

    if (mapped.contests.length > 0) {
      contestCache.contests = mapped.contests;
      contestCache.fetchedAt = Date.now();
    }

    if (mapped.contests.length === 0 && contestCache.contests.length > 0) {
      return res.json({
        date: now.toISOString(),
        scope: "cached",
        contests: contestCache.contests,
        warning: "No fresh contests found. Showing last known contests.",
      });
    }

    if (mapped.contests.length === 0) {
      return res.json({
        date: now.toISOString(),
        scope: "links",
        contests: emergencyContestLinks,
        warning: "No live contests found. Showing contest platform links.",
      });
    }

    return res.json({
      date: now.toISOString(),
      scope: mapped.scope,
      contests: mapped.contests,
    });
  } catch (kontestsErr) {
    try {
      const fallbackContests = [];

      // Fallback 1: Codeforces official API
      try {
        const cfRes = await axios.get("https://codeforces.com/api/contest.list", {
          timeout: PLATFORM_TIMEOUT_MS,
          headers: { "User-Agent": "NextHireApp" },
        });
        const list = Array.isArray(cfRes.data?.result) ? cfRes.data.result : [];
        list
          .filter((c) => c?.phase === "BEFORE")
          .forEach((c) => {
            const startDate = new Date((c.startTimeSeconds || 0) * 1000);
            if (Number.isNaN(startDate.getTime()) || !isSameLocalDay(startDate, now)) return;
            fallbackContests.push({
              platform: "CodeForces",
              name: c.name || "Codeforces Contest",
              startTime: startDate.toISOString(),
              endTime: null,
              status: "CODING",
              url: c.id ? `https://codeforces.com/contest/${c.id}` : "https://codeforces.com/contests",
            });
          });
      } catch {
        // ignore this source and continue
      }

      // Fallback 2: CodeChef public contests API
      try {
        const ccRes = await axios.get("https://www.codechef.com/api/list/contests/all", {
          timeout: PLATFORM_TIMEOUT_MS,
          headers: { "User-Agent": "NextHireApp" },
        });
        const all = [
          ...(Array.isArray(ccRes.data?.future_contests) ? ccRes.data.future_contests : []),
          ...(Array.isArray(ccRes.data?.present_contests) ? ccRes.data.present_contests : []),
        ];
        all.forEach((c) => {
          const startDate = new Date(c.contest_start_date_iso || c.contest_start_date);
          if (Number.isNaN(startDate.getTime()) || !isSameLocalDay(startDate, now)) return;
          fallbackContests.push({
            platform: "CodeChef",
            name: c.contest_name || c.contest_code || "CodeChef Contest",
            startTime: startDate.toISOString(),
            endTime: c.contest_end_date_iso || null,
            status: "CODING",
            url: c.contest_code
              ? `https://www.codechef.com/${c.contest_code}`
              : "https://www.codechef.com/contests",
          });
        });
      } catch {
        // ignore this source and continue
      }

      // Fallback 3: AtCoder contests public dataset
      try {
        const acRes = await axios.get("https://kenkoooo.com/atcoder/resources/contests.json", {
          timeout: PLATFORM_TIMEOUT_MS,
          headers: { "User-Agent": "NextHireApp" },
        });
        const list = Array.isArray(acRes.data) ? acRes.data : [];
        list
          .filter((c) => c?.start_epoch_second && String(c.id || "").startsWith("abc"))
          .forEach((c) => {
            const startDate = new Date(c.start_epoch_second * 1000);
            if (Number.isNaN(startDate.getTime()) || !isSameLocalDay(startDate, now)) return;
            fallbackContests.push({
              platform: "AtCoder",
              name: c.title || c.id || "AtCoder Contest",
              startTime: startDate.toISOString(),
              endTime: null,
              status: "CODING",
              url: c.id ? `https://atcoder.jp/contests/${c.id}` : "https://atcoder.jp/contests",
            });
          });
      } catch {
        // ignore this source and continue
      }

      const sorted = fallbackContests.sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
      const todays = sorted.filter((row) => isSameLocalDay(new Date(row.startTime), now));
      const contests = todays.length
        ? todays
        : sorted.filter((row) => withinNextDays(new Date(row.startTime), now, 7)).slice(0, 10);
      const scope = todays.length ? "today" : "upcoming";

      if (contests.length > 0) {
        contestCache.contests = contests;
        contestCache.fetchedAt = Date.now();
      }

      if (contests.length === 0 && contestCache.contests.length > 0) {
        return res.json({
          date: now.toISOString(),
          scope: "cached",
          contests: contestCache.contests,
          warning: "No fresh contests found. Showing last known contests.",
        });
      }
      if (contests.length === 0) {
        return res.json({
          date: now.toISOString(),
          scope: "links",
          contests: emergencyContestLinks,
          warning: "No live contests found. Showing contest platform links.",
        });
      }
      return res.json({
        date: now.toISOString(),
        scope,
        contests,
      });
    } catch (cfErr) {
      const cacheAgeMs = Date.now() - (contestCache.fetchedAt || 0);
      const hasCache = contestCache.contests.length > 0 && cacheAgeMs < 6 * 60 * 60 * 1000;
      if (hasCache) {
        return res.json({
          date: now.toISOString(),
          scope: "cached",
          contests: contestCache.contests,
          warning: "Live feeds unavailable. Showing last cached contests.",
        });
      }

      console.error("Contest feed failed:", {
        kontests: kontestsErr?.message || "unknown",
        fallback: cfErr?.message || "unknown",
      });
      return res.json({
        date: now.toISOString(),
        scope: "links",
        contests: emergencyContestLinks,
        warning: "Contest feeds unavailable. Showing contest platform links.",
      });
    }
  }
});

app.get("/api/hackathons", authMiddleware, async (req, res) => {
  const now = new Date();
  const applyPortals = [
    {
      source: "Devpost",
      name: "Browse Global Hackathons",
      location: "Worldwide",
      startDate: null,
      endDate: null,
      applyUrl: "https://devpost.com/hackathons",
    },
    {
      source: "MLH",
      name: "MLH Official Hackathons",
      location: "Worldwide",
      startDate: null,
      endDate: null,
      applyUrl: "https://mlh.io/seasons",
    },
    {
      source: "Devfolio",
      name: "Devfolio Hackathons",
      location: "Worldwide",
      startDate: null,
      endDate: null,
      applyUrl: "https://devfolio.co/hackathons",
    },
    {
      source: "Unstop",
      name: "Unstop Hackathon Listings",
      location: "Worldwide",
      startDate: null,
      endDate: null,
      applyUrl: "https://unstop.com/hackathons",
    },
    {
      source: "Hack2Skill",
      name: "Hack2Skill Open Hackathons",
      location: "Worldwide",
      startDate: null,
      endDate: null,
      applyUrl: "https://hack2skill.com/hackathons",
    },
  ];

  const parseDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const withinNextMonths = (date, from, months = 6) => {
    if (!date) return false;
    const end = new Date(from);
    end.setMonth(end.getMonth() + months);
    return date >= from && date <= end;
  };

  const dedupe = (rows) => {
    const seen = new Set();
    return rows.filter((row) => {
      const key = `${(row.name || "").toLowerCase()}|${(row.applyUrl || "").toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  try {
    const results = [];

    // Source 1: MLH seasons events
    const years = [now.getFullYear(), now.getFullYear() + 1];
    for (const year of years) {
      try {
        const mlhRes = await axios.get(`https://mlh.io/seasons/${year}/events.json`, {
          timeout: PLATFORM_TIMEOUT_MS,
          headers: { "User-Agent": "NextHireApp" },
        });
        const events = Array.isArray(mlhRes.data) ? mlhRes.data : [];
        events.forEach((ev) => {
          const start = parseDate(ev.event_start_date || ev.startDate || ev.start_date);
          const end = parseDate(ev.event_end_date || ev.endDate || ev.end_date);
          if (start && !withinNextMonths(start, now, 8)) return;
          results.push({
            source: "MLH",
            name: ev.title || ev.name || "MLH Hackathon",
            location: ev.location || ev.city || "Worldwide",
            startDate: start ? start.toISOString() : null,
            endDate: end ? end.toISOString() : null,
            applyUrl: ev.event_url || ev.website || ev.url || "https://mlh.io/seasons",
          });
        });
      } catch {
        // ignore and continue
      }
    }

    // Source 2: Devpost API
    try {
      const devpostRes = await axios.get(
        "https://devpost.com/api/hackathons?status[]=upcoming&page=1&per_page=30",
        {
          timeout: PLATFORM_TIMEOUT_MS,
          headers: { "User-Agent": "NextHireApp" },
        }
      );
      const list = Array.isArray(devpostRes.data?.hackathons)
        ? devpostRes.data.hackathons
        : [];
      list.forEach((h) => {
        const start = parseDate(h.submission_period_dates?.starts_at || h.opened_at);
        const end = parseDate(h.submission_period_dates?.ends_at || h.deadline);
        if (start && !withinNextMonths(start, now, 8)) return;
        results.push({
          source: "Devpost",
          name: h.title || h.name || "Devpost Hackathon",
          location: h.displayed_location?.location || "Worldwide",
          startDate: start ? start.toISOString() : null,
          endDate: end ? end.toISOString() : null,
          applyUrl: h.url || "https://devpost.com/hackathons",
        });
      });
    } catch {
      // ignore and continue
    }

    // Source 3: Public challenge portal list API (best effort)
    try {
      const unstopRes = await axios.get(
        "https://unstop.com/api/public/opportunity/search-result?opportunity=hackathons&page=1&per_page=30",
        {
          timeout: PLATFORM_TIMEOUT_MS,
          headers: { "User-Agent": "NextHireApp" },
        }
      );
      const list = Array.isArray(unstopRes.data?.data?.data)
        ? unstopRes.data.data.data
        : [];
      list.forEach((h) => {
        const start = parseDate(h.start_date || h.startDate);
        const end = parseDate(h.end_date || h.endDate);
        if (start && !withinNextMonths(start, now, 8)) return;
        results.push({
          source: "Unstop",
          name: h.title || h.name || "Unstop Hackathon",
          location: h.region || h.location || "Worldwide",
          startDate: start ? start.toISOString() : null,
          endDate: end ? end.toISOString() : null,
          applyUrl: h.public_url || h.url || "https://unstop.com/hackathons",
        });
      });
    } catch {
      // ignore and continue
    }

    const hackathons = dedupe(results).slice(0, 24);
    if (hackathons.length > 0) {
      hackathonCache.hackathons = hackathons;
      hackathonCache.fetchedAt = Date.now();
      return res.json({ date: now.toISOString(), scope: "live", hackathons });
    }

    const cacheAge = Date.now() - (hackathonCache.fetchedAt || 0);
    if (hackathonCache.hackathons.length > 0 && cacheAge < 24 * 60 * 60 * 1000) {
      return res.json({
        date: now.toISOString(),
        scope: "cached",
        hackathons: hackathonCache.hackathons,
        warning: "Live hackathon feeds unavailable. Showing cached list.",
      });
    }

    return res.json({
      date: now.toISOString(),
      scope: "links",
      hackathons: applyPortals,
      warning: "Live hackathon feeds unavailable. Showing application portals.",
    });
  } catch {
    return res.json({
      date: now.toISOString(),
      scope: "links",
      hackathons: applyPortals,
      warning: "Could not fetch live hackathons. Showing application portals.",
    });
  }
});

app.post("/api/analyze", authMiddleware, async (req, res) => {
  const { usernames = {}, role = "", jobSkills = [] } = req.body || {};
  try {
    const results = await Promise.allSettled([
      fetchLeetCode(usernames.leetcode),
      fetchCodeChef(usernames.codechef),
      fetchGitHub(usernames.github),
      fetchHackerRank(usernames.hackerrank),
    ]);
    const warnings = [];
    const unwrap = (result, fallback, label) => {
      if (result.status === "fulfilled") return result.value;
      const reasonText = result?.reason?.message
        ? String(result.reason.message)
        : `${label} unavailable`;
      warnings.push(`${label}: ${reasonText}.`);
      return fallback;
    };
    const leetcode = unwrap(
      results[0],
      {
        total: 0,
        easy: 0,
        medium: 0,
        hard: 0,
        rating: 0,
        rank: "-",
        contestsParticipated: 0,
      },
      "LeetCode"
    );
    const codechef = unwrap(
      results[1],
      { stars: 0, rank: "-", solved: 0, contestsParticipated: 0 },
      "CodeChef"
    );
    const github = unwrap(
      results[2],
      { repos: 0, stars: 0, languages: [], readmeQuality: "Unknown" },
      "GitHub"
    );
    const hackerrank = unwrap(
      results[3],
      { badges: 0, certs: 0 },
      "HackerRank"
    );
    [leetcode, codechef, github, hackerrank].forEach((item) => {
      if (item && item.warning) warnings.push(`${item.warning}.`);
    });

    const payload = {
      leetcode,
      codechef,
      github,
      hackerrank,
      achievements: buildAchievements({ leetcode, codechef, github, hackerrank }),
      warnings,
    };

    const knownSkills = [
      ...(Array.isArray(jobSkills) ? jobSkills : []),
      ...(github.languages || []),
    ]
      .map((s) => String(s).toLowerCase())
      .filter(Boolean);
    const profileText = [
      `leetcode ${leetcode.total} rating ${leetcode.rating}`,
      `codechef solved ${codechef.solved} stars ${codechef.stars}`,
      `github repos ${github.repos} ${github.languages?.join(" ") || ""}`,
      knownSkills.join(" "),
      role,
    ].join(" ");

    const ranked = predictRoles(profileText);
    const topRole = ranked[0]?.role || "Fullstack";
    const roleSkills = getRoleSkills(topRole);
    const missingSkills = roleSkills.filter(
      (skill) => !knownSkills.includes(skill.toLowerCase())
    );
    const coverage =
      roleSkills.length === 0
        ? 0
        : Math.round(
            ((roleSkills.length - missingSkills.length) / roleSkills.length) * 100
          );
    const readinessScore = Math.min(
      100,
      Math.round(ranked[0]?.score * 0.7 + (github.repos / 10) * 30)
    );
    const profileStrength = Math.min(
      100,
      Math.round(readinessScore * 0.6 + coverage * 0.4)
    );
    const hireProbability = estimateHireProbability({
      leetcode,
      codechef,
      github,
      hackerrank,
    });

    payload.ml = {
      ranked,
      strengths: [
        leetcode.total >= 200 ? "Consistent LeetCode volume." : "Growing DSA base.",
        github.repos >= 5 ? "Active GitHub portfolio." : "Portfolio still light.",
      ],
      gaps: missingSkills.slice(0, 5).map((skill) => `Missing: ${skill}`),
      readiness: readinessScore,
      hireProbability,
      profileStrength,
      targetSkills: missingSkills.slice(0, 3),
      plan: {
        week1: "Close 1 core gap and solve 10 DSA mediums.",
        week2: "Ship one portfolio feature and document it.",
        week3: "Add tests or deploy one project.",
        week4: "Mock interviews + refine weakest skill.",
      },
      projects: recommendProjects({
        role: topRole,
        jobSkills: Array.isArray(jobSkills) ? jobSkills : [],
        missingSkills,
      }),
      roadmap: [
        "Focus DSA: Arrays, Hashing, Sliding Window, Binary Search.",
        "Weekly contests: 1 LeetCode + 1 CodeChef Starter.",
        "Add 1 deployable project with documentation.",
        "Refactor one repo with tests and CI.",
      ],
      studyPlan: [
        "DSA: 2 medium problems/day + review 1 topic.",
        "System design basics: REST, auth, caching.",
        "Build one feature end-to-end each week.",
      ],
    };


    const db = await getDb();
    if (db) {
      try {
        await db.collection("analyses").insertOne({
          createdAt: new Date(),
          userId: req.user?.id,
          usernames,
          payload,
        });
      } catch {
        dbClient = null;
        dbFailedAt = Date.now();
        memoryAnalyses.push({
          createdAt: new Date(),
          userId: req.user?.id,
          usernames,
          payload,
        });
      }
    } else {
      memoryAnalyses.push({
        createdAt: new Date(),
        userId: req.user?.id,
        usernames,
        payload,
      });
    }

    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message || "Analysis failed." });
  }
});

app.post("/api/resume/readiness", authMiddleware, async (req, res) => {
  const { resumeData = {}, profileSignals = null, targetRole = "", targetSkills = [] } = req.body || {};
  try {
    const result = scoreResumeReadiness({
      resumeData,
      profileSignals,
      targetRole,
      targetSkills,
    });
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message || "Resume readiness failed." });
  }
});

app.post("/api/chatbot", authMiddleware, async (req, res) => {
  const { message = "", analysis = null, profileInputs = {}, history = [], resumeData = null } = req.body || {};
  const ask = String(message || "").toLowerCase().trim();
  if (!ask) {
    return res.status(400).json({ error: "Message is required." });
  }

  const data = analysis || null;
  const role = String(profileInputs?.role || "").toLowerCase();
  const jobSkills = Array.isArray(profileInputs?.jobSkills) ? profileInputs.jobSkills : [];
  const convo = Array.isArray(history) ? history.slice(-10) : [];
  const lastUserMsg = [...convo]
    .reverse()
    .find((h) => String(h?.role || "").toLowerCase() === "user" && String(h?.text || "").trim());
  const lastUserText = String(lastUserMsg?.text || "").toLowerCase();

  if (!data) {
    return res.json({
      reply:
        "Run Analyze Profile once, then I can give ML-based answers for role fit, hiring chance, skills, projects, contests, and resume readiness.",
    });
  }

  const leet = data.leetcode || {};
  const cc = data.codechef || {};
  const gh = data.github || {};
  const hr = data.hackerrank || {};
  const ml = data.ml || {};

  const safeRole =
    ml?.ranked?.[0]?.role ||
    (role.includes("front") ? "Frontend" : role.includes("back") ? "Backend" : "Fullstack");

  const hireProbability = estimateHireProbability({
    leetcode: leet,
    codechef: cc,
    github: gh,
    hackerrank: hr,
  });

  const knownSkills = [
    ...jobSkills,
    ...(Array.isArray(gh.languages) ? gh.languages : []),
  ]
    .map((s) => String(s).toLowerCase())
    .filter(Boolean);
  const roleSkills = getRoleSkills(safeRole) || [];
  const missingSkills = roleSkills.filter(
    (skill) => !knownSkills.includes(String(skill).toLowerCase())
  );
  const projects = recommendProjects({
    role: safeRole,
    jobSkills,
    missingSkills: missingSkills.slice(0, 6),
  });

  // Prefer current question; only use last user message for short follow-ups.
  const isShortFollowUp = ask.split(/\s+/).filter(Boolean).length <= 4;
  const wants = (pattern) => {
    if (pattern.test(ask)) return true;
    if (!isShortFollowUp) return false;
    return pattern.test(lastUserText);
  };
  const list = (arr, count = 4) =>
    (Array.isArray(arr) ? arr.slice(0, count) : []).join(", ");

  if (/(contest)/.test(ask) && /(today|now|current|happening|live)/.test(ask)) {
    const now = new Date();
    const sameDay = (a, b) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();

    let todays = [];
    try {
      const listRes = await axios.get("https://kontests.net/api/v1/all", {
        timeout: PLATFORM_TIMEOUT_MS,
      });
      const rows = Array.isArray(listRes.data) ? listRes.data : [];
      todays = rows
        .map((c) => {
          const start = new Date(c.start_time || c.startTime || c.start || "");
          if (Number.isNaN(start.getTime())) return null;
          return {
            name: c.name || "Contest",
            site: c.site || c.platform || "Platform",
            start,
          };
        })
        .filter(Boolean)
        .filter((c) => sameDay(c.start, now))
        .sort((a, b) => a.start - b.start)
        .slice(0, 5);
    } catch {
      todays = (contestCache.contests || [])
        .map((c) => {
          const start = new Date(c.startTime || "");
          if (Number.isNaN(start.getTime())) return null;
          return { name: c.name || "Contest", site: c.platform || "Platform", start };
        })
        .filter(Boolean)
        .filter((c) => sameDay(c.start, now))
        .sort((a, b) => a.start - b.start)
        .slice(0, 5);
    }

    if (!todays.length) {
      return res.json({
        reply:
          "I could not confirm a contest for today right now. Check the Today's Contests section for live/fallback links.",
      });
    }
    const out = todays
      .map((c) => {
        const hh = String(c.start.getHours()).padStart(2, "0");
        const mm = String(c.start.getMinutes()).padStart(2, "0");
        return `${c.site}: ${c.name} at ${hh}:${mm}`;
      })
      .join(" | ");
    return res.json({ reply: `Today's contests: ${out}` });
  }

  if (wants(/(hire|job chance|probability|placement)/)) {
    const reason = leet.medium < 120
      ? "medium-level DSA depth is low"
      : gh.repos < 5
        ? "project portfolio is light"
        : "profile is improving steadily";
    return res.json({
      reply: `Estimated hire probability: ${hireProbability}%. Main reason: ${reason}. Next best actions: ${missingSkills.slice(0, 3).join(", ") || "keep consistent practice"}, 1 deployable project, weekly contest consistency.`,
    });
  }

  if (wants(/(role|fit|frontend|backend|fullstack)/)) {
    const ranked = Array.isArray(ml.ranked)
      ? ml.ranked
      : predictRoles(`${knownSkills.join(" ")} ${safeRole}`);
    const top = ranked.slice(0, 3).map((r) => `${r.role} ${r.score}%`).join(" | ");
    return res.json({
      reply: `Role-fit ranking: ${top}. For ${safeRole}, focus on: ${missingSkills.slice(0, 4).join(", ") || "advanced project depth and interview prep"}.`,
    });
  }

  if (wants(/(skill|gap|missing|learn|improve skills)/)) {
    return res.json({
      reply: `Top skill gaps: ${missingSkills.slice(0, 6).join(", ") || "No major gaps"}. 7-day plan: Day1-2 core concepts, Day3-4 guided project tasks, Day5-6 problem sets, Day7 revision + mock interview.`,
    });
  }

  if (wants(/(project|build|portfolio|what should i build)/)) {
    const recommended = (projects || []).slice(0, 5);
    return res.json({
      reply: `Best projects for you now: ${recommended.join(", ") || "Portfolio website, Resume analyzer, API service"}. Pick one and ship MVP in 7 days with README + deployment.`,
    });
  }

  if (wants(/(roadmap|plan|today plan|next steps|weekly)/)) {
    const roadmap = Array.isArray(ml.roadmap) ? ml.roadmap.slice(0, 3) : [];
    const study = Array.isArray(ml.studyPlan) ? ml.studyPlan.slice(0, 2) : [];
    return res.json({
      reply: `Action roadmap: ${list(roadmap, 3) || "Solve DSA daily, contest weekly, build one deployable project"}. Study focus: ${list(study, 2) || "Medium DSA + system design basics"}.`,
    });
  }

  if (wants(/(resume|cv|readiness)/)) {
    if (resumeData) {
      try {
        const rr = scoreResumeReadiness({
          resumeData,
          profileSignals: data,
          targetRole: safeRole,
          targetSkills: jobSkills,
        });
        return res.json({
          reply: `Resume readiness: ${rr.readinessScore}% (Content ${rr.breakdown?.contentQuality ?? 0}%, Relevance ${rr.breakdown?.relevance ?? 0}%, Impact ${rr.breakdown?.impactEvidence ?? 0}%). Improve with: ${(rr.suggestions || []).slice(0, 3).join(" | ") || "add quantified project outcomes"}.`,
        });
      } catch {
        // ignore and fall back
      }
    }
    return res.json({
      reply:
        "Use Make Resume/Add Resume first, then ask me 'how is my resume' and I will give a detailed readiness breakdown.",
    });
  }

  if (wants(/(contest|participated|rating)/)) {
    return res.json({
      reply: `LeetCode: contests ${leet.contestsParticipated || 0}, rating ${leet.rating || 0}. CodeChef: contests ${cc.contestsParticipated || 0}, stars ${cc.stars || 0}, solved ${cc.solved || 0}.`,
    });
  }

  if (wants(/(hackathon|hackathons)/)) {
    const entries = (hackathonCache.hackathons || []).slice(0, 4);
    if (!entries.length) {
      return res.json({
        reply: "Open the Worldwide Hackathons section to fetch current events and apply links.",
      });
    }
    const out = entries
      .map((h) => `${h.source || "Source"}: ${h.name || "Hackathon"}`)
      .join(" | ");
    return res.json({ reply: `Upcoming hackathons: ${out}` });
  }

  return res.json({
    reply: `I can help with hire probability, role fit, skill gaps, roadmap, resume readiness, contests today, and project choices. Current snapshot: hire ${hireProbability}%, role ${safeRole}, LeetCode solved ${leet.total || 0}, CodeChef solved ${cc.solved || 0}, GitHub repos ${gh.repos || 0}.`,
  });
});

app.listen(PORT, () => {
  console.log(`NextHire backend running on http://localhost:${PORT}`);
});
