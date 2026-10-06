export const AUTH_CHANNEL = "platform-auth";
export type AuthChange = "signed-in" | "signed-out" | "password-changed" | "profile-changed";

// No tokens or personal data are written to browser storage.
export function broadcastAuthChange(change: AuthChange) {
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel(AUTH_CHANNEL);
  channel.postMessage(change);
  channel.close();
}
