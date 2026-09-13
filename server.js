require("dotenv").config();

const express = require("express");
const session = require("express-session");
const path = require("path");

const db = require("./db");
const { exchangeCode, getUser, getMemberRoles } = require("./discord");
const { resolveRank, isAdmin, isTrainee } = require("./roles");
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

const app = express();
app.set("trust proxy", 1);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

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

app.post("/api/submit", requireTrainee, (req, res) => {
  const { answers } = req.body;
  if (!answers || typeof answers !== "object") {
    return res.status(400).json({ error: "Missing answers" });
  }
  const existing = db.getSubmissionsByDiscordId(req.session.user.id);
  if (existing.length > 0) {
    return res.status(409).json({ error: "You've already submitted this quiz." });
  }
  db.insertSubmission({
    discord_id: req.session.user.id,
    username: req.session.user.username,
    rank: req.session.user.rank,
    answers,
  });
  res.json({ ok: true });
});

app.get("/api/my-submissions", requireAuth, (req, res) => {
  const rows = db.getSubmissionsByDiscordId(req.session.user.id).map((r) => ({
    id: r.id,
    status: r.status,
    verdict: r.verdict,
    submitted_at: r.submitted_at,
    reviewed_at: r.reviewed_at,
  }));
  res.json(rows);
});

// ---------------- Admin-only ----------------

app.get("/api/admin/submissions", requireAdmin, (req, res) => {
  const { status } = req.query;
  const rows = db.getAllSubmissions(status).map((r) => ({
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
});

app.get("/api/admin/submissions/:id", requireAdmin, (req, res) => {
  const row = db.getSubmissionById(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });

  const givenAnswers = row.answers;
  const merged = questions.map((q) => ({
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

  res.json({ ...row, answers: merged });
});

app.post("/api/admin/submissions/:id/review", requireAdmin, (req, res) => {
  const { verdict, notes } = req.body;
  const updated = db.reviewSubmission(req.params.id, {
    verdict,
    notes,
    reviewer_id: req.session.user.id,
    reviewer_name: req.session.user.username,
  });
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`LACRP staff portal running on http://localhost:${PORT}`);
});
