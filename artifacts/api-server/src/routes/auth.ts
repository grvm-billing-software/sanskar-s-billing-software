import { Router } from "express";
import { randomBytes } from "crypto";
import { eq, gt } from "drizzle-orm";
import { db } from "../../db";
import { sessionsTable } from "@db/schema";
import { LoginBody, LoginResponse } from "@shared/api-schema";

const router = Router();
const sessionDurationMs = 7 * 24 * 60 * 60 * 1000; // 7 days

const cookieName = "hptl_session";
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

function passwordMatches(input: string, expected: string): boolean {
  return input === expected;
}

router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const expectedPassword = "hptl@1234";

  if (!passwordMatches(parsed.data.password, expectedPassword)) {
    res.status(401).json({ error: "Incorrect password" });
    return;
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionDurationMs);

  await db.insert(sessionsTable).values({
    id: token,
    expiresAt,
  });

  res.cookie(cookieName, token, {
    ...cookieOptions,
    maxAge: sessionDurationMs,
  });

  res.json(LoginResponse.parse({ authenticated: true }));
});

router.get("/auth/session", async (req, res) => {
  const token = req.cookies[cookieName];
  if (!token) {
    res.json(LoginResponse.parse({ authenticated: false }));
    return;
  }

  // Verify session exists in DB and has not expired
  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, token));

  if (!session || session.expiresAt < new Date()) {
    // Clean up invalid/expired cookie and session if needed
    res.clearCookie(cookieName, cookieOptions);
    if (session) {
      await db.delete(sessionsTable).where(eq(sessionsTable.id, token));
    }
    res.json(LoginResponse.parse({ authenticated: false }));
    return;
  }

  res.json(LoginResponse.parse({ authenticated: true }));
});

router.post("/auth/logout", async (req, res) => {
  const token = req.cookies[cookieName];
  if (token) {
    // Remove session from the database
    await db.delete(sessionsTable).where(eq(sessionsTable.id, token));
  }

  res.clearCookie(cookieName, cookieOptions);
  res.json({ success: true });
});

export default router;
