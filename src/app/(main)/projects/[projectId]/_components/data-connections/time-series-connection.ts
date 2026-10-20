import type { CreateConnectionRequest, TimeSeriesConnectionKind } from "@/lib/api/services/fetch-data-connections";

export function createTimeSeriesConnection(
  kind: TimeSeriesConnectionKind,
  draft: { url: string; database: string; token: string; username: string; password: string },
  name: string,
): Extract<CreateConnectionRequest, { kind: TimeSeriesConnectionKind }> {
  const url = draft.url.trim();
  const hasControlCharacters = Array.from(url).some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
  if (!/^https?:\/\//i.test(url) || url.length > 2048 || /\s/.test(url) || hasControlCharacters)
    throw new Error("Enter an HTTP or HTTPS server URL of at most 2,048 characters without spaces.");
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Enter a valid HTTP or HTTPS server URL.");
  }
  if (parsed.username || parsed.password || url.includes("?") || url.includes("#"))
    throw new Error("The URL must not contain credentials, a query or a fragment.");
  if (!/^[A-Za-z0-9/._~-]*$/.test(parsed.pathname))
    throw new Error("URL prefixes may contain only letters, digits, slashes and . _ ~ -.");
  const username = draft.username;
  const token = draft.token;
  if (
    username &&
    (username.length > 255 || username.includes(":") || (kind === "influxdb" && /[^\x20-\x7e]/.test(username)))
  )
    throw new Error("Username must contain at most 255 characters without a colon; InfluxDB requires printable ASCII.");
  if (token && (token.length > 4096 || /[^\x21-\x7e]/.test(token)))
    throw new Error("Token must contain at most 4,096 printable ASCII characters without spaces.");
  if (kind === "prometheus") {
    if (username && !token) throw new Error("Provide the Basic auth password in the token field with your username.");
    const secret = { ...(username ? { username } : {}), ...(token ? { token } : {}) };
    return { name, kind, config: { url }, ...(Object.keys(secret).length ? { secret } : {}) };
  }
  const database = draft.database.trim();
  if (!database || database.length > 255) throw new Error("Database or bucket must contain 1 to 255 characters.");
  const password = draft.password;
  if (password && (password.length > 4096 || /[^\x20-\x7e]/.test(password)))
    throw new Error("Password must contain at most 4,096 printable ASCII characters.");
  if (token && (username || password)) throw new Error("Do not combine a token with username and password.");
  if (Boolean(username) !== Boolean(password)) throw new Error("Provide username and password together.");
  const secret = token ? { token } : { ...(username ? { username, password } : {}) };
  return { name, kind, config: { url, database }, ...(Object.keys(secret).length ? { secret } : {}) };
}
