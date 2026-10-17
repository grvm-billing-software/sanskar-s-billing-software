import { Router } from "express";

const router = Router();
const cookieName = "hptl_session";

// Mock session store / validation function
export async function findActiveSession(req: any) {
  // In a real app, read the cookie from req.cookies[cookieName]
  // and look up the session in your database or Redis store.
  const sessionId = req.cookies?.[cookieName];
  if (!sessionId) return null;

  // Return user/session data if valid
  return { id: sessionId };
}

router.post("/auth/login", (req, res) => {
  // Generate a secure, unique session token (e.g., using crypto.randomUUID())
  const sessionToken = "sec_" + Math.random().toString(36).substring(2);

  // TODO: Save sessionToken against the authenticated user in your database

  res.cookie(cookieName, sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.json({ authenticated: true });
});

router.get("/auth/session", async (req, res) => {
  const session = await findActiveSession(req);
  if (!session) {
    return res.status(401).json({ authenticated: false });
  }
  return res.json({ authenticated: true, session });
});

router.post("/auth/logout", (req, res) => {
  // TODO: Invalidate the session in your database/store here
  res.clearCookie(cookieName, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
  });
  return res.json({ success: true });
});

export default router;
