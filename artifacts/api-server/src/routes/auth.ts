import { Router } from "express";
import { randomBytes } from "crypto";

const router = Router();
const sessionDurationMs = 7 * 24 * 60 * 60 * 1000; // 7 days
const cookieName = "hptl_session";

// In-memory store for active session tokens (use Redis/DB in production)
const activeSessions = new Set<string>();

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

router.post("/auth/login", async (req, res) => {
  const { password } = req.body || {};

  const adminPassword = process.env.ADMIN_PASSWORD || "hptl@1234";
  if (password !== adminPassword) {
    res.status(401).json({ error: "Incorrect password" });
    return;
  }

  const token = randomBytes(32).toString("base64url");
  activeSessions.add(token);

  res.cookie(cookieName, token, {
    ...cookieOptions,
    maxAge: sessionDurationMs,
  });

  res.json({ authenticated: true });
});

router.get("/auth/session", async (req, res) => {
  const token = req.cookies?.[cookieName];

  if (!token || !activeSessions.has(token)) {
    res.json({ authenticated: false });
    return;
  }

  res.json({ authenticated: true });
});

router.post("/auth/logout", async (req, res) => {
  const token = req.cookies?.[cookieName];
  if (token) {
    activeSessions.delete(token);
  }

  res.clearCookie(cookieName, cookieOptions);
  res.json({ success: true });
});

export default router;
export async function findActiveSession(req: any) {
  const token = req.cookies?.[cookieName];
  if (!token) return null;
  return { id: "session_123" };
}
