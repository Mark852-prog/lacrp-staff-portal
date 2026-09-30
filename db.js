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
// Only used when Redis isn't configured (local development). Render's disk
// is wiped on every deploy/restart/spin-down, so this is NOT durable there.

const dataDir = path.join(__dirname, "data");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const submissionsPath = path.join(dataDir, "submissions.json");
const auditPath = path.join(dataDir, "audit.json");

function loadFile(filePath) {
  if (!fs.existsSync(filePath)) return [];

  const raw = fs.readFileSync(filePath, "utf8");
  try {
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    // Never treat a corrupt file as empty: the next save would overwrite
    // every submission with just the new one.
    console.error(`[db] ${filePath} is not valid JSON; refusing to read it:`, error.message);
    throw new Error("Submission storage file is corrupt");
  }
}

function saveFile(filePath, rows) {
  // Write-then-rename so a crash mid-write can't leave a truncated file.
  const tmp = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(rows, null, 2));
  fs.renameSync(tmp, filePath);
}

function nextId(rows) {
  return rows.reduce((max, r) => Math.max(max, Number(r.id) || 0), 0) + 1;
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
      console.error(
        "Failed to save audit log to Redis:",
        error.message
      );
    }
  } else {
    console.error(
      "Redis is unavailable. Audit entry was not saved to Redis."
    );
  }

  return entry;
}

async function getAuditLog({
  action,
  actor_id,
  target_id,
  q,
  limit,
} = {}) {
  let rows = [];

  if (redis) {
    try {
      const entries = await redis.zrange("lacrp:audit", 0, -1);

      rows = entries.map((entry) => {
        if (typeof entry === "string") {
          return JSON.parse(entry);
        }
        return entry;
      });
    } catch (error) {
      console.error("Failed to read audit log from Redis:", error.message);
      return [];
    }
  }

  rows.sort(
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
// Stored in Redis when configured: hash `lacrp:submissions` (field = id,
// value = JSON row) plus an INCR counter for ids.

const STATUS = Object.freeze({ PENDING: "pending", REVIEWED: "reviewed" });
const VERDICTS = Object.freeze(["pass", "fail"]);

const SUBMISSIONS_KEY = "lacrp:submissions";
const SUBMISSIONS_ID_KEY = "lacrp:submissions:next_id";

const storageBackend = redis ? "redis" : "file";

function parseRow(value) {
  return typeof value === "string" ? JSON.parse(value) : value;
}

async function readAllRows() {
  if (redis) {
    const hash = await redis.hgetall(SUBMISSIONS_KEY);
    return Object.values(hash || {}).map(parseRow);
  }
  return loadFile(submissionsPath);
}

async function readRow(id) {
  if (redis) {
    const value = await redis.hget(SUBMISSIONS_KEY, String(id));
    return value ? parseRow(value) : null;
  }
  return loadFile(submissionsPath).find((r) => String(r.id) === String(id)) || null;
}

async function writeRow(row) {
  if (redis) {
    await redis.hset(SUBMISSIONS_KEY, { [String(row.id)]: JSON.stringify(row) });
    return;
  }
  const rows = loadFile(submissionsPath);
  const idx = rows.findIndex((r) => String(r.id) === String(row.id));
  if (idx === -1) rows.push(row);
  else rows[idx] = row;
  saveFile(submissionsPath, rows);
}

async function allocateId(rows) {
  if (redis) return await redis.incr(SUBMISSIONS_ID_KEY);
  return nextId(rows);
}

// All read-modify-write operations run one at a time, so a double-clicked
// submit or two admins reviewing at once can't interleave and lose data.
let writeQueue = Promise.resolve();
function withWriteLock(fn) {
  const run = writeQueue.then(fn, fn);
  writeQueue = run.catch(() => {});
  return run;
}

function byNewest(a, b) {
  return new Date(b.submitted_at) - new Date(a.submitted_at);
}

function isActiveFor(r, discordId) {
  return r.discord_id === discordId && r.active !== false && r.verdict !== "fail";
}

// Returns { result: "created" | "duplicate" | "already_active", row }.
// Only resolves "created" after the row is durably written.
function insertSubmission({
  discord_id,
  username,
  rank,
  answers,
  client_submission_id,
}) {
  return withWriteLock(async () => {
    const rows = await readAllRows();
    const mine = rows.filter((r) => r.discord_id === discord_id);

    // Same browser retrying the same attempt (e.g. the response was lost).
    if (client_submission_id) {
      const same = mine.find((r) => r.client_submission_id === client_submission_id);
      if (same) return { result: "duplicate", row: same };
    }

    const active = mine.filter((r) => isActiveFor(r, discord_id)).sort(byNewest)[0];
    if (active) return { result: "already_active", row: active };

    const row = {
      id: await allocateId(rows),
      discord_id,
      username,
      rank,
      answers,
      attempt_number: mine.length + 1,
      active: true,
      status: STATUS.PENDING,
      verdict: null,
      notes: null,
      reviewer_id: null,
      reviewer_name: null,
      override_history: [],
      client_submission_id: client_submission_id || null,
      submitted_at: new Date().toISOString(),
      reviewed_at: null,
    };

    await writeRow(row);

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

    return { result: "created", row };
  });
}

async function getActiveSubmissionForUser(discordId) {
  return (await readAllRows()).filter((r) => isActiveFor(r, discordId)).sort(byNewest)[0] || null;
}

async function getSubmissionsByDiscordId(discordId) {
  return (await readAllRows()).filter((r) => r.discord_id === discordId).sort(byNewest);
}

async function getSubmissionById(id) {
  return readRow(id);
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
  return withWriteLock(async () => {
    const prior = await readRow(id);
    if (!prior) return null;

    const row = {
      ...prior,
      status: STATUS.REVIEWED,
      verdict: verdict || null,
      active: verdict === "fail" ? false : true,
      notes: notes || null,
      reviewer_id,
      reviewer_name,
      reviewed_at: new Date().toISOString(),
    };

    await writeRow(row);

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

    return row;
  });
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
  return withWriteLock(async () => {
    const prior = await readRow(id);
    if (!prior) return null;

    const row = {
      ...prior,
      status: STATUS.REVIEWED,
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

    await writeRow(row);

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

    return row;
  });
}

// ==================== STATS ====================

async function getStats() {
  const rows = await readAllRows();

  const reviewed = rows.filter(
    (r) => r.status === STATUS.REVIEWED
  );

  const pass = reviewed.filter(
    (r) => r.verdict === "pass"
  ).length;

  const fail = reviewed.filter(
    (r) => r.verdict === "fail"
  ).length;

  const pending = rows.filter(
    (r) => r.status === STATUS.PENDING
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

async function getAllSubmissions({ status, q } = {}) {
  let rows = (await readAllRows()).sort(byNewest);

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

// ==================== STARTUP ====================

// Verifies storage works and, when Redis is configured, imports any rows
// left in the old local submissions.json (never overwriting Redis rows) and
// makes sure new ids can't collide with existing ones.
async function init() {
  if (!redis) {
    console.error(
      "[db] WARNING: submissions are stored in data/submissions.json. On Render this file is " +
        "wiped on every deploy/restart, so set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
    );
    const rows = loadFile(submissionsPath);
    console.log(`[db] File storage ready: ${rows.length} submission(s)`);
    return;
  }

  await redis.ping();

  let fileRows = [];
  try {
    fileRows = loadFile(submissionsPath);
  } catch (error) {
    console.error("[db] Skipping import of local submissions.json:", error.message);
  }
  let imported = 0;
  for (const row of fileRows) {
    if (row && row.id !== undefined) {
      imported += await redis.hsetnx(SUBMISSIONS_KEY, String(row.id), JSON.stringify(row));
    }
  }

  const rows = await readAllRows();
  const maxId = rows.reduce((max, r) => Math.max(max, Number(r.id) || 0), 0);
  const current = Number(await redis.get(SUBMISSIONS_ID_KEY)) || 0;
  if (current < maxId) await redis.set(SUBMISSIONS_ID_KEY, maxId);

  const pending = rows.filter((r) => r.status === STATUS.PENDING).length;
  console.log(
    `[db] Redis storage ready: ${rows.length} submission(s), ${pending} pending` +
      (imported ? `, imported ${imported} from local file` : "")
  );
}

// ==================== EXPORTS ====================

module.exports = {
  STATUS,
  VERDICTS,
  storageBackend,
  init,
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
