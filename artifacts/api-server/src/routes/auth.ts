import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Router, type IRouter } from "express";
import { and, eq, gt } from "drizzle-orm";
import { db, sessionsTable } from "@workspace/db";
import {
  GetSessionResponse,
  LoginBody,
  LoginResponse,
  LogoutResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const cookieName = "hospital_session";
const sessionDurationMs = 12 * 60 * 60 * 1000;
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api",
};

function passwordMatches(provided: string, expected: string): boolean {
  const providedHash = createHash("sha256").update(provided).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(providedHash, expectedHash);
}

export async function findActiveSession(token: unknown) {
  if (typeof token !== "string" || token.length < 32) return undefined;
  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.id, token), gt(sessionsTable.expiresAt, new Date())))
    .limit(1);
  return session;
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const expectedPassword = process.env.HOSPITAL_ACCESS_PASSWORD;
  if (!expectedPassword) {
    req.log.error("HOSPITAL_ACCESS_PASSWORD is not configured");
    res.status(503).json({ error: "Login is not configured" });
    return;
  }
  if (!passwordMatches(parsed.data.password, expectedPassword)) {
    res.status(401).json({ error: "Incorrect password" });
    return;
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionDurationMs);
  await db.insert(sessionsTable).values({ id: token, expiresAt });
  res.cookie(cookieName, token, {
    ...cookieOptions,
    maxAge: sessionDurationMs,
  });
  res.json(LoginResponse.parse({ authenticated: true }));
});

router.get("/auth/session", async (req, res): Promise<void> => {
  const session = await findActiveSession(req.cookies?.[cookieName]);
  res.json(GetSessionResponse.parse({ authenticated: Boolean(session) }));
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  const token = req.cookies?.[cookieName];
  if (typeof token === "string") {
    await db.delete(sessionsTable).where(eq(sessionsTable.id, token));
  }
  res.clearCookie(cookieName, cookieOptions);
  res.json(LogoutResponse.parse({ authenticated: false }));
});

export default router;
