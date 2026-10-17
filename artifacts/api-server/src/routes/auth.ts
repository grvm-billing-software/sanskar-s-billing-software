import { Router } from "express";

const router = Router();

router.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  next();
});

router.post("/auth/login", (req, res) => {
  return res.json({
    authenticated: true,
    success: true,
    user: { id: "admin", name: "Staff" },
  });
});

router.get("/auth/session", (req, res) => {
  return res.json({
    authenticated: true,
    success: true,
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
