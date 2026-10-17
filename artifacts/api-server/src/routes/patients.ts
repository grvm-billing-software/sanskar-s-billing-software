import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { and, desc, eq, gte, ilike, lt, or, type SQL } from "drizzle-orm";
import {
  CreateIpdAdmissionBody,
  CreateIpdAdmissionResponse,
  CreateOpdVisitBody,
  CreateOpdVisitResponse,
  CreateReferralBody,
  CreateReferralResponse,
  DeleteIpdAdmissionParams,
  DeleteOpdVisitParams,
  DeleteReferralParams,
  ListIpdAdmissionsQueryParams,
  ListIpdAdmissionsResponse,
  ListOpdVisitsQueryParams,
  ListOpdVisitsResponse,
  ListReferralsQueryParams,
  ListReferralsResponse,
  UpdateIpdAdmissionBody,
  UpdateIpdAdmissionParams,
  UpdateIpdAdmissionResponse,
  UpdateOpdVisitBody,
  UpdateOpdVisitParams,
  UpdateOpdVisitResponse,
  UpdateReferralBody,
  UpdateReferralParams,
  UpdateReferralResponse,
} from "@workspace/api-zod";
import {
  db,
  ipdAdmissionsTable,
  opdVisitsTable,
  referralsTable,
} from "@workspace/db";

const router: IRouter = Router();

function dateOnly(value: string | Date): string;
function dateOnly(value: string | Date | null | undefined): string | null | undefined;
function dateOnly(value: string | Date | null | undefined): string | null | undefined {
  if (value == null) return value;
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

function indiaMidnight(value: string | Date): Date {
  return new Date(`${dateOnly(value)}T00:00:00+05:30`);
}

function nextDay(value: string | Date): string {
  const date = new Date(`${dateOnly(value)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function opdResponse(row: typeof opdVisitsTable.$inferSelect) {
  return { ...row, visitDate: row.visitDate.toISOString() };
}

function ipdResponse(row: typeof ipdAdmissionsTable.$inferSelect) {
  return {
    ...row,
    admissionAt: row.admissionAt.toISOString(),
    dischargeAt: row.dischargeAt?.toISOString() ?? null,
  };
}

function referralWire<T extends object>(
  parsed: T,
  row: typeof referralsTable.$inferSelect,
) {
  return Object.assign({}, parsed, { referralDate: row.referralDate });
}

router.get("/opd-visits", async (req, res): Promise<void> => {
  const queryDates: Record<string, unknown> = { ...req.query };
  for (const key of ["startDate", "endDate"] as const) {
    const value = req.query[key];
    if (typeof value === "string") {
      queryDates[key] = new Date(`${value}T00:00:00Z`);
    }
  }
  const parsed = ListOpdVisitsQueryParams.safeParse(queryDates);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const conditions: SQL[] = [];
  if (parsed.data.search?.trim()) {
    const pattern = `%${parsed.data.search.trim()}%`;
    const condition = or(
      ilike(opdVisitsTable.patientName, pattern),
      ilike(opdVisitsTable.appointmentNumber, pattern),
      ilike(opdVisitsTable.doctor, pattern),
      ilike(opdVisitsTable.contact, pattern),
    );
    if (condition) conditions.push(condition);
  }
  if (parsed.data.startDate) {
    conditions.push(gte(opdVisitsTable.visitDate, indiaMidnight(parsed.data.startDate)));
  }
  if (parsed.data.endDate) {
    conditions.push(lt(opdVisitsTable.visitDate, indiaMidnight(nextDay(parsed.data.endDate))));
  }
  const rows = await db
    .select()
    .from(opdVisitsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(opdVisitsTable.visitDate));
  res.json(ListOpdVisitsResponse.parse(rows.map(opdResponse)));
});

router.post("/opd-visits", async (req, res): Promise<void> => {
  const parsed = CreateOpdVisitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const visitDate = new Date(parsed.data.visitDate);
  if (Number.isNaN(visitDate.getTime())) {
    res.status(400).json({ error: "Invalid visit date" });
    return;
  }
  const visit = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(opdVisitsTable)
      .values({
        ...parsed.data,
        visitDate,
        appointmentNumber: `OPD-TEMP-${randomUUID()}`,
      })
      .returning();
    const [saved] = await tx
      .update(opdVisitsTable)
      .set({ appointmentNumber: `OPD-${1000 + created.id}` })
      .where(eq(opdVisitsTable.id, created.id))
      .returning();
    return saved;
  });
  res.status(201).json(CreateOpdVisitResponse.parse(opdResponse(visit)));
});

router.patch("/opd-visits/:id", async (req, res): Promise<void> => {
  const params = UpdateOpdVisitParams.safeParse(req.params);
  const body = UpdateOpdVisitBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: params.error?.message ?? body.error?.message });
    return;
  }
  const values = {
    ...body.data,
    ...(body.data.visitDate ? { visitDate: new Date(body.data.visitDate) } : {}),
  };
  const [visit] = await db
    .update(opdVisitsTable)
    .set(values)
    .where(eq(opdVisitsTable.id, params.data.id))
    .returning();
  if (!visit) {
    res.status(404).json({ error: "OPD visit not found" });
    return;
  }
  res.json(UpdateOpdVisitResponse.parse(opdResponse(visit)));
});

router.delete("/opd-visits/:id", async (req, res): Promise<void> => {
  const params = DeleteOpdVisitParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(opdVisitsTable)
    .where(eq(opdVisitsTable.id, params.data.id))
    .returning({ id: opdVisitsTable.id });
  if (!deleted) {
    res.status(404).json({ error: "OPD visit not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/ipd-admissions", async (req, res): Promise<void> => {
  const parsed = ListIpdAdmissionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const conditions: SQL[] = [];
  if (parsed.data.search?.trim()) {
    const pattern = `%${parsed.data.search.trim()}%`;
    const condition = or(
      ilike(ipdAdmissionsTable.patientName, pattern),
      ilike(ipdAdmissionsTable.patientContact, pattern),
      ilike(ipdAdmissionsTable.room, pattern),
      ilike(ipdAdmissionsTable.doctor, pattern),
    );
    if (condition) conditions.push(condition);
  }
  if (parsed.data.status && parsed.data.status !== "all") {
    conditions.push(eq(ipdAdmissionsTable.status, parsed.data.status));
  }
  const rows = await db
    .select()
    .from(ipdAdmissionsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(ipdAdmissionsTable.admissionAt));
  res.json(ListIpdAdmissionsResponse.parse(rows.map(ipdResponse)));
});

router.post("/ipd-admissions", async (req, res): Promise<void> => {
  const parsed = CreateIpdAdmissionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [admission] = await db
    .insert(ipdAdmissionsTable)
    .values({ ...parsed.data, admissionAt: new Date(parsed.data.admissionAt) })
    .returning();
  res
    .status(201)
    .json(CreateIpdAdmissionResponse.parse(ipdResponse(admission)));
});

router.patch("/ipd-admissions/:id", async (req, res): Promise<void> => {
  const params = UpdateIpdAdmissionParams.safeParse(req.params);
  const body = UpdateIpdAdmissionBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: params.error?.message ?? body.error?.message });
    return;
  }
  const values: Partial<typeof ipdAdmissionsTable.$inferInsert> = {
    ...body.data,
    ...(body.data.admissionAt
      ? { admissionAt: new Date(body.data.admissionAt) }
      : {}),
    ...(body.data.dischargeAt !== undefined
      ? {
          dischargeAt: body.data.dischargeAt
            ? new Date(body.data.dischargeAt)
            : null,
        }
      : {}),
  };
  if (body.data.status === "discharged" && body.data.dischargeAt === undefined) {
    values.dischargeAt = new Date();
  } else if (body.data.status === "admitted" && body.data.dischargeAt === undefined) {
    values.dischargeAt = null;
  } else if (body.data.dischargeAt !== undefined && body.data.status === undefined) {
    values.status = body.data.dischargeAt ? "discharged" : "admitted";
  }
  const [admission] = await db
    .update(ipdAdmissionsTable)
    .set(values)
    .where(eq(ipdAdmissionsTable.id, params.data.id))
    .returning();
  if (!admission) {
    res.status(404).json({ error: "IPD admission not found" });
    return;
  }
  res.json(UpdateIpdAdmissionResponse.parse(ipdResponse(admission)));
});

router.delete("/ipd-admissions/:id", async (req, res): Promise<void> => {
  const params = DeleteIpdAdmissionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(ipdAdmissionsTable)
    .where(eq(ipdAdmissionsTable.id, params.data.id))
    .returning({ id: ipdAdmissionsTable.id });
  if (!deleted) {
    res.status(404).json({ error: "IPD admission not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/referrals", async (req, res): Promise<void> => {
  const parsed = ListReferralsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const conditions: SQL[] = [];
  if (parsed.data.search?.trim()) {
    const pattern = `%${parsed.data.search.trim()}%`;
    const condition = or(
      ilike(referralsTable.patientName, pattern),
      ilike(referralsTable.referringDoctor, pattern),
      ilike(referralsTable.center, pattern),
      ilike(referralsTable.testName, pattern),
    );
    if (condition) conditions.push(condition);
  }
  if (parsed.data.status && parsed.data.status !== "all") {
    conditions.push(eq(referralsTable.status, parsed.data.status));
  }
  const rows = await db
    .select()
    .from(referralsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(referralsTable.referralDate));
  const validated = ListReferralsResponse.parse(rows);
  res.json(validated.map((item, index) => referralWire(item, rows[index])));
});

router.post("/referrals", async (req, res): Promise<void> => {
  const parsed = CreateReferralBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [referral] = await db
    .insert(referralsTable)
    .values({
      ...parsed.data,
      referralDate: dateOnly(parsed.data.referralDate)!,
    })
    .returning();
  const validated = CreateReferralResponse.parse(referral);
  res.status(201).json(referralWire(validated, referral));
});

router.patch("/referrals/:id", async (req, res): Promise<void> => {
  const params = UpdateReferralParams.safeParse(req.params);
  const body = UpdateReferralBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: params.error?.message ?? body.error?.message });
    return;
  }
  const { referralDate, ...referralFields } = body.data;
  const [referral] = await db
    .update(referralsTable)
    .set({
      ...referralFields,
      ...(referralDate
        ? { referralDate: dateOnly(referralDate) }
        : {}),
    })
    .where(eq(referralsTable.id, params.data.id))
    .returning();
  if (!referral) {
    res.status(404).json({ error: "Referral not found" });
    return;
  }
  const validated = UpdateReferralResponse.parse(referral);
  res.json(referralWire(validated, referral));
});

router.delete("/referrals/:id", async (req, res): Promise<void> => {
  const params = DeleteReferralParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(referralsTable)
    .where(eq(referralsTable.id, params.data.id))
    .returning({ id: referralsTable.id });
  if (!deleted) {
    res.status(404).json({ error: "Referral not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
