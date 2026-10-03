# LACRP project notes

Los Angeles City Roleplay (LACRP) is a roleplay community run from Discord. The owner
(Discord: Ghost_2435, rank Founder) isn't a developer: explain things in plain
language, give exact click-by-click steps for anything on Render/Discord/GitHub,
and prefer doing the work over describing it. Design taste: clean, not "AI-looking",
don't overdo it.

Never put secrets (tokens, client secrets, session/webhook secrets, API keys) in
code, commits or chat. Discord IDs below are not secret.

## The two services (both on Render, both repos under Mark852-prog)

| Repo | Render service | URL | What it does |
|---|---|---|---|
| `lacrp-bot` | lacrp-bot | https://lacrp-bot.onrender.com | Discord bot (discord.js 14, Express 5). Slash commands `/ping`, `/training-host`; receives `POST /api/quiz-submission` from the portal and posts it to Discord. |
| `lacrp-staff-portal` | lacrp-staff-portal | https://lacrp-staff-portal.onrender.com | Staff training portal (Express 4, vanilla JS in `public/`). Discord OAuth login, role-based access, Staff Operational Handbook quiz (22 questions, 3 sections), admin review, senior overrides, audit log. |

The bot shows in Discord as "Bot Testing#4414" and is in the Los Angeles City RP
guild (1535653403815059546).

### Quiz submission flow
Trainee submits -> portal saves to Upstash Redis (`lacrp:submissions` hash) ->
portal replies with a submission reference -> portal notifies the bot in the
background (retries 0s/5s/30s/90s) -> bot posts an embed in #📝┃pending-quizes
(channel 1551158588783861880) pinging role 1536348462478659604 -> admins review in
Pending Submissions. The bot de-duplicates by submission id. Success is only shown
after the save succeeds; drafts are kept in the browser (localStorage).

### Roles (portal `roles.config.js`)
Rank order: Founder, Director, Senior High Rank, High Rank, Supervisory Team,
Internal Affairs, Administrator, Senior Moderator, Moderator, Trial Moderator, Intern.
- Admin (review queue): Founder, Director, Administrator, Senior High Rank,
  High Rank, Supervisory Team, Internal Affairs.
- Senior (overrides, all activity, audit log, exports): Senior High Rank,
  High Rank, Supervisory Team. Seniors are also admins.
- Trainee (takes the quiz): Intern. Admins can also open it to preview.

### Environment variables (names only; values live in Render)
- Portal: `SESSION_SECRET`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`,
  `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_REDIRECT_URI`,
  `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `QUIZ_WEBHOOK_SECRET`,
  optional `QUIZ_WEBHOOK_URL`.
- Bot: `DISCORD_TOKEN` (falls back to `DISCORD_BOT_TOKEN`), `QUIZ_WEBHOOK_SECRET`
  (must match the portal), optional `DISCORD_GUILD_ID`, `KEEPALIVE=off`,
  `CLIENT_ID` for `npm run deploy-commands`.

### Hosting facts that matter
- Both services are on Render's **free plan**. Free services sleep after 15 min
  without HTTP traffic and the free allowance is ~750 instance-hours per month
  for the whole account, so only ONE service can be kept awake 24/7.
- The bot keeps itself awake by pinging its own `/health` every 5 minutes
  (uses `RENDER_EXTERNAL_URL`). The portal is allowed to sleep: first visit
  takes up to a minute and logs everyone out (in-memory sessions), but
  submissions are safe in Redis.
- **Auto-deploy hasn't been triggering**: after merging to `main`, do
  Render -> service -> Manual Deploy -> Deploy latest commit.
- Health checks: bot `/health` (reports the real Discord connection; 503 if not
  ready). Portal `/health` and `/api/health` (no Redis calls; shows
  `"storage":"redis"` when durable storage is live).
- Upstash free tier has a monthly request limit; don't add frequent polling
  that hits Redis.
- The audit log in Redis is trimmed to 5 days (`db.js`), though the UI calls it
  permanent. Known, not yet changed.

### Testing
There's no test suite in the repos. Past sessions tested with a local harness:
a mock Upstash REST server, a stub for Discord OAuth/REST, and a stubbed
discord.js client, then Playwright (Chromium is preinstalled in Claude cloud
sessions) for real browser flows. Rebuild that if you need it; don't call real
Discord from tests.

## History (Sep–Oct 2026)
- Submissions used to vanish from Pending because they were stored in a file on
  Render's disk, which is wiped on every restart/sleep. Moved to Redis.
- Bot crashed on any login failure and could look "live" on Render while offline.
  Added login retry, connection logging, `/health`, watchdog, keep-alive.
- Portal deploys timed out because Render's health check hit a missing path.
  Added `/health`.
- Portal UI redesign (auto-marked multiple choice, review queue, role dashboards,
  trainee sees reviewer notes, HTML escaping) is on branch
  `claude/lacrp-quiz-bot-reliability-0oq2vm` of `lacrp-staff-portal`, waiting
  for the owner's OK to merge.

## Waiting on / next up
- Staff uniforms (being made).
- The developer is finishing the "utilities".
- Upgrading the portal or bot to Render Starter (~$7/mo) would remove sleeping.
- Other repos on the same account (relationship not confirmed): `lafd-management`, `LACRP`.
