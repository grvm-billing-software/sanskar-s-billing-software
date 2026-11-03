import { Router } from "express";
import cors from "cors";

const router = Router();

// CORS middleware setup
router.use(cors({
  origin: true,
  credentials: true
}));
// Login route jo adminstaff password check karega
router.post("/auth/login", (req, res) => {
  const { password } = req.body || {};

  // Sahi password match hone par cookie set karega aur success dega
  if (password === "adminstaff") {
    res.cookie("connect.sid", "admin-session-token", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 24 * 60 * 60 * 1000
    });

    return res.json({
      authenticated: true,
      success: true,
      user: { id: "admin", name: "GRVM Admin", role: "admin" },
    });
  }

  return res.status(401).json({
    authenticated: false,
    success: false,
    message: "Galat password hai bhai! Sahi password 'adminstaff' daal.",
  });
});

router.get("/auth/session", (req, res) => {
  return res.json({
    authenticated: true,
    success: true,
    user: { id: "admin", name: "GRVM Admin", role: "admin" },
  });
});

router.post("/auth/logout", (req, res) => {
  return res.json({ success: true });
});

export async function findActiveSession(req: any) {
  return { id: "admin" };
}

export default router;
