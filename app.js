const form = document.getElementById("profile-form");
const statusEl = document.getElementById("status");
const editButton = document.getElementById("edit-profile");
const logoutButton = document.getElementById("logout-btn");
const feedbackFab = document.getElementById("feedback-fab");
const feedbackPanel = document.getElementById("feedback-panel");
const feedbackBtn = document.getElementById("feedback-btn");
const rankingsNav = document.getElementById("rankings-nav");
const rankingsModal = document.getElementById("rankings-modal");
const rankingsCloseBtn = document.getElementById("rankings-close");
const rankingsSearch = document.getElementById("rankings-search");
const rankingsRefreshBtn = document.getElementById("rankings-refresh");
const rankingsStatus = document.getElementById("rankings-status");
const rankingsBody = document.getElementById("rankings-body");
const rankingViewPanel = document.getElementById("ranking-view-panel");
const rankingViewTitle = document.getElementById("ranking-view-title");
const rankingViewContent = document.getElementById("ranking-view-content");
const rankingViewClose = document.getElementById("ranking-view-close");
const publicCardModal = document.getElementById("public-card-modal");
const publicCardClose = document.getElementById("public-card-close");
const publicCardContent = document.getElementById("public-card-content");
const activityModal = document.getElementById("activity-modal");
const activityCloseBtn = document.getElementById("activity-close");
const activitySessionText = document.getElementById("activity-session-text");
const activitySummary = document.getElementById("activity-summary");
const activityHeatmap = document.getElementById("activity-heatmap");
const activityLog = document.getElementById("activity-log");
const activityFeedbackBtn = document.getElementById("activity-feedback-btn");
const activityChatbotBtn = document.getElementById("activity-chatbot-btn");
const activityStudyBtn = document.getElementById("activity-study-btn");
const visibilityToggleBtn = document.getElementById("visibility-toggle-btn");
const shareProfileBtn = document.getElementById("share-profile-btn");
const themeToggleBtn = document.getElementById("theme-toggle-btn");
const chatbotBtn = document.getElementById("chatbot-btn");
const chatbotDrawer = document.getElementById("chatbot-drawer");
const chatbotClose = document.getElementById("chatbot-close");
const chatbotMessages = document.getElementById("chatbot-messages");
const chatbotForm = document.getElementById("chatbot-form");
const chatbotInput = document.getElementById("chatbot-input");
const chatbotSuggestionButtons = document.querySelectorAll(".chatbot-suggestion");
const studyBtn = document.getElementById("study-btn");
const studyModal = document.getElementById("study-modal");
const studyCloseBtn = document.getElementById("study-close");
const studySubtitle = document.getElementById("study-subtitle");
const studyList = document.getElementById("study-list");
const questionPapersBtn = document.getElementById("question-papers-btn");
const activityQuestionPapersBtn = document.getElementById("activity-question-papers-btn");
const papersModal = document.getElementById("papers-modal");
const papersCloseBtn = document.getElementById("papers-close");
const papersList = document.getElementById("papers-list");
const mockInterviewBtn = document.getElementById("mock-interview-btn");
const activityMockInterviewBtn = document.getElementById("activity-mock-interview-btn");
const mockModal = document.getElementById("mock-modal");
const mockCloseBtn = document.getElementById("mock-close");
const mockTypeSelect = document.getElementById("mock-type");
const mockPaperSelect = document.getElementById("mock-paper");
const mockStartBtn = document.getElementById("mock-start-btn");
const mockSubmitBtn = document.getElementById("mock-submit-btn");
const mockStatus = document.getElementById("mock-status");
const mockQuestions = document.getElementById("mock-questions");
const avatarInput = document.getElementById("profile-avatar-input");
const avatarImg = document.getElementById("profile-avatar-img");
const avatarFallback = document.getElementById("profile-avatar-fallback");

const state = {
  inputs: {
    leetcode: "",
    codechef: "",
    codechefSolved: "",
    github: "",
    hackerrank: "",
    role: "frontend",
    jobSkills: [],
    isPublic: true,
    publicSlug: "",
    publicUrl: "",
  },
  data: null,
  chatHistory: [],
  currentMockPaper: null,
  currentMockQuestions: [],
};

function resetKpis() {
  const strengthEl = document.getElementById("kpi-strength");
  const goalEl = document.getElementById("kpi-goal");
  const readyEl = document.getElementById("kpi-ready");
  if (strengthEl) strengthEl.textContent = "--";
  if (goalEl) goalEl.textContent = "--/--";
  if (readyEl) readyEl.textContent = "--";
}

const API_BASE = "http://localhost:4000";
const TOKEN_KEY = "nexthire_token";
const NAME_KEY = "nexthire_name";
const PROFILE_KEY = "nexthire_profile";
const ANALYSIS_KEY = "nexthire_analysis";
const LOCK_KEY = "nexthire_profile_locked";
const REQUEST_TIMEOUT_MS = 45000;
const WEEKLY_TASKS_KEY = "nexthire_weekly_tasks";
const WEEKLY_INDEX_KEY = "nexthire_week_index";
const WEEKLY_PLAN_KEY = "nexthire_week_plan_seed";
const WEEKLY_SEED_SIG_KEY = "nexthire_week_seed_signature";
const RESUME_DATA_KEY = "nexthire_resume_data";
const SESSION_START_KEY = "nexthire_session_start";
const ACTIVITY_LOG_KEY = "nexthire_activity_log";
const ACTIVITY_SESSION_ID_KEY = "nexthire_activity_session_id";
const ACTIVITY_LAST_LOGIN_DAY_KEY = "nexthire_activity_last_login_day";
const ML_TRAINED_AT_KEY = "nexthire_ml_trained_at";
const THEME_KEY = "nexthire_theme";

let activityRemoteLogs = [];
let activityRemoteStats = null;
let activityLastSyncAt = 0;
let rankingsRefreshTimer = null;
let rankingsSearchTimer = null;
let rankingsRowsCache = [];

function applyTheme(themeName = "dark") {
  const isLight = String(themeName || "").toLowerCase() === "light";
  document.body.classList.toggle("theme-light", isLight);
  if (themeToggleBtn) {
    themeToggleBtn.textContent = isLight ? "🌙" : "☀";
    themeToggleBtn.setAttribute("aria-label", isLight ? "Switch to dark theme" : "Switch to light theme");
  }
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const theme = saved === "light" ? "light" : "dark";
  applyTheme(theme);
}

const roleProjects = {
  frontend: [
    "Portfolio website",
    "React analytics dashboard",
    "E‑commerce storefront UI",
    "API integration project",
  ],
  backend: [
    "REST API with JWT",
    "Authentication service",
    "CRUD app with database",
    "Payment integration",
  ],
  fullstack: [
    "Job portal",
    "Chat application",
    "Resume analyzer",
    "Blogging platform",
  ],
};

const studyResources = {
  dsa: ["Striver A2Z Sheet", "NeetCode 150", "Blind 75"],
  system: ["REST APIs", "Authentication", "Caching", "Databases"],
};

const studyCourseCatalog = {
  common: [
    {
      track: "DSA",
      title: "Striver A2Z DSA Playlist",
      url: "https://www.youtube.com/playlist?list=PLgUwDviBIf0pFf4r0hQK3fYf6Q4wM5i8B",
    },
    {
      track: "Problem Solving",
      title: "NeetCode Roadmap + Explanations",
      url: "https://www.youtube.com/@NeetCode",
    },
    {
      track: "CS Core",
      title: "Operating Systems (Gate Smashers)",
      url: "https://www.youtube.com/playlist?list=PLxCzCOWd7aiFM9Lj5G9G_76adtyb4ef7i",
    },
    {
      track: "CS Core",
      title: "DBMS Full Course (Gate Smashers)",
      url: "https://www.youtube.com/playlist?list=PLxCzCOWd7aiFM9Lj5G9G_76adtyb4ef7i",
    },
    {
      track: "CS Core",
      title: "Computer Networks (Neso Academy)",
      url: "https://www.youtube.com/playlist?list=PLBlnK6fEyqRiVhbXDGLXDk_OQAeuVcp2O",
    },
    {
      track: "Interview",
      title: "Aptitude + Reasoning for Placements",
      url: "https://www.youtube.com/@FeelFreetoLearn",
    },
    {
      track: "Interview",
      title: "HR + Behavioral Interview Questions",
      url: "https://www.youtube.com/@SelfMadeMillennial",
    },
  ],
  frontend: [
    {
      track: "Frontend",
      title: "React JS Full Course (freeCodeCamp)",
      url: "https://www.youtube.com/watch?v=bMknfKXIFA8",
    },
    {
      track: "Frontend",
      title: "JavaScript Full Course (Bro Code)",
      url: "https://www.youtube.com/watch?v=lfmg-EJ8gm4",
    },
    {
      track: "Frontend",
      title: "CSS Complete Course (SuperSimpleDev)",
      url: "https://www.youtube.com/watch?v=G3e-cpL7ofc",
    },
    {
      track: "Frontend",
      title: "TypeScript Full Course",
      url: "https://www.youtube.com/watch?v=30LWjhZzg50",
    },
    {
      track: "Frontend",
      title: "Next.js Full Course (freeCodeCamp)",
      url: "https://www.youtube.com/watch?v=ZVnjOPwW4ZA",
    },
    {
      track: "Frontend",
      title: "Tailwind CSS Crash Course",
      url: "https://www.youtube.com/watch?v=lCxcTsOHrjo",
    },
    {
      track: "Frontend",
      title: "Frontend System Design",
      url: "https://www.youtube.com/@frontendfyi",
    },
  ],
  backend: [
    {
      track: "Backend",
      title: "Node.js + Express Course (freeCodeCamp)",
      url: "https://www.youtube.com/watch?v=Oe421EPjeBE",
    },
    {
      track: "Backend",
      title: "MongoDB Complete Course",
      url: "https://www.youtube.com/watch?v=ofme2o29ngU",
    },
    {
      track: "Backend",
      title: "System Design Basics (Gaurav Sen)",
      url: "https://www.youtube.com/@gkcs",
    },
    {
      track: "Backend",
      title: "Spring Boot Full Course",
      url: "https://www.youtube.com/watch?v=9SGDpanrc8U",
    },
    {
      track: "Backend",
      title: "SQL for Beginners",
      url: "https://www.youtube.com/watch?v=HXV3zeQKqGY",
    },
    {
      track: "Backend",
      title: "Redis Crash Course",
      url: "https://www.youtube.com/watch?v=jgpVdJB2sKQ",
    },
    {
      track: "Backend",
      title: "JWT + Auth Architecture",
      url: "https://www.youtube.com/watch?v=mbsmsi7l3r4",
    },
  ],
  fullstack: [
    {
      track: "Fullstack",
      title: "MERN Stack Full Course",
      url: "https://www.youtube.com/watch?v=7CqJlxBYj-M",
    },
    {
      track: "Fullstack",
      title: "Next.js Crash Course (Traversy Media)",
      url: "https://www.youtube.com/watch?v=wm5gMKuwSYk",
    },
    {
      track: "Projects",
      title: "Fullstack Project Builds (JavaScript Mastery)",
      url: "https://www.youtube.com/@javascriptmastery",
    },
    {
      track: "Fullstack",
      title: "Full Stack Open Course",
      url: "https://www.youtube.com/results?search_query=full+stack+open+course",
    },
    {
      track: "Fullstack",
      title: "React + Node + MongoDB Project",
      url: "https://www.youtube.com/watch?v=mrHNSanmqQ4",
    },
    {
      track: "Projects",
      title: "Build and Deploy Fullstack Apps",
      url: "https://www.youtube.com/@codewithharry",
    },
    {
      track: "Projects",
      title: "Production-grade Fullstack Patterns",
      url: "https://www.youtube.com/@ThePrimeagen",
    },
  ],
};

const interviewQuestionPapers = [
  {
    company: "Amazon",
    title: "Amazon Interview Questions",
    url: "https://www.interviewbit.com/amazon-interview-questions/",
  },
  {
    company: "Google",
    title: "Google Interview Questions",
    url: "https://www.interviewbit.com/google-interview-questions/",
  },
  {
    company: "Microsoft",
    title: "Microsoft Interview Questions",
    url: "https://www.interviewbit.com/microsoft-interview-questions/",
  },
  {
    company: "Meta",
    title: "Meta Interview Questions",
    url: "https://www.interviewbit.com/facebook-interview-questions/",
  },
  {
    company: "Apple",
    title: "Apple Interview Questions",
    url: "https://www.interviewbit.com/apple-interview-questions/",
  },
  {
    company: "Adobe",
    title: "Adobe Interview Questions",
    url: "https://www.interviewbit.com/adobe-interview-questions/",
  },
  {
    company: "Goldman Sachs",
    title: "Goldman Sachs Interview Questions",
    url: "https://www.interviewbit.com/goldman-sachs-interview-questions/",
  },
  {
    company: "Walmart",
    title: "Walmart Interview Questions",
    url: "https://www.interviewbit.com/walmart-interview-questions/",
  },
  {
    company: "TCS",
    title: "TCS Interview Questions",
    url: "https://www.interviewbit.com/tcs-interview-questions/",
  },
  {
    company: "Infosys",
    title: "Infosys Interview Questions",
    url: "https://www.interviewbit.com/infosys-interview-questions/",
  },
  {
    company: "Accenture",
    title: "Accenture Interview Questions",
    url: "https://www.interviewbit.com/accenture-interview-questions/",
  },
  {
    company: "Capgemini",
    title: "Capgemini Interview Questions",
    url: "https://www.interviewbit.com/capgemini-interview-questions/",
  },
  {
    company: "General",
    title: "LeetCode Top Interview Questions",
    url: "https://leetcode.com/problem-list/top-interview-questions/",
  },
  {
    company: "General",
    title: "GeeksforGeeks Company Interview Corner",
    url: "https://www.geeksforgeeks.org/company-interview-corner/",
  },
];

const mockQuestionBank = {
  technical: [
    {
      id: "tech-dsa-1",
      name: "DSA Core Paper",
      questions: [
        {
          question: "Given an array, find the longest subarray with sum K. Explain brute force and optimized approach.",
          keywords: ["prefix", "sum", "hashmap", "o(n)", "subarray"],
        },
        {
          question: "Detect a cycle in a linked list and return the starting node. Explain Floyd’s approach.",
          keywords: ["cycle", "slow", "fast", "floyd", "pointer"],
        },
        {
          question: "Explain difference between BFS and DFS and when each is preferred.",
          keywords: ["bfs", "dfs", "queue", "stack", "graph", "shortest"],
        },
        {
          question: "How would you design an LRU cache with O(1) get/put?",
          keywords: ["lru", "hashmap", "doubly", "linked", "o(1)"],
        },
        {
          question: "What is the time and space complexity of merge sort and quicksort?",
          keywords: ["merge sort", "quick sort", "time complexity", "space", "o(n log n)"],
        },
      ],
    },
    {
      id: "tech-backend-1",
      name: "Backend/API Paper",
      questions: [
        {
          question: "Design REST APIs for a job application platform. Include core endpoints.",
          keywords: ["rest", "endpoint", "get", "post", "put", "delete", "status"],
        },
        {
          question: "How do JWT access and refresh tokens work in authentication?",
          keywords: ["jwt", "access token", "refresh token", "expiry", "auth"],
        },
        {
          question: "How would you optimize a slow SQL query in production?",
          keywords: ["index", "explain", "join", "query plan", "optimize"],
        },
        {
          question: "Explain rate limiting strategies for public APIs.",
          keywords: ["rate limit", "token bucket", "redis", "throttle", "api"],
        },
        {
          question: "How would you handle caching and cache invalidation?",
          keywords: ["cache", "redis", "ttl", "invalidation", "stale"],
        },
      ],
    },
    {
      id: "tech-frontend-1",
      name: "Frontend/System Paper",
      questions: [
        {
          question: "How does React reconciliation work and why are keys important?",
          keywords: ["react", "reconciliation", "virtual dom", "keys", "render"],
        },
        {
          question: "Difference between controlled and uncontrolled components in React.",
          keywords: ["controlled", "uncontrolled", "state", "form", "react"],
        },
        {
          question: "How do you improve web performance in a large dashboard?",
          keywords: ["lazy loading", "memoization", "bundle", "performance", "cache"],
        },
        {
          question: "Explain CORS and how frontend-backend apps handle it.",
          keywords: ["cors", "origin", "headers", "preflight", "api"],
        },
        {
          question: "How would you structure reusable components and state management?",
          keywords: ["components", "reusable", "state", "context", "redux"],
        },
      ],
    },
  ],
  hr: [
    {
      id: "hr-behavioral-1",
      name: "Behavioral HR Paper",
      questions: [
        {
          question: "Tell me about yourself in 60-90 seconds.",
          keywords: ["background", "skills", "projects", "goal", "role"],
        },
        {
          question: "Describe a challenge you faced and how you solved it using STAR format.",
          keywords: ["situation", "task", "action", "result", "impact"],
        },
        {
          question: "Describe a time you worked in a team with conflict.",
          keywords: ["team", "conflict", "communication", "resolution", "outcome"],
        },
        {
          question: "What are your strengths and one improvement area?",
          keywords: ["strength", "improve", "example", "plan", "growth"],
        },
        {
          question: "How do you handle deadlines and pressure?",
          keywords: ["deadline", "priority", "pressure", "plan", "delivery"],
        },
      ],
    },
    {
      id: "hr-companyfit-1",
      name: "Company Fit HR Paper",
      questions: [
        {
          question: "Why do you want to join this company?",
          keywords: ["company", "mission", "role", "growth", "value"],
        },
        {
          question: "Why should we hire you for this role?",
          keywords: ["skills", "fit", "impact", "project", "role"],
        },
        {
          question: "Where do you see yourself in 3 years?",
          keywords: ["career", "growth", "learning", "impact", "goal"],
        },
        {
          question: "Tell us about a project you're most proud of and your contribution.",
          keywords: ["project", "contribution", "ownership", "result", "impact"],
        },
        {
          question: "What motivates you at work?",
          keywords: ["motivation", "learning", "team", "impact", "ownership"],
        },
      ],
    },
  ],
};

function getRoleKey() {
  const role = String(state.inputs?.role || "frontend").toLowerCase();
  if (role.includes("back")) return "backend";
  if (role.includes("full")) return "fullstack";
  return "frontend";
}

function renderStudyCourses() {
  if (!studyList) return;
  const roleKey = getRoleKey();
  const courses = [
    ...(studyCourseCatalog.common || []),
    ...(studyCourseCatalog[roleKey] || []),
  ];
  if (studySubtitle) {
    studySubtitle.textContent = `Recommended courses for ${roleKey} + core interview prep.`;
  }
  studyList.innerHTML = "";
  courses.forEach((course) => {
    const card = document.createElement("article");
    card.className = "study-course-card";
    card.innerHTML = `
      <span class="study-course-track">${course.track}</span>
      <div class="study-course-title">${course.title}</div>
      <a class="study-course-link" href="${course.url}" target="_blank" rel="noopener noreferrer">Open on YouTube</a>
    `;
    studyList.appendChild(card);
  });
}

function openStudyModal() {
  if (!studyModal) return;
  renderStudyCourses();
  studyModal.classList.remove("hidden");
}

function closeStudyModal() {
  if (!studyModal) return;
  studyModal.classList.add("hidden");
}

function renderQuestionPapers() {
  if (!papersList) return;
  papersList.innerHTML = "";
  interviewQuestionPapers.forEach((item) => {
    const card = document.createElement("article");
    card.className = "study-course-card";
    card.innerHTML = `
      <span class="paper-company">${item.company}</span>
      <div class="study-course-title">${item.title}</div>
      <a class="study-course-link" href="${item.url}" target="_blank" rel="noopener noreferrer">Open Question Set</a>
    `;
    papersList.appendChild(card);
  });
}

function openQuestionPapersModal() {
  if (!papersModal) return;
  renderQuestionPapers();
  papersModal.classList.remove("hidden");
  logActivity("question_papers_opened", { count: interviewQuestionPapers.length });
}

function closeQuestionPapersModal() {
  if (!papersModal) return;
  papersModal.classList.add("hidden");
}

function getPapersByType(type) {
  return Array.isArray(mockQuestionBank[type]) ? mockQuestionBank[type] : [];
}

function fillMockPaperOptions(type) {
  if (!mockPaperSelect) return;
  const papers = getPapersByType(type);
  mockPaperSelect.innerHTML = "";
  papers.forEach((paper) => {
    const option = document.createElement("option");
    option.value = paper.id;
    option.textContent = paper.name;
    mockPaperSelect.appendChild(option);
  });
}

function getSelectedPaper(type) {
  const papers = getPapersByType(type);
  const selectedId = String(mockPaperSelect?.value || "");
  return papers.find((paper) => paper.id === selectedId) || papers[0] || null;
}

function pickRandomQuestions(type, paperId, count = 3) {
  const papers = getPapersByType(type);
  const paper = papers.find((p) => p.id === paperId) || papers[0];
  const source = Array.isArray(paper?.questions) ? [...paper.questions] : [];
  for (let i = source.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [source[i], source[j]] = [source[j], source[i]];
  }
  return {
    paper: paper || null,
    questions: source.slice(0, count),
  };
}

function openMockInterviewModal() {
  if (!mockModal) return;
  const type = String(mockTypeSelect?.value || "technical");
  fillMockPaperOptions(type);
  mockModal.classList.remove("hidden");
}

function closeMockInterviewModal() {
  if (!mockModal) return;
  mockModal.classList.add("hidden");
}

function setMockStatus(message, type = "muted") {
  if (!mockStatus) return;
  mockStatus.className = `status ${type}`.trim();
  mockStatus.textContent = message;
}

function renderMockQuestions(type) {
  if (!mockQuestions) return;
  const paper = getSelectedPaper(type);
  const selected = pickRandomQuestions(type, paper?.id || "", 3);
  state.currentMockPaper = selected.paper;
  state.currentMockQuestions = selected.questions || [];
  mockQuestions.innerHTML = "";
  state.currentMockQuestions.forEach((item, idx) => {
    const card = document.createElement("article");
    card.className = "mock-question-card";
    card.innerHTML = `
      <div class="mock-question-title">Q${idx + 1}. ${item.question}</div>
      <textarea class="mock-answer-input" data-idx="${idx}" data-type="${type}" placeholder="Write your answer here..."></textarea>
    `;
    mockQuestions.appendChild(card);
  });
  const paperName = selected.paper?.name || "Selected Paper";
  setMockStatus(`${type.toUpperCase()} round started: ${paperName}. Answer all 3 questions and click Submit Answers.`, "warn");
  logActivity("mock_started", { type, paper: paperName });
}

function scoreMockAnswers() {
  const answers = Array.from(document.querySelectorAll(".mock-answer-input"));
  if (!answers.length) {
    setMockStatus("Start a mock round first.", "warn");
    return;
  }
  const type = answers[0].getAttribute("data-type") || "technical";
  const activeQuestions = Array.isArray(state.currentMockQuestions)
    ? state.currentMockQuestions
    : [];

  let total = 0;
  answers.forEach((input, idx) => {
    const raw = String(input.value || "").toLowerCase();
    const words = raw.split(/\s+/).filter(Boolean);
    const lengthScore = Math.min(40, words.length * 1.2);
    const keys = activeQuestions[idx]?.keywords || [];
    const hits = keys.filter((k) => raw.includes(k.toLowerCase())).length;
    const keywordScore = keys.length ? (hits / keys.length) * 60 : 0;
    total += Math.round(lengthScore + keywordScore);
  });
  const finalScore = Math.max(0, Math.min(100, Math.round(total / answers.length)));
  const grade =
    finalScore >= 80 ? "Excellent" : finalScore >= 65 ? "Good" : finalScore >= 50 ? "Average" : "Needs Improvement";
  setMockStatus(`Mock score: ${finalScore}% (${grade}). Improve clarity, structure, and role-specific keywords.`, finalScore >= 65 ? "ok" : "warn");
  logActivity("mock_submitted", { type, paper: state.currentMockPaper?.name || "", score: finalScore });
}

function parseSkills(value) {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function computeRoadmap(data) {
  const roadmap = [];

  if (data.leetcode.rating < 1600 || data.leetcode.medium < 200) {
    roadmap.push(
      "LeetCode focus: Arrays (50), Sliding Window, Binary Search, Graph BFS/DFS."
    );
    roadmap.push("Practice: 1 contest per week, 2 medium problems daily.");
  } else {
    roadmap.push("LeetCode is strong. Focus on advanced graphs and DP.");
  }

  if (data.codechef.stars < 3) {
    roadmap.push("CodeChef: Prioritize Math, Greedy, Implementation problems.");
    roadmap.push("Participate: Monthly long challenge, weekly starters.");
  } else {
    roadmap.push("CodeChef: Maintain consistency and push to next star level.");
  }

  if (data.github.repos < 5 || data.github.readmeQuality === "Low") {
    roadmap.push(
      "GitHub: Add meaningful repos, strong README, and live deployments."
    );
  }
  return roadmap;
}

function computeStudyPlan(data) {
  const safe = data || {};
  const lc = safe.leetcode || {};
  const gh = safe.github || {};
  const plan = [];

  const mediumRatio = (lc.medium || 0) / Math.max(lc.total || 0, 1);
  if (mediumRatio < 0.45) {
    plan.push("DSA focus: 2 medium LeetCode problems per day.");
    plan.push(`DSA lists: ${studyResources.dsa.join(", ")}.`);
  }

  if ((gh.repos || 0) < 5) {
    plan.push("Projects: Build 1 project per month and deploy it.");
  }

  plan.push(
    `System Design: Read about ${studyResources.system.join(", ")}.`
  );

  return plan;
}

function computeSkillGap(inputs, data) {
  const safeInputs = inputs || {};
  const safeData = data || {};
  const role = String(safeInputs.role || "fullstack").toLowerCase();
  const normalize = (value) => String(value || "").trim().toLowerCase().replace(/[.]/g, "").replace(/\s+/g, " ");
  const displayName = (value) => String(value || "").trim().replace(/\bapi\b/i, "API").replace(/\bui\b/i, "UI");

  const roleDefaults = {
    frontend: ["JavaScript", "React", "HTML", "CSS", "API Integration", "Git", "Testing", "Deployment"],
    backend: ["Node.js", "Express", "REST API", "MongoDB", "SQL", "Authentication", "Testing", "Deployment"],
    fullstack: ["JavaScript", "React", "Node.js", "REST API", "MongoDB", "SQL", "Git", "Testing", "Deployment"],
  };
  const roleActions = {
    frontend: {
      React: "Build one React dashboard component with state, API loading, and error states.",
      JavaScript: "Add one JavaScript feature using async fetch, validation, and DOM/state updates.",
      HTML: "Improve semantic structure and accessibility labels in one page.",
      CSS: "Create one responsive layout and document screenshots in README.",
      "API Integration": "Connect a frontend view to one real API with loading and retry handling.",
    },
    backend: {
      "Node.js": "Build one Node.js endpoint with validation and error handling.",
      Express: "Create an Express CRUD route set and document request/response examples.",
      "REST API": "Publish a REST API collection with auth, pagination, and validation.",
      MongoDB: "Add one MongoDB schema/query feature and explain indexes in README.",
      SQL: "Practice joins, grouping, and one schema design problem.",
      Authentication: "Implement JWT login/logout with protected routes and bcrypt hashing.",
    },
    fullstack: {
      React: "Build a small React UI connected to a backend endpoint.",
      "Node.js": "Ship a Node API and consume it from the frontend.",
      MongoDB: "Persist one full workflow in MongoDB and show sample records.",
    },
  };

  const userTargets = Array.isArray(safeInputs.jobSkills) ? safeInputs.jobSkills : [];
  const mlTargets = Array.isArray(safeData?.ml?.targetSkills) ? safeData.ml.targetSkills : [];
  const targetSkills = [...userTargets, ...mlTargets, ...(roleDefaults[role] || roleDefaults.fullstack)]
    .map(displayName)
    .filter(Boolean)
    .filter((skill, idx, arr) => arr.findIndex((s) => normalize(s) === normalize(skill)) === idx)
    .slice(0, 12);

  const githubLangs = Array.isArray(safeData?.github?.languages) ? safeData.github.languages : [];
  const githubRepos = Number(safeData?.github?.repos) || 0;
  const githubStars = Number(safeData?.github?.stars) || 0;
  const readmeQuality = String(safeData?.github?.readmeQuality || "").toLowerCase();
  const leetTotal = Number(safeData?.leetcode?.total) || 0;
  const leetMedium = Number(safeData?.leetcode?.medium) || 0;
  const leetHard = Number(safeData?.leetcode?.hard) || 0;
  const leetRating = Number(safeData?.leetcode?.rating) || 0;
  const codechefSolved = Number(safeData?.codechef?.solved) || 0;
  const contests = (Number(safeData?.leetcode?.contestsParticipated) || 0) + (Number(safeData?.codechef?.contestsParticipated) || 0);
  const resumeData = loadResumeData?.() || {};
  const resumeSkills = Array.isArray(resumeData.skills) ? resumeData.skills : [];
  const resumeText = [
    ...resumeSkills,
    resumeData.summary || "",
    ...(Array.isArray(resumeData.projects) ? resumeData.projects : []),
    resumeData.uploadedResumeText || "",
  ].join(" ").toLowerCase();
  const profileText = [
    ...githubLangs,
    readmeQuality,
    ...(Array.isArray(safeData?.ml?.strengths) ? safeData.ml.strengths : []),
    ...(Array.isArray(safeData?.achievements) ? safeData.achievements.map((a) => `${a.title || ""} ${a.detail || ""}`) : []),
  ].join(" ").toLowerCase();

  const aliases = {
    javascript: ["javascript", "js", "node", "react"],
    typescript: ["typescript", "ts"],
    react: ["react", "jsx", "frontend"],
    html: ["html"],
    css: ["css", "tailwind", "bootstrap"],
    "nodejs": ["node", "nodejs", "node.js"],
    express: ["express"],
    "rest api": ["rest", "api", "endpoint", "http"],
    "api integration": ["api", "fetch", "axios", "integration"],
    mongodb: ["mongodb", "mongo", "mongoose"],
    sql: ["sql", "mysql", "postgres", "postgresql", "database"],
    authentication: ["auth", "authentication", "jwt", "login", "bcrypt", "session"],
    testing: ["test", "testing", "jest", "unit", "playwright"],
    git: ["git", "github"],
    deployment: ["deploy", "deployment", "vercel", "netlify", "render", "aws"],
    dsa: ["dsa", "algorithm", "data structure", "leetcode", "codechef"],
  };
  const termsFor = (skill) => aliases[normalize(skill)] || [normalize(skill), normalize(skill).replace(/\s+/g, "")];
  const hasAny = (text, terms) => terms.some((term) => text.includes(term));
  const isDsa = (skill) => hasAny(termsFor(skill), ["dsa", "algorithm", "data structure", "leetcode", "codechef"]);

  return targetSkills.map((skill) => {
    const key = normalize(skill);
    const terms = termsFor(skill);
    const evidence = [];
    const missingProof = [];
    let score = 0;

    if (hasAny(profileText, terms)) {
      score += 35;
      evidence.push("shown in GitHub/profile data");
    } else {
      missingProof.push("not visible in GitHub/profile data");
    }

    if (hasAny(resumeText, terms)) {
      score += 25;
      evidence.push("mentioned in resume");
    } else {
      missingProof.push("not mentioned in resume");
    }

    if (["javascript", "react", "nodejs", "express", "rest api", "mongodb", "sql", "api integration"].includes(key)) {
      const repoScore = Math.min(20, githubRepos * 3 + Math.min(5, githubStars));
      score += repoScore;
      if (githubRepos >= 3) evidence.push(`${githubRepos} GitHub repos`);
      else missingProof.push("needs project proof");
    }

    if (key === "git" && githubRepos > 0) {
      score += 35;
      evidence.push("active GitHub profile");
    }
    if (key === "deployment" && (readmeQuality === "good" || githubRepos >= 5)) {
      score += 15;
      evidence.push("portfolio is documented; add deployment links if missing");
    }
    if (key === "testing" && hasAny(resumeText + " " + profileText, ["test", "testing", "jest", "playwright"])) {
      score += 30;
      evidence.push("testing is explicitly mentioned");
    }
    if (key === "authentication" && hasAny(resumeText + " " + profileText, ["auth", "jwt", "login", "bcrypt"])) {
      score += 35;
      evidence.push("auth/JWT evidence found");
    }
    if (isDsa(skill)) {
      const dsaVolume = leetTotal + codechefSolved;
      const dsaScore = Math.min(55, Math.round((dsaVolume / 900) * 35 + (leetMedium / 200) * 10 + (leetHard / 80) * 5 + (contests / 30) * 5));
      score += dsaScore;
      if (dsaVolume >= 400) evidence.push(`${dsaVolume} solved problems`);
      if (leetRating >= 1400) evidence.push(`contest rating ${leetRating}`);
    }

    score = clampScore(score);
    const priority = score >= 75 ? "Covered" : score >= 45 ? "Improve" : "High Priority";
    const present = score >= 75;
    const action =
      roleActions[role]?.[skill] ||
      roleActions.fullstack?.[skill] ||
      (isDsa(skill)
        ? "Solve 15 medium problems from this topic and add contest consistency."
        : `Add one project or resume bullet that proves ${skill}.`);
    const reason = present
      ? `Strong evidence: ${evidence.join(", ") || "profile signals match this skill"}.`
      : score >= 45
        ? `Partial evidence: ${evidence.join(", ") || "some signals found"}. Next: ${action}`
        : `Gap: ${missingProof.slice(0, 2).join(", ") || "not enough proof"}. Next: ${action}`;

    return {
      skill,
      present,
      score,
      priority,
      reason,
      evidence: evidence.join(", "),
      action,
    };
  }).sort((a, b) => a.score - b.score);
}
function computeProgress(data, inputs) {
  const dsa = Math.min(100, Math.round((data.leetcode.total / 600) * 100));
  const contest = Math.min(100, Math.round((data.leetcode.rating / 2000) * 100));
  const github = Math.min(100, Math.round((data.github.repos / 10) * 100));
  const codechef = Math.min(100, Math.round((data.codechef.solved / 800) * 100));
  const hackerrank = Math.min(
    100,
    Math.round(((data.hackerrank.badges + data.hackerrank.certs) / 20) * 100)
  );
  const skills = computeSkillGap(inputs, data);
  const skillGap =
    skills.length === 0
      ? 0
      : Math.min(
          100,
          Math.round(
            skills.reduce((sum, item) => sum + (Number(item.score) || 0), 0) / skills.length
          )
        );
  const projects = Math.min(100, Math.round((data.github.repos / 5) * 100));
  return { dsa, contest, github, codechef, hackerrank, skillGap, projects };
}

function computeKpis(data) {
  const strength = Math.min(
    100,
    Math.round(
        (data.leetcode.total / 600) * 40 +
        (data.codechef.stars / 5) * 25 +
        (data.github.repos / 10) * 20 +
        (data.hackerrank.badges / 10) * 15
    )
  );
  const goal = Math.min(10, Math.round(data.leetcode.medium / 40));
  const readiness = Math.min(
    100,
    Math.round(
      (data.leetcode.medium / 300) * 35 +
        (data.github.repos / 10) * 30 +
        (data.github.stars / 100) * 20 +
        (data.codechef.solved / 800) * 15
    )
  );
  return { strength, goal, readiness };
}

function getWeeklyTasks() {
  try {
    const raw = localStorage.getItem(WEEKLY_TASKS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setWeeklyTasks(data) {
  localStorage.setItem(WEEKLY_TASKS_KEY, JSON.stringify(data));
}

function getWeekIndex() {
  return parseInt(localStorage.getItem(WEEKLY_INDEX_KEY), 10) || 1;
}

function setWeekIndex(value) {
  localStorage.setItem(WEEKLY_INDEX_KEY, String(value));
}

function setWeekPlanSeed(seed) {
  localStorage.setItem(WEEKLY_PLAN_KEY, JSON.stringify(seed));
}

function getWeekPlanSeed() {
  try {
    const raw = localStorage.getItem(WEEKLY_PLAN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function buildDefaultWeeklyTasks() {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  return days.map((day) => ({
    day,
    tasks: [
      { text: "Solve 2 DSA problems", done: false },
      { text: "Review 1 concept", done: false },
    ],
  }));
}

function getWeekCycleNumber(weekIndex) {
  const idx = Number(weekIndex) || 1;
  return ((idx - 1) % 4) + 1;
}

function createWeeklySeed(inputs, data, weekIndex) {
  const role = String(inputs?.role || "fullstack");
  const ml = data?.ml || {};
  const targetSkills = Array.isArray(ml.targetSkills) ? ml.targetSkills.filter(Boolean) : [];
  const skillGaps = computeSkillGap(inputs || state.inputs, data || state.data || {})
    .filter((g) => !g.present)
    .map((g) => g.skill)
    .slice(0, 4);
  const focus = [...new Set([...targetSkills, ...skillGaps])].slice(0, 4);
  const projects = Array.isArray(ml.projects) ? ml.projects.filter(Boolean) : [];
  const project = projects[0] || "Build a role-aligned mini project";
  const studyItems =
    Array.isArray(ml.studyPlan) && ml.studyPlan.length
      ? ml.studyPlan.slice(0, 4)
      : computeStudyPlan(data || state.data || {}).slice(0, 4);
  const cycle = getWeekCycleNumber(weekIndex);
  const weekGoal =
    (ml.plan && ml.plan[`week${cycle}`]) ||
    "Close one major weak area, ship one project milestone, and do one contest.";
  const contestTask =
    (data?.leetcode?.contestsParticipated || 0) < 5
      ? "Join one live contest this week and review mistakes."
      : "Upsolve 2 old contest problems and improve speed.";
  return {
    role,
    focus,
    project,
    studyItems,
    weekGoal,
    contestTask,
  };
}

function getWeeklySeedSignature(seed, weekIndex) {
  return JSON.stringify({
    w: Number(weekIndex) || 1,
    role: seed?.role || "",
    focus: (seed?.focus || []).slice(0, 4),
    project: seed?.project || "",
    weekGoal: seed?.weekGoal || "",
    contestTask: seed?.contestTask || "",
    studyItems: (seed?.studyItems || []).slice(0, 4),
  });
}

function generateWeeklyTasks(profileSeed, weekIndex) {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const tasks = [];
  const focus = profileSeed?.focus || [];
  const role = profileSeed?.role || "fullstack";
  const project = profileSeed?.project || "Build a small portfolio feature";
  const weekGoal = profileSeed?.weekGoal || "Improve one weak area and maintain consistency.";
  const studyItems = Array.isArray(profileSeed?.studyItems) ? profileSeed.studyItems : [];
  const contestTask = profileSeed?.contestTask || "Do one contest practice session.";

  const baseTasks = [
    `Week ${weekIndex} goal: ${weekGoal}`,
    `Solve 2 DSA problems and revise ${focus[0] || "Arrays"}`,
    `Project milestone: ${project}`,
    `${studyItems[0] || `Update notes for ${role} fundamentals`}`,
    `${contestTask}`,
    `${studyItems[1] || `Practice ${focus[1] || "problem-solving"} questions`}`,
    `${studyItems[2] || "Mock interview prep + revision"}`,
  ];

  days.forEach((day, idx) => {
    const dayTasks = [];
    dayTasks.push({ text: baseTasks[idx % baseTasks.length], done: false });
    dayTasks.push({
      text: `Skill focus: ${focus[(idx + 1) % focus.length] || "Problem solving"}`,
      done: false,
    });
    dayTasks.push({
      text: studyItems[idx % Math.max(1, studyItems.length)] || "Review key concepts for 30 minutes",
      done: false,
    });
    tasks.push({ day, tasks: dayTasks });
  });

  return tasks;
}

function renderWeeklyTracker(profileSeed = null, options = {}) {
  const container = document.getElementById("weekly-tracker");
  if (!container) return;
  const force = Boolean(options.force);
  const weekIndex = getWeekIndex();
  const seedSignature = profileSeed ? getWeeklySeedSignature(profileSeed, weekIndex) : "";
  const existingSignature = localStorage.getItem(WEEKLY_SEED_SIG_KEY) || "";
  let weekly = getWeeklyTasks();
  if (!weekly || force || (profileSeed && seedSignature !== existingSignature)) {
    weekly = profileSeed
      ? generateWeeklyTasks(profileSeed, weekIndex)
      : buildDefaultWeeklyTasks();
    setWeeklyTasks(weekly);
    if (profileSeed) {
      localStorage.setItem(WEEKLY_SEED_SIG_KEY, seedSignature);
    }
  }
  container.innerHTML = "";
  weekly.forEach((dayBlock, dayIdx) => {
    const dayEl = document.createElement("div");
    dayEl.className = "weekly-day";
    const title = document.createElement("h4");
    title.textContent = dayBlock.day;
    dayEl.appendChild(title);
    dayBlock.tasks.forEach((task, taskIdx) => {
      const row = document.createElement("label");
      row.className = "weekly-task";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = Boolean(task.done);
      input.addEventListener("change", () => {
        weekly[dayIdx].tasks[taskIdx].done = input.checked;
        setWeeklyTasks(weekly);
        updateWeeklyGoalKpi(weekly);
        updateWeeklyCompleteState(weekly);
        saveWeeklyToDb(weekly, getWeekIndex());
      });
      const span = document.createElement("span");
      span.textContent = task.text;
      row.appendChild(input);
      row.appendChild(span);
      dayEl.appendChild(row);
    });
    container.appendChild(dayEl);
  });
  updateWeeklyGoalKpi(weekly);
  updateWeeklyCompleteState(weekly);
}

function computeWeeklyProgress(weekly) {
  const tasks = weekly.flatMap((day) => day.tasks);
  const total = tasks.length || 1;
  const done = tasks.filter((t) => t.done).length;
  return { done, total };
}

function updateWeeklyGoalKpi(weekly) {
  const goalEl = document.getElementById("kpi-goal");
  if (!goalEl) return;
  const progress = computeWeeklyProgress(weekly);
  goalEl.textContent = `${progress.done}/${progress.total}`;
}

function updateWeeklyCompleteState(weekly) {
  const progress = computeWeeklyProgress(weekly);
  const completeBtn = document.getElementById("weekly-complete");
  const statusEl = document.getElementById("weekly-status");
  if (!completeBtn || !statusEl) return;
  const isComplete = progress.done === progress.total;
  completeBtn.disabled = !isComplete;
  statusEl.textContent = isComplete
    ? "Week complete. Click to generate next week."
    : "Finish all tasks to unlock next week.";
}

function clampScore(value) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function computeRoleScores(inputs, data) {
  const ghLangs = (data.github.languages || []).map((l) => l.toLowerCase());
  const jobSkills = inputs.jobSkills || [];
  const jobSkillsLower = jobSkills.map((s) => s.toLowerCase());
  const frontendSignals = ["react", "vue", "angular", "html", "css", "js"];
  const backendSignals = ["node", "express", "java", "spring", "python", "api"];
  const fullstackSignals = ["fullstack", "mern", "mean", "api", "react"];

  const languageMatch = (signals) =>
    signals.filter((s) => ghLangs.some((l) => l.includes(s))).length;
  const skillMatch = (signals) =>
    signals.filter((s) => jobSkillsLower.some((k) => k.includes(s))).length;

  const base =
    (data.leetcode.total / 600) * 30 +
    (data.leetcode.rating / 2000) * 20 +
    (data.codechef.solved / 800) * 10 +
    (data.github.repos / 10) * 20;

  const frontend =
    base +
    languageMatch(frontendSignals) * 6 +
    skillMatch(frontendSignals) * 5 +
    (inputs.role === "frontend" ? 6 : 0);
  const backend =
    base +
    languageMatch(backendSignals) * 6 +
    skillMatch(backendSignals) * 5 +
    (inputs.role === "backend" ? 6 : 0);
  const fullstack =
    base +
    languageMatch(fullstackSignals) * 6 +
    skillMatch(fullstackSignals) * 5 +
    (inputs.role === "fullstack" ? 6 : 0);

  return {
    frontend: clampScore(frontend),
    backend: clampScore(backend),
    fullstack: clampScore(fullstack),
  };
}

function generateCareerIntel(inputs, data) {
  const scores = computeRoleScores(inputs, data);
  const ranked = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([role, score]) => ({ role, score }));

  const strengths = [];
  if (data.leetcode.total >= 200) strengths.push("Consistent LeetCode volume.");
  if (data.leetcode.rating >= 1500) strengths.push("Strong contest performance.");
  if (data.codechef.solved >= 300) strengths.push("Solid CodeChef problem depth.");
  if (data.github.repos >= 5) strengths.push("Active GitHub portfolio.");
  if (!strengths.length) strengths.push("Profile is early-stage but consistent.");

  const gaps = [];
  if (data.leetcode.medium < 120) gaps.push("Increase medium-level DSA depth.");
  if (data.github.repos < 5) gaps.push("Build more deployable projects.");
  if (data.codechef.solved < 300) gaps.push("Raise CodeChef solved count.");
  if (!inputs.jobSkills.length) gaps.push("Add target job skills for clearer fit.");

  const readiness = clampScore(
    (scores[ranked[0].role] * 0.7) + (data.github.repos / 10) * 30
  );

  const targetSkills = inputs.jobSkills.length
    ? inputs.jobSkills.slice(0, 3)
    : ranked[0].role === "frontend"
      ? ["React", "TypeScript", "CSS Architecture"]
      : ranked[0].role === "backend"
        ? ["Node/Express", "Databases", "Authentication"]
        : ["React", "Node/Express", "System Design"];

  const plan = {
    week1: "Audit fundamentals and fix weak DSA topics. Solve 10 medium problems.",
    week2: "Build one feature-focused mini project and publish it.",
    week3: "Add 2 repo improvements: README + tests or deployment.",
    week4: "Mock interviews + improve one major skill gap.",
  };

  const projects =
    ranked[0].role === "frontend"
      ? ["Responsive portfolio + analytics dashboard", "UI redesign for an open-source app"]
      : ranked[0].role === "backend"
        ? ["JWT auth service with MongoDB", "Rate-limited REST API with caching"]
        : ["Fullstack job tracker", "AI-free resume analyzer with rules engine"];

  return { ranked, strengths, gaps, readiness, targetSkills, plan, projects };
}

function renderCareerIntel(inputs, data) {
  const output = document.getElementById("career-output");
  if (!output) return;
    const intel = data.ml
      ? {
          ranked: data.ml.ranked || [],
          strengths: data.ml.strengths || [],
          gaps: data.ml.gaps || [],
          readiness:
            typeof data.ml.hireProbability === "number"
              ? data.ml.hireProbability
              : computeKpis(data).readiness || 0,
          targetSkills: data.ml.targetSkills || [],
          plan: data.ml.plan || {},
          projects: data.ml.projects || [],
      }
    : generateCareerIntel(inputs, data);

  output.innerHTML = `
    <div class="career-block">
      <h3>1. Ranked Job Recommendations</h3>
      <ul class="career-list">
        ${intel.ranked
          .slice(0, 3)
          .map((item) => `<li>${item.role.toUpperCase()} (${item.score}%)</li>`)
          .join("")}
      </ul>
    </div>
    <div class="career-block">
      <h3>2. Strength Analysis</h3>
      <ul class="career-list">${intel.strengths.map((s) => `<li>${s}</li>`).join("")}</ul>
    </div>
    <div class="career-block">
      <h3>3. Weakness / Skill Gap Analysis</h3>
      <ul class="career-list">${intel.gaps.map((g) => `<li>${g}</li>`).join("")}</ul>
    </div>
    <div class="career-block">
      <h3>4. Job Readiness Probability</h3>
      <p>${intel.readiness}% readiness based on current competitive + project signals.</p>
    </div>
    <div class="career-block">
      <h3>5. Target Skills To Focus (Ranked)</h3>
      <ol class="career-list">
        ${intel.targetSkills.map((s) => `<li>${s}</li>`).join("")}
      </ol>
    </div>
    <div class="career-block">
      <h3>6. 30-Day Plan</h3>
      <p><strong>Week 1:</strong> ${intel.plan.week1}</p>
      <p><strong>Week 2:</strong> ${intel.plan.week2}</p>
      <p><strong>Week 3:</strong> ${intel.plan.week3}</p>
      <p><strong>Week 4:</strong> ${intel.plan.week4}</p>
    </div>
    <div class="career-block">
      <h3>7. Suggested Portfolio Projects</h3>
      <ul class="career-list">${intel.projects.map((p) => `<li>${p}</li>`).join("")}</ul>
    </div>
  `;
}

const projectDetails = {
  "Portfolio website": {
    tech: ["HTML", "CSS", "JavaScript", "Responsive design"],
    features: ["Personal bio + skills", "Project showcase", "Contact form"],
  },
  "React analytics dashboard": {
    tech: ["React", "Chart.js or Recharts", "REST APIs"],
    features: ["KPIs overview", "Filters + sorting", "Export to CSV"],
  },
  "E-commerce storefront UI": {
    tech: ["React or Vue", "State management", "Mock API"],
    features: ["Product grid", "Cart + checkout flow", "Search + filters"],
  },
  "API integration project": {
    tech: ["JavaScript", "REST APIs", "Async fetch"],
    features: ["API search", "Results list", "Error + loading states"],
  },
  "REST API with JWT": {
    tech: ["Node.js", "Express", "JWT", "MongoDB"],
    features: ["Auth routes", "Protected endpoints", "Refresh token flow"],
  },
  "Authentication service": {
    tech: ["Node.js", "Express", "MongoDB", "bcrypt"],
    features: ["Signup/login", "Email verification", "Password reset"],
  },
  "CRUD app with database": {
    tech: ["Node.js", "Express", "MongoDB"],
    features: ["Create/read/update/delete", "Pagination", "Validation"],
  },
  "Payment integration": {
    tech: ["Node.js", "Stripe SDK", "Webhooks"],
    features: ["Payment intent", "Webhook handling", "Receipts"],
  },
  "Job portal": {
    tech: ["React", "Node.js", "MongoDB"],
    features: ["Job listings", "Apply flow", "Admin dashboard"],
  },
  "Chat application": {
    tech: ["Node.js", "Socket.io", "React"],
    features: ["Real-time chat", "Typing indicators", "Message history"],
  },
  "Resume analyzer": {
    tech: ["Node.js", "Rules engine", "Text parsing"],
    features: ["Skill extraction", "Gap report", "PDF upload"],
  },
  "Blogging platform": {
    tech: ["React", "Node.js", "MongoDB"],
    features: ["Editor", "Tags + search", "Comments"],
  },
  "Component-driven UI kit": {
    tech: ["React", "Storybook", "CSS tokens"],
    features: ["Reusable components", "Accessibility checks", "Theming"],
  },
  "Responsive dashboard UI": {
    tech: ["HTML", "CSS", "Charts"],
    features: ["Responsive layout", "KPI cards", "Filter controls"],
  },
  "JWT auth + RBAC service": {
    tech: ["Node.js", "Express", "JWT"],
    features: ["Role-based access", "Admin routes", "Audit logs"],
  },
  "Caching-enabled REST API": {
    tech: ["Node.js", "Redis", "Express"],
    features: ["Cache layer", "Rate limiting", "ETags"],
  },
  "Fullstack job tracker": {
    tech: ["React", "Node.js", "MongoDB"],
    features: ["Pipeline stages", "Reminders", "Analytics"],
  },
  "Portfolio analytics platform": {
    tech: ["React", "Node.js", "Analytics"],
    features: ["Visitor tracking", "Conversion stats", "A/B layout"],
  },
};

function ensureProjectDetail() {
  return {
    container: document.getElementById("project-detail"),
    title: document.getElementById("project-title"),
    tech: document.getElementById("project-tech"),
    features: document.getElementById("project-features"),
    close: document.getElementById("project-close"),
  };
}

function openProjectDetail(name) {
  const detail = ensureProjectDetail();
  if (!detail.container) return;
  const data = projectDetails[name] || {
    tech: ["Choose tools that match your target role"],
    features: ["Define scope", "Build core flow", "Deploy + document"],
  };
  detail.title.textContent = name;
  detail.tech.innerHTML = data.tech.map((t) => `<li>${t}</li>`).join("");
  detail.features.innerHTML = data.features
    .map((f) => `<li>${f}</li>`)
    .join("");
  detail.container.classList.remove("hidden");
}

function bindProjectClicks() {
  const container = document.getElementById("project-list");
  const detail = ensureProjectDetail();
  if (!container || !detail.container) return;
  container.onclick = (event) => {
    const target = event.target.closest(".pill");
    if (!target) return;
    openProjectDetail(target.dataset.project);
  };
  if (detail.close) {
    detail.close.onclick = () => detail.container.classList.add("hidden");
  }
}
function renderDashboard(data) {
  const kpis = computeKpis(data);
  const strengthValue =
    typeof data.ml?.profileStrength === "number"
      ? data.ml.profileStrength
      : kpis.strength;
  document.getElementById("kpi-strength").textContent = `${strengthValue}%`;
  const weekly = getWeeklyTasks();
  if (weekly) {
    updateWeeklyGoalKpi(weekly);
  } else {
    document.getElementById("kpi-goal").textContent = `${kpis.goal}/10`;
  }
  document.getElementById("kpi-ready").textContent = `${kpis.readiness}%`;

  document.getElementById("lc-total").textContent = data.leetcode.total;
  document.getElementById("lc-easy").textContent = data.leetcode.easy;
  document.getElementById("lc-medium").textContent = data.leetcode.medium;
  document.getElementById("lc-hard").textContent = data.leetcode.hard;
  document.getElementById("lc-rating").textContent = data.leetcode.rating;
  document.getElementById("lc-contests").textContent =
    data.leetcode.contestsParticipated ?? 0;
  document.getElementById("lc-rank").textContent = data.leetcode.rank;

  document.getElementById("cc-stars").textContent = `${data.codechef.stars}⭐`;
  document.getElementById("cc-rank").textContent = data.codechef.rank;
  document.getElementById("cc-solved").textContent = data.codechef.solved;
  document.getElementById("cc-contests").textContent =
    data.codechef.contestsParticipated ?? 0;
  document.getElementById("cc-target").textContent =
    data.codechef.stars < 3 ? "3⭐ in 2 months" : "Next star in 3 months";

  document.getElementById("gh-repos").textContent = data.github.repos;
  document.getElementById("gh-stars").textContent = data.github.stars;
  document.getElementById("gh-langs").textContent =
    data.github.languages.join(", ") || "-";
  document.getElementById("gh-readme").textContent = data.github.readmeQuality;

  document.getElementById("hr-badges").textContent = data.hackerrank.badges;
  document.getElementById("hr-certs").textContent = data.hackerrank.certs;
}

function renderAchievements(data) {
  const container = document.getElementById("achievement-list");
  if (!container) return;

  const escapeHtml = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");

  let items = Array.isArray(data?.achievements) ? data.achievements.slice(0, 18) : [];

  if (!items.length) {
    const fallback = [];
    const leetTotal = data?.leetcode?.total || 0;
    const ccStars = data?.codechef?.stars || 0;
    const hrBadges = data?.hackerrank?.badges || 0;
    const hrCerts = data?.hackerrank?.certs || 0;
    const ghRepos = data?.github?.repos || 0;

    if (leetTotal > 0) {
      fallback.push({
        platform: "LeetCode",
        type: "Solved",
        title: `${leetTotal} problems solved`,
        detail: `Medium ${data?.leetcode?.medium || 0}`,
      });
    }
    if (ccStars > 0) {
      fallback.push({
        platform: "CodeChef",
        type: "Rating",
        title: `${ccStars} star profile`,
        detail: `Solved ${data?.codechef?.solved || 0}`,
      });
    }
    if (hrBadges > 0) {
      fallback.push({
        platform: "HackerRank",
        type: "Badge",
        title: `${hrBadges} badges`,
        detail: `${hrCerts} certificates`,
      });
    }
    if (ghRepos > 0) {
      fallback.push({
        platform: "GitHub",
        type: "Portfolio",
        title: `${ghRepos} repositories`,
        detail: `${data?.github?.stars || 0} stars`,
      });
    }
    items = fallback;
  }

  if (items.length === 0) {
    items.push({
      platform: "Profile",
      type: "Info",
      title: "No achievements yet",
      detail: "Run analyzer with public profiles to load badges and certificates.",
    });
  }

  container.innerHTML = items
    .slice(0, 12)
    .map((item) => {
      const platform = escapeHtml(item.platform || "Profile");
      const type = escapeHtml(item.type || "Badge");
      const title = escapeHtml(item.title || item.text || "Achievement");
      const detail = escapeHtml(item.detail || "");
      const url = item.url ? escapeHtml(item.url) : "";
      return `
      <div class="achievement-item achievement-item-rich">
        <div class="achievement-head">
          <span class="achievement-platform">${platform}</span>
          <span class="achievement-type">${type}</span>
        </div>
        <span class="achievement-title">${title}</span>
        <span class="achievement-text">${detail}</span>
        ${url ? `<a class="achievement-link" href="${url}" target="_blank" rel="noopener noreferrer">View</a>` : ""}
      </div>
    `;
    })
    .join("");
}
function renderRoadmap(items) {
  const container = document.getElementById("roadmap");
  container.innerHTML = "";
  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = "roadmap-item";
    div.textContent = item;
    container.appendChild(div);
  });
}

function renderStudyPlan(items) {
  const container = document.getElementById("study-plan");
  container.innerHTML = "";
  const safeItems = Array.isArray(items) ? items : [];
  safeItems.forEach((item) => {
    const div = document.createElement("div");
    div.className = "study-item";
    div.textContent = item;
    container.appendChild(div);
  });
  if (!safeItems.length) {
    const div = document.createElement("div");
    div.className = "study-item";
    div.textContent = "Run Analyze Profile to generate an ML weekly study plan.";
    container.appendChild(div);
  }
}

function renderProjects(roleOrList) {
  const container = document.getElementById("project-list");
  container.innerHTML = "";
  const projects = Array.isArray(roleOrList)
    ? roleOrList
    : roleProjects[roleOrList] || [];
  projects.forEach((proj) => {
    const div = document.createElement("div");
    div.className = "pill";
    div.textContent = proj;
    div.dataset.project = proj;
    container.appendChild(div);
  });
}

function renderSkillGap(skillItems) {
  const container = document.getElementById("skill-gap-grid");
  container.innerHTML = "";
  if (!skillItems.length) {
    const empty = document.createElement("div");
    empty.className = "gap-card";
    empty.textContent =
      "Add target job skills above to generate a skill gap analysis.";
    container.appendChild(empty);
    return;
  }
  skillItems.forEach((item) => {
    const card = document.createElement("div");
    card.className = "gap-card";
    const title = document.createElement("h4");
    title.textContent = item.skill;
    const badge = document.createElement("span");
    badge.className = `badge ${item.present ? "ok" : "missing"}`;
    badge.textContent = item.priority || (item.present ? "Covered" : "High priority");
    const score = document.createElement("p");
    score.className = "muted";
    score.textContent = `Evidence score: ${Number(item.score || 0)}%`;
    const reason = document.createElement("p");
    reason.className = "muted";
    reason.textContent = item.reason;
    const action = document.createElement("p");
    action.className = "muted";
    action.textContent = item.action ? `Action: ${item.action}` : "";
    card.appendChild(title);
    card.appendChild(badge);
    card.appendChild(score);
    card.appendChild(reason);
    if (item.action) card.appendChild(action);
    container.appendChild(card);
  });
}

function renderProgress(data) {
  const progress = computeProgress(data, state.inputs);
  document.getElementById("prog-dsa").style.width = `${progress.dsa}%`;
  document.getElementById("prog-contest").style.width = `${progress.contest}%`;
  document.getElementById("prog-gh").style.width = `${progress.github}%`;
  document.getElementById("prog-cc").style.width = `${progress.codechef}%`;
  document.getElementById("prog-hr").style.width = `${progress.hackerrank}%`;
  document.getElementById("prog-skillgap").style.width = `${progress.skillGap}%`;
  document.getElementById("prog-projects").style.width = `${progress.projects}%`;
}

function formatContestTime(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "Time unavailable";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderTodayContests(contests, scope = "today") {
  const container = document.getElementById("contest-list");
  const status = document.getElementById("contest-status");
  if (!container || !status) return;
  container.innerHTML = "";

  if (!Array.isArray(contests) || contests.length === 0) {
    status.className = "status warn";
    status.textContent = "No contests found right now.";
    return;
  }

  status.className = "status ok";
  status.textContent =
    scope === "upcoming"
      ? `No contests today. Showing ${contests.length} upcoming contest(s).`
      : scope === "cached"
        ? `Showing ${contests.length} cached contest(s).`
        : scope === "links"
          ? "Showing contest platform links."
      : `Found ${contests.length} contest(s) today.`;
  contests.forEach((item) => {
    const card = document.createElement("div");
    card.className = "contest-card";
    card.innerHTML = `
      <div class="contest-platform">${item.platform || "Platform"}</div>
      <div class="contest-name">${item.name || "Contest"}</div>
      <div class="contest-time">Starts: ${formatContestTime(item.startTime)}</div>
      ${
        item.url
          ? `<a class="contest-link" href="${item.url}" target="_blank" rel="noopener noreferrer">Open contest</a>`
          : ""
      }
    `;
    container.appendChild(card);
  });
}

async function loadTodayContests() {
  const status = document.getElementById("contest-status");
  if (!status) return;
  status.className = "status muted";
  status.textContent = "Loading contests...";

  try {
    const data = await fetchWithAuth("/api/contests/today");
    renderTodayContests(data.contests || [], data.scope || "today");
    // Show warnings only when there is no contest data to display.
    if (data.warning && (!Array.isArray(data.contests) || data.contests.length === 0)) {
      status.className = "status warn";
      status.textContent = data.warning;
    }
  } catch {
    status.className = "status err";
    status.textContent = "Could not load contests right now.";
  }
}

function formatHackathonDate(value) {
  if (!value) return "Date TBD";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date TBD";
  return date.toLocaleDateString();
}

function renderHackathons(items, scope = "live") {
  const container = document.getElementById("hackathon-list");
  const status = document.getElementById("hackathon-status");
  if (!container || !status) return;
  container.innerHTML = "";

  if (!Array.isArray(items) || items.length === 0) {
    status.className = "status warn";
    status.textContent = "No hackathons found right now.";
    return;
  }

  status.className = "status ok";
  status.textContent =
    scope === "links"
      ? "Showing trusted hackathon application portals."
      : `Found ${items.length} hackathon(s).`;

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "contest-card";
    card.innerHTML = `
      <div class="contest-platform">${item.source || "Source"}</div>
      <div class="contest-name">${item.name || "Hackathon"}</div>
      <div class="hackathon-meta">${item.location || "Worldwide"}</div>
      <div class="contest-time">${formatHackathonDate(item.startDate)} - ${formatHackathonDate(item.endDate)}</div>
      ${
        item.applyUrl
          ? `<a class="contest-link" href="${item.applyUrl}" target="_blank" rel="noopener noreferrer">Apply Now</a>`
          : ""
      }
    `;
    container.appendChild(card);
  });
}

async function loadHackathons() {
  const status = document.getElementById("hackathon-status");
  if (!status) return;
  status.className = "status muted";
  status.textContent = "Loading hackathons...";

  try {
    const data = await fetchWithAuth("/api/hackathons");
    renderHackathons(data.hackathons || [], data.scope || "live");
    if (data.warning && (!Array.isArray(data.hackathons) || data.hackathons.length === 0)) {
      status.className = "status warn";
      status.textContent = data.warning;
    }
  } catch {
    status.className = "status err";
    status.textContent = "Could not load hackathons right now.";
  }
}

function runAnalysis(data, options = {}) {
  const manualSolved = parseInt(state.inputs.codechefSolved, 10);
  if (Number.isFinite(manualSolved) && manualSolved >= 0) {
    data.codechef.solved = manualSolved;
  }
  renderDashboard(data);
  renderAchievements(data);
  renderCareerIntel(state.inputs, data);
  if (data.ml?.roadmap?.length) {
    renderRoadmap(data.ml.roadmap);
  } else {
    renderRoadmap(computeRoadmap(data));
  }
  const seed = createWeeklySeed(state.inputs, data, getWeekIndex());
  const alignedWeeklyPlan = [
    `This week goal: ${seed.weekGoal}`,
    ...(seed.studyItems || []),
    `Contest task: ${seed.contestTask}`,
    `Project task: ${seed.project}`,
  ];
  renderStudyPlan(alignedWeeklyPlan);
  if (data.ml?.projects?.length) {
    renderProjects(data.ml.projects);
  } else {
    renderProjects(state.inputs.role);
  }
  renderSkillGap(computeSkillGap(state.inputs, data));
  renderProgress(data);
  bindProjectClicks();
  setWeekPlanSeed(seed);
  renderWeeklyTracker(seed, { force: true });
  if (options.track !== false) {
    logActivity("analysis", buildAnalysisSnapshot(data));
  }
}

const weeklyCompleteBtn = document.getElementById("weekly-complete");
if (weeklyCompleteBtn) {
  weeklyCompleteBtn.addEventListener("click", () => {
    const nextWeek = getWeekIndex() + 1;
    setWeekIndex(nextWeek);
    const seed = createWeeklySeed(state.inputs, state.data || loadStoredAnalysis() || {}, nextWeek);
    setWeekPlanSeed(seed);
    const weekly = generateWeeklyTasks(seed, nextWeek);
    setWeeklyTasks(weekly);
    localStorage.setItem(WEEKLY_SEED_SIG_KEY, getWeeklySeedSignature(seed, nextWeek));
    renderWeeklyTracker(seed, { force: true });
    saveWeeklyToDb(weekly, nextWeek);
    logActivity("weekly_complete", { week: nextWeek - 1 });
  });
}

function setStatus(type, message) {
  statusEl.className = `status ${type || ""}`.trim();
  statusEl.textContent = message;
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function decodeTokenPayload(token = "") {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(b64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getUserIdFromToken() {
  const token = getToken();
  const payload = decodeTokenPayload(token || "");
  return String(payload?.id || "");
}

function getName() {
  return localStorage.getItem(NAME_KEY);
}

function getAvatarInitial() {
  const name = (getName() || "").trim();
  return (name[0] || "N").toUpperCase();
}

function renderAvatar(imageDataUrl = "") {
  if (!avatarImg || !avatarFallback) return;
  if (imageDataUrl) {
    avatarImg.src = imageDataUrl;
    avatarImg.style.display = "block";
    avatarFallback.style.display = "none";
    return;
  }
  avatarImg.removeAttribute("src");
  avatarImg.style.display = "none";
  avatarFallback.textContent = getAvatarInitial();
  avatarFallback.style.display = "inline";
}

function renderPublicProfileControls(profile = {}) {
  const isPublic = profile?.isPublic !== false;
  if (!visibilityToggleBtn) return;
  visibilityToggleBtn.textContent = isPublic ? "Public" : "Private";
  visibilityToggleBtn.classList.remove("is-public", "is-private");
  visibilityToggleBtn.classList.add(isPublic ? "is-public" : "is-private");
}

function buildClientPublicProfileUrl(slug = "") {
  const safeSlug = String(slug || "").trim();
  if (!safeSlug) return "";
  try {
    const base = new URL(window.location.href);
    base.search = "";
    base.hash = "";
    base.pathname = base.pathname.replace(/[^/]*$/, "public-profile.html");
    base.searchParams.set("u", safeSlug);
    return base.toString();
  } catch {
    return `public-profile.html?u=${encodeURIComponent(safeSlug)}`;
  }
}

function resolveShareLinkFromResult(result = {}) {
  const raw = String(result?.publicUrl || "").trim();
  const slug = String(result?.publicSlug || state.inputs?.publicSlug || "").trim();
  const clientUrl = buildClientPublicProfileUrl(slug);

  if (!raw || /^null\//i.test(raw)) {
    return clientUrl;
  }

  try {
    const parsed = new URL(raw, window.location.href);
    // Convert old API-share links to UI page links.
    if (/\/api\/profile\/public\//i.test(parsed.pathname)) {
      const fromPathSlug = parsed.pathname.split("/").pop() || slug;
      return buildClientPublicProfileUrl(fromPathSlug);
    }
    // If app is opened via file://, always use local page link.
    if (window.location.protocol === "file:") {
      return clientUrl;
    }
    // If origins differ, prefer current app origin link to avoid broken host links.
    const currentOrigin = String(window.location.origin || "").trim();
    if (currentOrigin && currentOrigin !== "null" && parsed.origin !== currentOrigin) {
      return clientUrl;
    }
    return parsed.toString();
  } catch {
    return clientUrl;
  }
}

function ensurePublicSlug() {
  const existing = String(state.inputs?.publicSlug || "").trim();
  if (existing) return existing;
  const userId = getUserIdFromToken();
  const fallback = userId ? `user-${userId}` : "";
  if (fallback) {
    state.inputs.publicSlug = fallback;
    persistProfile(state.inputs);
  }
  return fallback;
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(NAME_KEY);
  localStorage.removeItem(PROFILE_KEY);
  localStorage.removeItem(ANALYSIS_KEY);
  localStorage.removeItem(LOCK_KEY);
  localStorage.removeItem(SESSION_START_KEY);
  localStorage.removeItem(ACTIVITY_LOG_KEY);
  localStorage.removeItem(ACTIVITY_SESSION_ID_KEY);
  localStorage.removeItem(ACTIVITY_LAST_LOGIN_DAY_KEY);
  localStorage.removeItem(WEEKLY_SEED_SIG_KEY);
  activityRemoteLogs = [];
  activityRemoteStats = null;
  activityLastSyncAt = 0;
}

function renderWelcome() {
  const name = (getName() || "").trim();
  const welcomeNameEl = document.getElementById("welcome-name");
  if (!welcomeNameEl) return;
  welcomeNameEl.textContent = name || "there";
  renderAvatar(state.inputs?.profileImage || "");
}

function readProfileFromForm() {
  const currentPublic = state.inputs || {};
  return {
    leetcode: document.getElementById("leetcode").value.trim(),
    codechef: document.getElementById("codechef").value.trim(),
    codechefSolved: document.getElementById("codechef-solved").value.trim(),
    github: document.getElementById("github").value.trim(),
    hackerrank: document.getElementById("hackerrank").value.trim(),
    role: document.getElementById("role").value,
    jobSkills: parseSkills(document.getElementById("job-skills").value),
    profileImage: state.inputs?.profileImage || "",
    isPublic: currentPublic.isPublic !== false,
    publicSlug: String(currentPublic.publicSlug || ""),
    publicUrl: String(currentPublic.publicUrl || ""),
  };
}

function writeProfileToForm(profile) {
  if (!profile) return;
  if (profile.leetcode !== undefined) {
    document.getElementById("leetcode").value = profile.leetcode || "";
  }
  if (profile.codechef !== undefined) {
    document.getElementById("codechef").value = profile.codechef || "";
  }
  if (profile.codechefSolved !== undefined) {
    document.getElementById("codechef-solved").value =
      profile.codechefSolved || "";
  }
  if (profile.github !== undefined) {
    document.getElementById("github").value = profile.github || "";
  }
  if (profile.hackerrank !== undefined) {
    document.getElementById("hackerrank").value = profile.hackerrank || "";
  }
  if (profile.role) {
    document.getElementById("role").value = profile.role;
  }
  if (profile.jobSkills) {
    document.getElementById("job-skills").value = profile.jobSkills.join(", ");
  }
  state.inputs.profileImage = profile.profileImage || "";
  state.inputs.isPublic = profile?.isPublic !== false;
  state.inputs.publicSlug = String(profile.publicSlug || "");
  state.inputs.publicUrl = String(profile.publicUrl || "");
  renderAvatar(state.inputs.profileImage);
  renderPublicProfileControls(state.inputs);
}

function setProfileLocked(locked) {
  // Lock only analyzer identity fields. Keep resume/upload controls usable.
  const lockableSelectors = [
    "#leetcode",
    "#codechef",
    "#codechef-solved",
    "#github",
    "#hackerrank",
    "#role",
    "#job-skills",
  ];
  document.querySelectorAll(lockableSelectors.join(", ")).forEach((el) => {
    el.disabled = locked;
  });
  if (editButton) {
    editButton.textContent = locked ? "Edit Profile" : "Lock Profile";
  }
  localStorage.setItem(LOCK_KEY, locked ? "1" : "0");
}

function loadStoredProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function loadStoredAnalysis() {
  try {
    const raw = localStorage.getItem(ANALYSIS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistAnalysis(data) {
  localStorage.setItem(ANALYSIS_KEY, JSON.stringify(data));
}

function loadActivityLog() {
  try {
    const raw = localStorage.getItem(ACTIVITY_LOG_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const localLogs = Array.isArray(parsed) ? parsed : [];
    if (!activityRemoteLogs.length) return localLogs;
    const merged = [...localLogs, ...activityRemoteLogs];
    const unique = new Map();
    merged.forEach((entry) => {
      const type = String(entry?.type || "event");
      const at = Number(entry?.at || 0);
      if (!at) return;
      const key = `${type}:${at}:${JSON.stringify(entry?.payload || {})}`;
      if (!unique.has(key)) {
        unique.set(key, {
          type,
          at,
          payload: entry?.payload && typeof entry.payload === "object" ? entry.payload : {},
        });
      }
    });
    return Array.from(unique.values()).sort((a, b) => a.at - b.at);
  } catch {
    return activityRemoteLogs.length ? [...activityRemoteLogs] : [];
  }
}

function persistActivityLog(logs) {
  localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(logs));
}

function getActivitySessionId() {
  let sessionId = localStorage.getItem(ACTIVITY_SESSION_ID_KEY) || "";
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(ACTIVITY_SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

async function syncActivityFromDb(force = false) {
  if (!getToken()) return [];
  const now = Date.now();
  if (!force && now - activityLastSyncAt < 20000 && activityRemoteLogs.length) {
    return activityRemoteLogs;
  }
  try {
    const data = await fetchWithAuth("/api/activity/logs?limit=5000");
    const logs = Array.isArray(data?.logs) ? data.logs : [];
    activityRemoteLogs = logs
      .map((entry) => ({
        type: String(entry?.type || "event"),
        at: Number(entry?.at || Date.now()),
        payload: entry?.payload && typeof entry.payload === "object" ? entry.payload : {},
      }))
      .sort((a, b) => a.at - b.at);
    activityRemoteStats = data?.stats || null;
    activityLastSyncAt = now;
    persistActivityLog(activityRemoteLogs.slice(-1000));
    return activityRemoteLogs;
  } catch {
    return loadActivityLog();
  }
}

async function logActivityToDb(entry) {
  if (!getToken()) return;
  try {
    await fetchWithAuth("/api/activity/log", {
      method: "POST",
      body: JSON.stringify({
        type: entry.type,
        payload: entry.payload || {},
        at: entry.at,
        sessionId: getActivitySessionId(),
        source: "web",
      }),
    });
    activityRemoteLogs.push(entry);
    activityRemoteLogs.sort((a, b) => a.at - b.at);
    if (activityRemoteLogs.length > 5000) {
      activityRemoteLogs.splice(0, activityRemoteLogs.length - 5000);
    }
  } catch {
    // local fallback only
  }
}

function logActivity(type, payload = {}) {
  if (!getToken()) return;
  const logs = loadActivityLog();
  const entry = {
    type: String(type || "event"),
    at: Date.now(),
    payload: payload || {},
  };
  logs.push(entry);
  if (logs.length > 500) {
    logs.splice(0, logs.length - 500);
  }
  persistActivityLog(logs);
  logActivityToDb(entry);
  if (activityModal && !activityModal.classList.contains("hidden")) {
    renderActivityModal();
  }
}

function ensureActivitySession() {
  if (!getToken()) return;
  const existing = parseInt(localStorage.getItem(SESSION_START_KEY) || "0", 10);
  if (!Number.isFinite(existing) || existing <= 0) {
    localStorage.setItem(SESSION_START_KEY, String(Date.now()));
  }
  const todayKey = new Date().toISOString().slice(0, 10);
  const lastLoginDay = localStorage.getItem(ACTIVITY_LAST_LOGIN_DAY_KEY) || "";
  if (todayKey !== lastLoginDay) {
    localStorage.setItem(ACTIVITY_LAST_LOGIN_DAY_KEY, todayKey);
    logActivity("login", { note: "Session started" });
  }
  syncActivityFromDb(true);
}

function buildAnalysisSnapshot(data) {
  const kpis = computeKpis(data);
  return {
    profileStrength: Number(kpis.strength) || 0,
    readiness: Number(kpis.readiness) || 0,
    hireProbability: Number(data?.ml?.hireProbability ?? kpis.readiness) || 0,
    leetContests: Number(data?.leetcode?.contestsParticipated ?? 0) || 0,
    codechefContests: Number(data?.codechef?.contestsParticipated ?? 0) || 0,
  };
}

function formatActivityTime(ts) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function describeActivity(entry) {
  const payload = entry?.payload || {};
  switch (entry?.type) {
    case "login":
      return "Logged in and started tracking.";
    case "analysis":
      return `Analyzed profile (Strength ${payload.profileStrength || 0}%, Readiness ${payload.readiness || 0}%, Hire ${payload.hireProbability || 0}%).`;
    case "resume_generated":
      return "Generated a resume draft.";
    case "resume_uploaded":
      return `Added resume file${payload.name ? `: ${payload.name}` : ""}.`;
    case "resume_readiness":
      return `Checked resume readiness (${payload.score || 0}%).`;
    case "resume_downloaded":
      return "Downloaded resume PDF.";
    case "chat":
      return `Asked NexMind: "${String(payload.message || "").slice(0, 60)}${String(payload.message || "").length > 60 ? "..." : ""}"`;
    case "weekly_complete":
      return `Completed week ${payload.week || "-"}.`;
    case "question_papers_opened":
      return `Opened question papers (${payload.count || 0} links).`;
    case "mock_started":
      return `Started ${payload.type || "technical"} mock interview.`;
    case "mock_submitted":
      return `Submitted mock interview (${payload.score || 0}%).`;
    default:
      return "Activity recorded.";
  }
}

function getAnalysisSnapshots(logs) {
  return logs
    .filter((entry) => entry?.type === "analysis" && entry?.payload)
    .map((entry) => entry.payload);
}

function getActivitySummary(logs) {
  const snapshots = getAnalysisSnapshots(logs);
  const first = snapshots[0] || null;
  const latest = snapshots[snapshots.length - 1] || null;
  const deltaStrength = first && latest ? latest.profileStrength - first.profileStrength : 0;
  const deltaReadiness = first && latest ? latest.readiness - first.readiness : 0;
  const deltaHire = first && latest ? latest.hireProbability - first.hireProbability : 0;
  const activeDaySet = new Set(
    logs.map((entry) => {
      const d = new Date(entry?.at || Date.now());
      d.setHours(0, 0, 0, 0);
      return d.toISOString().slice(0, 10);
    })
  );
  const activeDays = activeDaySet.size;
  let streak = 0;
  if (activeDays > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let cursor = new Date(today);
    while (activeDaySet.has(cursor.toISOString().slice(0, 10))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  return {
    events: logs.length,
    analyses: snapshots.length,
    latest,
    deltaStrength,
    deltaReadiness,
    deltaHire,
    activeDays,
    streak,
  };
}

function isProgressActivity(entry) {
  const type = String(entry?.type || "");
  return [
    "analysis",
    "weekly_complete",
    "resume_generated",
    "resume_uploaded",
    "resume_readiness",
    "mock_submitted",
  ].includes(type);
}

function renderActivityHeatmap(logs, sessionStartTs = 0) {
  if (!activityHeatmap) return;
  const realLogs = Array.isArray(logs)
    ? logs.filter((entry) => Number(entry?.at) > 0 && isProgressActivity(entry))
    : [];
  if (!realLogs.length) {
    activityHeatmap.innerHTML = `
      <div class="heatmap-shell">
        <div class="heatmap-empty-note">No real progress activity logged yet.</div>
      </div>
    `;
    return;
  }
  const now = new Date();
  const currentYear = now.getFullYear();
  const firstLogTs = Math.min(...realLogs.map((entry) => Number(entry.at)));
  const effectiveStartTs =
    sessionStartTs > 0 ? Math.max(sessionStartTs, firstLogTs) : firstLogTs;
  const effectiveStart = new Date(effectiveStartTs);
  effectiveStart.setHours(0, 0, 0, 0);
  const monthAlignedStart = new Date(
    effectiveStart.getFullYear(),
    effectiveStart.getMonth(),
    1
  );
  const jan1 = new Date(currentYear, 0, 1);
  const dec31 = new Date(currentYear, 11, 31);
  const start = monthAlignedStart < jan1 ? jan1 : monthAlignedStart;
  const end = dec31;

  const byDay = new Map();
  const dayTimes = new Map();
  realLogs.forEach((entry) => {
    const d = new Date(entry?.at || Date.now());
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) || 0) + 1);
    const ts = Number(entry?.at) || Date.now();
    const meta = dayTimes.get(key) || { min: ts, max: ts };
    meta.min = Math.min(meta.min, ts);
    meta.max = Math.max(meta.max, ts);
    dayTimes.set(key, meta);
  });

  const weekStart = new Date(start);
  weekStart.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // Monday
  const totalDays = Math.floor((end - weekStart) / (24 * 60 * 60 * 1000)) + 1;
  const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));
  const totalSlots = totalWeeks * 7;
  const points = [];
  for (let i = 0; i < totalSlots; i += 1) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const inRange = d >= start && d <= end;
    const key = d.toISOString().slice(0, 10);
    const times = dayTimes.get(key);
    const activeMinutes = times
      ? Math.max(1, Math.round((times.max - times.min) / (60 * 1000)))
      : 0;
    const actions = inRange ? (byDay.get(key) || 0) : 0;
    const score = actions + activeMinutes / 30;
    points.push({
      date: key,
      count: actions,
      score,
      inRange,
      dow: i % 7, // monday-first
      week: Math.floor(i / 7),
      month: d.getMonth(),
    });
  }

  const monthLabels = [];
  let lastMonth = -1;
  for (let w = 0; w < totalWeeks; w += 1) {
    const weekPoints = points.slice(w * 7, w * 7 + 7);
    const firstInRange = weekPoints.find((p) => p?.inRange);
    if (!firstInRange) continue;
    if (firstInRange.month !== lastMonth) {
      monthLabels.push({
        name: new Date(currentYear, firstInRange.month, 1).toLocaleString([], { month: "short" }),
        col: w,
      });
      lastMonth = firstInRange.month;
    }
  }

  const pointsInRange = points.filter((p) => p.inRange);
  const activeDaysInRange = pointsInRange.filter((p) => p.count > 0).length;
  const previousMonthDate = new Date(currentYear, now.getMonth() - 1, 1);
  const previousMonthKey = `${previousMonthDate.getFullYear()}-${String(
    previousMonthDate.getMonth() + 1
  ).padStart(2, "0")}`;
  const activeDaysLastMonth = pointsInRange.filter((p) => {
    if (p.count <= 0) return false;
    return String(p.date || "").slice(0, 7) === previousMonthKey;
  }).length;
  const activeDaysLastWeek = points
    .filter((p) => p.inRange)
    .slice(-7)
    .filter((p) => p.count > 0).length;
  const totalProgressActions = realLogs.length;

  activityHeatmap.innerHTML = `
    <div class="heatmap-shell">
      <div class="heatmap-months"></div>
      <div class="heatmap-body">
        <div class="heatmap-days">
          <span class="heatmap-day">Mon</span>
          <span class="heatmap-day"></span>
          <span class="heatmap-day">Wed</span>
          <span class="heatmap-day"></span>
          <span class="heatmap-day">Fri</span>
          <span class="heatmap-day"></span>
          <span class="heatmap-day"></span>
        </div>
        <div class="heatmap-grid-year"></div>
      </div>
      <div class="heatmap-stats">
        <div class="heatmap-stat"><strong>${activeDaysInRange}</strong><span>Active days in range</span></div>
        <div class="heatmap-stat"><strong>${activeDaysLastMonth}</strong><span>Active days previous month</span></div>
        <div class="heatmap-stat"><strong>${activeDaysLastWeek}</strong><span>Active days last week</span></div>
        <div class="heatmap-stat"><strong>${totalProgressActions}</strong><span>Total progress actions</span></div>
      </div>
    </div>
  `;

  const monthWrap = activityHeatmap.querySelector(".heatmap-months");
  const grid = activityHeatmap.querySelector(".heatmap-grid-year");
  if (!monthWrap || !grid) return;

  const cell = 12;
  const gap = 3;
  monthWrap.style.width = `${totalWeeks * (cell + gap)}px`;
  grid.style.gridTemplateColumns = `repeat(${totalWeeks}, ${cell}px)`;
  monthLabels.forEach((m) => {
    const lab = document.createElement("span");
    lab.className = "heatmap-month-label";
    lab.textContent = m.name;
    lab.style.left = `${m.col * (cell + gap)}px`;
    monthWrap.appendChild(lab);
  });

  points.forEach((p) => {
    const level =
      p.score <= 0
        ? 0
        : p.score < 1.8
          ? 1
          : p.score < 3.5
            ? 2
            : p.score < 6
              ? 3
              : 4;
    const cell = document.createElement("div");
    cell.className = `activity-cell${p.inRange ? "" : " empty"}${level ? ` level-${level}` : ""}`;
    cell.style.gridColumn = String(p.week + 1);
    cell.style.gridRow = String(p.dow + 1);
    cell.title = `${p.date}: ${p.count} progress action${p.count === 1 ? "" : "s"}`;
    grid.appendChild(cell);
  });
}

async function renderActivityModal() {
  if (!activitySummary || !activityLog) return;
  await syncActivityFromDb(false);
  const logs = loadActivityLog();
  const startRaw = parseInt(localStorage.getItem(SESSION_START_KEY) || "0", 10);
  const firstTrackedAt = Number(activityRemoteStats?.firstLoginAt || startRaw || 0);
  const sessionLogs = logs;
  const progressLogs = sessionLogs.filter((entry) => isProgressActivity(entry));
  if (activitySessionText) {
    activitySessionText.textContent = firstTrackedAt
      ? `Tracking since ${formatActivityTime(firstTrackedAt)}`
      : "Tracking your work from this login session.";
  }

  const summary = getActivitySummary(progressLogs);
  const deltaText = summary.analyses >= 2
    ? `Strength ${summary.deltaStrength >= 0 ? "+" : ""}${summary.deltaStrength}% | Readiness ${summary.deltaReadiness >= 0 ? "+" : ""}${summary.deltaReadiness}% | Hire ${summary.deltaHire >= 0 ? "+" : ""}${summary.deltaHire}%`
    : "Run Analyze Profile at least twice to see improvement deltas.";

  activitySummary.innerHTML = `
    <div class="activity-summary-item">
      <strong>Session Events</strong>
      <span>${summary.events}</span>
    </div>
    <div class="activity-summary-item">
      <strong>Analyses Run</strong>
      <span>${summary.analyses}</span>
    </div>
    <div class="activity-summary-item">
      <strong>Latest Score</strong>
      <span>${summary.latest ? `Readiness ${summary.latest.readiness}% | Hire ${summary.latest.hireProbability}%` : "No analysis yet"}</span>
    </div>
    <div class="activity-summary-item">
      <strong>Improvement</strong>
      <span>${deltaText}</span>
    </div>
    <div class="activity-summary-item">
      <strong>Active Days</strong>
      <span>${summary.activeDays} day(s) | Streak ${summary.streak}</span>
    </div>
  `;

  renderActivityHeatmap(progressLogs, startRaw);
  activityLog.innerHTML = "";
  const latestFirst = [...sessionLogs].reverse().slice(0, 30);
  if (!latestFirst.length) {
    const empty = document.createElement("div");
    empty.className = "activity-log-item";
    empty.textContent = "No activity yet.";
    activityLog.appendChild(empty);
    return;
  }
  latestFirst.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "activity-log-item";
    row.innerHTML = `
      <div>${describeActivity(entry)}</div>
      <div class="activity-log-time">${formatActivityTime(entry.at)}</div>
    `;
    activityLog.appendChild(row);
  });
}

function openActivityModal() {
  if (!activityModal) return;
  renderPublicProfileControls(state.inputs || {});
  renderActivityModal();
  activityModal.classList.remove("hidden");
}

function closeActivityModal() {
  if (!activityModal) return;
  activityModal.classList.add("hidden");
}

function loadResumeData() {
  try {
    const raw = localStorage.getItem(RESUME_DATA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistResumeData(data) {
  localStorage.setItem(RESUME_DATA_KEY, JSON.stringify(data));
}

function splitLines(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderBullets(items) {
  if (!Array.isArray(items) || !items.length) return "<p>-</p>";
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function buildResumePdfSections(data) {
  const analysis = getResumeAnalysis();
  const ml = analysis?.ml || {};
  const fallbackSkills = Array.isArray(ml.targetSkills) ? ml.targetSkills : [];
  const fallbackProjects = Array.isArray(ml.projects) ? ml.projects : [];
  const skills = Array.isArray(data.skills) && data.skills.length ? data.skills : fallbackSkills;
  const projects =
    Array.isArray(data.projects) && data.projects.length ? data.projects : fallbackProjects;
  const achievements = Array.isArray(data.achievements) ? data.achievements : [];
  const certs = Array.isArray(data.certifications) ? data.certifications : [];

  const summary =
    data.summary ||
    "Focused software engineer with strong problem-solving skills and project delivery mindset.";

  const education = `${data.degree || "Degree"} - ${data.college || "College/University"}${
    data.gradYear ? ` (${data.gradYear})` : ""
  }${data.cgpa ? ` | CGPA: ${data.cgpa}` : ""}`;

  return {
    name: data.name || "Candidate Name",
    contact: [data.email, data.phone, data.location].filter(Boolean).join(" | "),
    links: [data.linkedin, data.portfolio].filter(Boolean).join(" | "),
    sections: [
      { title: "PROFESSIONAL SUMMARY", lines: [summary] },
      { title: "EDUCATION", lines: [education] },
      { title: "TECHNICAL SKILLS", lines: [skills.length ? skills.join(", ") : "N/A"] },
      { title: "PROJECTS", lines: (projects.length ? projects : ["N/A"]).map((p) => `- ${p}`) },
      {
        title: "ACHIEVEMENTS",
        lines: (achievements.length ? achievements : ["N/A"]).map((p) => `- ${p}`),
      },
      {
        title: "CERTIFICATIONS",
        lines: (certs.length ? certs : ["N/A"]).map((p) => `- ${p}`),
      },
    ],
  };
}

function getResumeAnalysis() {
  if (state?.data) return state.data;
  return loadStoredAnalysis() || null;
}

function getMlResumeDefaults() {
  const analysis = getResumeAnalysis();
  const ml = analysis?.ml || {};
  const profile = analysis || {};
  const suggestedSkills = [
    ...(Array.isArray(ml.targetSkills) ? ml.targetSkills : []),
    ...(Array.isArray(profile?.github?.languages) ? profile.github.languages : []),
  ]
    .map((s) => String(s).trim())
    .filter(Boolean);
  const dedupeSkills = [...new Set(suggestedSkills)].slice(0, 10);
  const suggestedProjects = Array.isArray(ml.projects) ? ml.projects.slice(0, 4) : [];
  const suggestedSummary = ml?.ranked?.[0]?.role
    ? `Aspiring ${ml.ranked[0].role} engineer with hands-on coding practice and project delivery, focused on measurable impact and clean implementation.`
    : "";
  return {
    skills: dedupeSkills,
    projects: suggestedProjects,
    summary: suggestedSummary,
  };
}

function buildResumeHtml(data) {
  const analysis = getResumeAnalysis();
  const ml = analysis?.ml || {};
  const skills = Array.isArray(data.skills) ? data.skills : [];
  const projects = Array.isArray(data.projects) ? data.projects : [];
  const achievements = Array.isArray(data.achievements) ? data.achievements : [];
  const certs = Array.isArray(data.certifications) ? data.certifications : [];
  const mlProjects = Array.isArray(ml.projects) ? ml.projects.slice(0, 3) : [];
  const mlSkills = Array.isArray(ml.targetSkills) ? ml.targetSkills.slice(0, 5) : [];
  const rankedRole = Array.isArray(ml.ranked) && ml.ranked[0]?.role ? ml.ranked[0].role : "";
  const readiness = Number.isFinite(ml.readiness) ? `${ml.readiness}%` : "";
  const hireProbability = Number.isFinite(ml.hireProbability) ? `${ml.hireProbability}%` : "";

  const finalProjects = projects.length ? projects : mlProjects;
  const finalSkills = skills.length ? skills : mlSkills;

  const summary =
    data.summary ||
    `Focused ${rankedRole || "software"} engineer with hands-on delivery, coding consistency, and problem-solving depth${
      readiness ? ` (ML readiness ${readiness})` : ""
    }.`;
  const degreeLine = `${data.degree || "Degree"} - ${data.college || "College/University"}${
    data.gradYear ? ` (${data.gradYear})` : ""
  }`;
  const subLine = [data.cgpa ? `CGPA: ${data.cgpa}` : "", `${parseInt(data.experienceMonths || 0, 10) || 0} months experience`]
    .filter(Boolean)
    .join(" | ");
  const links = [data.linkedin, data.portfolio].filter(Boolean).map(escapeHtml).join(" | ");
  const contact = [data.email, data.phone, data.location].filter(Boolean).map(escapeHtml).join(" | ");

  return `
  <article class="resume-document">
    <header class="resume-head">
      <h1 class="resume-name">${escapeHtml(data.name || "Candidate Name")}</h1>
      <p class="resume-contact">${contact || "Email | Phone | Location"}</p>
      <p class="resume-contact">${links || "LinkedIn | Portfolio"}</p>
    </header>

    <section class="resume-section">
      <h4>Professional Summary</h4>
      <p>${escapeHtml(summary)}</p>
    </section>

    <section class="resume-section">
      <h4>Education</h4>
      <p><strong>${escapeHtml(degreeLine)}</strong></p>
      <p>${escapeHtml(subLine || "CGPA and experience details")}</p>
    </section>

    <section class="resume-section">
      <h4>Technical Skills</h4>
      <p>${finalSkills.length ? escapeHtml(finalSkills.join(", ")) : "Add role-specific technical skills."}</p>
    </section>

    <section class="resume-section">
      <h4>Projects</h4>
      ${renderBullets(finalProjects)}
    </section>

    <section class="resume-section">
      <h4>Achievements</h4>
      ${renderBullets(achievements)}
    </section>

    <section class="resume-section">
      <h4>Certifications</h4>
      ${renderBullets(certs)}
    </section>
  </article>
  `;
}

function renderResumePreview(data) {
  const actions = document.getElementById("resume-output-actions");
  if (!actions) return;
  if (actions) actions.classList.remove("hidden");
}

function setResumeStatus(message, type = "muted") {
  const el = document.getElementById("resume-status");
  if (!el) return;
  el.className = `status ${type}`.trim();
  el.textContent = message;
}

function gatherResumeFormData() {
  return {
    name: document.getElementById("resume-name")?.value.trim() || "",
    email: document.getElementById("resume-email")?.value.trim() || "",
    phone: document.getElementById("resume-phone")?.value.trim() || "",
    location: document.getElementById("resume-location")?.value.trim() || "",
    linkedin: document.getElementById("resume-linkedin")?.value.trim() || "",
    portfolio: document.getElementById("resume-portfolio")?.value.trim() || "",
    college: document.getElementById("resume-college")?.value.trim() || "",
    degree: document.getElementById("resume-degree")?.value.trim() || "",
    cgpa: document.getElementById("resume-cgpa")?.value.trim() || "",
    gradYear: document.getElementById("resume-grad-year")?.value.trim() || "",
    experienceMonths: parseInt(document.getElementById("resume-exp-months")?.value || "0", 10) || 0,
    summary: document.getElementById("resume-summary")?.value.trim() || "",
    skills: parseSkills(document.getElementById("resume-skills")?.value || ""),
    projects: splitLines(document.getElementById("resume-projects")?.value || ""),
    achievements: splitLines(document.getElementById("resume-achievements")?.value || ""),
    certifications: splitLines(document.getElementById("resume-certs")?.value || ""),
  };
}

function fillResumeForm(data = {}) {
  const mlDefaults = getMlResumeDefaults();
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value || "";
  };
  set("resume-name", data.name);
  set("resume-email", data.email);
  set("resume-phone", data.phone);
  set("resume-location", data.location);
  set("resume-linkedin", data.linkedin);
  set("resume-portfolio", data.portfolio);
  set("resume-college", data.college);
  set("resume-degree", data.degree);
  set("resume-cgpa", data.cgpa);
  set("resume-grad-year", data.gradYear);
  set("resume-exp-months", data.experienceMonths ?? 0);
  set("resume-summary", data.summary || mlDefaults.summary || "");
  set(
    "resume-skills",
    Array.isArray(data.skills) && data.skills.length
      ? data.skills.join(", ")
      : mlDefaults.skills.join(", ")
  );
  set(
    "resume-projects",
    Array.isArray(data.projects) && data.projects.length
      ? data.projects.join("\n")
      : mlDefaults.projects.join("\n")
  );
  set(
    "resume-achievements",
    Array.isArray(data.achievements) ? data.achievements.join("\n") : ""
  );
  set(
    "resume-certs",
    Array.isArray(data.certifications) ? data.certifications.join("\n") : ""
  );
}

async function fetchAnalysis(payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const token = getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  let response;
  try {
    response = await fetch(`${API_BASE}/api/analyze`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Request timed out. Check the backend and try again.");
    }
    throw new Error("Cannot reach backend. Start the server on http://localhost:4000.");
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    const msg = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error("Session expired. Please log in again.");
    }
    throw new Error(msg.error || "Failed to fetch analysis.");
  }
  return response.json();
}

async function fetchWithAuth(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error(msg.error || "Request failed.");
  }
  return res.json();
}

function setRankingsStatus(type, message) {
  if (!rankingsStatus) return;
  rankingsStatus.className = `status ${type || "muted"}`.trim();
  rankingsStatus.textContent = message;
}

function renderRankingRows(rows = []) {
  if (!rankingsBody) return;
  rankingsBody.innerHTML = "";
  if (!Array.isArray(rows) || !rows.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="9" class="rankings-empty">No users found.</td>`;
    rankingsBody.appendChild(tr);
    return;
  }
  rows.forEach((row, rowIndex) => {
    const isPublic = row?.isPublic !== false;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>#${Number(row?.rank || 0)}</strong></td>
      <td>${escapeHtml(row?.name || "User")}</td>
      <td><span class="visibility-badge ${isPublic ? "public" : "private"}">${isPublic ? "Public" : "Private"}</span></td>
      <td>${Number(row?.jobReadiness || 0)}%</td>
      <td>${Number(row?.rankScore || 0)}</td>
      <td>${Number(row?.totalPrograms || 0)}</td>
      <td>${Number(row?.projectsDone || 0)}</td>
      <td>${Number(row?.contestsDone || 0)}</td>
      <td>${isPublic ? `<button type="button" class="ghost view-public-btn" data-row-index="${rowIndex}">View</button>` : "-"}</td>
    `;
    rankingsBody.appendChild(tr);
  });
}

async function loadRankings(query = "") {
  if (!getToken()) {
    setRankingsStatus("err", "Login required.");
    renderRankingRows([]);
    return;
  }
  setRankingsStatus("warn", "Loading live rankings...");
  try {
    const data = await fetchWithAuth(
      `/api/rankings?limit=300&q=${encodeURIComponent(String(query || "").trim())}`
    );
    const rows = Array.isArray(data?.rankings) ? data.rankings : [];
    rankingsRowsCache = rows;
    renderRankingRows(rows);
    const timeText = data?.updatedAt
      ? new Date(data.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      : "now";
    setRankingsStatus("ok", `Live ranking updated at ${timeText}. Users: ${rows.length}`);
  } catch (err) {
    renderRankingRows([]);
    setRankingsStatus("err", err.message || "Failed to load rankings.");
  }
}

function closeRankingsModal() {
  if (!rankingsModal) return;
  rankingsModal.classList.add("hidden");
  if (rankingViewPanel) rankingViewPanel.classList.add("hidden");
  if (rankingsRefreshTimer) {
    clearInterval(rankingsRefreshTimer);
    rankingsRefreshTimer = null;
  }
}

function openRankingsModal() {
  if (!rankingsModal) return;
  rankingsModal.classList.remove("hidden");
  loadRankings(rankingsSearch?.value || "");
  if (rankingsRefreshTimer) clearInterval(rankingsRefreshTimer);
  rankingsRefreshTimer = setInterval(() => {
    if (!rankingsModal.classList.contains("hidden")) {
      loadRankings(rankingsSearch?.value || "");
    }
  }, 30000);
}

function closeRankingViewPanel() {
  if (!rankingViewPanel) return;
  rankingViewPanel.classList.add("hidden");
}

function closePublicCardModal() {
  if (!publicCardModal) return;
  publicCardModal.classList.add("hidden");
}

async function openPublicCardModal(row) {
  if (!publicCardModal || !publicCardContent) return;
  if (!row || row?.isPublic === false) return;
  publicCardModal.classList.remove("hidden");
  publicCardContent.innerHTML = `<div class="status muted">Loading public profile...</div>`;

  let data = null;
  const slug = String(row?.publicSlug || "").trim();
  if (slug) {
    try {
      const res = await fetch(`${API_BASE}/api/profile/public/${encodeURIComponent(slug)}`);
      const json = await res.json().catch(() => ({}));
      if (res.ok) data = json;
    } catch {
      data = null;
    }
  }

  const name = escapeHtml(data?.name || row?.name || "User");
  const profile = data?.profile || {};
  const metrics = data?.metrics || {};
  const fallbackBasics = row?.publicBasics || {};
  const role = escapeHtml(String(profile?.role || fallbackBasics?.role || row?.roleFit || "-"));
  const skills = Array.isArray(profile?.jobSkills)
    ? profile.jobSkills.slice(0, 8)
    : Array.isArray(fallbackBasics?.skills)
      ? fallbackBasics.skills.slice(0, 8)
      : [];
  const avatar = String(profile?.profileImage || fallbackBasics?.profileImage || "").trim();
  const readiness = Number(metrics?.jobReadiness ?? row?.jobReadiness ?? 0);
  const hire = Number(metrics?.hireProbability ?? row?.hireProbability ?? 0);
  const strength = Number(metrics?.profileStrength ?? row?.profileStrength ?? 0);
  const leetSolvedRaw =
    row?.leetcodeSolved !== undefined && row?.leetcodeSolved !== null
      ? row.leetcodeSolved
      : metrics?.leetcodeSolved;
  const ccSolvedRaw =
    row?.codechefSolved !== undefined && row?.codechefSolved !== null
      ? row.codechefSolved
      : metrics?.codechefSolved;
  const leetSolved = Number.isFinite(Number(leetSolvedRaw)) ? Number(leetSolvedRaw) : 0;
  const ccSolved = Number.isFinite(Number(ccSolvedRaw)) ? Number(ccSolvedRaw) : 0;
  const initials = String(name || "U").replace(/<[^>]+>/g, "").trim().charAt(0).toUpperCase() || "U";

  publicCardContent.innerHTML = `
    <div class="public-profile-hero">
      <div class="public-avatar">${avatar ? `<img src="${avatar}" alt="${name} avatar" />` : initials}</div>
      <div>
        <div class="public-name">${name}</div>
        <div class="public-sub">Role Focus: ${role}</div>
        <div class="public-pill-row">
          <span class="public-pill">Readiness ${readiness}%</span>
          <span class="public-pill">Rank Score ${Number(row?.rankScore || 0)}</span>
          <span class="public-pill">Hire ${hire}%</span>
        </div>
      </div>
    </div>
    <div class="public-stats-grid">
      <article class="public-stat"><strong>Profile Strength</strong><span>${strength}%</span></article>
      <article class="public-stat"><strong>Programs Solved</strong><span>${Number(row?.totalPrograms || 0)}</span></article>
      <article class="public-stat"><strong>Projects</strong><span>${Number(row?.projectsDone || 0)}</span></article>
      <article class="public-stat"><strong>Contests</strong><span>${Number(row?.contestsDone || 0)}</span></article>
      <article class="public-stat"><strong>LeetCode Solved</strong><span>${leetSolved}</span></article>
      <article class="public-stat"><strong>CodeChef Solved</strong><span>${ccSolved}</span></article>
    </div>
    <div class="public-pill-row">
      ${(skills.length ? skills : ["No public skills listed"]).map((skill) => `<span class="public-pill">${escapeHtml(skill)}</span>`).join("")}
    </div>
  `;
}

async function saveProfileToDb(profile) {
  if (!getToken()) return null;
  try {
    const result = await fetchWithAuth("/api/profile", {
      method: "PUT",
      body: JSON.stringify({ profile }),
    });
    if (result) {
      state.inputs.isPublic = result?.isPublic !== false;
      state.inputs.publicSlug = String(result.publicSlug || "");
      state.inputs.publicUrl = resolveShareLinkFromResult(result);
      renderPublicProfileControls(state.inputs);
    }
    return result;
  } catch (err) {
    setStatus("err", err?.message || "Failed to save profile visibility.");
    return null;
  }
}

async function loadProfileFromDb() {
  if (!getToken()) return null;
  try {
    const data = await fetchWithAuth("/api/profile");
    if (!data.profile) return null;
    const profile = data.profile?.profile || {};
    return {
      ...profile,
      isPublic: data.profile?.isPublic !== false,
      publicSlug: String(data.profile?.publicSlug || ""),
      publicUrl:
        String(data.profile?.publicUrl || "").trim() ||
        buildClientPublicProfileUrl(String(data.profile?.publicSlug || "")),
    };
  } catch {
    return null;
  }
}

async function saveProfileVisibility(isPublic) {
  if (!getToken()) return null;
  try {
    const result = await fetchWithAuth("/api/profile/visibility", {
      method: "PUT",
      body: JSON.stringify({
        isPublic: Boolean(isPublic),
        publicSlug: state.inputs?.publicSlug || "",
      }),
    });
    if (result) {
      state.inputs.isPublic = result?.isPublic !== false;
      state.inputs.publicSlug = String(result.publicSlug || "");
      state.inputs.publicUrl = resolveShareLinkFromResult(result);
      persistProfile(state.inputs);
      renderPublicProfileControls(state.inputs);
    }
    return result;
  } catch (err) {
    setStatus("err", err?.message || "Could not update profile visibility.");
    return null;
  }
}

async function saveWeeklyToDb(weekly, weekIndex) {
  if (!getToken()) return;
  try {
    await fetchWithAuth("/api/weekly", {
      method: "PUT",
      body: JSON.stringify({ weekly: { weekIndex, tasks: weekly } }),
    });
  } catch {
    // ignore
  }
}

async function loadWeeklyFromDb() {
  if (!getToken()) return null;
  try {
    const data = await fetchWithAuth("/api/weekly");
    if (!data.weekly) return null;
    return {
      weekIndex: data.weekly.weekIndex || 1,
      tasks: data.weekly.tasks || null,
    };
  } catch {
    return null;
  }
}

async function ensureCareerModelTraining(force = false) {
  if (!getToken()) return false;
  const last = parseInt(localStorage.getItem(ML_TRAINED_AT_KEY) || "0", 10);
  const ageMs = Date.now() - last;
  if (!force && last && ageMs < 24 * 60 * 60 * 1000) {
    return true;
  }
  try {
    await fetchWithAuth("/api/ml/train-career-engine", {
      method: "POST",
      body: JSON.stringify({ force: Boolean(force) }),
    });
    localStorage.setItem(ML_TRAINED_AT_KEY, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!getToken()) {
    setStatus("err", "Please log in before running analysis.");
    return;
  }
  state.inputs = readProfileFromForm();

  setStatus("warn", "Refreshing ML week-plan model and fetching live data...");
  await ensureCareerModelTraining(false);

  try {
    const payload = {
      usernames: {
        leetcode: state.inputs.leetcode,
        codechef: state.inputs.codechef,
        github: state.inputs.github,
        hackerrank: state.inputs.hackerrank,
      },
      role: state.inputs.role,
      jobSkills: state.inputs.jobSkills,
    };
    state.data = await fetchAnalysis(payload);
    runAnalysis(state.data);
    persistProfile(state.inputs);
    persistAnalysis(state.data);
    saveProfileToDb(state.inputs);
    setProfileLocked(true);
    if (rankingsModal && !rankingsModal.classList.contains("hidden")) {
      loadRankings(rankingsSearch?.value || "");
    }
    const warnings = Array.isArray(state.data.warnings)
      ? state.data.warnings
      : [];
    if (warnings.length) {
      setStatus("warn", `Saved. ${warnings.join(" ")}`);
    } else {
      setStatus("ok", "Live data synced and profile saved.");
    }
  } catch (err) {
    setStatus("err", err.message);
    if (err.message.includes("log in")) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(NAME_KEY);
      setTimeout(() => {
        window.location.href = "login.html";
      }, 800);
    }
  }
});

if (editButton) {
  editButton.addEventListener("click", () => {
    const locked = localStorage.getItem(LOCK_KEY) === "1";
    setProfileLocked(!locked);
    if (!locked) {
      saveProfileToDb(readProfileFromForm());
      setStatus("ok", "Profile locked.");
    } else {
      setStatus("warn", "Edit your profile and re-run analysis.");
    }
  });
}

if (logoutButton) {
  logoutButton.addEventListener("click", () => {
    clearSession();
    window.location.href = "login.html";
  });
}

if (feedbackFab) {
  feedbackFab.addEventListener("click", () => {
    openActivityModal();
  });
}

if (feedbackBtn) {
  feedbackBtn.addEventListener("click", () => {
    window.location.href = "mailto:doramiasthetic@gmail.com?subject=NextHire%20Feedback";
  });
}

if (visibilityToggleBtn) {
  visibilityToggleBtn.addEventListener("click", async () => {
    const previous = state.inputs?.isPublic !== false;
    state.inputs.isPublic = !previous;
    renderPublicProfileControls(state.inputs);
    const result = await saveProfileVisibility(state.inputs.isPublic);
    if (!result) {
      state.inputs.isPublic = previous;
      renderPublicProfileControls(state.inputs);
      return;
    }
    if (state.inputs.isPublic) {
      const shareLink = resolveShareLinkFromResult(result || {});
      if (shareLink) {
        state.inputs.publicUrl = shareLink;
        setStatus("ok", `Profile is Public. ID: ${state.inputs.publicSlug || "-"} | Share link is ready.`);
      } else {
        setStatus("warn", "Profile is Public. Link will appear once backend responds.");
      }
    } else {
      setStatus("ok", "Profile is Private.");
    }
  });
}

if (shareProfileBtn) {
  shareProfileBtn.addEventListener("click", async () => {
    const originalText = shareProfileBtn.textContent;
    shareProfileBtn.disabled = true;
    shareProfileBtn.textContent = "Sharing...";
    try {
      let result = null;
      let backendSynced = true;
      if (state.inputs?.isPublic === false) {
        result = await saveProfileVisibility(true);
        if (!result) {
          backendSynced = false;
        }
      }

      let slug = String(state.inputs?.publicSlug || "").trim();
      if (!slug) slug = ensurePublicSlug();
      if (!slug) {
        result = result || (await saveProfileVisibility(true));
        if (!result) backendSynced = false;
        slug = String(result?.publicSlug || "").trim();
      }

      let link = String(state.inputs?.publicUrl || "").trim();
      if (!link) {
        result = result || (await saveProfileVisibility(true));
        if (!result) backendSynced = false;
        link = resolveShareLinkFromResult(result || {});
      }
      if (!link && slug) {
        link = buildClientPublicProfileUrl(slug);
      }

      if (!link) {
        setStatus("err", "Share link is unavailable. Please re-login and try again.");
        return;
      }

      state.inputs.isPublic = true;
      state.inputs.publicSlug = slug || state.inputs.publicSlug || "";
      state.inputs.publicUrl = link;
      persistProfile(state.inputs);
      renderPublicProfileControls(state.inputs);

      let copied = false;
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(link);
          copied = true;
        } catch {
          copied = false;
        }
      }
      if (!copied) {
        try {
          const temp = document.createElement("input");
          temp.value = link;
          document.body.appendChild(temp);
          temp.select();
          copied = document.execCommand("copy");
          document.body.removeChild(temp);
        } catch {
          copied = false;
        }
      }
      if (!copied && navigator.share) {
        try {
          await navigator.share({ title: "My NextHire profile", url: link });
          copied = true;
        } catch {
          copied = false;
        }
      }

      // Always show the link so user can share even if clipboard APIs are blocked.
      window.prompt("Copy this profile link:", link);
      window.alert(
        backendSynced
          ? `Share link ready:\n${link}`
          : `Share link generated:\n${link}\n\nBackend sync failed, so others may not open it yet. Re-login and restart backend, then click Share Profile again.`
      );
      setStatus(
        copied ? "ok" : "warn",
        copied
          ? `Public profile ready. ID: ${state.inputs.publicSlug || "-"} | Link copied and shown.`
          : `Public profile ready. ID: ${state.inputs.publicSlug || "-"} | Copy link from prompt.`
      );
    } finally {
      shareProfileBtn.disabled = false;
      shareProfileBtn.textContent = originalText || "Share Profile";
    }
  });
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    const nextTheme = document.body.classList.contains("theme-light") ? "dark" : "light";
    localStorage.setItem(THEME_KEY, nextTheme);
    applyTheme(nextTheme);
  });
}

if (rankingsNav) {
  rankingsNav.addEventListener("click", (event) => {
    event.preventDefault();
    openRankingsModal();
  });
}

if (rankingsCloseBtn) {
  rankingsCloseBtn.addEventListener("click", () => {
    closeRankingsModal();
  });
}

if (rankingsModal) {
  rankingsModal.addEventListener("click", (event) => {
    if (event.target === rankingsModal) closeRankingsModal();
  });
}

if (rankingsRefreshBtn) {
  rankingsRefreshBtn.addEventListener("click", () => {
    loadRankings(rankingsSearch?.value || "");
  });
}

if (rankingViewClose) {
  rankingViewClose.addEventListener("click", () => {
    closeRankingViewPanel();
  });
}

if (publicCardClose) {
  publicCardClose.addEventListener("click", () => {
    closePublicCardModal();
  });
}

if (publicCardModal) {
  publicCardModal.addEventListener("click", (event) => {
    if (event.target === publicCardModal) closePublicCardModal();
  });
}

if (rankingsBody) {
  rankingsBody.addEventListener("click", (event) => {
    const rawTarget = event.target;
    const targetEl =
      rawTarget instanceof Element ? rawTarget : rawTarget?.parentElement || null;
    if (!targetEl) return;
    const btn = targetEl.closest(".view-public-btn");
    if (!btn) return;
    const idx = parseInt(String(btn.getAttribute("data-row-index") || "-1"), 10);
    const row = Number.isFinite(idx) && idx >= 0 ? rankingsRowsCache[idx] : null;
    if (!row) {
      setRankingsStatus("warn", "Could not open profile details. Refresh rankings and try again.");
      return;
    }
    openPublicCardModal(row);
  });
}

if (rankingsSearch) {
  rankingsSearch.addEventListener("input", () => {
    if (rankingsSearchTimer) {
      clearTimeout(rankingsSearchTimer);
      rankingsSearchTimer = null;
    }
    rankingsSearchTimer = setTimeout(() => {
      loadRankings(rankingsSearch.value || "");
    }, 260);
  });
}

if (activityCloseBtn) {
  activityCloseBtn.addEventListener("click", closeActivityModal);
}

if (activityModal) {
  activityModal.addEventListener("click", (event) => {
    if (event.target === activityModal) closeActivityModal();
  });
}

if (activityFeedbackBtn) {
  activityFeedbackBtn.addEventListener("click", () => {
    window.location.href = "mailto:doramiasthetic@gmail.com?subject=NextHire%20Feedback";
  });
}

if (studyBtn) {
  studyBtn.addEventListener("click", () => {
    openStudyModal();
  });
}

if (activityStudyBtn) {
  activityStudyBtn.addEventListener("click", () => {
    closeActivityModal();
    openStudyModal();
  });
}

if (studyCloseBtn) {
  studyCloseBtn.addEventListener("click", () => {
    closeStudyModal();
  });
}

if (studyModal) {
  studyModal.addEventListener("click", (event) => {
    if (event.target === studyModal) closeStudyModal();
  });
}

if (questionPapersBtn) {
  questionPapersBtn.addEventListener("click", () => {
    openQuestionPapersModal();
  });
}

if (activityQuestionPapersBtn) {
  activityQuestionPapersBtn.addEventListener("click", () => {
    closeActivityModal();
    openQuestionPapersModal();
  });
}

if (papersCloseBtn) {
  papersCloseBtn.addEventListener("click", () => {
    closeQuestionPapersModal();
  });
}

if (papersModal) {
  papersModal.addEventListener("click", (event) => {
    if (event.target === papersModal) closeQuestionPapersModal();
  });
}

if (mockInterviewBtn) {
  mockInterviewBtn.addEventListener("click", () => {
    openMockInterviewModal();
  });
}

if (activityMockInterviewBtn) {
  activityMockInterviewBtn.addEventListener("click", () => {
    closeActivityModal();
    openMockInterviewModal();
  });
}

if (mockCloseBtn) {
  mockCloseBtn.addEventListener("click", () => {
    closeMockInterviewModal();
  });
}

if (mockModal) {
  mockModal.addEventListener("click", (event) => {
    if (event.target === mockModal) closeMockInterviewModal();
  });
}

if (mockStartBtn) {
  mockStartBtn.addEventListener("click", () => {
    const type = String(mockTypeSelect?.value || "technical");
    renderMockQuestions(type);
  });
}

if (mockSubmitBtn) {
  mockSubmitBtn.addEventListener("click", () => {
    scoreMockAnswers();
  });
}

if (mockTypeSelect) {
  mockTypeSelect.addEventListener("change", () => {
    const type = String(mockTypeSelect.value || "technical");
    fillMockPaperOptions(type);
    if (mockQuestions) mockQuestions.innerHTML = "";
    setMockStatus("Paper updated. Click Start Mock to load questions.", "muted");
  });
}

const appendChatMessage = (role, text) => {
  if (!chatbotMessages) return;
  const msg = document.createElement("div");
  msg.className = `chat-msg ${role}`;
  msg.textContent = text;
  chatbotMessages.appendChild(msg);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  state.chatHistory.push({ role, text: String(text || "") });
  if (state.chatHistory.length > 30) {
    state.chatHistory = state.chatHistory.slice(-30);
  }
};

const openChatbot = () => {
  if (!chatbotDrawer) return;
  chatbotDrawer.classList.remove("hidden");
  if (chatbotMessages && chatbotMessages.childElementCount === 0) {
    appendChatMessage(
      "bot",
      "Hi. Ask me about hire probability, role fit, skill gaps, projects, or contest progress."
    );
  }
};

const closeChatbot = () => {
  if (!chatbotDrawer) return;
  chatbotDrawer.classList.add("hidden");
};

if (chatbotBtn) {
  chatbotBtn.addEventListener("click", () => {
    openChatbot();
  });
}

if (activityChatbotBtn) {
  activityChatbotBtn.addEventListener("click", () => {
    closeActivityModal();
    openChatbot();
  });
}

if (chatbotClose) {
  chatbotClose.addEventListener("click", () => {
    closeChatbot();
  });
}

if (chatbotForm) {
  const sendChatMessage = async (message) => {
    const safeMessage = String(message || "").trim();
    if (!safeMessage) return;
    appendChatMessage("user", safeMessage);
    logActivity("chat", { message: safeMessage });
    if (chatbotInput) chatbotInput.value = "";
    try {
      const out = await fetchWithAuth("/api/chatbot", {
        method: "POST",
        body: JSON.stringify({
          message: safeMessage,
          history: state.chatHistory.slice(-10),
          profileInputs: state.inputs || {},
          analysis: state.data || loadStoredAnalysis() || null,
          resumeData: loadResumeData() || null,
        }),
      });
      appendChatMessage("bot", out?.reply || "I could not find a good response.");
    } catch (err) {
      appendChatMessage("bot", err.message || "Chatbot unavailable right now.");
    }
  };

  chatbotForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await sendChatMessage(chatbotInput?.value || "");
  });

  chatbotSuggestionButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      openChatbot();
      await sendChatMessage(btn.textContent || "");
    });
  });
}

if (avatarInput) {
  avatarInput.addEventListener("change", () => {
    const file = avatarInput.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus("warn", "Please select an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setStatus("warn", "Image too large. Please upload up to 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const imageDataUrl = String(reader.result || "");
      state.inputs.profileImage = imageDataUrl;
      renderAvatar(imageDataUrl);
      const profile = readProfileFromForm();
      persistProfile(profile);
      saveProfileToDb(profile);
      setStatus("ok", "Profile picture updated.");
    };
    reader.onerror = () => {
      setStatus("err", "Could not read image file.");
    };
    reader.readAsDataURL(file);
  });
}

const makeResumeBtn = document.getElementById("make-resume-btn");
const addResumeBtn = document.getElementById("add-resume-btn");
const resumeReadinessBtn = document.getElementById("resume-readiness-btn");
const resumeModal = document.getElementById("resume-modal");
const resumeModalClose = document.getElementById("resume-modal-close");
const resumeViewModal = document.getElementById("resume-view-modal");
const resumeViewClose = document.getElementById("resume-view-close");
const resumeViewContent = document.getElementById("resume-view-content");
const resumeForm = document.getElementById("resume-form");
const resumeFileInput = document.getElementById("resume-file-input");
const viewResumeBtn = document.getElementById("view-resume-btn");
const viewAddedResumeBtn = document.getElementById("view-added-resume-btn");
const downloadResumeBtn = document.getElementById("download-resume-btn");

const openResumeModal = () => {
  if (!resumeModal) return;
  resumeModal.classList.remove("hidden");
};

const closeResumeModal = () => {
  if (!resumeModal) return;
  resumeModal.classList.add("hidden");
};

const openResumeViewModal = () => {
  if (!resumeViewModal) return;
  resumeViewModal.classList.remove("hidden");
};

const closeResumeViewModal = () => {
  if (!resumeViewModal) return;
  resumeViewModal.classList.add("hidden");
};

async function fetchResumeReadiness(resumeData) {
  return fetchWithAuth("/api/resume/readiness", {
    method: "POST",
    body: JSON.stringify({
      resumeData,
      profileSignals: state.data || null,
      targetRole: state.inputs?.role || "frontend",
      targetSkills: state.inputs?.jobSkills || [],
    }),
  });
}

async function refreshUploadedResumeLevel(resumeData) {
  const levelEl = document.getElementById("uploaded-resume-level");
  if (!levelEl) return;
  if (!resumeData?.uploadedResumeText) {
    levelEl.classList.add("hidden");
    return;
  }
  levelEl.classList.remove("hidden");
  levelEl.className = "status warn";
  levelEl.textContent = "Uploaded resume readiness: calculating...";
  try {
    const out = await fetchResumeReadiness(resumeData);
    const score = out?.readinessScore ?? 0;
    const level =
      score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 55 ? "Average" : "Needs Improvement";
    levelEl.className = `status ${score >= 75 ? "ok" : "warn"}`;
    levelEl.textContent = `Uploaded resume readiness: ${score}% (${level})`;
  } catch {
    levelEl.className = "status err";
    levelEl.textContent = "Uploaded resume readiness: unavailable.";
  }
}

if (makeResumeBtn) {
  makeResumeBtn.addEventListener("click", () => {
    fillResumeForm(loadResumeData() || {});
    openResumeModal();
  });
}

if (resumeModalClose) {
  resumeModalClose.addEventListener("click", closeResumeModal);
}

if (resumeModal) {
  resumeModal.addEventListener("click", (event) => {
    if (event.target === resumeModal) closeResumeModal();
  });
}

if (resumeViewClose) {
  resumeViewClose.addEventListener("click", closeResumeViewModal);
}

if (resumeViewModal) {
  resumeViewModal.addEventListener("click", (event) => {
    if (event.target === resumeViewModal) closeResumeViewModal();
  });
}

if (resumeForm) {
  resumeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = gatherResumeFormData();
    persistResumeData(data);
    renderResumePreview(data);
    closeResumeModal();
    setResumeStatus("Resume generated. Click Resume Readiness % for ML score.", "ok");
    logActivity("resume_generated", {
      name: data.name || "",
      skills: Array.isArray(data.skills) ? data.skills.length : 0,
    });
  });
}

if (addResumeBtn && resumeFileInput) {
  const extractResumeText = async (file) => {
    const name = (file.name || "").toLowerCase();
    const mime = (file.type || "").toLowerCase();
    const isPdf = mime.includes("pdf") || name.endsWith(".pdf");
    const isDocx =
      mime.includes("wordprocessingml") || name.endsWith(".docx");
    const isTextLike =
      mime.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".md");

    if (isTextLike) {
      return file.text();
    }

    if (isPdf) {
      const pdfjs = window.pdfjsLib;
      if (!pdfjs) throw new Error("PDF parser not available.");
      if (pdfjs.GlobalWorkerOptions) {
        pdfjs.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      }
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: buffer }).promise;
      const pages = [];
      for (let i = 1; i <= pdf.numPages; i += 1) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const text = (content.items || []).map((item) => item.str || "").join(" ");
        pages.push(text);
      }
      return pages.join("\n");
    }

    if (isDocx) {
      if (!window.mammoth?.extractRawText) {
        throw new Error("DOCX parser not available.");
      }
      const buffer = await file.arrayBuffer();
      const result = await window.mammoth.extractRawText({ arrayBuffer: buffer });
      return result.value || "";
    }

    throw new Error("Unsupported file type. Use PDF, DOCX, TXT, or MD.");
  };

  addResumeBtn.addEventListener("click", () => {
    resumeFileInput.click();
  });
  resumeFileInput.addEventListener("change", async () => {
    const file = resumeFileInput.files?.[0];
    if (!file) return;
    setResumeStatus("Reading resume file...", "warn");
    try {
      const text = String(await extractResumeText(file));
      if (!text.trim()) {
        setResumeStatus("Could not extract text from this file.", "err");
        return;
      }
      const existing = loadResumeData() || {};
      const updated = {
        ...existing,
        uploadedResumeText: text.slice(0, 12000),
        uploadedResumeName: file.name,
      };
      persistResumeData(updated);
      setResumeStatus(`Resume file added: ${file.name}`, "ok");
      renderResumePreview(updated);
      refreshUploadedResumeLevel(updated);
      logActivity("resume_uploaded", { name: file.name || "" });
    } catch (err) {
      setResumeStatus(err.message || "Could not read uploaded resume file.", "err");
    } finally {
      resumeFileInput.value = "";
    }
  });
}

if (resumeReadinessBtn) {
  resumeReadinessBtn.addEventListener("click", async () => {
    const resumeData = loadResumeData();
    if (!resumeData) {
      setResumeStatus("Create a resume or upload one using Add Resume first.", "warn");
      return;
    }
    const hasGeneratedResume = Boolean(
      String(resumeData.summary || "").trim() ||
        (Array.isArray(resumeData.skills) && resumeData.skills.length) ||
        (Array.isArray(resumeData.projects) && resumeData.projects.length)
    );
    const hasUploadedResume = Boolean(String(resumeData.uploadedResumeText || "").trim());
    if (!hasGeneratedResume && !hasUploadedResume) {
      setResumeStatus("Create a resume or upload one using Add Resume first.", "warn");
      return;
    }
    setResumeStatus("Calculating readiness using ML model...", "warn");
    try {
      const out = await fetchResumeReadiness(resumeData);
      const score = out?.readinessScore ?? 0;
      const breakdown = out?.breakdown || {};
      const tips = Array.isArray(out?.suggestions) ? out.suggestions.slice(0, 3) : [];
      const content = Number.isFinite(breakdown.contentQuality)
        ? `Content ${breakdown.contentQuality}%`
        : "";
      const relevance = Number.isFinite(breakdown.relevance)
        ? `Relevance ${breakdown.relevance}%`
        : "";
      const impact = Number.isFinite(breakdown.impactEvidence)
        ? `Impact ${breakdown.impactEvidence}%`
        : "";
      const parts = [content, relevance, impact].filter(Boolean).join(" | ");
      const message = `Resume readiness: ${score}%${parts ? ` | ${parts}` : ""}${
        tips.length ? ` | Tips: ${tips.join(" | ")}` : ""
      }`;
      setResumeStatus(message, score >= 75 ? "ok" : "warn");
      logActivity("resume_readiness", { score });
    } catch (err) {
      setResumeStatus(err.message || "Could not calculate readiness.", "err");
    }
  });
}

if (viewResumeBtn) {
  viewResumeBtn.addEventListener("click", () => {
    const data = loadResumeData();
    if (!data) {
      setResumeStatus("Create resume first using Make a Resume.", "warn");
      return;
    }
    if (!resumeViewContent) return;
    resumeViewContent.innerHTML = buildResumeHtml(data);
    openResumeViewModal();
  });
}

if (viewAddedResumeBtn) {
  viewAddedResumeBtn.addEventListener("click", () => {
    const data = loadResumeData();
    const text = data?.uploadedResumeText || "";
    if (!text.trim()) {
      setResumeStatus("No uploaded resume found. Use Add Resume first.", "warn");
      return;
    }
    if (!resumeViewContent) return;
    const name = escapeHtml(data?.uploadedResumeName || "Uploaded Resume");
    resumeViewContent.innerHTML = `
      <article class="resume-document">
        <header class="resume-head">
          <h1 class="resume-name">${name}</h1>
          <p class="resume-contact">Extracted text preview from uploaded resume</p>
        </header>
        <section class="resume-section">
          <h4>Uploaded Resume Content</h4>
          <p style="white-space: pre-wrap;">${escapeHtml(text)}</p>
        </section>
      </article>
    `;
    openResumeViewModal();
  });
}

if (downloadResumeBtn) {
  downloadResumeBtn.addEventListener("click", async () => {
    const data = loadResumeData();
    if (!data) {
      setResumeStatus("Create resume first using Make a Resume.", "warn");
      return;
    }
    setResumeStatus("Generating PDF download...", "warn");
    const safeName = (data.name || "resume")
      .toString()
      .trim()
      .replace(/[^a-zA-Z0-9-_]+/g, "_");
    const fileName = `${safeName || "resume"}_NextHire.pdf`;

    const ensureJsPdf = async () => {
      if (window.jspdf?.jsPDF) return true;
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("jsPDF failed to load."));
        document.head.appendChild(script);
      });
      return Boolean(window.jspdf?.jsPDF);
    };

    try {
      const ok = await ensureJsPdf();
      if (!ok || !window.jspdf?.jsPDF) {
        setResumeStatus("PDF engine unavailable. Refresh and try again.", "err");
        return;
      }
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      const payload = buildResumePdfSections(data);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      const nameLines = doc.splitTextToSize(payload.name, contentWidth);
      doc.text(nameLines, margin, y);
      y += nameLines.length * 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      if (payload.contact) {
        const contactLines = doc.splitTextToSize(payload.contact, contentWidth);
        doc.text(contactLines, margin, y);
        y += contactLines.length * 5.2;
      }
      if (payload.links) {
        const linkLines = doc.splitTextToSize(payload.links, contentWidth);
        doc.text(linkLines, margin, y);
        y += linkLines.length * 5.2;
      }
      y += 3;

      payload.sections.forEach((section) => {
        if (y > pageHeight - 24) {
          doc.addPage();
          y = margin;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11.5);
        doc.text(section.title, margin, y);
        y += 5.5;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.5);
        section.lines.forEach((line) => {
          const wrapped = doc.splitTextToSize(String(line), contentWidth);
          if (y + wrapped.length * 4.8 > pageHeight - margin) {
            doc.addPage();
            y = margin;
          }
          doc.text(wrapped, margin, y);
          y += wrapped.length * 4.8 + 1.2;
        });
        y += 2;
      });

      doc.save(fileName);
      setResumeStatus("Resume PDF downloaded.", "ok");
      logActivity("resume_downloaded", { name: fileName });
    } catch {
      setResumeStatus("Download failed. Try again after refresh.", "err");
    }
  });
}

initTheme();
setStatus("warn", "Connect your backend at http://localhost:4000.");
renderWelcome();
resetKpis();
renderPublicProfileControls(state.inputs);
if (!getToken()) {
  window.location.href = "login.html";
}
ensureActivitySession();
loadTodayContests();
loadHackathons();

const storedProfile = loadStoredProfile();
if (storedProfile) {
  state.inputs = storedProfile;
  writeProfileToForm(storedProfile);
  const locked = localStorage.getItem(LOCK_KEY) === "1";
  setProfileLocked(locked);
}

const storedResume = loadResumeData();
if (storedResume) {
  renderResumePreview(storedResume);
  setResumeStatus("Loaded saved resume draft.", "ok");
  refreshUploadedResumeLevel(storedResume);
}

const storedAnalysis = loadStoredAnalysis();
const hasDetailedAchievements = (analysis) =>
  Array.isArray(analysis?.achievements) &&
  analysis.achievements.some((item) => (item?.title || item?.text) && item?.platform);

if (storedAnalysis && storedProfile) {
  state.data = storedAnalysis;
  runAnalysis(storedAnalysis, { track: false });
  if (hasDetailedAchievements(storedAnalysis)) {
    setStatus("ok", "Loaded saved profile and dashboard.");
  } else {
    setStatus("warn", "Loaded saved profile. Refreshing achievements from live profiles...");
  }
}

// Load profile/weekly data from DB if available
if (getToken()) {
  loadProfileFromDb().then((profile) => {
    if (profile) {
      state.inputs = profile;
      writeProfileToForm(profile);
      setProfileLocked(true);
      persistProfile(profile);
    }
  });
  loadWeeklyFromDb().then((weekly) => {
    if (weekly?.tasks) {
      setWeekIndex(weekly.weekIndex || 1);
      setWeeklyTasks(weekly.tasks);
      renderWeeklyTracker(getWeekPlanSeed());
    }
  });
}

// Auto-refresh old saved analyses that don't contain detailed achievements.
if (
  getToken() &&
  storedProfile &&
  storedAnalysis &&
  !hasDetailedAchievements(storedAnalysis)
) {
  (async () => {
    try {
      const payload = {
        usernames: {
          leetcode: storedProfile.leetcode || "",
          codechef: storedProfile.codechef || "",
          github: storedProfile.github || "",
          hackerrank: storedProfile.hackerrank || "",
        },
        role: storedProfile.role || "frontend",
        jobSkills: Array.isArray(storedProfile.jobSkills) ? storedProfile.jobSkills : [],
      };
      const fresh = await fetchAnalysis(payload);
      state.data = fresh;
      runAnalysis(fresh, { track: false });
      persistAnalysis(fresh);
      setStatus("ok", "Live achievements synced.");
    } catch {
      setStatus("warn", "Saved dashboard loaded. Click Analyze Profile to fetch live achievements.");
    }
  })();
}




