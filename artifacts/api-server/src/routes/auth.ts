import { Router } from "express";

const router = Router();
const cookieName = "hptl_session";

router.post("/auth/login", (req, res) => {
  res.cookie(cookieName, "authenticated_user", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return res.json({ authenticated: true });
});

router.get("/auth/session", (req, res) => {
  return res.json({ authenticated: true });
});

router.post("/auth/logout", (req, res) => {
  res.clearCookie(cookieName);
  return res.json({ success: true });
});

export async function findActiveSession(req: any) {
  return { id: "session_123" };
}

export default router;
