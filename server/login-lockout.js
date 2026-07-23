// Complements the existing per-IP login rate limiter (server/index.js), which
// doesn't stop a distributed attacker (many IPs) from brute-forcing one
// specific account. This tracks failed attempts per email in memory - it
// resets on server restart, which is an accepted tradeoff for a single
// Railway instance rather than adding a shared store for this alone.
const FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const FAILED_LOGIN_MAX_ATTEMPTS = Number(process.env.ACCOUNT_LOCKOUT_MAX_ATTEMPTS || 10);

const failedAttemptsByEmail = new Map();

function recentAttempts(email) {
  const attempts = failedAttemptsByEmail.get(email) || [];
  const recent = attempts.filter((timestamp) => Date.now() - timestamp < FAILED_LOGIN_WINDOW_MS);
  if (recent.length) failedAttemptsByEmail.set(email, recent);
  else failedAttemptsByEmail.delete(email);
  return recent;
}

export function isAccountLocked(email) {
  return recentAttempts(email).length >= FAILED_LOGIN_MAX_ATTEMPTS;
}

export function recordFailedLogin(email) {
  const attempts = recentAttempts(email);
  attempts.push(Date.now());
  failedAttemptsByEmail.set(email, attempts);
}

export function clearFailedLogins(email) {
  failedAttemptsByEmail.delete(email);
}
