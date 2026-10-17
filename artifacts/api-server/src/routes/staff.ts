import { Router, type IRouter } from "express";
import { and, eq, gte, ilike, lt, or, sql } from "drizzle-orm";
import {
  CreateStaffBody,
  CreateStaffResponse,
  DeleteStaffParams,
  GetSalaryReportsQueryParams,
  GetSalaryReportsResponse,
  ListAttendanceQueryParams,
  ListAttendanceResponse,
  ListStaffQueryParams,
  ListStaffResponse,
  SaveAttendanceBody,
  SaveAttendanceResponse,
  UpdateStaffBody,
  UpdateStaffParams,
  UpdateStaffResponse,
} from "@workspace/api-zod";
import { attendanceTable, db, staffTable } from "@workspace/db";

const router: IRouter = Router();

function getMonthWindow(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(monthNumber) ||
    monthNumber < 1 ||
    monthNumber > 12
  ) {
    return null;
  }
  const start = `${year}-${String(monthNumber).padStart(2, "0")}-01`;
  const nextMonth = new Date(Date.UTC(year, monthNumber, 1));
  const end = nextMonth.toISOString().slice(0, 10);
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return { start, end, daysInMonth };
}

function dateOnly(value: string | Date): string;
function dateOnly(value: string | Date | null | undefined): string | null | undefined;
function dateOnly(value: string | Date | null | undefined): string | null | undefined {
  if (value == null) return value;
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

function staffResponse(row: typeof staffTable.$inferSelect) {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

function staffWire<T extends object>(parsed: T, row: typeof staffTable.$inferSelect) {
  return Object.assign({}, parsed, { joiningDate: row.joiningDate });
}

function attendanceWire<T extends object>(
  parsed: T,
  row: typeof attendanceTable.$inferSelect,
) {
  return Object.assign({}, parsed, { date: row.date });
}

export async function calculateSalaryReports(month: string) {
  const window = getMonthWindow(month);
  if (!window) return null;

  const [staffRows, attendanceRows] = await Promise.all([
    db.select().from(staffTable).orderBy(staffTable.name),
    db
      .select()
      .from(attendanceTable)
      .where(
        and(
          gte(attendanceTable.date, window.start),
          lt(attendanceTable.date, window.end),
        ),
      ),
  ]);
  const absenceCount = new Map<number, number>();
  for (const row of attendanceRows) {
    if (row.status === "absent") {
      absenceCount.set(row.staffId, (absenceCount.get(row.staffId) ?? 0) + 1);
    }
  }
  return staffRows.map((member) => {
    const absentDays = absenceCount.get(member.id) ?? 0;
    const freeAbsences = Math.min(absentDays, 2);
    const deduction =
      Math.round(
        ((member.monthlySalary / window.daysInMonth) *
          Math.max(absentDays - 2, 0) +
          Number.EPSILON) *
          100,
      ) / 100;
    return {
      staffId: member.id,
      staffName: member.name,
      designation: member.designation,
      month,
      monthlySalary: member.monthlySalary,
      absentDays,
      freeAbsences,
      deduction,
      netSalary: Math.round((member.monthlySalary - deduction + Number.EPSILON) * 100) / 100,
    };
  });
}

router.get("/staff", async (req, res): Promise<void> => {
  const parsed = ListStaffQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const search = parsed.data.search?.trim();
  const rows = await db
    .select()
    .from(staffTable)
    .where(
      search
        ? or(
            ilike(staffTable.name, `%${search}%`),
            ilike(staffTable.designation, `%${search}%`),
            ilike(staffTable.phone, `%${search}%`),
          )
        : undefined,
    )
    .orderBy(staffTable.name);
  const validated = ListStaffResponse.parse(rows.map(staffResponse));
  res.json(validated.map((member, index) => staffWire(member, rows[index])));
});

router.post("/staff", async (req, res): Promise<void> => {
  const parsed = CreateStaffBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [member] = await db
    .insert(staffTable)
    .values({
      ...parsed.data,
      joiningDate: dateOnly(parsed.data.joiningDate)!,
    })
    .returning();
  const validated = CreateStaffResponse.parse(staffResponse(member));
  res.status(201).json(staffWire(validated, member));
});

router.patch("/staff/:id", async (req, res): Promise<void> => {
  const params = UpdateStaffParams.safeParse(req.params);
  const body = UpdateStaffBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: params.error?.message ?? body.error?.message });
    return;
  }
  const { joiningDate, ...staffFields } = body.data;
  const [member] = await db
    .update(staffTable)
    .set({
      ...staffFields,
      ...(joiningDate
        ? { joiningDate: dateOnly(joiningDate) }
        : {}),
    })
    .where(eq(staffTable.id, params.data.id))
    .returning();
  if (!member) {
    res.status(404).json({ error: "Staff member not found" });
    return;
  }
  const validated = UpdateStaffResponse.parse(staffResponse(member));
  res.json(staffWire(validated, member));
});

router.delete("/staff/:id", async (req, res): Promise<void> => {
  const params = DeleteStaffParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [member] = await db
    .delete(staffTable)
    .where(eq(staffTable.id, params.data.id))
    .returning({ id: staffTable.id });
  if (!member) {
    res.status(404).json({ error: "Staff member not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/attendance", async (req, res): Promise<void> => {
  const parsed = ListAttendanceQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const window = getMonthWindow(parsed.data.month);
  if (!window) {
    res.status(400).json({ error: "Month must be a valid YYYY-MM value" });
    return;
  }
  const rows = await db
    .select()
    .from(attendanceTable)
    .where(
      and(
        gte(attendanceTable.date, window.start),
        lt(attendanceTable.date, window.end),
      ),
    )
    .orderBy(attendanceTable.date, attendanceTable.staffName);
  const validated = ListAttendanceResponse.parse(rows);
  res.json(validated.map((entry, index) => attendanceWire(entry, rows[index])));
});

router.post("/attendance", async (req, res): Promise<void> => {
  const parsed = SaveAttendanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [member] = await db
    .select()
    .from(staffTable)
    .where(eq(staffTable.id, parsed.data.staffId))
    .limit(1);
  if (!member) {
    res.status(404).json({ error: "Staff member not found" });
    return;
  }
  const [entry] = await db
    .insert(attendanceTable)
    .values({
      ...parsed.data,
      date: dateOnly(parsed.data.date)!,
      staffName: member.name,
    })
    .onConflictDoUpdate({
      target: [attendanceTable.staffId, attendanceTable.date],
      set: {
        staffName: member.name,
        status: sql`excluded.status`,
      },
    })
    .returning();
  const validated = SaveAttendanceResponse.parse(entry);
  res.json(attendanceWire(validated, entry));
});

router.get("/salary-reports", async (req, res): Promise<void> => {
  const parsed = GetSalaryReportsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const reports = await calculateSalaryReports(parsed.data.month);
  if (!reports) {
    res.status(400).json({ error: "Month must be a valid YYYY-MM value" });
    return;
  }
  res.json(GetSalaryReportsResponse.parse(reports));
});

export default router;
