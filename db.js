// Plain JSON-file storage. No native compilation required (unlike
// better-sqlite3), so this installs and runs on any machine with just
// Node.js, no Python, no build tools, no C++ compiler.
//
// Fine for a small staff team's quiz submissions. If you ever outgrow
// this (hundreds of concurrent writes, multiple server instances load
// balanced behind each other, etc.), swap this file for a real database.
// Every other file only talks to the functions exported below, so that's
// a contained change.

const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
const filePath = path.join(dataDir, "submissions.json");

function load() {
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(rows) {
  fs.writeFileSync(filePath, JSON.stringify(rows, null, 2));
}

function nextId(rows) {
  return rows.reduce((max, r) => Math.max(max, r.id), 0) + 1;
}

function insertSubmission({ discord_id, username, rank, answers }) {
  const rows = load();
  const row = {
    id: nextId(rows),
    discord_id,
    username,
    rank,
    answers, // { questionId: { value, optionIndex? } }
    status: "pending", // 'pending' | 'reviewed'
    verdict: null, // 'pass' | 'fail' | null
    notes: null,
    reviewer_id: null,
    reviewer_name: null,
    submitted_at: new Date().toISOString(),
    reviewed_at: null,
  };
  rows.push(row);
  save(rows);
  return row;
}

function getAllSubmissions(status) {
  const rows = load().sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at));
  return status ? rows.filter((r) => r.status === status) : rows;
}

function getSubmissionsByDiscordId(discordId) {
  return load()
    .filter((r) => r.discord_id === discordId)
    .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
}

function getSubmissionById(id) {
  return load().find((r) => String(r.id) === String(id)) || null;
}

function reviewSubmission(id, { verdict, notes, reviewer_id, reviewer_name }) {
  const rows = load();
  const idx = rows.findIndex((r) => String(r.id) === String(id));
  if (idx === -1) return null;
  rows[idx] = {
    ...rows[idx],
    status: "reviewed",
    verdict: verdict || null,
    notes: notes || null,
    reviewer_id,
    reviewer_name,
    reviewed_at: new Date().toISOString(),
  };
  save(rows);
  return rows[idx];
}

module.exports = {
  insertSubmission,
  getAllSubmissions,
  getSubmissionsByDiscordId,
  getSubmissionById,
  reviewSubmission,
};
