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
  candidateHistory: null,
  auditList: [],
  auditFilter: { action: "", q: "" },
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
  file: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 3.5C6 2.7 6.7 2 7.5 2H14l5 5v14.5c0 .8-.7 1.5-1.5 1.5h-10c-.8 0-1.5-.7-1.5-1.5V3.5Z"/><path d="M14 2v5h5"/></svg>`,
  discord: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.3 5.3A18 18 0 0 0 15.7 4l-.3.6a13 13 0 0 1 4 1.6 15 15 0 0 0-15 0 13 13 0 0 1 4-1.6L8 4a18 18 0 0 0-4.6 1.3S.5 10 1 15.8a18 18 0 0 0 5.4 2.7l.9-1.5a10 10 0 0 1-1.7-.8l.4-.3a13 13 0 0 0 11.9 0l.4.3a10 10 0 0 1-1.7.8l.9 1.5a18 18 0 0 0 5.4-2.7c.6-6.4-1.5-11-3.6-12.5ZM8.7 14a1.6 1.6 0 0 1 0-3.3 1.6 1.6 0 0 1 0 3.3Zm6.6 0a1.6 1.6 0 0 1 0-3.3 1.6 1.6 0 0 1 0 3.3Z"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>`,
  history: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 2"/></svg>`,
  download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v12m0 0l-4-4m4 4l4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>`,
  flag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 3v18"/><path d="M5 4h11l-2 4 2 4H5"/></svg>`,
  pulse: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12h4l2-7 4 14 2-7h6"/></svg>`,
};

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
        ${state.loginError ? `<div class="splash-error">${state.loginError}</div>` : ""}
        <a class="discord-btn" href="/login">${icon.discord}Continue with Discord</a>
        <div class="splash-foot">Staff access only. All activity is logged.</div>
      </div>
    </div>
  `;
}

/* ============== SIDEBAR ============== */
function sidebarHTML(active) {
  const u = state.user;
  return `
    <div class="sidebar">
      <div class="brand">
        <div class="brand-mark"><img src="/logo.png" alt="Server logo"></div>
        <div class="brand-text">LACRP <span>Staff Portal</span></div>
      </div>
      <div class="nav">
        <button class="nav-item ${active === "dashboard" ? "active" : ""}" data-nav="dashboard">${icon.grid}<span class="nav-label">Dashboard</span></button>
        <button class="nav-item ${active === "trainings" ? "active" : ""}" data-nav="dashboard">${icon.book}<span class="nav-label">Trainings</span></button>
      </div>
      ${u.isAdmin ? `
        <div class="nav-divider"></div>
        <div class="nav-sub-label">Admin only</div>
        <div class="nav">
          <button class="nav-item ${active === "admin" ? "active" : ""}" data-nav="admin">
            ${icon.inbox}<span class="nav-label">Pending Submissions</span>
            <span class="nav-badge" id="pendingBadge" style="display:none;">0</span>
          </button>
        </div>
      ` : ""}
      ${u.isSenior ? `
        <div class="nav-divider"></div>
        <div class="nav-sub-label">Senior High Rank</div>
        <div class="nav">
          <button class="nav-item ${active === "seniorActivity" ? "active" : ""}" data-nav="seniorActivity">${icon.layers}<span class="nav-label">All Quiz Activity</span></button>
          <button class="nav-item ${active === "auditLog" ? "active" : ""}" data-nav="auditLog">${icon.clock}<span class="nav-label">Audit Log</span></button>
        </div>
      ` : ""}
      <div class="sidebar-foot">
        <img class="avatar" src="${u.avatar}" alt="">
        <div class="who">${u.username}<span>${u.rank}</span></div>
        <a class="logout-link" href="/logout">Sign out</a>
      </div>
    </div>
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
    const badge = document.getElementById("pendingBadge");
    if (badge && rows.length > 0) {
      badge.style.display = "inline-block";
      badge.textContent = rows.length;
    }
  } catch {}
}

/* ============== DASHBOARD ============== */
async function renderDashboard() {
  let mySubs = [];
  try { mySubs = await api("/api/my-submissions"); } catch {}
  const latest = mySubs[0];
  const total = 22; // matches question bank count

  // Build the right-hand activity panel based on who's looking.
  let activityHTML = "";
  if (state.user.isSenior) {
    let recent = [];
    try { recent = await api("/api/senior/audit?limit=8"); } catch {}
    activityHTML = `
      <div class="side-panel">
        <h3>${icon.pulse}Recent activity</h3>
        ${recent.length === 0
          ? `<div class="empty-state small">Nothing's happened yet.</div>`
          : recent.map((a) => `
            <div class="activity-item">
              <div class="activity-dot ${a.action}"></div>
              <div>
                <p class="activity-text">${activityLabel(a)}</p>
                <p class="activity-time">${timeAgo(a.at)}</p>
              </div>
            </div>
          `).join("")
        }
        <button class="btn-ghost side-panel-link" data-nav="auditLog">View full audit log</button>
      </div>
    `;
  } else if (state.user.isAdmin) {
    let pending = [];
    try { pending = await api("/api/admin/submissions?status=pending"); } catch {}
    activityHTML = `
      <div class="side-panel">
        <h3>${icon.inbox}Needs your review</h3>
        ${pending.length === 0
          ? `<div class="empty-state small">Nothing pending right now.</div>`
          : pending.slice(0, 6).map((s) => `
            <div class="activity-item">
              <div class="activity-dot pending"></div>
              <div>
                <p class="activity-text"><strong>${s.username}</strong> submitted an attempt</p>
                <p class="activity-time">${timeAgo(s.submitted_at)}</p>
              </div>
            </div>
          `).join("")
        }
        <button class="btn-ghost side-panel-link" data-nav="admin">Go to Pending Submissions</button>
      </div>
    `;
  } else if (mySubs.length > 0) {
    activityHTML = `
      <div class="side-panel">
        <h3>${icon.history}Your attempt history</h3>
        ${mySubs.map((s) => `
          <div class="activity-item">
            <div class="activity-dot ${s.status === "pending" ? "pending" : s.verdict === "pass" ? "pass" : s.verdict === "fail" ? "fail" : ""}"></div>
            <div>
              <p class="activity-text">Attempt #${s.attempt_number || 1}, ${s.status === "pending" ? "awaiting review" : s.verdict === "pass" ? "passed" : s.verdict === "fail" ? "needs retake" : "reviewed"}${s.reopened ? " (reopened for retake)" : ""}</p>
              <p class="activity-time">${timeAgo(s.submitted_at)}</p>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  } else {
    activityHTML = `
      <div class="side-panel">
        <h3>${icon.book}Getting started</h3>
        <p class="side-panel-copy">Once you start the training below, your progress and history will show up here.</p>
      </div>
    `;
  }

  app.innerHTML = `
    <div class="shell">
      ${sidebarHTML("dashboard")}
      <div class="main">
        <div class="page-head">
          <div>
            <h1>Welcome back, ${state.user.username}</h1>
            <p>Here's what's assigned to you right now. Quizzes are marked by the Administration team, so you won't see a score here.</p>
          </div>
        </div>

        <div class="dashboard-grid">
          <div class="dashboard-main">
            <div class="grid-3">
              <div class="stat-card"><div class="num">${total}</div><div class="lbl">Questions in this training</div></div>
              <div class="stat-card"><div class="num">3</div><div class="lbl">Sections to complete</div></div>
              <div class="stat-card"><div class="num">${mySubs.length}</div><div class="lbl">Submissions on file</div></div>
            </div>

            <h3 class="section-label">Assigned training</h3>

            <div class="card training-card">
              <div class="info">
                <div class="training-icon">${icon.file}</div>
                <div>
                  <h3>Staff Operational Handbook Quiz</h3>
                  <div class="training-meta">
                    <span>${icon.layers}${total} questions</span>
                    <span>${icon.clock}~15 min</span>
                    <span>Assigned to: Interns</span>
                  </div>
                </div>
              </div>
              <div style="display:flex; align-items:center; gap:12px;">
                ${!state.user.isTrainee
                  ? `<span class="status-pill">Not assigned to your role</span>`
                  : mySubs.length > 0
                    ? (() => {
                        if (latest.status === "pending") return `<span class="status-pill"><span class="dot"></span>Awaiting review</span>`;
                        if (latest.verdict === "pass") return `<span class="status-pill pass"><span class="dot"></span>Passed</span>`;
                        if (latest.verdict === "fail" && latest.active !== false) return `<span class="status-pill fail"><span class="dot"></span>Needs retake, contact an Admin</span>`;
                        if (latest.active === false) return `<button class="btn-start" id="startBtn">Start quiz</button>`; return `<span class="status-pill done"><span class="dot"></span>Reviewed</span>`;
                      })()
                    : `<button class="btn-start" id="startBtn">Start quiz</button>`
                }
              </div>
            </div>

            ${state.user.isSenior ? await seniorStatsRowHTML() : ""}
          </div>

          <div class="dashboard-side">
            ${activityHTML}
          </div>
        </div>
      </div>
    </div>
  `;
  wireSidebar();
  document.querySelectorAll(".side-panel-link[data-nav]").forEach((b) => {
    b.onclick = () => { state.view = b.dataset.nav; render(); };
  });
  const startBtn = document.getElementById("startBtn");
  if (startBtn) {
    startBtn.onclick = async () => {
      state.questions = await api("/api/questions");
      state.answers = {};
      state.qi = 0;
      state.view = "quiz";
      render();
    };
  }
}

async function seniorStatsRowHTML() {
  let stats = null;
  try { stats = await api("/api/senior/stats"); } catch { return ""; }
  if (!stats) return "";
  return `
    <h3 class="section-label">Server-wide quiz stats</h3>
    <div class="grid-4">
      <div class="stat-card"><div class="num">${stats.pass_rate}%</div><div class="lbl">Pass rate</div></div>
      <div class="stat-card"><div class="num">${stats.total_candidates}</div><div class="lbl">Candidates</div></div>
      <div class="stat-card"><div class="num">${stats.avg_attempts}</div><div class="lbl">Avg attempts</div></div>
      <div class="stat-card"><div class="num">${stats.pending}</div><div class="lbl">Pending</div></div>
    </div>
  `;
}

function activityLabel(a) {
  const labels = {
    submission_created: `<strong>${a.actor_name}</strong> submitted an attempt`,
    review: `<strong>${a.actor_name}</strong> reviewed a submission`,
    override: `<strong>${a.actor_name}</strong> overrode a result`,
    reopen: `<strong>${a.actor_name}</strong> reopened a quiz for retake`,
    export: `<strong>${a.actor_name}</strong> exported records`,
  };
  return labels[a.action] || `<strong>${a.actor_name}</strong> ${a.action}`;
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

/* ============== QUIZ ============== */
function renderQuiz() {
  const q = state.questions[state.qi];
  const pct = Math.round((state.qi / state.questions.length) * 100);
  const existing = state.answers[q.id];

  app.innerHTML = `
    <div class="quiz-shell">
      <div class="quiz-topbar">
        <button class="quiz-exit" id="exitBtn">← Save & exit</button>
        <div class="quiz-progress-track"><div class="quiz-progress-fill" style="width:${pct}%"></div></div>
        <div class="quiz-progress-count">${state.qi + 1} / ${state.questions.length}</div>
      </div>
      <div class="quiz-body">
        <span class="section-chip">${q.section}</span>
        <div class="quiz-q">${q.q}</div>
        <div id="answerArea"></div>
        <div class="quiz-nav">
          <button class="btn-back" id="backBtn" ${state.qi === 0 ? "disabled" : ""}>Back</button>
          <button class="btn-next" id="nextBtn">${state.qi === state.questions.length - 1 ? "Review answers" : "Next"}</button>
        </div>
      </div>
    </div>
  `;

  const answerArea = document.getElementById("answerArea");
  const nextBtn = document.getElementById("nextBtn");

  function refreshNextState() {
    const a = state.answers[q.id];
    const ok = q.type === "mc" ? a && a.optionIndex !== undefined : a && a.value && a.value.trim().length > 0;
    nextBtn.disabled = !ok;
  }

  if (q.type === "mc") {
    answerArea.innerHTML = `<div class="mc-options">${q.options
      .map(
        (opt, i) => `
      <button class="mc-opt ${existing && existing.optionIndex === i ? "selected" : ""}" data-i="${i}">
        <span class="radio"></span>${opt}
      </button>
    `
      )
      .join("")}</div>`;
    answerArea.querySelectorAll(".mc-opt").forEach((btn) => {
      btn.onclick = () => {
        answerArea.querySelectorAll(".mc-opt").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        state.answers[q.id] = { value: q.options[+btn.dataset.i], optionIndex: +btn.dataset.i };
        refreshNextState();
      };
    });
  } else {
    answerArea.innerHTML = `
      <textarea class="quiz-textarea" id="scenarioInput" placeholder="Write your answer here...">${existing ? existing.value : ""}</textarea>
      <div class="char-hint">Answer in your own words. This will be reviewed by an Administrator.</div>
    `;
    const ta = document.getElementById("scenarioInput");
    ta.addEventListener("input", () => {
      state.answers[q.id] = { value: ta.value };
      refreshNextState();
    });
  }

  refreshNextState();
  nextBtn.onclick = () => {
    if (state.qi < state.questions.length - 1) {
      state.qi++;
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

/* ============== REVIEW ============== */
function renderReview() {
  app.innerHTML = `
    <div class="shell">
      ${sidebarHTML("dashboard")}
      <div class="main">
        <div class="page-head">
          <div>
            <h1>Review your answers</h1>
            <p>Nothing is graded here. Just make sure everything's filled in before you submit to the Administration team.</p>
          </div>
        </div>
        <div class="card">
          ${state.questions
            .map((q, i) => {
              const a = state.answers[q.id];
              return `
              <div class="review-item">
                <p class="rq">${i + 1}. ${q.q}</p>
                <div class="ra ${!a || !a.value ? "empty" : ""}">${a && a.value ? a.value : "No answer yet"}</div>
                <button class="review-edit" data-jump="${i}">Edit answer</button>
              </div>
            `;
            })
            .join("")}
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:22px;">
          <button class="btn-ghost" id="backToQuizBtn">Back to quiz</button>
          <button class="btn-start" id="submitBtn">Submit for review</button>
        </div>
      </div>
    </div>
  `;
  wireSidebar();
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
  document.getElementById("submitBtn").onclick = async () => {
    await api("/api/submit", { method: "POST", body: JSON.stringify({ answers: state.answers }) });
    state.view = "submitted";
    render();
  };
}

/* ============== SUBMITTED ============== */
function renderSubmitted() {
  app.innerHTML = `
    <div class="shell">
      ${sidebarHTML("dashboard")}
      <div class="main">
        <div class="submitted-wrap" style="max-width:520px; margin:0 auto;">
          <div class="check-circle">${icon.check}</div>
          <h2 style="font-size:22px; margin:0 0 8px;">Submitted for review</h2>
          <p style="color:var(--text-dim); font-size:14.5px; line-height:1.55; max-width:420px;">
            Your answers have gone to the Administration team. Nothing here is auto-graded, a real person will mark this and follow up with you directly.
          </p>
          <button class="btn-start" id="doneBtn" style="margin-top:24px;">Back to dashboard</button>
        </div>
      </div>
    </div>
  `;
  wireSidebar();
  document.getElementById("doneBtn").onclick = () => {
    state.view = "dashboard";
    render();
  };
}

/* ============== ADMIN: LIST ============== */
async function renderAdminList() {
  state.adminList = await api(`/api/admin/submissions?status=${state.adminFilter}`);

  app.innerHTML = `
    <div class="shell">
      ${sidebarHTML("admin")}
      <div class="main">
        <div class="page-head">
          <div>
            <h1>Submissions</h1>
            <p>Quiz attempts from staff, waiting on your review. Nothing here is auto-graded.</p>
          </div>
        </div>
        <div style="display:flex; gap:8px; margin-bottom:18px;">
          <button class="btn-ghost" data-filter="pending" style="${state.adminFilter === "pending" ? "border-color:var(--amber); color:var(--amber);" : ""}">Pending</button>
          <button class="btn-ghost" data-filter="reviewed" style="${state.adminFilter === "reviewed" ? "border-color:var(--amber); color:var(--amber);" : ""}">Reviewed</button>
        </div>
        <div class="card">
          ${
            state.adminList.length === 0
              ? `<div class="empty-state">Nothing here right now.</div>`
              : state.adminList
                  .map(
                    (s) => `
              <div class="admin-row">
                <div class="who">
                  <div>
                    <div class="name">${s.username}</div>
                    <div class="meta">${s.rank || "Staff"} · Submitted ${new Date(s.submitted_at).toLocaleString()}</div>
                  </div>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                  ${s.status === "reviewed" ? `<span class="status-pill ${s.verdict === "pass" ? "pass" : "fail"}"><span class="dot"></span>${s.verdict === "pass" ? "Passed" : "Failed"}</span>` : ""}
                  <button class="btn-start" data-open="${s.id}">Review</button>
                </div>
              </div>
            `
                  )
                  .join("")
          }
        </div>
      </div>
    </div>
  `;
  wireSidebar();
  document.querySelectorAll("[data-filter]").forEach((b) => {
    b.onclick = () => {
      state.adminFilter = b.dataset.filter;
      renderAdminList();
    };
  });
  document.querySelectorAll("[data-open]").forEach((b) => {
    b.onclick = async () => {
      state.adminDetail = await api(`/api/admin/submissions/${b.dataset.open}`);
      state.view = "adminDetail";
      render();
    };
  });
}

/* ============== ADMIN: DETAIL ============== */
function renderAdminDetail() {
  const s = state.adminDetail;
  app.innerHTML = `
    <div class="shell">
      ${sidebarHTML("admin")}
      <div class="main">
        <div class="page-head">
          <div>
            <h1>${s.username}'s submission</h1>
            <p>${s.rank || "Staff"} · Submitted ${new Date(s.submitted_at).toLocaleString()}</p>
          </div>
          <button class="btn-ghost" id="backToListBtn">← Back to list</button>
        </div>
        <div class="card">
          ${s.answers
            .map(
              (q, i) => `
            <div class="key-item">
              <p class="kq">${i + 1}. [${q.section}] ${q.q}</p>
              ${
                q.type === "mc"
                  ? `<div class="answer-compare">
                      <div class="answer-block given"><span class="lbl">STAFF ANSWERED</span>${q.givenAnswer || "(no answer)"}</div>
                      <div class="answer-block correct"><span class="lbl">CORRECT ANSWER</span>${q.correctAnswer}</div>
                    </div>`
                  : `<div class="answer-compare">
                      <div class="answer-block given"><span class="lbl">STAFF ANSWERED</span>${q.givenAnswer || "(no answer)"}</div>
                      <div class="answer-block model"><span class="lbl">WHAT A GOOD ANSWER COVERS</span>${q.modelSummary}</div>
                    </div>`
              }
            </div>
          `
            )
            .join("")}

          <div class="review-panel">
            <h3 style="font-size:15px; font-family:'Inter'; margin:0 0 12px;">Your verdict</h3>
            <div class="verdict-row">
              <button class="verdict-btn pass ${s.verdict === "pass" ? "picked" : ""}" data-verdict="pass">Pass</button>
              <button class="verdict-btn fail ${s.verdict === "fail" ? "picked" : ""}" data-verdict="fail">Needs retake</button>
            </div>
            <textarea class="notes-textarea" id="notesInput" placeholder="Notes for the staff member (optional)">${s.notes || ""}</textarea>
            <button class="btn-start" id="saveReviewBtn">${s.status === "reviewed" ? "Update review" : "Save review"}</button>
          </div>
        </div>
      </div>
    </div>
  `;
  wireSidebar();
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
    const notes = document.getElementById("notesInput").value;
    await api(`/api/admin/submissions/${s.id}/review`, {
      method: "POST",
      body: JSON.stringify({ verdict: pickedVerdict, notes }),
    });
    e.target.textContent = "Saved ✓";
    setTimeout(() => {
      state.view = "admin";
      render();
    }, 700);
  };
}

/* ============== SENIOR: ALL QUIZ ACTIVITY ============== */
async function renderSeniorActivity() {
  const params = new URLSearchParams();
  if (state.seniorStatusFilter) params.set("status", state.seniorStatusFilter);
  if (state.seniorQuery) params.set("q", state.seniorQuery);
  state.seniorList = await api(`/api/senior/submissions?${params.toString()}`);

  app.innerHTML = `
    <div class="shell">
      ${sidebarHTML("seniorActivity")}
      <div class="main">
        <div class="page-head">
          <div>
            <h1>All Quiz Activity</h1>
            <p>Every attempt, any status. Search by name or filter by status.</p>
          </div>
        </div>
        <div class="filter-row">
          <div class="search-box">
            ${icon.search}
            <input type="text" id="seniorSearch" placeholder="Search by username..." value="${state.seniorQuery}">
          </div>
          <select id="seniorStatusSelect" class="filter-select">
            <option value="">All statuses</option>
            <option value="pending" ${state.seniorStatusFilter === "pending" ? "selected" : ""}>Pending</option>
            <option value="reviewed" ${state.seniorStatusFilter === "reviewed" ? "selected" : ""}>Reviewed</option>
          </select>
        </div>
        <div class="card">
          ${state.seniorList.length === 0
            ? `<div class="empty-state">No submissions match.</div>`
            : state.seniorList.map((s) => `
              <div class="admin-row">
                <div class="who">
                  <div>
                    <div class="name">${s.username} <span class="attempt-tag">#${s.attempt_number || 1}</span>${s.active === false ? `<span class="archived-tag">archived</span>` : ""}${s.reopened ? `<span class="reopened-tag">reopened</span>` : ""}</div>
                    <div class="meta">${s.rank || "Staff"} · Submitted ${new Date(s.submitted_at).toLocaleString()}${s.reviewer_name ? ` · Marked by ${s.reviewer_name}` : ""}</div>
                  </div>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                  ${s.status === "reviewed" ? `<span class="status-pill ${s.verdict === "pass" ? "pass" : "fail"}"><span class="dot"></span>${s.verdict === "pass" ? "Passed" : "Failed"}</span>` : `<span class="status-pill"><span class="dot"></span>Pending</span>`}
                  <button class="btn-ghost" data-history="${s.discord_id}">History</button>
                  <button class="btn-start" data-open="${s.id}">View</button>
                </div>
              </div>
            `).join("")
          }
        </div>
      </div>
    </div>
  `;
  wireSidebar();
  document.getElementById("seniorSearch").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      state.seniorQuery = e.target.value;
      renderSeniorActivity();
    }
  });
  document.getElementById("seniorStatusSelect").onchange = (e) => {
    state.seniorStatusFilter = e.target.value;
    renderSeniorActivity();
  };
  document.querySelectorAll("[data-open]").forEach((b) => {
    b.onclick = async () => {
      state.seniorDetail = await api(`/api/senior/submissions/${b.dataset.open}`);
      state.view = "seniorDetail";
      render();
    };
  });
  document.querySelectorAll("[data-history]").forEach((b) => {
    b.onclick = async () => {
      state.candidateHistory = await api(`/api/senior/candidates/${b.dataset.history}`);
      state.view = "candidateHistory";
      render();
    };
  });
}

/* ============== SENIOR: SUBMISSION DETAIL (override / reopen) ============== */
function renderSeniorDetail() {
  const s = state.seniorDetail;
  app.innerHTML = `
    <div class="shell">
      ${sidebarHTML("seniorActivity")}
      <div class="main">
        <div class="page-head">
          <div>
            <h1>${s.username}'s attempt #${s.attempt_number || 1}</h1>
            <p>${s.rank || "Staff"} · Submitted ${new Date(s.submitted_at).toLocaleString()}${s.active === false ? " · Archived (superseded by a later attempt)" : ""}</p>
          </div>
          <button class="btn-ghost" id="backToListBtn">← Back to activity</button>
        </div>

        <div class="card">
          <div class="current-verdict-row">
            <span class="status-pill ${s.status === "reviewed" ? (s.verdict === "pass" ? "pass" : "fail") : ""}"><span class="dot"></span>${s.status === "reviewed" ? (s.verdict === "pass" ? "Passed" : "Failed") : "Pending"}</span>
            ${s.reviewer_name ? `<span class="meta-inline">Marked by ${s.reviewer_name}</span>` : ""}
          </div>

          ${s.reopened ? `
            <div class="info-banner">This attempt was reopened by ${s.reopened_by_name} on ${new Date(s.reopened_at).toLocaleString()}.<br>Reason: ${s.reopen_reason}</div>
          ` : ""}

          ${(s.override_history && s.override_history.length > 0) ? `
            <div class="info-banner override">
              <strong>Override history</strong>
              ${s.override_history.map((o) => `
                <div class="override-entry">${o.by_name} changed the verdict from <strong>${o.previous_verdict || "none"}</strong> on ${new Date(o.at).toLocaleString()}.<br>Reason: ${o.reason}</div>
              `).join("")}
            </div>
          ` : ""}

          ${s.answers.map((q, i) => `
            <div class="key-item">
              <p class="kq">${i + 1}. [${q.section}] ${q.q}</p>
              ${q.type === "mc"
                ? `<div class="answer-compare">
                    <div class="answer-block given"><span class="lbl">STAFF ANSWERED</span>${q.givenAnswer || "(no answer)"}</div>
                    <div class="answer-block correct"><span class="lbl">CORRECT ANSWER</span>${q.correctAnswer}</div>
                  </div>`
                : `<div class="answer-compare">
                    <div class="answer-block given"><span class="lbl">STAFF ANSWERED</span>${q.givenAnswer || "(no answer)"}</div>
                    <div class="answer-block model"><span class="lbl">WHAT A GOOD ANSWER COVERS</span>${q.modelSummary}</div>
                  </div>`
              }
            </div>
          `).join("")}

          <div class="review-panel">
            <h3 class="panel-heading">${icon.flag}Override result</h3>
            <p class="panel-sub">Changes the recorded verdict. The previous verdict is kept in history, never erased. A reason is required.</p>
            <div class="verdict-row">
              <button class="verdict-btn pass" data-override-verdict="pass">Pass</button>
              <button class="verdict-btn fail" data-override-verdict="fail">Needs retake</button>
            </div>
            <textarea class="notes-textarea" id="overrideNotes" placeholder="Updated notes (optional)"></textarea>
            <textarea class="notes-textarea" id="overrideReason" placeholder="Reason for the override (required)"></textarea>
            <button class="btn-start" id="saveOverrideBtn" disabled>Save override</button>
          </div>

          <div class="review-panel">
            <h3 class="panel-heading">${icon.history}Reopen for retake</h3>
            <p class="panel-sub">Lets this candidate submit a brand new attempt. This attempt stays on file, archived, for history. A reason is required.</p>
            <textarea class="notes-textarea" id="reopenReason" placeholder="Reason for reopening (required)"></textarea>
            <button class="btn-ghost" id="reopenBtn" ${s.active === false ? "disabled" : ""}>${s.active === false ? "Already reopened" : "Reopen this quiz"}</button>
          </div>
        </div>
      </div>
    </div>
  `;
  wireSidebar();

  let overrideVerdict = null;
  document.querySelectorAll("[data-override-verdict]").forEach((b) => {
    b.onclick = () => {
      overrideVerdict = b.dataset.overrideVerdict;
      document.querySelectorAll("[data-override-verdict]").forEach((x) => x.classList.remove("picked"));
      b.classList.add("picked");
      document.getElementById("saveOverrideBtn").disabled = !document.getElementById("overrideReason").value.trim();
    };
  });
  document.getElementById("overrideReason").addEventListener("input", (e) => {
    document.getElementById("saveOverrideBtn").disabled = !overrideVerdict || !e.target.value.trim();
  });
  document.getElementById("saveOverrideBtn").onclick = async (e) => {
    try {
      await api(`/api/senior/submissions/${s.id}/override`, {
        method: "POST",
        body: JSON.stringify({
          verdict: overrideVerdict,
          notes: document.getElementById("overrideNotes").value,
          reason: document.getElementById("overrideReason").value,
        }),
      });
      e.target.textContent = "Saved ✓";
      setTimeout(() => { state.view = "seniorActivity"; render(); }, 700);
    } catch (err) {
      alert(err.message);
    }
  };

  document.getElementById("reopenBtn").onclick = async (e) => {
    const reason = document.getElementById("reopenReason").value;
    if (!reason.trim()) { alert("A reason is required to reopen a quiz."); return; }
    try {
      await api(`/api/senior/submissions/${s.id}/reopen`, { method: "POST", body: JSON.stringify({ reason }) });
      e.target.textContent = "Reopened ✓";
      setTimeout(() => { state.view = "seniorActivity"; render(); }, 700);
    } catch (err) {
      alert(err.message);
    }
  };

  document.getElementById("backToListBtn").onclick = () => { state.view = "seniorActivity"; render(); };
}

/* ============== SENIOR: CANDIDATE HISTORY ============== */
function renderCandidateHistory() {
  const c = state.candidateHistory;
  app.innerHTML = `
    <div class="shell">
      ${sidebarHTML("seniorActivity")}
      <div class="main">
        <div class="page-head">
          <div>
            <h1>${c.username}'s history</h1>
            <p>${c.rank || "Staff"} · ${c.attempts.length} attempt${c.attempts.length === 1 ? "" : "s"} on file</p>
          </div>
          <button class="btn-ghost" id="backBtn">← Back to activity</button>
        </div>
        <div class="card">
          ${c.attempts.map((a) => `
            <div class="admin-row">
              <div class="who">
                <div>
                  <div class="name">Attempt #${a.attempt_number}${a.active === false ? `<span class="archived-tag">archived</span>` : `<span class="active-tag">current</span>`}${a.reopened ? `<span class="reopened-tag">reopened</span>` : ""}</div>
                  <div class="meta">Submitted ${new Date(a.submitted_at).toLocaleString()}${a.reviewer_name ? ` · Marked by ${a.reviewer_name}` : ""}</div>
                </div>
              </div>
              <div style="display:flex; align-items:center; gap:10px;">
                ${a.status === "reviewed" ? `<span class="status-pill ${a.verdict === "pass" ? "pass" : "fail"}"><span class="dot"></span>${a.verdict === "pass" ? "Passed" : "Failed"}</span>` : `<span class="status-pill"><span class="dot"></span>Pending</span>`}
                <button class="btn-start" data-open="${a.id}">View</button>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;
  wireSidebar();
  document.getElementById("backBtn").onclick = () => { state.view = "seniorActivity"; render(); };
  document.querySelectorAll("[data-open]").forEach((b) => {
    b.onclick = async () => {
      state.seniorDetail = await api(`/api/senior/submissions/${b.dataset.open}`);
      state.view = "seniorDetail";
      render();
    };
  });
}

/* ============== SENIOR: AUDIT LOG ============== */
async function renderAuditLog() {
  const params = new URLSearchParams();
  if (state.auditFilter.action) params.set("action", state.auditFilter.action);
  if (state.auditFilter.q) params.set("q", state.auditFilter.q);
  state.auditList = await api(`/api/senior/audit?${params.toString()}`);

  app.innerHTML = `
    <div class="shell">
      ${sidebarHTML("auditLog")}
      <div class="main">
        <div class="page-head">
          <div>
            <h1>Audit Log</h1>
            <p>Every important action, permanent and searchable. Nothing here can be edited or deleted.</p>
          </div>
          <div style="display:flex; gap:8px;">
            <a class="btn-ghost" href="/api/senior/export?type=submissions">${icon.download}Export submissions</a>
            <a class="btn-ghost" href="/api/senior/export?type=audit">${icon.download}Export audit log</a>
          </div>
        </div>
        <div class="filter-row">
          <div class="search-box">
            ${icon.search}
            <input type="text" id="auditSearch" placeholder="Search actor, action, reason..." value="${state.auditFilter.q}">
          </div>
          <select id="auditActionSelect" class="filter-select">
            <option value="">All actions</option>
            <option value="submission_created" ${state.auditFilter.action === "submission_created" ? "selected" : ""}>Submitted</option>
            <option value="review" ${state.auditFilter.action === "review" ? "selected" : ""}>Reviewed</option>
            <option value="override" ${state.auditFilter.action === "override" ? "selected" : ""}>Override</option>
            <option value="reopen" ${state.auditFilter.action === "reopen" ? "selected" : ""}>Reopen</option>
            <option value="export" ${state.auditFilter.action === "export" ? "selected" : ""}>Export</option>
          </select>
        </div>
        <div class="card">
          ${state.auditList.length === 0
            ? `<div class="empty-state">No matching audit entries.</div>`
            : state.auditList.map((a) => `
              <div class="audit-item">
                <div class="activity-dot ${a.action}"></div>
                <div style="flex:1;">
                  <p class="activity-text">${activityLabel(a)}${a.target_id ? ` <span class="meta-inline">#${a.target_id}</span>` : ""}</p>
                  ${a.details ? `<p class="audit-detail">${a.details}</p>` : ""}
                  ${a.reason ? `<p class="audit-reason">Reason: ${a.reason}</p>` : ""}
                </div>
                <p class="activity-time">${new Date(a.at).toLocaleString()}</p>
              </div>
            `).join("")
          }
        </div>
      </div>
    </div>
  `;
  wireSidebar();
  document.getElementById("auditSearch").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      state.auditFilter.q = e.target.value;
      renderAuditLog();
    }
  });
  document.getElementById("auditActionSelect").onchange = (e) => {
    state.auditFilter.action = e.target.value;
    renderAuditLog();
  };
}

/* ============== ROUTER ============== */
function render() {
  if (state.view === "loading") app.innerHTML = `<div class="boot-loader">Loading…</div>`;
  else if (state.view === "splash") renderSplash();
  else if (state.view === "dashboard") renderDashboard();
  else if (state.view === "quiz") renderQuiz();
  else if (state.view === "review") renderReview();
  else if (state.view === "submitted") renderSubmitted();
  else if (state.view === "admin") renderAdminList();
  else if (state.view === "adminDetail") renderAdminDetail();
  else if (state.view === "seniorActivity") renderSeniorActivity();
  else if (state.view === "seniorDetail") renderSeniorDetail();
  else if (state.view === "candidateHistory") renderCandidateHistory();
  else if (state.view === "auditLog") renderAuditLog();
}

init();
