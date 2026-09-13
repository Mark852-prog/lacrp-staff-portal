# LACRP Staff Portal

A staff training portal with real Discord login. Someone's Discord roles
decide what they can see, regular staff get the quiz, admins additionally
get a "Pending Submissions" review queue with an answer key.

## How it works

- **Login**, "Continue with Discord" runs a real OAuth2 flow. No passwords
  are stored; Discord is the identity provider.
- **Roles**, once logged in, the server asks Discord (via your bot token)
  what roles that person holds in your server, and maps that to a rank
  label and an admin yes/no using `roles.config.js`.
- **Quiz**, staff answer questions one at a time. Correct answers and
  model answers are **never sent to the browser** for a non-admin, they
  only exist in `questions.js` on the server.
- **Submissions**, stored in a local JSON file (`data/submissions.json`),
  no database server or native modules needed.
- **Admin review**, anyone with an admin role sees a "Pending Submissions"
  queue, can open any attempt, see the staff member's answer next to the
  correct answer / model answer, and mark it Pass / Needs retake with notes.

## 1. Discord Developer Portal setup

1. Go to https://discord.com/developers/applications and open (or create) your application.
2. **OAuth2 → General**:
   - Copy the **Client ID** and **Client Secret** into your `.env` (see step 3).
     ⚠️ If a Client Secret has ever been pasted into a chat, Slack, Discord,
     or anywhere non-private, click **Reset Secret** first, treat it as
     already compromised.
   - Under **Redirects**, add exactly: `http://localhost:3000/callback`
     (and later, your real domain's `/callback` once deployed).
3. **Bot** tab:
   - If you don't already have a bot on this application, create one and
     copy its **Token** into `.env` as `DISCORD_BOT_TOKEN`.
   - No privileged intents need to be enabled for this app, it only does
     a single member lookup over the REST API, not gateway member syncing.
4. Invite the bot to your server with at least the **View Server Members**
   permission (a basic `bot` scope invite with minimal permissions is fine
  , it doesn't need to send messages or moderate anything).
5. Get your **Server (Guild) ID**: in Discord, enable Developer Mode
   (User Settings → Advanced → Developer Mode), then right-click your
   server icon → **Copy Server ID**.

## 2. Find your role IDs

With Developer Mode on: Server Settings → Roles → right-click each role
(Trial Moderator, Moderator, Administrator, etc.) → **Copy Role ID**.

Paste these into `roles.config.js`:

```js
ranks: [
  { id: "1234567890", label: "Administrator" },
  { id: "2345678901", label: "Moderator" },
  { id: "3456789012", label: "Trial Moderator" },
],
adminRoleIds: [
  "1234567890", // only Administrator (and above) can see the review queue
],
```

## 3. Configure environment variables

```bash
cp .env.example .env
```

Then fill in `.env`:

```
SESSION_SECRET=          # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_BOT_TOKEN=
DISCORD_GUILD_ID=
DISCORD_REDIRECT_URI=http://localhost:3000/callback
```

Never commit `.env` or paste its contents anywhere outside your own machine/host.

## 4. Run it locally

```bash
npm install
npm start
```

Visit `http://localhost:3000`, click **Continue with Discord**, and you
should land on the dashboard with your real Discord name/avatar and rank.

## 5. Deploying for real

Since your bot dev already knows where the bot itself would eventually be
hosted, the simplest path is running this Node app as a second process
right alongside it, same server, same box, no extra monthly cost beyond
what you're already planning to pay for bot hosting.

Any of these work fine for a project this size:

- **A VPS you/your bot dev already control**, run with `pm2` or a
  `systemd` service so it restarts if it crashes; put it behind Caddy or
  Nginx for free HTTPS via Let's Encrypt.
- **Railway / Render**, push this folder to a GitHub repo, connect it,
  set the same environment variables in their dashboard, done. Both have
  usage-based free tiers that comfortably cover a small staff team.

Whichever you pick, update `DISCORD_REDIRECT_URI` in `.env` (and in the
Discord Developer Portal's OAuth2 Redirects list) to match your real
domain, e.g. `https://trainings.yourdomain.xyz/callback`.

## Project structure

```
lacrp-portal/
  server.js          Express app + all routes
  discord.js          Discord OAuth + role lookup helpers
  roles.js            Turns role IDs into rank label / admin / trainee flags
  roles.config.js      <-- EDIT THIS with your real role IDs
  questions.js         Quiz content + answer key (server-only)
  db.js                Plain JSON-file storage (no native modules)
  data/                 submissions.json lives here at runtime (gitignored)
  public/
    index.html
    styles.css
    app.js             All frontend logic, talks to the API only
  .env.example          <-- copy to .env and fill in
```

Sessions use express-session's built-in in-memory store, so everyone's
logged out if the server process restarts, a non-issue for a small team,
and it means zero extra setup. If you ever move to a host that restarts
the process often (e.g. some serverless platforms), swap in a proper
session store at that point.

## Extending it

- **Add more trainings**: duplicate the shape in `questions.js` with a new
  `section` value, or split into multiple quiz "tracks" if you want more
  than one assigned training per person.
- **Notify admins on new submissions**: easiest addition is a bot webhook
  call inside the `/api/submit` route in `server.js`, you already have a
  bot token, so this is a small addition (send a message to a
  `#quiz-submissions` channel when a new row is inserted).
