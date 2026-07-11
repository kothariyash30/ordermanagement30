import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";

const TOKEN_TTL = "12h";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is required to sign and verify authentication tokens.");
  }
  return secret;
}

export function signToken(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: TOKEN_TTL });
}

export function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

// Used for accounts created through the generic admin state sync (e.g. "Add
// admin user") that never went through a real password-setup flow: gives them
// a hash that cannot be produced by any real password, so login always fails
// until a proper "set password" flow exists, instead of leaving the field
// blank/trusting whatever the client happened to send.
export function unusablePasswordHash() {
  return bcrypt.hashSync(randomUUID(), 10);
}

export function authenticate(request, response, next) {
  const header = request.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    response.status(401).json({ error: "Authentication required." });
    return;
  }
  try {
    request.user = verifyToken(token);
    next();
  } catch {
    response.status(401).json({ error: "Invalid or expired session." });
  }
}

export function requireAdmin(request, response, next) {
  authenticate(request, response, () => {
    if (request.user.role !== "admin") {
      response.status(403).json({ error: "Admin access required." });
      return;
    }
    next();
  });
}
