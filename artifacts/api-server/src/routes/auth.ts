import { Router } from "express";
import cors from "cors";

const router = Router();

// CORS middleware setup
router.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
    ],
  }),
);

// Login route jo hptl@1234 password check karega
router.post("/auth/login", (req, res) => {
  const { password } = req.body || {};

  // Sahi password match hone par success dega
  if (password === "hptl@1234") {
    return res.json({
      authenticated: true,
      success: true,
      user: { id: "admin", name: "GRVM Admin", role: "admin" },
    });
  }

  return res.status(401).json({
    authenticated: false,
    success: false,
    message: "Galat password hai bhai! Sahi password 'hptl@1234' daal.",
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
