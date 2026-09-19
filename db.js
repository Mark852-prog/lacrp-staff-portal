// Plain JSON-file storage. No native compilation required, so this
// installs and runs on any machine with just Node.js, no Python, no
// build tools, no C++ compiler.
//
// Fine for a small staff team's quiz submissions. If you ever outgrow
// this, swap this file for a real database. Every other file only talks
// to the functions exported below, so that's a contained change.

const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
const submissionsPath = path.join(dataDir, "submissions.json");
const auditPath = path.join(dataDir, "audit.json");

function loadFile(filePath) {
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveFile(filePath, rows) {
  fs.writeFileSync(filePath, JSON.stringify(rows, null, 2));
}
function nextId(rows) {
  return rows.reduce((max, r) => Math.max(max, r.id), 0) + 1;
}

// ==================== AUDIT LOG ====================
// Append-only. Nothing in this file exposes a way to edit or delete an
// entry once written, only add and read. Keep it that way, an audit log
// that can be quietly edited isn't an audit log.

function logAudit({ action, target_type, target_id, actor_id, actor_name, details, reason }) {
  const rows = loadFile(auditPath);
  const entry = {
    id: nextId(rows),
    action, // e.g. 'submission_created' | 'review' | 'override'
    target_type, // 'submission'
    target_id,
    actor_id,
    actor_name,
    details: details || null,
    reason: reason || null,
    at: new Date().toISOString(),
  };
  rows.push(entry);
  saveFile(auditPath, rows);
  return entry;
}

function getAuditLog({ action, actor_id, target_id, q, limit } = {}) {
  let rows = loadFile(auditPath).sort((a, b) => new Date(b.at) - new Date(a.at));
  if (action) rows = rows.filter((r) => r.action === action);
  if (actor_id) rows = rows.filter((r) => String(r.actor_id) === String(actor_id));
  if (target_id) rows = rows.filter((r) => String(r.target_id) === String(target_id));
  if (q) {
    const needle = q.toLowerCase();
    rows = rows.filter((r) =>
      [r.actor_name, r.action, r.details, r.reason].filter(Boolean).join(" ").toLowerCase().includes(needle)
    );
  }
  if (limit) rows = rows.slice(0, limit);
  return rows;
}

// ==================== SUBMISSIONS ====================

function insertSubmission({ discord_id, username, rank, answers }) {
  const rows = loadFile(submissionsPath);
  const priorAttempts = rows.filter((r) => r.discord_id === discord_id).length;
  const row = {
    id: nextId(rows),
    discord_id,
    username,
    rank,
    answers, // { questionId: { value, optionIndex? } }
    attempt_number: priorAttempts + 1,
    active: true, // false once the attempt is failed; archived but kept for history
    status: "pending", // 'pending' | 'reviewed'
    verdict: null, // 'pass' | 'fail' | null
    notes: null,
    reviewer_id: null,
    reviewer_name: null,
    override_history: [], // [{ previous_verdict, previous_notes, reason, by_id, by_name, at }]
    submitted_at: new Date().toISOString(),
    reviewed_at: null,
  };
  rows.push(row);
  saveFile(submissionsPath, rows);

  logAudit({
    action: "submission_created",
    target_type: "submission",
    target_id: row.id,
    actor_id: discord_id,
    actor_name: username,
    details: `Attempt #${row.attempt_number} submitted`,
  });

  return row;
}

function getActiveSubmissionForUser(discordId) {
  return (
    loadFile(submissionsPath)
      .filter(
        (r) =>
          r.discord_id === discordId &&
          r.active !== false &&
          r.verdict !== "fail"
      )
      .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))[0] || null
  );
}

function getSubmissionsByDiscordId(discordId) {
  return loadFile(submissionsPath)
    .filter((r) => r.discord_id === discordId)
    .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
}

function getSubmissionById(id) {
  return loadFile(submissionsPath).find((r) => String(r.id) === String(id)) || null;
}

function reviewSubmission(id, { verdict, notes, reviewer_id, reviewer_name }) {
  const rows = loadFile(submissionsPath);
  const idx = rows.findIndex((r) => String(r.id) === String(id));
  if (idx === -1) return null;
  rows[idx] = {
    ...rows[idx],
    status: "reviewed",
    verdict: verdict || null,
    active: verdict === "fail" ? false : true,
    notes: notes || null,
    reviewer_id,
    reviewer_name,
    reviewed_at: new Date().toISOString(),
  };
  saveFile(submissionsPath, rows);

  logAudit({
    action: "review",
    target_type: "submission",
    target_id: id,
    actor_id: reviewer_id,
    actor_name: reviewer_name,
    details: `Marked ${verdict || "reviewed"}${notes ? `, notes: ${notes}` : ""}`,
  });

  return rows[idx];
}

// Senior-only: change a verdict that's already been recorded. Always
// keeps the prior verdict in override_history rather than just
// overwriting it, and always requires a reason.
function overrideSubmission(id, { verdict, notes, reason, by_id, by_name }) {
  const rows = loadFile(submissionsPath);
  const idx = rows.findIndex((r) => String(r.id) === String(id));
  if (idx === -1) return null;
  const prior = rows[idx];

  rows[idx] = {
    ...prior,
    status: "reviewed",
    verdict: verdict || prior.verdict,
    active: (verdict || prior.verdict) === "fail" ? false : true,
    notes: notes || prior.notes,
    override_history: [
      ...(prior.override_history || []),
      {
        previous_verdict: prior.verdict,
        previous_notes: prior.notes,
        reason,
        by_id,
        by_name,
        at: new Date().toISOString(),
      },
    ],
  };
  saveFile(submissionsPath, rows);

  logAudit({
    action: "override",
    target_type: "submission",
    target_id: id,
    actor_id: by_id,
    actor_name: by_name,
    details: `Changed verdict from ${prior.verdict || "none"} to ${verdict}`,
    reason,
  });

  return rows[idx];
}

function getStats() {
  const rows = loadFile(submissionsPath);
  const reviewed = rows.filter((r) => r.status === "reviewed");
  const pass = reviewed.filter((r) => r.verdict === "pass").length;
  const fail = reviewed.filter((r) => r.verdict === "fail").length;
  const pending = rows.filter((r) => r.status === "pending").length;
  const candidateIds = [...new Set(rows.map((r) => r.discord_id))];
  const avgAttempts = candidateIds.length
    ? (rows.length / candidateIds.length).toFixed(2)
    : "0";
  return {
    total_submissions: rows.length,
    total_candidates: candidateIds.length,
    pending,
    reviewed: reviewed.length,
    pass,
    fail,
    pass_rate: reviewed.length ? Math.round((pass / reviewed.length) * 100) : 0,
    avg_attempts: avgAttempts,
  };
}
function getAllSubmissions({ status, q } = {}) {
  let rows = loadFile(submissionsPath).sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
  if (status) rows = rows.filter((r) => r.status === status);
  if (q) {
    const needle = q.toLowerCase();
    rows = rows.filter((r) => (r.username || "").toLowerCase().includes(needle));
  }
  return rows;
}
module.exports = {
  insertSubmission,
  getActiveSubmissionForUser,
  getAllSubmissions,
  getSubmissionsByDiscordId,
  getSubmissionById,
  reviewSubmission,
  overrideSubmission,
  getStats,
  logAudit,
  getAuditLog,
};
