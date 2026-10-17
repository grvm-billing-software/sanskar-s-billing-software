import { Router } from "express";

const router = Router();

// CORS headers taaki frontend aur Render ke beech communication mein koi rukawat na aaye
router.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Login route jo hptl@1234 password check karega
router.post("/auth/login", (req, res) => {
  const { password, username } = req.body || {};

  // Agar password 'hptl@1234' match ho jata hai, ya agar koi blank/bypass bheje toh bhi success dega
  if (!password || password === "hptl@1234") {
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
