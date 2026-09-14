// Thin wrapper around the bits of Discord's API this app needs.
// Uses the global fetch built into Node 18+.

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
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  if (!res.ok) {
    const body = await res.text();

    console.error(
      "DISCORD_DIAGNOSTIC status=" +
        res.status +
        " retry-after=" +
        res.headers.get("retry-after") +
        " remaining=" +
        res.headers.get("x-ratelimit-remaining") +
        " limit=" +
        res.headers.get("x-ratelimit-limit") +
        " reset=" +
        res.headers.get("x-ratelimit-reset") +
        " global=" +
        res.headers.get("x-ratelimit-global")
    );

    console.error("DISCORD_BODY " + body);

    throw new Error(
      `Discord token exchange failed: ${res.status} ${body}`
    );
  }

  return res.json();
}

async function getUser(accessToken) {
  const res = await fetch("https://discord.com/api/users/@me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch Discord user: ${res.status} ${await res.text()}`
    );
  }

  return res.json();
}

// Requires the bot to be a member of the guild.
async function getMemberRoles(discordUserId) {
  const res = await fetch(
    `https://discord.com/api/guilds/${process.env.DISCORD_GUILD_ID}/members/${discordUserId}`,
    {
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      },
    }
  );

  if (res.status === 404) {
    return [];
  }

  if (!res.ok) {
    throw new Error(
      `Failed to fetch member roles: ${res.status} ${await res.text()}`
    );
  }

  const member = await res.json();
  return member.roles || [];
}

module.exports = {
  exchangeCode,
  getUser,
  getMemberRoles,
};