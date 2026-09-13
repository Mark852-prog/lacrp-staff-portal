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

        <div class="grid-3">
          <div class="stat-card"><div class="num">${total}</div><div class="lbl">Questions in this training</div></div>
          <div class="stat-card"><div class="num">3</div><div class="lbl">Sections to complete</div></div>
          <div class="stat-card"><div class="num">${mySubs.length}</div><div class="lbl">Submissions on file</div></div>
        </div>

        <h3 style="font-size:15px; font-family:'Inter'; font-weight:700; color:var(--text-dim); margin:0 0 12px;">Assigned training</h3>

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
                    if (latest.verdict === "fail") return `<span class="status-pill fail"><span class="dot"></span>Needs retake, contact an Admin</span>`;
                    return `<span class="status-pill done"><span class="dot"></span>Reviewed</span>`;
                  })()
                : `<button class="btn-start" id="startBtn">Start quiz</button>`
            }
          </div>
        </div>
      </div>
    </div>
  `;
  wireSidebar();
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
}

init();
