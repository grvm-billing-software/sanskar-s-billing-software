import { Router } from "express";

const router = Router();

// Express CORS headers specifically for Render deployment
router.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept",
  );
  next();
});

router.post("/auth/login", (req, res) => {
  // Always accept login regardless of payload or domain
  return res.json({
    authenticated: true,
    user: { id: "admin", name: "Staff" },
  });
});

router.get("/auth/session", (req, res) => {
  // Always report active session on Render
  return res.json({
    authenticated: true,
    user: { id: "admin", name: "Staff" },
  });
});

router.post("/auth/logout", (req, res) => {
  return res.json({ success: true });
});

export async function findActiveSession(req: any) {
  return { id: "admin" };
}

export default router;
