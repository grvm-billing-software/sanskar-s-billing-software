import { Router } from "express";

const router = Router();

router.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

router.post("/auth/login", (req, res) => {
  res.cookie("token", "mock-jwt-token-admin", { 
    httpOnly: false, 
    secure: true, 
    sameSite: "none" 
  });
  return res.json({ 
    authenticated: true, 
    success: true, 
    token: "mock-jwt-token-admin",
    user: { id: "admin", name: "Staff", role: "admin" } 
  });
});

router.get("/auth/session", (req, res) => {
  return res.json({ 
    authenticated: true, 
    success: true, 
    user: { id: "admin", name: "Staff", role: "admin" } 
  });
});

router.post("/auth/logout", (req, res) => {
  res.clearCookie("token");
  return res.json({ success: true });
});

export async function findActiveSession(req: any) {
  return { id: "admin" };
}

export default router;