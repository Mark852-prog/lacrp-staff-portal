require("dotenv").config();

const express = require("express");
const session = require("express-session");
const path = require("path");

const db = require("./db");
const { exchangeCode, getUser, getMemberRoles } = require("./discord");
const { resolveRank, isAdmin, isSenior, isTrainee } = require("./roles");
const questions = require("./questions");

const REQUIRED_ENV = [
  "SESSION_SECRET",
  "DISCORD_CLIENT_ID",
  "DISCORD_CLIENT_SECRET",
  "DISCORD_BOT_TOKEN",
  "DISCORD_GUILD_ID",
  "DISCORD_REDIRECT_URI",
];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.warn(
    `[warning] Missing env vars: ${missing.join(", ")}. Copy .env.example to .env and fill these in before going live.`
  );
}
// Not strictly required to boot, but without them submissions aren't
// durable (Redis) or admins aren't pinged in Discord (webhook secret).
const RECOMMENDED_ENV = ["QUIZ_WEBHOOK_SECRET", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"];
const missingRecommended = RECOMMENDED_ENV.filter((k) => !process.env[k]);
if (missingRecommended.length) {
  console.warn(`[warning] Missing recommended env vars: ${missingRecommended.join(", ")}.`);
}

// The bot service that posts the "new quiz submission" message in Discord.
const QUIZ_WEBHOOK_URL =
  process.env.QUIZ_WEBHOOK_URL || "https://lacrp-bot.onrender.com/api/quiz-submission";
const QUIZ_WEBHOOK_SECRET = (process.env.QUIZ_WEBHOOK_SECRET || "").trim();

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));
// API responses are live data (e.g. the pending queue); never serve stale copies.
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// Express 4 doesn't catch rejected promises from async handlers; without
// this a storage error would crash the whole process.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Using express-session's built-in MemoryStore. That means everyone's
// logged out if the server restarts, a non-issue for a small staff
// team's login, and it avoids needing any native/compiled dependency.
// If you outgrow this, swap in a Redis or Postgres session store later.
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev_only_change_me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      secure: process.env.NODE_ENV === "production",
    },
  })
);

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "Not signed in" });
  next();
}
function requireAdmin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "Not signed in" });
  if (!req.session.user.isAdmin) return res.status(403).json({ error: "Admins only" });
  next();
}
function requireSenior(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "Not signed in" });
  if (!req.session.user.isSenior) return res.status(403).json({ error: "Senior High Rank only" });
  next();
}
function requireTrainee(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "Not signed in" });
  if (!req.session.user.isTrainee) {
    return res.status(403).json({ error: "This training isn't assigned to your role." });
  }
  next();
}

// ---------------- Auth ----------------

app.get("/login", (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: process.env.DISCORD_REDIRECT_URI,
    response_type: "code",
    scope: "identify",
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
});

app.get("/callback", async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).send("Missing ?code from Discord.");

    const token = await exchangeCode(code);
    const discordUser = await getUser(token.access_token);
    const roleIds = await getMemberRoles(discordUser.id);
    const rank = resolveRank(roleIds);
    const admin = isAdmin(roleIds);
    const senior = isSenior(roleIds);
    const trainee = isTrainee(roleIds);

    const avatar = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : `https://cdn.discordapp.com/embed/avatars/${Number(discordUser.discriminator || "0") % 5}.png`;

    req.session.user = {
      id: discordUser.id,
      username: discordUser.global_name || discordUser.username,
      avatar,
      rank,
      isAdmin: admin,
      isSenior: senior,
      isTrainee: trainee,
    };

    res.redirect("/");
  } catch (err) {
    console.error("Login failed:", err);
    res.status(500).send("Login failed. Check the server logs.");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

app.get("/api/me", (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "Not signed in" });
  res.json(req.session.user);
});

// ---------------- Staff-facing quiz ----------------

// Strips correct answers / model summaries before sending to the client.
app.get("/api/questions", requireTrainee, (req, res) => {
  const sanitized = questions.map(({ id, section, type, q, options }) => ({
    id,
    section,
    type,
    q,
    options: options || null,
  }));
  res.json(sanitized);
});
function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

app.post("/api/submit", requireTrainee, wrap(async (req, res) => {
  const { answers, client_submission_id } = req.body || {};
  const user = req.session.user;

  if (!isPlainObject(answers)) {
    return res.status(400).json({ error: "Missing answers" });
  }
  const knownIds = new Set(questions.map((q) => q.id));
  const answered = Object.entries(answers).filter(
    ([id, a]) => knownIds.has(id) && isPlainObject(a) && typeof a.value === "string" && a.value.trim()
  );
  if (answered.length === 0) {
    return res.status(400).json({ error: "No answers were included in the submission." });
  }
  if (client_submission_id !== undefined && !/^[A-Za-z0-9-]{8,64}$/.test(String(client_submission_id))) {
    return res.status(400).json({ error: "Invalid submission reference." });
  }
  if (answered.length < knownIds.size) {
    console.warn(`[submit] user=${user.id} answered ${answered.length}/${knownIds.size} questions`);
  }

  let outcome;
  try {
    outcome = await db.insertSubmission({
      discord_id: user.id,
      username: user.username,
      rank: user.rank,
      answers,
      client_submission_id,
    });
  } catch (error) {
    console.error(`[submit] FAILED to save submission for user=${user.id} ref=${client_submission_id || "-"}:`, error.message);
    return res.status(500).json({
      error: "Your quiz could not be saved. Please try again in a moment; your answers are still on this page.",
    });
  }

  const { result, row } = outcome;
  if (result === "already_active") {
    console.log(`[submit] user=${user.id} blocked: active submission #${row.id} (${row.status})`);
    return res.status(409).json({ error: "You've already submitted this quiz.", id: row.id });
  }
  if (result === "duplicate") {
    console.log(`[submit] user=${user.id} retried ref=${client_submission_id}; already saved as #${row.id}`);
    return res.json({ ok: true, id: row.id, attempt_number: row.attempt_number, duplicate: true });
  }

  console.log(
    `[submit] saved submission #${row.id} user=${user.id} attempt=${row.attempt_number} status=${row.status} ref=${client_submission_id || "-"}`
  );
  // The submission is durably stored; tell the user now. The Discord ping is
  // a best-effort side effect and must not decide whether this succeeded.
  res.json({ ok: true, id: row.id, attempt_number: row.attempt_number });

  notifyBot(row).catch((error) => console.error(`[notify] #${row.id} unexpected error:`, error.message));
}));

// Posts the "new submission" alert via the bot, retrying through bot cold
// starts / reconnects. The bot de-duplicates by submission id.
const NOTIFY_RETRY_DELAYS_MS = [0, 5000, 30000, 90000];
async function notifyBot(row) {
  if (!QUIZ_WEBHOOK_SECRET) {
    console.error(`[notify] #${row.id} not sent: QUIZ_WEBHOOK_SECRET is not set on the portal`);
    return false;
  }
  const payload = JSON.stringify({
    id: row.id,
    discord_id: row.discord_id,
    username: row.username,
    rank: row.rank,
    attempt_number: row.attempt_number,
    submitted_at: row.submitted_at,
  });

  for (let i = 0; i < NOTIFY_RETRY_DELAYS_MS.length; i++) {
    if (NOTIFY_RETRY_DELAYS_MS[i]) await new Promise((r) => setTimeout(r, NOTIFY_RETRY_DELAYS_MS[i]));
    const attempt = `attempt ${i + 1}/${NOTIFY_RETRY_DELAYS_MS.length}`;
    try {
      const response = await fetch(QUIZ_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${QUIZ_WEBHOOK_SECRET}`,
        },
        body: payload,
        signal: AbortSignal.timeout(20000),
      });
      const text = (await response.text()).slice(0, 200);
      if (response.ok) {
        console.log(`[notify] #${row.id} delivered to bot (${response.status}, ${attempt})`);
        return true;
      }
      console.error(`[notify] #${row.id} bot responded ${response.status} (${attempt}): ${text}`);
      if (response.status === 401) {
        console.error("[notify] QUIZ_WEBHOOK_SECRET differs between the portal and the bot service.");
        return false;
      }
      if (response.status === 400) return false;
    } catch (error) {
      console.error(`[notify] #${row.id} request failed (${attempt}): ${error.name}: ${error.message}`);
    }
  }
  console.error(`[notify] #${row.id} gave up; the submission is saved and visible in Pending Submissions.`);
  return false;
}

// Health check for Render (either path works as the Health Check Path) and
// a quick way to confirm which storage backend is live after a deploy.
// Deliberately doesn't touch Redis: Render polls this frequently and every
// call would count against Upstash's request quota.
function health(req, res) {
  res.json({ ok: true, storage: db.storageBackend, uptime_s: Math.round(process.uptime()) });
}
app.get("/health", health);
app.get("/api/health", health);

app.get("/api/my-submissions", requireAuth, wrap(async (req, res) => {
  const rows = (await db.getSubmissionsByDiscordId(req.session.user.id)).map((r) => ({
    id: r.id,
    status: r.status,
    verdict: r.verdict,
    active: r.active,
    attempt_number: r.attempt_number,
    submitted_at: r.submitted_at,
    reviewed_at: r.reviewed_at,
  }));
  res.json(rows);
}));

// ---------------- Admin-only ----------------

function mergeAnswers(row) {
  const givenAnswers = row.answers;
  return questions.map((q) => ({
    id: q.id,
    section: q.section,
    type: q.type,
    q: q.q,
    options: q.options || null,
    correctAnswer: q.type === "mc" ? q.options[q.correct] : null,
    modelSummary: q.modelSummary || null,
    note: q.note || null,
    givenAnswer: givenAnswers[q.id] ? givenAnswers[q.id].value : null,
  }));
}

app.get("/api/admin/submissions", requireAdmin, wrap(async (req, res) => {
  const { status } = req.query;
  const rows = (await db.getAllSubmissions({ status })).map((r) => ({
    id: r.id,
    discord_id: r.discord_id,
    username: r.username,
    rank: r.rank,
    status: r.status,
    verdict: r.verdict,
    submitted_at: r.submitted_at,
    reviewed_at: r.reviewed_at,
  }));
  res.json(rows);
}));

app.get("/api/admin/submissions/:id", requireAdmin, wrap(async (req, res) => {
  const row = await db.getSubmissionById(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json({ ...row, answers: mergeAnswers(row) });
}));

// A review without a verdict used to move the attempt out of Pending with
// no result, leaving the candidate unable to retake.
function badVerdict(verdict) {
  return !db.VERDICTS.includes(verdict);
}

app.post("/api/admin/submissions/:id/review", requireAdmin, wrap(async (req, res) => {
  const { verdict, notes } = req.body || {};
  if (badVerdict(verdict)) return res.status(400).json({ error: "Pick Pass or Needs retake before saving." });
  const updated = await db.reviewSubmission(req.params.id, {
    verdict,
    notes,
    reviewer_id: req.session.user.id,
    reviewer_name: req.session.user.username,
  });
  if (!updated) return res.status(404).json({ error: "Not found" });
  console.log(`[review] #${updated.id} marked ${verdict} by ${req.session.user.id}`);
  res.json({ ok: true });
}));

// ---------------- Senior High Rank only ----------------
// Everything here requires isSenior, a tier above regular Admin. See
// roles.config.js: seniorRoleIds.

// All quiz activity, every status, searchable by username.
app.get("/api/senior/submissions", requireSenior, wrap(async (req, res) => {
  const { status, q } = req.query;
  const rows = (await db.getAllSubmissions({ status, q })).map((r) => ({
    id: r.id,
    discord_id: r.discord_id,
    username: r.username,
    rank: r.rank,
    status: r.status,
    verdict: r.verdict,
    active: r.active,
    attempt_number: r.attempt_number,
    reviewer_name: r.reviewer_name,
    submitted_at: r.submitted_at,
    reviewed_at: r.reviewed_at,
  }));
  res.json(rows);
}));

app.get("/api/senior/submissions/:id", requireSenior, wrap(async (req, res) => {
  const row = await db.getSubmissionById(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json({ ...row, answers: mergeAnswers(row) });
}));

// A candidate's complete attempt history, oldest to newest, plus which
// one (if any) is currently the active/counted attempt.
app.get("/api/senior/candidates/:discordId", requireSenior, wrap(async (req, res) => {
  const rows = await db.getSubmissionsByDiscordId(req.params.discordId);
  if (rows.length === 0) return res.status(404).json({ error: "No submissions from this candidate" });
  res.json({
    discord_id: req.params.discordId,
    username: rows[0].username,
    rank: rows[0].rank,
    attempts: rows.map((r) => ({
      id: r.id,
      attempt_number: r.attempt_number,
      status: r.status,
      verdict: r.verdict,
      active: r.active,
      reviewer_name: r.reviewer_name,
      override_history: r.override_history,
      submitted_at: r.submitted_at,
      reviewed_at: r.reviewed_at,
    })),
  });
}));

app.post("/api/senior/submissions/:id/review", requireSenior, wrap(async (req, res) => {
  const { verdict, notes } = req.body || {};
  if (badVerdict(verdict)) return res.status(400).json({ error: "Pick Pass or Needs retake before saving." });
  const updated = await db.reviewSubmission(req.params.id, {
    verdict,
    notes,
    reviewer_id: req.session.user.id,
    reviewer_name: req.session.user.username,
  });
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
}));

app.post("/api/senior/submissions/:id/override", requireSenior, wrap(async (req, res) => {
  const { verdict, notes, reason } = req.body || {};
  if (!reason || !String(reason).trim()) {
    return res.status(400).json({ error: "A reason is required to override a result." });
  }
  if (badVerdict(verdict)) return res.status(400).json({ error: "Pick Pass or Needs retake for the override." });
  const updated = await db.overrideSubmission(req.params.id, {
    verdict,
    notes,
    reason,
    by_id: req.session.user.id,
    by_name: req.session.user.username,
  });
  if (!updated) return res.status(404).json({ error: "Not found" });
  console.log(`[override] #${updated.id} set to ${verdict} by ${req.session.user.id}`);
  res.json({ ok: true });
}));

app.get("/api/senior/audit", requireSenior, wrap(async (req, res) => {
  const { action, actor_id, target_id, q, limit } = req.query;
  const rows = await db.getAuditLog({ action, actor_id, target_id, q, limit: limit ? Number(limit) : 200 });
  res.json(rows);
}));

// The dashboard's stats row calls /api/senior/stats; this was previously
// registered as a second /api/senior/export, which also hid the CSV export.
app.get("/api/senior/stats", requireSenior, wrap(async (req, res) => {
  res.json(await db.getStats());
}));

// Simple CSV export for either submissions or the audit log, since
// management asked to be able to export records for documentation.
app.get("/api/senior/export", requireSenior, wrap(async (req, res) => {
  const { type } = req.query;
  let rows, filename, headers;

  if (type === "audit") {
    rows = await db.getAuditLog({ limit: 100000 });
    headers = ["id", "at", "action", "actor_name", "actor_id", "target_id", "details", "reason"];
    filename = "lacrp-audit-log.csv";
  } else {
    rows = await db.getAllSubmissions({});
    headers = ["id", "username", "discord_id", "rank", "attempt_number", "status", "verdict", "reviewer_name", "submitted_at", "reviewed_at"];
    filename = "lacrp-submissions.csv";
  }

  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);

    await db.logAudit({
    action: "export",
    target_type: type === "audit" ? "audit_log" : "submissions",
    target_id: null,
    actor_id: req.session.user.id,
    actor_name: req.session.user.username,
    details: `Exported ${rows.length} ${type === "audit" ? "audit log" : "submission"} rows`,
  });
}));

// Anything a route throws ends up here: log it and answer with JSON so the
// browser shows a real error instead of hanging or pretending it worked.
app.use((err, req, res, next) => {
  console.error(`[error] ${req.method} ${req.path}:`, err && err.stack ? err.stack : err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: "Something went wrong on the server. Please try again." });
});

process.on("unhandledRejection", (reason) => {
  console.error("[process] Unhandled promise rejection:", reason);
});

const PORT = process.env.PORT || 3000;
db.init()
  .catch((error) => {
    // Keep serving so logins work, but every storage call will surface this
    // error to users/admins rather than failing silently.
    console.error("[db] FATAL: storage initialisation failed:", error.message);
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`LACRP staff portal running on http://localhost:${PORT} (storage: ${db.storageBackend})`);
    });
  });
