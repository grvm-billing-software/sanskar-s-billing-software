import { Router } from "express";

const router = Router();
const cookieName = "hptl_session";

router.post("/auth/login", (req, res) => {
  const password = req.body?.password;

  if (password === "hptl@1234") {
    res.cookie(cookieName, "authenticated_user", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return res.json({ authenticated: true });
  }

  return res.status(401).json({ error: "That password was not accepted." });
});

router.get("/auth/session", (req, res) => {
  const token = req.cookies?.[cookieName];
  if (token === "authenticated_user") {
    return res.json({ authenticated: true });
  }
  return res.json({ authenticated: false });
});

router.post("/auth/logout", (req, res) => {
  res.clearCookie(cookieName);
  return res.json({ success: true });
});

export async function findActiveSession(req: any) {
  return null;
}

export default router;
