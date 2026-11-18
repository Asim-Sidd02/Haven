import { errMsg } from "./format";

export function friendlyAuthError(e: unknown) {
  const m = errMsg(e);
  if (/invalid-credential|wrong-password|user-not-found/.test(m)) return "That email and password don't match. Check them and try again.";
  if (/too-many-requests/.test(m)) return "Too many attempts. Wait a minute, or reset your password.";
  if (/email-already-in-use/.test(m)) return "An account with this email already exists. Sign in instead.";
  if (/weak-password/.test(m)) return "Use a password of at least 8 characters.";
  if (/network/.test(m)) return "You seem to be offline. Check your connection.";
  return m.replace(/^Firebase: /, "");
}
