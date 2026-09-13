// Thin wrapper around the bits of Discord's API this app needs.
// Uses the global `fetch` built into Node 18+.

async function exchangeCode(code) {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    client_secret: process.env.DISCORD_CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.DISCORD_REDIRECT_URI,
  });

  const res = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!res.ok) {
    throw new Error(`Discord token exchange failed: ${res.status} ${await res.text()}`);
  }
  return res.json(); // { access_token, token_type, expires_in, ... }
}

async function getUser(accessToken) {
  const res = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch Discord user: ${res.status} ${await res.text()}`);
  }
  return res.json(); // { id, username, global_name, avatar, discriminator, ... }
}

// Requires the bot to be a member of the guild. A single-member lookup
// like this does NOT require the privileged "Server Members Intent".
// That's only needed for bulk/gateway member syncing.
async function getMemberRoles(discordUserId) {
  const res = await fetch(
    `https://discord.com/api/guilds/${process.env.DISCORD_GUILD_ID}/members/${discordUserId}`,
    { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` } }
  );

  if (res.status === 404) return []; // logged in with Discord but not in your server
  if (!res.ok) {
    throw new Error(`Failed to fetch member roles: ${res.status} ${await res.text()}`);
  }
  const member = await res.json();
  return member.roles || [];
}

module.exports = { exchangeCode, getUser, getMemberRoles };
