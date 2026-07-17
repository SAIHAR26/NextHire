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

function extractSection(text, headings) {
  const source = normalizeText(text);
  if (!source) return "";
  const escaped = headings.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const headingPattern = escaped.join("|");
  const allHeadings = [
    "summary",
    "profile",
    "objective",
    "skills",
    "technical skills",
    "projects",
    "experience",
    "education",
    "achievements",
    "certifications",
    "certificates",
  ];
  const otherPattern = allHeadings
    .filter((h) => !headings.map((x) => x.toLowerCase()).includes(h))
    .map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const regex = new RegExp(`(?:^|\\n)\\s*(?:${headingPattern})\\s*:?\\s*\\n?([\\s\\S]*?)(?=\\n\\s*(?:${otherPattern})\\s*:?\\s*\\n|$)`, "i");
  const match = source.match(regex);
  return normalizeText(match?.[1] || "");
}

function splitResumeLines(value) {
  return String(value || "")
    .split(/\r?\n|•|\u2022|\s+-\s+/)
    .map((v) => v.replace(/^[-*]\s*/, "").trim())
    .filter((v) => v.length > 2);
}

function parseUploadedResumeText(text = {}) {
  const raw = normalizeText(text);
  if (!raw) return {};
  const compact = raw.replace(/\s+/g, " ").trim();
  const summarySection = extractSection(raw, ["summary", "profile", "objective"]);
  const skillsSection = extractSection(raw, ["skills", "technical skills"]);
  const projectsSection = extractSection(raw, ["projects", "experience"]);
  const educationSection = extractSection(raw, ["education"]);
  const achievementsSection = extractSection(raw, ["achievements"]);
  const certsSection = extractSection(raw, ["certifications", "certificates"]);

  const summary = summarySection || compact.slice(0, 360);
  const knownTech = [
    "javascript",
    "typescript",
    "react",
    "node",
    "express",
    "mongodb",
    "sql",
    "python",
    "java",
    "c++",
    "html",
    "css",
    "rest api",
    "git",
    "docker",
    "aws",
  ];
  const skills = normalizeArray(skillsSection || compact.match(/skills?[:\-]\s*([^\n]+)/i)?.[1] || "");
  const inferredSkills = knownTech.filter((skill) => compact.toLowerCase().includes(skill));
  const finalSkills = [...new Set([...skills, ...inferredSkills])];
  const projectLines = splitResumeLines(projectsSection)
    .filter((line) => line.length >= 12)
    .slice(0, 8);
  const inferredProjectLines = splitResumeLines(raw)
    .filter((line) => /(built|developed|implemented|created|optimized|deployed|project|api|dashboard|module)/i.test(line))
    .filter((line) => line.length >= 20)
    .slice(0, 6);
  const finalProjects = projectLines.length ? projectLines : inferredProjectLines;
  const achievements = splitResumeLines(achievementsSection || raw)
    .filter((line) => /(solved|contest|rank|certified|certificate|achievement|won|completed|\d+\+)/i.test(line))
    .slice(0, 6);
  const certifications = splitResumeLines(certsSection).slice(0, 6);

  const email = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  const phone = raw.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0] || "";
  const cgpa = raw.match(/(?:cgpa|gpa)\s*[:\-]?\s*([0-9.]+)/i)?.[1] || "";
  const gradYear = raw.match(/\b(20\d{2})\b/)?.[1] || "";

  return {
    summary,
    skills: finalSkills,
    projects: finalProjects,
    achievements,
    certifications,
    email,
    phone,
    cgpa,
    gradYear,
    college: educationSection.split(/\r?\n/).find(Boolean) || "Resume education",
    degree: educationSection.match(/\b(B\.?Tech|Bachelor|Master|M\.?Tech|BSc|MSc|BE|ME|Degree)\b[^\n]*/i)?.[0] || "Degree",
  };
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
  const uploadedData = parseUploadedResumeText(resumeData.uploadedResumeText || "");
  const mergedResumeData = {
    ...uploadedData,
    ...resumeData,
    summary: resumeData.summary || uploadedData.summary || "",
    skills: normalizeArray(resumeData.skills).length ? resumeData.skills : uploadedData.skills || [],
    projects: normalizeArray(resumeData.projects).length ? resumeData.projects : uploadedData.projects || [],
    achievements: normalizeArray(resumeData.achievements).length
      ? resumeData.achievements
      : uploadedData.achievements || [],
    certifications: normalizeArray(resumeData.certifications).length
      ? resumeData.certifications
      : uploadedData.certifications || [],
    email: resumeData.email || uploadedData.email || "",
    phone: resumeData.phone || uploadedData.phone || "",
    college: resumeData.college || uploadedData.college || "",
    degree: resumeData.degree || uploadedData.degree || "",
    cgpa: resumeData.cgpa || uploadedData.cgpa || "",
    gradYear: resumeData.gradYear || uploadedData.gradYear || "",
  };
  const suggestions = [];
  const missingSections = [];

  const summaryRes = scoreSummary(mergedResumeData.summary);
  if (summaryRes.tip) {
    suggestions.push(summaryRes.tip);
    missingSections.push("summary_quality");
  }

  const projectRes = scoreProjectLines(mergedResumeData.projects);
  if (projectRes.tip) {
    suggestions.push(projectRes.tip);
    missingSections.push("project_impact");
  }

  const relevanceRes = scoreSkillsRelevance(
    mergedResumeData.skills,
    targetSkills,
    targetRole,
    profileSignals
  );
  if (relevanceRes.tip) {
    suggestions.push(relevanceRes.tip);
    missingSections.push("skills_relevance");
  }

  const impactEvidence = scoreAchievements(
    mergedResumeData.achievements,
    mergedResumeData.certifications,
    profileSignals
  );

  const structure = scoreStructure(mergedResumeData);
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

