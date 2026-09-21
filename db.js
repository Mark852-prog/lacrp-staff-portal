const fs = require("fs");
const path = require("path");
const { Redis } = require("@upstash/redis");

// ==================== REDIS ====================

const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

let redis = null;

if (redisUrl && redisToken) {
  redis = new Redis({
    url: redisUrl,
    token: redisToken,
  });
} else {
  console.error("UPSTASH REDIS VARIABLES ARE MISSING");
}

// ==================== FILE STORAGE ====================

const dataDir = path.join(__dirname, "data");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

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

async function logAudit({
  action,
  target_type,
  target_id,
  actor_id,
  actor_name,
  details,
  reason,
}) {
  let auditId = Date.now();

  if (redis) {
    try {
      auditId = await redis.incr("lacrp:audit:next_id");
    } catch (error) {
      console.error("Redis audit ID failed:", error.message);
      console.error("Audit log will continue using a temporary ID.");
    }
  }

  const entry = {
    id: auditId,
    action,
    target_type,
    target_id,
    actor_id,
    actor_name,
    details: details || null,
    reason: reason || null,
    at: new Date().toISOString(),
  };

  if (redis) {
    try {
      const now = Date.now();
      const fiveDaysAgo = now - 5 * 24 * 60 * 60 * 1000;

      await redis.zadd("lacrp:audit", {
        score: now,
        member: JSON.stringify(entry),
      });

      await redis.zremrangebyscore(
        "lacrp:audit",
        0,
        fiveDaysAgo
      );
    } catch (error) {
      console.error("Failed to save audit log to Redis:", error.message);
    }
  } else {
    console.error("Redis is unavailable. Audit entry was not saved to Redis.");
  }

  return entry;
}

function getAuditLog({
  action,
  actor_id,
  target_id,
  q,
  limit,
} = {}) {
  let rows = loadFile(auditPath).sort(
    (a, b) => new Date(b.at) - new Date(a.at)
  );

  if (action) {
    rows = rows.filter((r) => r.action === action);
  }

  if (actor_id) {
    rows = rows.filter(
      (r) => String(r.actor_id) === String(actor_id)
    );
  }

  if (target_id) {
    rows = rows.filter(
      (r) => String(r.target_id) === String(target_id)
    );
  }

  if (q) {
    const needle = q.toLowerCase();

    rows = rows.filter((r) =>
      [r.actor_name, r.action, r.details, r.reason]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }

  if (limit) {
    rows = rows.slice(0, limit);
  }

  return rows;
}

// ==================== SUBMISSIONS ====================

function insertSubmission({
  discord_id,
  username,
  rank,
  answers,
}) {
  const rows = loadFile(submissionsPath);

  const priorAttempts = rows.filter(
    (r) => r.discord_id === discord_id
  ).length;

  const row = {
    id: nextId(rows),
    discord_id,
    username,
    rank,
    answers,
    attempt_number: priorAttempts + 1,
    active: true,
    status: "pending",
    verdict: null,
    notes: null,
    reviewer_id: null,
    reviewer_name: null,
    override_history: [],
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
  }).catch((error) => {
    console.error("Audit logging failed:", error.message);
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
      .sort(
        (a, b) =>
          new Date(b.submitted_at) -
          new Date(a.submitted_at)
      )[0] || null
  );
}

function getSubmissionsByDiscordId(discordId) {
  return loadFile(submissionsPath)
    .filter((r) => r.discord_id === discordId)
    .sort(
      (a, b) =>
        new Date(b.submitted_at) -
        new Date(a.submitted_at)
    );
}

function getSubmissionById(id) {
  return (
    loadFile(submissionsPath).find(
      (r) => String(r.id) === String(id)
    ) || null
  );
}

function reviewSubmission(
  id,
  {
    verdict,
    notes,
    reviewer_id,
    reviewer_name,
  }
) {
  const rows = loadFile(submissionsPath);

  const idx = rows.findIndex(
    (r) => String(r.id) === String(id)
  );

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
    details: `Marked ${verdict || "reviewed"}${
      notes ? `, notes: ${notes}` : ""
    }`,
  }).catch((error) => {
    console.error("Audit logging failed:", error.message);
  });

  return rows[idx];
}

// ==================== OVERRIDE ====================

function overrideSubmission(
  id,
  {
    verdict,
    notes,
    reason,
    by_id,
    by_name,
  }
) {
  const rows = loadFile(submissionsPath);

  const idx = rows.findIndex(
    (r) => String(r.id) === String(id)
  );

  if (idx === -1) return null;

  const prior = rows[idx];

  rows[idx] = {
    ...prior,
    status: "reviewed",
    verdict: verdict || prior.verdict,
    active:
      (verdict || prior.verdict) === "fail"
        ? false
        : true,
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
    details: `Changed verdict from ${
      prior.verdict || "none"
    } to ${verdict}`,
    reason,
  }).catch((error) => {
    console.error("Audit logging failed:", error.message);
  });

  return rows[idx];
}

// ==================== STATS ====================

function getStats() {
  const rows = loadFile(submissionsPath);

  const reviewed = rows.filter(
    (r) => r.status === "reviewed"
  );

  const pass = reviewed.filter(
    (r) => r.verdict === "pass"
  ).length;

  const fail = reviewed.filter(
    (r) => r.verdict === "fail"
  ).length;

  const pending = rows.filter(
    (r) => r.status === "pending"
  ).length;

  const candidateIds = [
    ...new Set(rows.map((r) => r.discord_id)),
  ];

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
    pass_rate: reviewed.length
      ? Math.round((pass / reviewed.length) * 100)
      : 0,
    avg_attempts: avgAttempts,
  };
}

function getAllSubmissions({ status, q } = {}) {
  let rows = loadFile(submissionsPath).sort(
    (a, b) =>
      new Date(b.submitted_at) -
      new Date(a.submitted_at)
  );

  if (status) {
    rows = rows.filter(
      (r) => r.status === status
    );
  }

  if (q) {
    const needle = q.toLowerCase();

    rows = rows.filter((r) =>
      (r.username || "")
        .toLowerCase()
        .includes(needle)
    );
  }

  return rows;
}

// ==================== EXPORTS ====================

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