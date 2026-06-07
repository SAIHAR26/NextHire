function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (!value) return [];
  return String(value)
    .split(/[,\n]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function normalizeText(value) {
  return String(value || "").trim();
}

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function uniqueRatio(tokens) {
  if (!tokens.length) return 0;
  return new Set(tokens).size / tokens.length;
}

function scoreSummary(summary) {
  const txt = normalizeText(summary);
  if (!txt) return { score: 0, tip: "Add a concise 3-4 line professional summary." };
  const len = txt.length;
  let score = 0;
  if (len >= 80 && len <= 400) score += 45;
  else if (len >= 50 && len < 80) score += 25;
  else if (len > 400) score += 22;
  else score += 12;

  const tokens = tokenize(txt);
  const diversity = uniqueRatio(tokens);
  score += Math.min(25, Math.round(diversity * 25));

  const actionWords = [
    "built",
    "designed",
    "developed",
    "implemented",
    "optimized",
    "delivered",
    "improved",
    "scaled",
  ];
  const hasAction = actionWords.some((w) => tokens.includes(w));
  if (hasAction) score += 20;

  return { score: clampScore(score) };
}

function scoreProjectLines(projects) {
  const rows = normalizeArray(projects);
  if (!rows.length) return { score: 0, impact: 0, tip: "Add 2-4 project bullets with impact and tech." };

  const impactRegex = /(\d+%|\d+\+|reduced|improved|increased|saved|cut|faster|latency|users?|requests?)/i;
  const techRegex = /(react|node|express|mongodb|sql|python|java|api|docker|aws|redis|typescript|javascript)/i;
  const actionRegex = /(built|designed|implemented|developed|optimized|deployed|automated|created)/i;

  let quality = 0;
  let impact = 0;
  rows.forEach((line) => {
    const t = normalizeText(line);
    if (t.length >= 30) quality += 18;
    else if (t.length >= 16) quality += 10;
    else quality += 4;
    if (actionRegex.test(t)) quality += 10;
    if (techRegex.test(t)) quality += 8;
    if (impactRegex.test(t)) impact += 20;
  });

  const normalizedQuality = clampScore((quality / (rows.length * 36)) * 100);
  const normalizedImpact = clampScore((impact / (rows.length * 20)) * 100);

  const tip =
    normalizedImpact < 50
      ? "Rewrite project bullets with measurable outcomes (%, counts, speed, users)."
      : "";
  return { score: normalizedQuality, impact: normalizedImpact, tip };
}

function scoreSkillsRelevance(skills, targetSkills, targetRole, profileSignals) {
  const skillList = normalizeArray(skills).map((s) => s.toLowerCase());
  if (!skillList.length) {
    return { score: 0, tip: "Add role-relevant technical skills." };
  }

  const targetList = normalizeArray(targetSkills).map((s) => s.toLowerCase());
  const roleKeywords = String(targetRole || "")
    .toLowerCase()
    .includes("front")
    ? ["react", "javascript", "typescript", "css", "html", "redux"]
    : String(targetRole || "").toLowerCase().includes("back")
      ? ["node", "express", "api", "sql", "mongodb", "redis", "java", "python"]
      : ["react", "node", "api", "sql", "mongodb", "typescript", "docker"];

  const profileLangs = (profileSignals?.github?.languages || []).map((s) => String(s).toLowerCase());
  const expected = [...new Set([...targetList, ...roleKeywords, ...profileLangs])];
  if (!expected.length) return { score: 70 };

  const overlap = expected.filter((exp) =>
    skillList.some((s) => s.includes(exp) || exp.includes(s))
  ).length;
  const coverage = overlap / expected.length;
  const score = clampScore(coverage * 100);
  const tip = score < 55 ? "Improve skill alignment with role requirements and GitHub profile." : "";
  return { score, tip };
}

function scoreAchievements(achievements, certifications, profileSignals) {
  const ach = normalizeArray(achievements);
  const certs = normalizeArray(certifications);
  const text = `${ach.join(" ")} ${certs.join(" ")}`.toLowerCase();
  const numericEvidence = (text.match(/\d+/g) || []).length;

  let score = 0;
  score += Math.min(50, ach.length * 12);
  score += Math.min(30, certs.length * 10);
  score += Math.min(20, numericEvidence * 3);

  // Align with coding-profile depth
  const lc = Number(profileSignals?.leetcode?.total) || 0;
  const hr = Number(profileSignals?.hackerrank?.badges) || 0;
  const cc = Number(profileSignals?.codechef?.solved) || 0;
  if (lc + hr + cc > 0 && (ach.length || certs.length)) score += 8;

  return clampScore(score);
}

function scoreStructure(resumeData) {
  const name = normalizeText(resumeData.name);
  const email = normalizeText(resumeData.email);
  const phone = normalizeText(resumeData.phone);
  const college = normalizeText(resumeData.college);
  const degree = normalizeText(resumeData.degree);
  const summary = normalizeText(resumeData.summary);
  const projects = normalizeArray(resumeData.projects);
  const skills = normalizeArray(resumeData.skills);

  const checks = [name, email, phone, college, degree, summary, projects.length > 0, skills.length > 0];
  const ok = checks.filter(Boolean).length;
  return clampScore((ok / checks.length) * 100);
}

export function scoreResumeReadiness({
  resumeData = {},
  profileSignals = null,
  targetRole = "frontend",
  targetSkills = [],
}) {
  const suggestions = [];
  const missingSections = [];

  const summaryRes = scoreSummary(resumeData.summary);
  if (summaryRes.tip) {
    suggestions.push(summaryRes.tip);
    missingSections.push("summary_quality");
  }

  const projectRes = scoreProjectLines(resumeData.projects);
  if (projectRes.tip) {
    suggestions.push(projectRes.tip);
    missingSections.push("project_impact");
  }

  const relevanceRes = scoreSkillsRelevance(
    resumeData.skills,
    targetSkills,
    targetRole,
    profileSignals
  );
  if (relevanceRes.tip) {
    suggestions.push(relevanceRes.tip);
    missingSections.push("skills_relevance");
  }

  const impactEvidence = scoreAchievements(
    resumeData.achievements,
    resumeData.certifications,
    profileSignals
  );

  const structure = scoreStructure(resumeData);
  if (structure < 60) missingSections.push("core_structure");

  // Weighted content-centric score
  const contentQuality = clampScore(summaryRes.score * 0.45 + projectRes.score * 0.55);
  const relevance = clampScore(relevanceRes.score);
  const impact = clampScore(projectRes.impact * 0.65 + impactEvidence * 0.35);

  const readinessScore = clampScore(
    contentQuality * 0.45 +
      relevance * 0.30 +
      impact * 0.20 +
      structure * 0.05
  );

  if (readinessScore < 65) {
    suggestions.push("Increase specificity: include tools, outcomes, and scale in every major bullet.");
  }

  return {
    readinessScore,
    breakdown: {
      contentQuality,
      relevance,
      impactEvidence: impact,
      structure,
    },
    missingSections: [...new Set(missingSections)],
    suggestions: [...new Set(suggestions)].slice(0, 6),
  };
}

