/* ============== STATE ============== */
let state = {
  view: "loading",
  user: null,
  questions: [],
  answers: {},
  qi: 0,
  adminList: [],
  adminFilter: "pending",
  adminDetail: null,
  loginError: null,
  seniorList: [],
  seniorStatusFilter: "",
  seniorQuery: "",
  seniorDetail: null,
  seniorBack: "seniorActivity",
  candidateHistory: null,
  auditList: [],
  auditFilter: { action: "", q: "" },
  clientSubmissionId: null,
  lastSubmission: null,
  pendingCount: null,
};

const app = document.getElementById("app");

/* ============== ICONS ============== */
const icon = {
  grid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`,
  book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5.5C4 4.7 4.7 4 5.5 4H14v16H5.5C4.7 20 4 19.3 4 18.5v-13Z"/><path d="M14 4h4.5c.8 0 1.5.7 1.5 1.5v13c0 .8-.7 1.5-1.5 1.5H14"/></svg>`,
  inbox: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 12h4l1.5 3h5L16 12h4"/><path d="M4 12l1.5-6.5A1.5 1.5 0 0 1 7 4.3h10a1.5 1.5 0 0 1 1.5 1.2L20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6Z"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>`,
  layers: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l9 5-9 5-9-5 9-5Z"/><path d="M3 13l9 5 9-5"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 13l4 4L19 7"/></svg>`,
  cross: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
  file: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 3.5C6 2.7 6.7 2 7.5 2H14l5 5v14.5c0 .8-.7 1.5-1.5 1.5h-10c-.8 0-1.5-.7-1.5-1.5V3.5Z"/><path d="M14 2v5h5"/></svg>`,
  discord: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.3 5.3A18 18 0 0 0 15.7 4l-.3.6a13 13 0 0 1 4 1.6 15 15 0 0 0-15 0 13 13 0 0 1 4-1.6L8 4a18 18 0 0 0-4.6 1.3S.5 10 1 15.8a18 18 0 0 0 5.4 2.7l.9-1.5a10 10 0 0 1-1.7-.8l.4-.3a13 13 0 0 0 11.9 0l.4.3a10 10 0 0 1-1.7.8l.9 1.5a18 18 0 0 0 5.4-2.7c.6-6.4-1.5-11-3.6-12.5ZM8.7 14a1.6 1.6 0 0 1 0-3.3 1.6 1.6 0 0 1 0 3.3Zm6.6 0a1.6 1.6 0 0 1 0-3.3 1.6 1.6 0 0 1 0 3.3Z"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>`,
  history: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 2"/></svg>`,
  download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v12m0 0l-4-4m4 4l4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>`,
  flag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 3v18"/><path d="M5 4h11l-2 4 2 4H5"/></svg>`,
  pulse: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12h4l2-7 4 14 2-7h6"/></svg>`,
  logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5"/><path d="M5 12h11"/></svg>`,
  chevron: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>`,
};

/* ============== HELPERS ============== */
// Everything people type (answers, names, notes, reasons) goes through this
// before it's put into the page, so it's shown as text and never run as code.
function esc(str) {
  if (str === null || str === undefined) return "";
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}
// "Today, 16:59" / "Yesterday, 09:12" / "28 Sep, 16:59".
function fmtDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (days === 0) return `Today, ${time}`;
  if (days === 1) return `Yesterday, ${time}`;
  const opts = { day: "numeric", month: "short" };
  if (d.getFullYear() !== now.getFullYear()) opts.year = "numeric";
  return `${d.toLocaleDateString([], opts)}, ${time}`;
}
function fullDate(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
}
function dateHTML(iso) {
  return `<time title="${esc(fullDate(iso))}">${esc(fmtDate(iso))}</time>`;
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function waitingHTML(iso) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  const label = mins < 1 ? "Just in" : `Waiting ${mins < 60 ? `${mins}m` : mins < 1440 ? `${Math.floor(mins / 60)}h` : `${Math.floor(mins / 1440)}d`}`;
  return `<span class="wait-tag ${mins >= 1440 ? "late" : ""}" title="Submitted ${esc(fullDate(iso))}">${label}</span>`;
}

function scoreHTML(score) {
  if (!score || !score.total) return "";
  const pct = score.correct / score.total;
  const tone = pct >= 0.8 ? "good" : pct >= 0.5 ? "mid" : "low";
  return `<span class="score-tag ${tone}" title="Multiple choice answers correct">${score.correct}/${score.total} MC</span>`;
}

function initials(name) {
  const parts = String(name || "?").replace(/[^\p{L}\p{N} _.-]/gu, "").split(/[\s_.-]+/).filter(Boolean);
  return ((parts[0] || "?")[0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
}
// Initials sit underneath; the Discord avatar covers them once it loads and
// removes itself if it fails, so there's never a broken-image icon.
function avatarHTML(url, name, cls = "avatar") {
  return `<span class="${cls}" aria-hidden="true">${esc(initials(name))}${url ? `<img src="${esc(url)}" alt="" onerror="this.remove()">` : ""}</span>`;
}

function verdictPill(s) {
  if (s.status !== "reviewed") return `<span class="status-pill"><span class="dot"></span>Pending</span>`;
  if (s.verdict === "pass") return `<span class="status-pill pass"><span class="dot"></span>Passed</span>`;
  return `<span class="status-pill fail"><span class="dot"></span>Needs retake</span>`;
}

/* ============== API HELPER ============== */
async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (res.status === 401) {
    state.user = null;
    state.view = "splash";
    render();
    throw new Error("Not signed in");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

/* ============== QUIZ DRAFT ============== */
// In-progress answers are kept on this device so a session expiry, server
// restart or failed submit never throws away a finished quiz. The draft's
// id doubles as an idempotency key so retrying a submit can't double-save.
function draftKey() {
  return `lacrp:quiz-draft:${state.user ? state.user.id : "anon"}`;
}
function loadDraft() {
  try {
    const raw = localStorage.getItem(draftKey());
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveDraft() {
  try {
    localStorage.setItem(draftKey(), JSON.stringify({
      answers: state.answers,
      qi: state.qi,
      clientSubmissionId: state.clientSubmissionId,
      savedAt: new Date().toISOString(),
    }));
  } catch {}
}
function clearDraft() {
  try { localStorage.removeItem(draftKey()); } catch {}
}
function newSubmissionId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/* ============== INIT ============== */
async function init() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("error")) state.loginError = params.get("error");

  try {
    state.user = await api("/api/me");
    state.view = "dashboard";
  } catch {
    state.view = "splash";
  }
  render();
}

/* ============== SPLASH ============== */
function renderSplash() {
  app.innerHTML = `
    <div class="splash">
      <div class="splash-card">
        <div class="splash-mark"><img src="/logo.png" alt="Server logo"></div>
        <h1>Los Angeles City Roleplay</h1>
        <p>Staff Portal. Sign in with Discord to access your assigned trainings. Your server role determines what you can see.</p>
        ${state.loginError ? `<div class="splash-error">${esc(state.loginError)}</div>` : ""}
        <a class="discord-btn" href="/login">${icon.discord}Continue with Discord</a>
        <div class="splash-foot">Staff access only. All activity is logged.</div>
      </div>
    </div>
  `;
}

/* ============== SHELL ============== */
function sidebarHTML(active) {
  const u = state.user;
  const badge = state.pendingCount ? `<span class="nav-badge" id="pendingBadge">${state.pendingCount}</span>` : `<span class="nav-badge" id="pendingBadge" style="display:none;"></span>`;
  return `
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark"><img src="/logo.png" alt="Server logo"></div>
        <div class="brand-text">LACRP <span>Staff Portal</span></div>
      </div>
      <nav class="nav">
        <button class="nav-item ${active === "dashboard" ? "active" : ""}" data-nav="dashboard" title="Dashboard">${icon.grid}<span class="nav-label">Dashboard</span></button>
      </nav>
      ${u.isAdmin ? `
        <div class="nav-divider"></div>
        <div class="nav-sub-label">Admin</div>
        <nav class="nav">
          <button class="nav-item ${active === "admin" ? "active" : ""}" data-nav="admin" title="Pending Submissions">
            ${icon.inbox}<span class="nav-label">Pending Submissions</span>${badge}
          </button>
        </nav>
      ` : ""}
      ${u.isSenior ? `
        <div class="nav-divider"></div>
        <div class="nav-sub-label">Senior High Rank</div>
        <nav class="nav">
          <button class="nav-item ${active === "seniorActivity" ? "active" : ""}" data-nav="seniorActivity" title="All Quiz Activity">${icon.layers}<span class="nav-label">All Quiz Activity</span></button>
          <button class="nav-item ${active === "auditLog" ? "active" : ""}" data-nav="auditLog" title="Audit Log">${icon.clock}<span class="nav-label">Audit Log</span></button>
        </nav>
      ` : ""}
      <div class="sidebar-foot">
        ${avatarHTML(u.avatar, u.username)}
        <div class="who">${esc(u.username)}<span>${esc(u.rank)}</span></div>
        <a class="logout-link" href="/logout" title="Sign out">${icon.logout}<span>Sign out</span></a>
      </div>
    </aside>
  `;
}

function wireSidebar() {
  document.querySelectorAll("[data-nav]").forEach((b) => {
    b.onclick = () => {
      state.view = b.dataset.nav;
      render();
    };
  });
  if (state.user.isAdmin) refreshPendingBadge();
}

async function refreshPendingBadge() {
  try {
    const rows = await api("/api/admin/submissions?status=pending");
    setPendingCount(rows.length);
  } catch (err) {
    console.error("Couldn't refresh pending count:", err.message);
  }
}
function setPendingCount(n) {
  state.pendingCount = n;
  const badge = document.getElementById("pendingBadge");
  if (!badge) return;
  badge.style.display = n > 0 ? "inline-block" : "none";
  badge.textContent = n;
}

function paint(active, mainHTML) {
  app.innerHTML = `
    <div class="shell">
      ${sidebarHTML(active)}
      <main class="main">${mainHTML}</main>
    </div>
  `;
  wireSidebar();
}

function errorStateHTML(message) {
  return `<div class="card"><div class="empty-state">Couldn't load this page: ${esc(message)}<br><button class="btn-ghost" id="retryBtn" style="margin-top:14px;">Try again</button></div></div>`;
}

/* ============== ROUTER ============== */
// Each render gets a number. Async views check it before drawing, so a slow
// response can't overwrite a page the person has already navigated away from.
let renderSeq = 0;
let lastView = null;
const isCurrent = (seq) => seq === renderSeq;

const views = {
  loading: () => { app.innerHTML = `<div class="boot-loader">Loading…</div>`; },
  splash: renderSplash,
  dashboard: renderDashboard,
  quiz: renderQuiz,
  review: renderReview,
  submitted: renderSubmitted,
  admin: renderAdminList,
  adminDetail: renderAdminDetail,
  seniorActivity: renderSeniorActivity,
  seniorDetail: renderSeniorDetail,
  candidateHistory: renderCandidateHistory,
  auditLog: renderAuditLog,
};
const navFor = {
  dashboard: "dashboard", review: "dashboard", submitted: "dashboard",
  admin: "admin", adminDetail: "admin",
  seniorActivity: "seniorActivity", seniorDetail: "seniorActivity", candidateHistory: "seniorActivity",
  auditLog: "auditLog",
};

function render() {
  const seq = ++renderSeq;
  const view = state.view;
  if (view !== lastView) window.scrollTo(0, 0);
  lastView = view;

  // Only show "Loading…" if the page takes a moment, to avoid flicker.
  const loadingTimer = navFor[view] && state.user
    ? setTimeout(() => { if (isCurrent(seq)) paint(navFor[view], `<div class="page-loading">Loading…</div>`); }, 180)
    : null;

  Promise.resolve()
    .then(() => (views[view] || renderDashboard)(seq))
    .catch((err) => {
      if (!isCurrent(seq) || err.message === "Not signed in") return;
      paint(navFor[view] || "dashboard", errorStateHTML(err.message));
      document.getElementById("retryBtn").onclick = () => render();
    })
    .finally(() => clearTimeout(loadingTimer));
}

/* ============== DASHBOARD ============== */
function trainingStatusHTML(mySubs, latest, startLabel) {
  if (!state.user.isTrainee) return `<span class="status-pill">Not assigned to your role</span>`;
  if (!latest) return `<button class="btn-start" id="startBtn">${startLabel}</button>`;
  if (latest.status === "pending") return `<span class="status-pill"><span class="dot"></span>Awaiting review</span>`;
  if (latest.verdict === "pass") return `<span class="status-pill pass"><span class="dot"></span>Passed</span>`;
  if (latest.verdict === "fail" && latest.active !== false) return `<span class="status-pill fail"><span class="dot"></span>Needs retake, contact an Admin</span>`;
  if (latest.active === false) {
    const label = startLabel === "Resume quiz" ? startLabel : "Retake quiz";
    return `<span class="status-pill fail"><span class="dot"></span>Needs retake</span><button class="btn-start" id="startBtn">${label}</button>`;
  }
  return `<span class="status-pill done"><span class="dot"></span>Reviewed</span>`;
}

function trainingCardHTML(mySubs) {
  const latest = mySubs[0];
  const draft = loadDraft();
  const startLabel = draft && Object.keys(draft.answers || {}).length ? "Resume quiz" : "Start quiz";
  const feedback = latest && latest.status === "reviewed" && latest.notes
    ? `<div class="feedback">
         <span class="feedback-label">Reviewer's notes on attempt #${latest.attempt_number || 1}</span>
         <p>${esc(latest.notes)}</p>
       </div>`
    : "";
  return `
    <div class="card training-card">
      <div class="training-row">
        <div class="info">
          <div class="training-icon">${icon.file}</div>
          <div>
            <h3>Staff Operational Handbook Quiz</h3>
            <div class="training-meta">
              <span>${icon.layers}22 questions, 3 sections</span>
              <span>${icon.clock}~15 min</span>
              <span>Assigned to: Interns</span>
            </div>
          </div>
        </div>
        <div class="training-actions">${trainingStatusHTML(mySubs, latest, startLabel)}</div>
      </div>
      ${feedback}
    </div>
  `;
}

// The review queue is first come, first served.
const oldestFirst = (rows) => [...rows].sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at));

function pendingRowsHTML(rows, limit) {
  return rows.slice(0, limit).map((s) => `
    <button class="queue-row" data-open="${esc(s.id)}">
      ${avatarHTML(null, s.username, "avatar sm")}
      <span class="queue-main">
        <span class="name">${esc(s.username)} <span class="attempt-tag">#${esc(s.attempt_number || 1)}</span></span>
        <span class="meta">${esc(s.rank || "Staff")}</span>
      </span>
      ${scoreHTML(s.mc_score)}
      ${waitingHTML(s.submitted_at)}
      <span class="row-chevron">${icon.chevron}</span>
    </button>
  `).join("");
}

function activityLabel(a) {
  const who = `<strong>${esc(a.actor_name)}</strong>`;
  const labels = {
    submission_created: `${who} submitted an attempt`,
    review: `${who} reviewed a submission`,
    override: `${who} overrode a result`,
    export: `${who} exported records`,
  };
  return labels[a.action] || `${who} ${esc(a.action)}`;
}

async function renderDashboard(seq) {
  const u = state.user;
  const [mySubs, pending, stats, recent] = await Promise.all([
    u.isTrainee ? api("/api/my-submissions").catch(() => []) : [],
    u.isAdmin ? api("/api/admin/submissions?status=pending").catch((e) => ({ error: e.message })) : null,
    u.isSenior ? api("/api/senior/stats").catch(() => null) : null,
    u.isSenior ? api("/api/senior/audit?limit=8").catch(() => []) : null,
  ]);
  if (!isCurrent(seq)) return;
  if (Array.isArray(pending)) state.pendingCount = pending.length;

  const statsHTML = stats ? `
    <div class="grid-4">
      <div class="stat-card"><div class="num">${stats.pending}</div><div class="lbl">Pending review</div></div>
      <div class="stat-card"><div class="num">${stats.pass_rate}%</div><div class="lbl">Pass rate</div></div>
      <div class="stat-card"><div class="num">${stats.total_candidates}</div><div class="lbl">Candidates</div></div>
      <div class="stat-card"><div class="num">${stats.avg_attempts}</div><div class="lbl">Avg attempts</div></div>
    </div>` : "";

  let queueHTML = "";
  if (u.isAdmin) {
    const body = pending && pending.error
      ? `<div class="empty-state small">Couldn't load pending submissions: ${esc(pending.error)}</div>`
      : pending.length === 0
        ? `<div class="empty-state small">Nothing is waiting for review.</div>`
        : pendingRowsHTML(oldestFirst(pending), 5);
    const more = Array.isArray(pending) && pending.length > 0
      ? `<button class="btn-ghost queue-more" data-nav="admin">Open Pending Submissions${pending.length > 5 ? ` (${pending.length})` : ""}</button>`
      : "";
    queueHTML = `
      <h3 class="section-label">Waiting for review</h3>
      <div class="card queue-card">${body}${more}</div>
    `;
  }

  const trainingHTML = u.isTrainee ? `
    <h3 class="section-label">${u.isAdmin ? "Training (you can open it to preview)" : "Your training"}</h3>
    ${trainingCardHTML(mySubs)}
  ` : "";

  let sideHTML = "";
  if (u.isSenior) {
    sideHTML = `
      <div class="side-panel">
        <h3>${icon.pulse}Recent activity</h3>
        ${!recent || recent.length === 0
          ? `<div class="empty-state small">Nothing's happened yet.</div>`
          : recent.map((a) => `
            <div class="activity-item">
              <div class="activity-dot ${esc(a.action)}"></div>
              <div>
                <p class="activity-text">${activityLabel(a)}</p>
                <p class="activity-time">${esc(timeAgo(a.at))}</p>
              </div>
            </div>
          `).join("")}
        <button class="btn-ghost side-panel-link" data-nav="auditLog">View full audit log</button>
      </div>`;
  } else if (mySubs.length > 0) {
    sideHTML = `
      <div class="side-panel">
        <h3>${icon.history}Your attempts</h3>
        ${mySubs.map((s) => `
          <div class="activity-item">
            <div class="activity-dot ${s.status === "pending" ? "pending" : s.verdict === "pass" ? "pass" : s.verdict === "fail" ? "fail" : ""}"></div>
            <div>
              <p class="activity-text">Attempt #${esc(s.attempt_number || 1)}, ${s.status === "pending" ? "awaiting review" : s.verdict === "pass" ? "passed" : s.verdict === "fail" ? "needs retake" : "reviewed"}</p>
              <p class="activity-time">${esc(timeAgo(s.submitted_at))}</p>
            </div>
          </div>
        `).join("")}
      </div>`;
  }

  const subtitle = u.isAdmin
    ? "Here's what needs your attention."
    : "Your assigned training is below. Quizzes are marked by the Administration team, so you won't see a score here.";

  paint("dashboard", `
    <div class="page-head">
      <div>
        <h1>Welcome back, ${esc(u.username)}</h1>
        <p>${subtitle}</p>
      </div>
    </div>
    <div class="dashboard-grid ${sideHTML ? "" : "no-side"}">
      <div class="dashboard-main">
        ${statsHTML}
        ${queueHTML}
        ${trainingHTML}
      </div>
      ${sideHTML ? `<div class="dashboard-side">${sideHTML}</div>` : ""}
    </div>
  `);

  document.querySelectorAll(".queue-row[data-open]").forEach((b) => {
    b.onclick = () => openAdminDetail(b.dataset.open);
  });
  const startBtn = document.getElementById("startBtn");
  if (startBtn) startBtn.onclick = startQuiz;
}

async function startQuiz(e) {
  const btn = e && e.currentTarget;
  if (btn) { btn.disabled = true; btn.textContent = "Loading…"; }
  try {
    state.questions = await api("/api/questions");
  } catch (err) {
    if (btn) { btn.disabled = false; btn.textContent = "Start quiz"; }
    if (err.message !== "Not signed in") alert(`Couldn't load the quiz: ${err.message}`);
    return;
  }
  const saved = loadDraft();
  state.answers = (saved && saved.answers) || {};
  state.qi = saved && saved.qi < state.questions.length ? saved.qi : 0;
  state.clientSubmissionId = (saved && saved.clientSubmissionId) || newSubmissionId();
  saveDraft();
  state.view = "quiz";
  render();
}

/* ============== QUIZ ============== */
function sectionPosition(qi) {
  const q = state.questions[qi];
  const inSection = state.questions.filter((x) => x.section === q.section);
  return { index: inSection.indexOf(q) + 1, size: inSection.length };
}

function isAnswered(q) {
  const a = state.answers[q.id];
  return q.type === "mc" ? !!a && a.optionIndex !== undefined : !!a && !!a.value && a.value.trim().length > 0;
}

function renderQuiz() {
  const q = state.questions[state.qi];
  const pct = Math.round((state.qi / state.questions.length) * 100);
  const existing = state.answers[q.id];
  const pos = sectionPosition(state.qi);
  const last = state.qi === state.questions.length - 1;

  app.innerHTML = `
    <div class="quiz-shell">
      <div class="quiz-topbar">
        <button class="quiz-exit" id="exitBtn">← Save & exit</button>
        <div class="quiz-progress-track"><div class="quiz-progress-fill" style="width:${pct}%"></div></div>
        <div class="quiz-progress-count">${state.qi + 1} / ${state.questions.length}</div>
      </div>
      <div class="quiz-body">
        <span class="section-chip">${esc(q.section)} <span class="section-pos">· ${pos.index} of ${pos.size}</span></span>
        <div class="quiz-q">${esc(q.q)}</div>
        <div id="answerArea"></div>
        <div class="quiz-nav">
          <button class="btn-back" id="backBtn" ${state.qi === 0 ? "disabled" : ""}>Back</button>
          <button class="btn-next" id="nextBtn">${last ? "Review answers" : "Next"}</button>
        </div>
        <div class="quiz-foot">
          <span class="saved-note">${icon.check}Answers are saved on this device</span>
          <span class="key-hint">${q.type === "mc" ? `Press 1–${q.options.length} to choose, Enter to continue` : "Ctrl + Enter to continue"}</span>
        </div>
      </div>
    </div>
  `;

  const answerArea = document.getElementById("answerArea");
  const nextBtn = document.getElementById("nextBtn");

  function refreshNextState() {
    nextBtn.disabled = !isAnswered(q);
  }

  if (q.type === "mc") {
    answerArea.innerHTML = `<div class="mc-options">${q.options
      .map(
        (opt, i) => `
      <button class="mc-opt ${existing && existing.optionIndex === i ? "selected" : ""}" data-i="${i}">
        <span class="radio"></span><span class="mc-text">${esc(opt)}</span><span class="mc-key">${i + 1}</span>
      </button>
    `
      )
      .join("")}</div>`;
    answerArea.querySelectorAll(".mc-opt").forEach((btn) => {
      btn.onclick = () => {
        answerArea.querySelectorAll(".mc-opt").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        state.answers[q.id] = { value: q.options[+btn.dataset.i], optionIndex: +btn.dataset.i };
        saveDraft();
        refreshNextState();
      };
    });
  } else {
    answerArea.innerHTML = `
      <textarea class="quiz-textarea" id="scenarioInput" placeholder="Write your answer here...">${esc(existing ? existing.value : "")}</textarea>
      <div class="char-hint">Answer in your own words. This will be reviewed by an Administrator.</div>
    `;
    const ta = document.getElementById("scenarioInput");
    ta.addEventListener("input", () => {
      state.answers[q.id] = { value: ta.value };
      saveDraft();
      refreshNextState();
    });
    if (window.matchMedia("(hover: hover)").matches) ta.focus();
  }

  refreshNextState();
  nextBtn.onclick = () => {
    if (state.qi < state.questions.length - 1) {
      state.qi++;
      saveDraft();
      render();
    } else {
      state.view = "review";
      render();
    }
  };
  document.getElementById("backBtn").onclick = () => {
    if (state.qi > 0) {
      state.qi--;
      render();
    }
  };
  document.getElementById("exitBtn").onclick = () => {
    state.view = "dashboard";
    render();
  };
}

// Keyboard shortcuts while taking the quiz.
document.addEventListener("keydown", (e) => {
  if (state.view !== "quiz" || e.altKey) return;
  const next = document.getElementById("nextBtn");
  if (e.target.tagName === "TEXTAREA") {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && next && !next.disabled) {
      e.preventDefault();
      next.click();
    }
    return;
  }
  if (e.ctrlKey || e.metaKey) return;
  if (/^[1-9]$/.test(e.key)) {
    const opt = document.querySelectorAll(".mc-opt")[Number(e.key) - 1];
    if (opt) { e.preventDefault(); opt.click(); }
  } else if (e.key === "Enter" && next && !next.disabled) {
    e.preventDefault();
    next.click();
  }
});

/* ============== REVIEW (before submitting) ============== */
function groupBySection(items) {
  const groups = [];
  items.forEach((item, i) => {
    let g = groups.find((x) => x.section === item.section);
    if (!g) groups.push((g = { section: item.section, items: [] }));
    g.items.push({ item, i });
  });
  return groups;
}

function renderReview() {
  const answered = state.questions.filter(isAnswered).length;
  const total = state.questions.length;
  paint("dashboard", `
    <div class="page-head">
      <div>
        <h1>Review your answers</h1>
        <p>Nothing is graded here. Make sure everything's filled in before you submit to the Administration team.</p>
      </div>
      <span class="status-pill ${answered === total ? "done" : "fail"}"><span class="dot"></span>${answered} of ${total} answered</span>
    </div>
    ${groupBySection(state.questions).map((g) => `
      <h3 class="section-label">${esc(g.section)}</h3>
      <div class="card review-card">
        ${g.items.map(({ item: q, i }) => {
          const a = state.answers[q.id];
          const has = isAnswered(q);
          return `
          <div class="review-item">
            <p class="rq"><span class="qnum">${i + 1}.</span> ${esc(q.q)}</p>
            <div class="ra ${has ? "" : "empty"}">${has ? esc(a.value) : "No answer yet"}</div>
            <button class="review-edit" data-jump="${i}">${has ? "Edit answer" : "Answer this question"}</button>
          </div>`;
        }).join("")}
      </div>
    `).join("")}
    <div id="submitError" class="splash-error" style="display:none; margin-top:18px;"></div>
    <div class="submit-row">
      <button class="btn-ghost" id="backToQuizBtn">Back to quiz</button>
      <button class="btn-start" id="submitBtn">Submit for review</button>
    </div>
  `);
  document.querySelectorAll("[data-jump]").forEach((b) => {
    b.onclick = () => {
      state.qi = +b.dataset.jump;
      state.view = "quiz";
      render();
    };
  });
  document.getElementById("backToQuizBtn").onclick = () => {
    state.qi = state.questions.length - 1;
    state.view = "quiz";
    render();
  };
  document.getElementById("submitBtn").onclick = async (e) => {
    const btn = e.currentTarget;
    const errorBox = document.getElementById("submitError");
    btn.disabled = true;
    btn.textContent = "Submitting…";
    errorBox.style.display = "none";
    if (!state.clientSubmissionId) state.clientSubmissionId = newSubmissionId();
    saveDraft();
    try {
      // Only show "Submitted" once the server confirms the attempt is saved.
      const result = await api("/api/submit", {
        method: "POST",
        body: JSON.stringify({ answers: state.answers, client_submission_id: state.clientSubmissionId }),
      });
      clearDraft();
      state.lastSubmission = result;
      state.clientSubmissionId = null;
      state.view = "submitted";
      render();
    } catch (err) {
      if (err.message === "Not signed in") {
        // api() already switched to the sign-in screen; the draft is kept.
        state.loginError = "Your session expired before the quiz was submitted. Your answers are saved on this device: sign in, open the quiz and submit again.";
        render();
        return;
      }
      btn.disabled = false;
      btn.textContent = "Submit for review";
      errorBox.textContent = `Your quiz was NOT submitted: ${err.message}`;
      errorBox.style.display = "block";
    }
  };
}

/* ============== SUBMITTED ============== */
function renderSubmitted() {
  paint("dashboard", `
    <div class="submitted-wrap">
      <div class="check-circle">${icon.check}</div>
      <h2>Submitted for review</h2>
      <p>Your answers have gone to the Administration team. Nothing here is auto-graded, a real person will mark this and follow up with you directly.</p>
      ${state.lastSubmission && state.lastSubmission.id ? `<p class="ref">Submission reference #${esc(state.lastSubmission.id)}</p>` : ""}
      <button class="btn-start" id="doneBtn">Back to dashboard</button>
    </div>
  `);
  document.getElementById("doneBtn").onclick = () => {
    state.view = "dashboard";
    render();
  };
}

/* ============== ADMIN: LIST ============== */
async function renderAdminList(seq) {
  let listError = null;
  try {
    state.adminList = await api(`/api/admin/submissions?status=${state.adminFilter}`);
  } catch (err) {
    if (err.message === "Not signed in") return;
    listError = err.message;
    state.adminList = [];
  }
  if (!isCurrent(seq)) return;
  if (state.adminFilter === "pending" && !listError) state.pendingCount = state.adminList.length;

  const pendingTab = state.adminFilter === "pending";
  const rows = (pendingTab ? oldestFirst(state.adminList) : state.adminList).map((s) => `
    <button class="queue-row" data-open="${esc(s.id)}">
      ${avatarHTML(null, s.username, "avatar sm")}
      <span class="queue-main">
        <span class="name">${esc(s.username)} <span class="attempt-tag">#${esc(s.attempt_number || 1)}</span></span>
        <span class="meta">${esc(s.rank || "Staff")} · Submitted ${dateHTML(s.submitted_at)}</span>
      </span>
      ${scoreHTML(s.mc_score)}
      ${pendingTab ? waitingHTML(s.submitted_at) : verdictPill(s)}
      <span class="row-chevron">${icon.chevron}</span>
    </button>
  `).join("");

  paint("admin", `
    <div class="page-head">
      <div>
        <h1>Submissions</h1>
        <p>Quiz attempts from staff, oldest first in the queue. Multiple choice is marked for you; written answers need a person.</p>
      </div>
    </div>
    <div class="tab-row">
      <div class="tabs">
        <button class="tab ${pendingTab ? "active" : ""}" data-filter="pending">Pending${state.pendingCount ? ` <span class="tab-count">${state.pendingCount}</span>` : ""}</button>
        <button class="tab ${!pendingTab ? "active" : ""}" data-filter="reviewed">Reviewed</button>
      </div>
      <button class="btn-ghost" id="refreshListBtn">Refresh</button>
    </div>
    <div class="card list-card">
      ${listError
        ? `<div class="empty-state">Couldn't load submissions: ${esc(listError)}</div>`
        : state.adminList.length === 0
          ? `<div class="empty-state">${pendingTab ? "Nothing is waiting for review." : "No reviewed submissions yet."}</div>`
          : rows}
    </div>
  `);
  document.querySelectorAll("[data-filter]").forEach((b) => {
    b.onclick = () => {
      state.adminFilter = b.dataset.filter;
      render();
    };
  });
  document.getElementById("refreshListBtn").onclick = () => render();
  document.querySelectorAll(".queue-row[data-open]").forEach((b) => {
    b.onclick = () => openAdminDetail(b.dataset.open);
  });
}

async function openAdminDetail(id) {
  try {
    state.adminDetail = await api(`/api/admin/submissions/${encodeURIComponent(id)}`);
  } catch (err) {
    if (err.message !== "Not signed in") alert(`Couldn't open submission: ${err.message}`);
    return;
  }
  state.view = "adminDetail";
  render();
}

/* ============== SUBMISSION DETAIL (shared) ============== */
function answerItemHTML(q, n) {
  if (q.type === "mc") {
    const ok = q.isCorrect;
    return `
      <div class="key-item mc ${ok ? "is-correct" : "is-wrong"}">
        <span class="mark ${ok ? "ok" : "bad"}">${ok ? icon.check : icon.cross}</span>
        <div class="key-body">
          <p class="kq"><span class="qnum">${n}.</span> ${esc(q.q)}</p>
          <p class="kanswer">
            ${q.givenAnswer ? `Answered <strong>${esc(q.givenAnswer)}</strong>` : `<em>No answer</em>`}
            ${ok ? "" : `<span class="sep">·</span> Correct: <strong class="correct">${esc(q.correctAnswer)}</strong>`}
          </p>
          ${!ok && q.note ? `<p class="knote">${esc(q.note)}</p>` : ""}
        </div>
      </div>`;
  }
  return `
    <div class="key-item written">
      <p class="kq"><span class="qnum">${n}.</span> ${esc(q.q)}</p>
      <div class="answer-compare">
        <div class="answer-block given"><span class="lbl">Staff answered</span>${q.givenAnswer ? esc(q.givenAnswer) : "<em>No answer</em>"}</div>
        <div class="answer-block model"><span class="lbl">What a good answer covers</span>${esc(q.modelSummary)}</div>
      </div>
    </div>`;
}

function submissionBodyHTML(s) {
  const mc = s.answers.filter((q) => q.type === "mc");
  const correct = mc.filter((q) => q.isCorrect).length;
  const written = s.answers.length - mc.length;
  const pct = mc.length ? Math.round((correct / mc.length) * 100) : 0;
  let n = 0;
  const numbered = s.answers.map((q) => ({ ...q, n: ++n }));

  return `
    <div class="card summary-card">
      <div class="summary-score">
        <div class="num">${correct}<span>/${mc.length}</span></div>
        <div class="lbl">Multiple choice correct</div>
        <div class="meter"><div style="width:${pct}%"></div></div>
      </div>
      <div class="summary-side">
        <p>${mc.length - correct === 0 ? "No wrong multiple choice answers." : `${mc.length - correct} wrong multiple choice answer${mc.length - correct === 1 ? "" : "s"}`} and ${written} written answer${written === 1 ? "" : "s"} to read below.</p>
        ${correct > 0 ? `<button class="btn-ghost" id="toggleCorrectBtn">Show ${correct} correct answer${correct === 1 ? "" : "s"}</button>` : ""}
      </div>
    </div>
    <div class="answers" id="answersWrap">
      ${groupBySection(numbered).map((g) => {
        const gmc = g.items.filter(({ item }) => item.type === "mc");
        const gOk = gmc.filter(({ item }) => item.isCorrect).length;
        const allHidden = gmc.length === g.items.length && gOk === gmc.length;
        return `
        <div class="answer-group ${allHidden ? "all-correct" : ""}">
          <h3 class="section-label">${esc(g.section)}${gmc.length ? ` <span class="group-score">${gOk}/${gmc.length} correct</span>` : ""}</h3>
          <div class="card">
            ${g.items.map(({ item }) => answerItemHTML(item, item.n)).join("")}
            ${allHidden ? `<div class="all-correct-note">All correct. Use "Show correct answers" to see them.</div>` : ""}
          </div>
        </div>`;
      }).join("")}
    </div>
  `;
}

function wireCorrectToggle() {
  const btn = document.getElementById("toggleCorrectBtn");
  if (!btn) return;
  const wrap = document.getElementById("answersWrap");
  const showLabel = btn.textContent;
  btn.onclick = () => {
    const on = wrap.classList.toggle("show-all");
    btn.textContent = on ? "Hide correct answers" : showLabel;
  };
}

function submissionHeadHTML(s, backId, backLabel, extra = "") {
  return `
    <div class="page-head">
      <div>
        <h1>${esc(s.username)} <span class="attempt-tag big">Attempt #${esc(s.attempt_number || 1)}</span></h1>
        <p>${esc(s.rank || "Staff")} · Submitted ${dateHTML(s.submitted_at)}${s.active === false ? " · Archived" : ""}</p>
      </div>
      <div class="head-actions">${extra}<button class="btn-ghost" id="${backId}">← ${backLabel}</button></div>
    </div>
    <div class="current-verdict-row">
      ${verdictPill(s)}
      ${s.reviewer_name ? `<span class="meta-inline">Marked by ${esc(s.reviewer_name)}${s.reviewed_at ? `, ${esc(fmtDate(s.reviewed_at))}` : ""}</span>` : ""}
    </div>
    ${s.notes && s.status === "reviewed" ? `<div class="info-banner"><strong>Notes</strong><br>${esc(s.notes)}</div>` : ""}
  `;
}

/* ============== ADMIN: DETAIL ============== */
function renderAdminDetail() {
  const s = state.adminDetail;
  paint("admin", `
    ${submissionHeadHTML(s, "backToListBtn", "Back to list")}
    ${submissionBodyHTML(s)}
    <div class="verdict-bar">
      <div class="verdict-row">
        <button class="verdict-btn pass ${s.verdict === "pass" ? "picked" : ""}" data-verdict="pass">${icon.check}Pass</button>
        <button class="verdict-btn fail ${s.verdict === "fail" ? "picked" : ""}" data-verdict="fail">${icon.cross}Needs retake</button>
      </div>
      <textarea class="notes-textarea" id="notesInput" rows="1" placeholder="Notes for the staff member" title="The staff member will see these notes">${esc(s.notes || "")}</textarea>
      <button class="btn-start" id="saveReviewBtn">${s.status === "reviewed" ? "Update review" : "Save review"}</button>
    </div>
  `);
  wireCorrectToggle();
  if (window.matchMedia("(max-width: 780px)").matches) document.getElementById("notesInput").placeholder = "Notes (optional)";
  let pickedVerdict = s.verdict || null;
  document.querySelectorAll("[data-verdict]").forEach((b) => {
    b.onclick = () => {
      pickedVerdict = b.dataset.verdict;
      document.querySelectorAll("[data-verdict]").forEach((x) => x.classList.remove("picked"));
      b.classList.add("picked");
    };
  });
  document.getElementById("backToListBtn").onclick = () => {
    state.view = "admin";
    render();
  };
  document.getElementById("saveReviewBtn").onclick = async (e) => {
    const btn = e.currentTarget;
    const notes = document.getElementById("notesInput").value;
    if (!pickedVerdict) {
      alert("Pick Pass or Needs retake before saving.");
      return;
    }
    btn.disabled = true;
    try {
      await api(`/api/admin/submissions/${encodeURIComponent(s.id)}/review`, {
        method: "POST",
        body: JSON.stringify({ verdict: pickedVerdict, notes }),
      });
    } catch (err) {
      btn.disabled = false;
      if (err.message !== "Not signed in") alert(`Review was not saved: ${err.message}`);
      return;
    }
    btn.textContent = "Saved ✓";
    setTimeout(() => {
      state.view = "admin";
      render();
    }, 700);
  };
}

/* ============== SENIOR: ALL QUIZ ACTIVITY ============== */
async function renderSeniorActivity(seq) {
  const params = new URLSearchParams();
  if (state.seniorStatusFilter) params.set("status", state.seniorStatusFilter);
  if (state.seniorQuery) params.set("q", state.seniorQuery);
  state.seniorList = await api(`/api/senior/submissions?${params.toString()}`);
  if (!isCurrent(seq)) return;

  paint("seniorActivity", `
    <div class="page-head">
      <div>
        <h1>All Quiz Activity</h1>
        <p>Every attempt, any status. Search by name or filter by status.</p>
      </div>
    </div>
    <div class="filter-row">
      <div class="search-box">
        ${icon.search}
        <input type="text" id="seniorSearch" placeholder="Search by username, press Enter" value="${esc(state.seniorQuery)}">
      </div>
      <select id="seniorStatusSelect" class="filter-select">
        <option value="">All statuses</option>
        <option value="pending" ${state.seniorStatusFilter === "pending" ? "selected" : ""}>Pending</option>
        <option value="reviewed" ${state.seniorStatusFilter === "reviewed" ? "selected" : ""}>Reviewed</option>
      </select>
    </div>
    <div class="card list-card">
      ${state.seniorList.length === 0
        ? `<div class="empty-state">No submissions match.</div>`
        : state.seniorList.map((s) => `
          <div class="admin-row">
            <div class="who">
              ${avatarHTML(null, s.username, "avatar sm")}
              <div>
                <div class="name">${esc(s.username)} <span class="attempt-tag">#${esc(s.attempt_number || 1)}</span>${s.active === false ? `<span class="archived-tag">archived</span>` : ""}</div>
                <div class="meta">${esc(s.rank || "Staff")} · ${dateHTML(s.submitted_at)}${s.reviewer_name ? ` · Marked by ${esc(s.reviewer_name)}` : ""}</div>
              </div>
            </div>
            <div class="row-actions">
              ${scoreHTML(s.mc_score)}
              ${verdictPill(s)}
              <button class="btn-ghost sm" data-history="${esc(s.discord_id)}">History</button>
              <button class="btn-start sm" data-open="${esc(s.id)}">View</button>
            </div>
          </div>
        `).join("")}
    </div>
  `);
  document.getElementById("seniorSearch").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      state.seniorQuery = e.target.value;
      render();
    }
  });
  document.getElementById("seniorStatusSelect").onchange = (e) => {
    state.seniorStatusFilter = e.target.value;
    render();
  };
  document.querySelectorAll("[data-open]").forEach((b) => {
    b.onclick = () => openSeniorDetail(b.dataset.open, "seniorActivity");
  });
  document.querySelectorAll("[data-history]").forEach((b) => {
    b.onclick = () => openCandidateHistory(b.dataset.history);
  });
}

async function openSeniorDetail(id, back) {
  try {
    state.seniorDetail = await api(`/api/senior/submissions/${encodeURIComponent(id)}`);
  } catch (err) {
    if (err.message !== "Not signed in") alert(`Couldn't open submission: ${err.message}`);
    return;
  }
  state.seniorBack = back;
  state.view = "seniorDetail";
  render();
}

async function openCandidateHistory(discordId) {
  try {
    state.candidateHistory = await api(`/api/senior/candidates/${encodeURIComponent(discordId)}`);
  } catch (err) {
    if (err.message !== "Not signed in") alert(`Couldn't open history: ${err.message}`);
    return;
  }
  state.view = "candidateHistory";
  render();
}

/* ============== SENIOR: SUBMISSION DETAIL (override) ============== */
function renderSeniorDetail() {
  const s = state.seniorDetail;
  const backLabel = state.seniorBack === "candidateHistory" ? "Back to history" : "Back to activity";
  paint("seniorActivity", `
    ${submissionHeadHTML(s, "backToListBtn", backLabel, `<button class="btn-ghost" id="historyBtn">${icon.history}History</button>`)}
    ${(s.override_history && s.override_history.length > 0) ? `
      <div class="info-banner override">
        <strong>Override history</strong>
        ${s.override_history.map((o) => `
          <div class="override-entry">${esc(o.by_name)} changed the verdict from <strong>${esc(o.previous_verdict || "none")}</strong>, ${dateHTML(o.at)}.<br>Reason: ${esc(o.reason)}</div>
        `).join("")}
      </div>
    ` : ""}
    ${submissionBodyHTML(s)}
    <div class="verdict-bar override-bar">
      <div class="override-title">${icon.flag}<span>Override result</span><span class="panel-sub">The previous verdict stays in history. A reason is required.</span></div>
      <div class="verdict-row">
        <button class="verdict-btn pass" data-override-verdict="pass">${icon.check}Pass</button>
        <button class="verdict-btn fail" data-override-verdict="fail">${icon.cross}Needs retake</button>
      </div>
      <textarea class="notes-textarea" id="overrideNotes" rows="1" placeholder="Updated notes (optional)"></textarea>
      <textarea class="notes-textarea" id="overrideReason" rows="1" placeholder="Reason for the override (required)"></textarea>
      <button class="btn-start" id="saveOverrideBtn" disabled>Save override</button>
    </div>
  `);
  wireCorrectToggle();

  let overrideVerdict = null;
  const saveBtn = document.getElementById("saveOverrideBtn");
  const reasonInput = document.getElementById("overrideReason");
  const refresh = () => { saveBtn.disabled = !overrideVerdict || !reasonInput.value.trim(); };
  document.querySelectorAll("[data-override-verdict]").forEach((b) => {
    b.onclick = () => {
      overrideVerdict = b.dataset.overrideVerdict;
      document.querySelectorAll("[data-override-verdict]").forEach((x) => x.classList.remove("picked"));
      b.classList.add("picked");
      refresh();
    };
  });
  reasonInput.addEventListener("input", refresh);
  saveBtn.onclick = async () => {
    saveBtn.disabled = true;
    try {
      await api(`/api/senior/submissions/${encodeURIComponent(s.id)}/override`, {
        method: "POST",
        body: JSON.stringify({
          verdict: overrideVerdict,
          notes: document.getElementById("overrideNotes").value,
          reason: reasonInput.value,
        }),
      });
      saveBtn.textContent = "Saved ✓";
      setTimeout(() => { state.view = state.seniorBack; render(); }, 700);
    } catch (err) {
      refresh();
      if (err.message !== "Not signed in") alert(err.message);
    }
  };

  document.getElementById("historyBtn").onclick = () => openCandidateHistory(s.discord_id);
  document.getElementById("backToListBtn").onclick = () => { state.view = state.seniorBack; render(); };
}

/* ============== SENIOR: CANDIDATE HISTORY ============== */
function renderCandidateHistory() {
  const c = state.candidateHistory;
  paint("seniorActivity", `
    <div class="page-head">
      <div>
        <h1>${esc(c.username)}'s history</h1>
        <p>${esc(c.rank || "Staff")} · ${c.attempts.length} attempt${c.attempts.length === 1 ? "" : "s"} on file</p>
      </div>
      <button class="btn-ghost" id="backBtn">← Back to activity</button>
    </div>
    <div class="card list-card">
      ${c.attempts.map((a) => `
        <div class="admin-row">
          <div class="who">
            <div>
              <div class="name">Attempt #${esc(a.attempt_number)}${a.active === false ? `<span class="archived-tag">archived</span>` : `<span class="active-tag">current</span>`}</div>
              <div class="meta">Submitted ${dateHTML(a.submitted_at)}${a.reviewer_name ? ` · Marked by ${esc(a.reviewer_name)}` : ""}</div>
            </div>
          </div>
          <div class="row-actions">
            ${scoreHTML(a.mc_score)}
            ${verdictPill(a)}
            <button class="btn-start sm" data-open="${esc(a.id)}">View</button>
          </div>
        </div>
      `).join("")}
    </div>
  `);
  document.getElementById("backBtn").onclick = () => { state.view = "seniorActivity"; render(); };
  document.querySelectorAll("[data-open]").forEach((b) => {
    b.onclick = () => openSeniorDetail(b.dataset.open, "candidateHistory");
  });
}

/* ============== SENIOR: AUDIT LOG ============== */
async function renderAuditLog(seq) {
  const params = new URLSearchParams();
  if (state.auditFilter.action) params.set("action", state.auditFilter.action);
  if (state.auditFilter.q) params.set("q", state.auditFilter.q);
  state.auditList = await api(`/api/senior/audit?${params.toString()}`);
  if (!isCurrent(seq)) return;

  paint("auditLog", `
    <div class="page-head">
      <div>
        <h1>Audit Log</h1>
        <p>Every important action, searchable. Nothing here can be edited or deleted.</p>
      </div>
      <div class="head-actions">
        <a class="btn-ghost" href="/api/senior/export?type=submissions">${icon.download}Export submissions</a>
        <a class="btn-ghost" href="/api/senior/export?type=audit">${icon.download}Export audit log</a>
      </div>
    </div>
    <div class="filter-row">
      <div class="search-box">
        ${icon.search}
        <input type="text" id="auditSearch" placeholder="Search actor, action, reason, press Enter" value="${esc(state.auditFilter.q)}">
      </div>
      <select id="auditActionSelect" class="filter-select">
        <option value="">All actions</option>
        <option value="submission_created" ${state.auditFilter.action === "submission_created" ? "selected" : ""}>Submitted</option>
        <option value="review" ${state.auditFilter.action === "review" ? "selected" : ""}>Reviewed</option>
        <option value="override" ${state.auditFilter.action === "override" ? "selected" : ""}>Override</option>
        <option value="export" ${state.auditFilter.action === "export" ? "selected" : ""}>Export</option>
      </select>
    </div>
    <div class="card list-card">
      ${state.auditList.length === 0
        ? `<div class="empty-state">No matching audit entries.</div>`
        : state.auditList.map((a) => `
          <div class="audit-item">
            <div class="activity-dot ${esc(a.action)}"></div>
            <div class="audit-body">
              <p class="activity-text">${activityLabel(a)}${a.target_id ? ` <span class="meta-inline">#${esc(a.target_id)}</span>` : ""}</p>
              ${a.details ? `<p class="audit-detail">${esc(a.details)}</p>` : ""}
              ${a.reason ? `<p class="audit-reason">Reason: ${esc(a.reason)}</p>` : ""}
            </div>
            <p class="activity-time">${dateHTML(a.at)}</p>
          </div>
        `).join("")}
    </div>
  `);
  document.getElementById("auditSearch").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      state.auditFilter.q = e.target.value;
      render();
    }
  });
  document.getElementById("auditActionSelect").onchange = (e) => {
    state.auditFilter.action = e.target.value;
    render();
  };
}

init();
