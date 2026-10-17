import { randomBytes } from "node:crypto";
import { Router, type IRouter } from "express";
import {
  and,
  desc,
  eq,
  gt,
  gte,
  ilike,
  lt,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import {
  CreateBillBody,
  CreateBillResponse,
  CreateMedicineBody,
  CreateMedicineResponse,
  DeleteMedicineParams,
  GetBillParams,
  GetBillResponse,
  GetDashboardResponse,
  GetMedicineParams,
  GetMedicineResponse,
  ListBillsQueryParams,
  ListBillsResponse,
  ListMedicinesQueryParams,
  ListMedicinesResponse,
  UpdateMedicineBody,
  UpdateMedicineParams,
  UpdateMedicineResponse,
} from "@workspace/api-zod";
import {
  billLinesTable,
  billsTable,
  ipdAdmissionsTable,
  db,
  inventoryLogsTable,
  medicinesTable,
  opdVisitsTable,
} from "@workspace/db";

const router: IRouter = Router();

function indiaDate(now = new Date()): string {
  const values = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const parts = Object.fromEntries(values.map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function addCalendarDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function monthBounds(value: string): { start: string; end: string } {
  const [year, month] = value.split("-").map(Number);
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = new Date(Date.UTC(year, month, 1));
  return { start, end: nextMonth.toISOString().slice(0, 10) };
}

function dateOnly(value: string | Date): string;
function dateOnly(value: string | Date | null | undefined): string | null | undefined;
function dateOnly(value: string | Date | null | undefined): string | null | undefined {
  if (value == null) return value;
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

function indiaMidnight(value: string | Date): Date {
  return new Date(`${dateOnly(value)}T00:00:00+05:30`);
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function medicineResponse(row: typeof medicinesTable.$inferSelect) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
  };
}

function medicineWire<T extends object>(
  parsed: T,
  row: typeof medicinesTable.$inferSelect,
) {
  return Object.assign({}, parsed, {
    dispatchDate: row.dispatchDate,
    receiveDate: row.receiveDate,
    expiryDate: row.expiryDate,
  });
}

function billResponse(row: typeof billsTable.$inferSelect) {
  return {
    ...row,
    invoiceDate: row.invoiceDate.toISOString(),
  };
}

function billDetailResponse(
  row: typeof billsTable.$inferSelect,
  lines: (typeof billLinesTable.$inferSelect)[],
) {
  return {
    ...billResponse(row),
    lines,
  };
}

router.get("/dashboard", async (_req, res): Promise<void> => {
  const today = indiaDate();
  const todayEnd = addCalendarDays(today, 1);
  const nearExpiryDate = addCalendarDays(today, 60);
  const { start: monthStart, end: monthEnd } = monthBounds(today.slice(0, 7));
  const [
    medicineRows,
    admittedRows,
    opdRows,
    billingRows,
    recentBillRows,
  ] = await Promise.all([
    db.select().from(medicinesTable),
    db.select({ id: ipdAdmissionsTable.id })
      .from(ipdAdmissionsTable)
      .where(eq(ipdAdmissionsTable.status, "admitted")),
    db.select({ id: opdVisitsTable.id })
      .from(opdVisitsTable)
      .where(
        and(
          gte(opdVisitsTable.visitDate, indiaMidnight(today)),
          lt(opdVisitsTable.visitDate, indiaMidnight(todayEnd)),
        ),
      ),
    db.select({ total: billsTable.total })
      .from(billsTable)
      .where(
        and(
          gte(billsTable.invoiceDate, indiaMidnight(monthStart)),
          lt(billsTable.invoiceDate, indiaMidnight(monthEnd)),
        ),
      ),
    db.select().from(billsTable).orderBy(desc(billsTable.invoiceDate)).limit(5),
  ]);

  const summary = {
    medicineCount: medicineRows.length,
    lowStockCount: medicineRows.filter((item) => item.quantity < 10).length,
    nearExpiryCount: medicineRows.filter(
      (item) => item.expiryDate >= today && item.expiryDate <= nearExpiryDate,
    ).length,
    expiredCount: medicineRows.filter((item) => item.expiryDate < today).length,
    admittedCount: admittedRows.length,
    todayOpdCount: opdRows.length,
    monthlyBilling: roundMoney(billingRows.reduce((sum, bill) => sum + bill.total, 0)),
    recentBills: recentBillRows.map(billResponse),
  };
  res.json(GetDashboardResponse.parse(summary));
});

router.get("/medicines", async (req, res): Promise<void> => {
  const parsed = ListMedicinesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { search, stock, expiry } = parsed.data;
  const conditions: SQL[] = [];
  if (search?.trim()) {
    const pattern = `%${search.trim()}%`;
    const condition = or(
      ilike(medicinesTable.name, pattern),
      ilike(medicinesTable.batchNumber, pattern),
      ilike(medicinesTable.supplier, pattern),
    );
    if (condition) conditions.push(condition);
  }
  if (stock === "low") conditions.push(lt(medicinesTable.quantity, 10));
  if (stock === "available") conditions.push(gt(medicinesTable.quantity, 0));
  const today = indiaDate();
  if (expiry === "expired") conditions.push(lt(medicinesTable.expiryDate, today));
  if (expiry === "near") {
    conditions.push(gte(medicinesTable.expiryDate, today));
    conditions.push(lt(medicinesTable.expiryDate, addCalendarDays(today, 61)));
  }
  const rows = await db
    .select()
    .from(medicinesTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(medicinesTable.name);
  const validated = ListMedicinesResponse.parse(rows.map(medicineResponse));
  res.json(validated.map((medicine, index) => medicineWire(medicine, rows[index])));
});

router.post("/medicines", async (req, res): Promise<void> => {
  const parsed = CreateMedicineBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const row = await db.transaction(async (tx) => {
    const [medicine] = await tx
      .insert(medicinesTable)
      .values({
        ...parsed.data,
        dispatchDate: dateOnly(parsed.data.dispatchDate),
        receiveDate: dateOnly(parsed.data.receiveDate),
        expiryDate: dateOnly(parsed.data.expiryDate)!,
      })
      .returning();
    await tx.insert(inventoryLogsTable).values({
      medicineId: medicine.id,
      medicineName: medicine.name,
      batchNumber: medicine.batchNumber,
      action: medicine.quantity > 0 ? "received" : "created",
      quantityChange: medicine.quantity,
      quantityBefore: 0,
      quantityAfter: medicine.quantity,
      notes: "Initial inventory entry",
    });
    return medicine;
  });
  const validated = CreateMedicineResponse.parse(medicineResponse(row));
  res.status(201).json(medicineWire(validated, row));
});

router.get("/medicines/:id", async (req, res): Promise<void> => {
  const params = GetMedicineParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select()
    .from(medicinesTable)
    .where(eq(medicinesTable.id, params.data.id))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "Medicine not found" });
    return;
  }
  const validated = GetMedicineResponse.parse(medicineResponse(row));
  res.json(medicineWire(validated, row));
});

router.patch("/medicines/:id", async (req, res): Promise<void> => {
  const params = UpdateMedicineParams.safeParse(req.params);
  const body = UpdateMedicineBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: params.error?.message ?? body.error?.message });
    return;
  }
  const { dispatchDate, receiveDate, expiryDate, ...medicineFields } = body.data;
  if (Object.keys(body.data).length === 0) {
    res.status(400).json({ error: "Provide at least one field to update" });
    return;
  }
  const row = await db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(medicinesTable)
      .where(eq(medicinesTable.id, params.data.id))
      .for("update")
      .limit(1);
    if (!current) return undefined;
    const [updated] = await tx
      .update(medicinesTable)
      .set({
        ...medicineFields,
        ...(dispatchDate !== undefined
          ? { dispatchDate: dateOnly(dispatchDate) }
          : {}),
        ...(receiveDate !== undefined
          ? { receiveDate: dateOnly(receiveDate) }
          : {}),
        ...(expiryDate ? { expiryDate: dateOnly(expiryDate) } : {}),
      })
      .where(eq(medicinesTable.id, params.data.id))
      .returning();
    if (updated.quantity !== current.quantity) {
      await tx.insert(inventoryLogsTable).values({
        medicineId: updated.id,
        medicineName: updated.name,
        batchNumber: updated.batchNumber,
        action: "adjustment",
        quantityChange: updated.quantity - current.quantity,
        quantityBefore: current.quantity,
        quantityAfter: updated.quantity,
        notes: "Manual stock adjustment",
      });
    }
    return updated;
  });
  if (!row) {
    res.status(404).json({ error: "Medicine not found" });
    return;
  }
  const validated = UpdateMedicineResponse.parse(medicineResponse(row));
  res.json(medicineWire(validated, row));
});

router.delete("/medicines/:id", async (req, res): Promise<void> => {
  const params = DeleteMedicineParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const row = await db.transaction(async (tx) => {
    const [medicine] = await tx
      .select()
      .from(medicinesTable)
      .where(eq(medicinesTable.id, params.data.id))
      .for("update")
      .limit(1);
    if (!medicine) return undefined;
    await tx.insert(inventoryLogsTable).values({
      medicineId: medicine.id,
      medicineName: medicine.name,
      batchNumber: medicine.batchNumber,
      action: "removed",
      quantityChange: -medicine.quantity,
      quantityBefore: medicine.quantity,
      quantityAfter: 0,
      notes: "Medicine record removed",
    });
    await tx
      .delete(medicinesTable)
      .where(eq(medicinesTable.id, medicine.id));
    return medicine.id;
  });
  if (!row) {
    res.status(404).json({ error: "Medicine not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/bills", async (req, res): Promise<void> => {
  const queryDates: Record<string, unknown> = { ...req.query };
  for (const key of ["startDate", "endDate"] as const) {
    const value = req.query[key];
    if (typeof value === "string") {
      queryDates[key] = new Date(`${value}T00:00:00Z`);
    }
  }
  const parsed = ListBillsQueryParams.safeParse(queryDates);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const conditions: SQL[] = [];
  if (parsed.data.search?.trim()) {
    const pattern = `%${parsed.data.search.trim()}%`;
    const condition = or(
      ilike(billsTable.invoiceNumber, pattern),
      ilike(billsTable.patientName, pattern),
      ilike(billsTable.patientContact, pattern),
    );
    if (condition) conditions.push(condition);
  }
  if (parsed.data.startDate) {
    conditions.push(gte(billsTable.invoiceDate, indiaMidnight(parsed.data.startDate)));
  }
  if (parsed.data.endDate) {
    conditions.push(
      lt(
        billsTable.invoiceDate,
        indiaMidnight(addCalendarDays(dateOnly(parsed.data.endDate)!, 1)),
      ),
    );
  }
  const rows = await db
    .select()
    .from(billsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(billsTable.invoiceDate));
  res.json(ListBillsResponse.parse(rows.map(billResponse)));
});

router.post("/bills", async (req, res): Promise<void> => {
  const parsed = CreateBillBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const input = parsed.data;
  const requestedQuantities = new Map<number, number>();
  for (const line of input.lines) {
    requestedQuantities.set(
      line.medicineId,
      (requestedQuantities.get(line.medicineId) ?? 0) + line.quantity,
    );
  }

  const detail = await db.transaction(async (tx) => {
    const inventory = new Map<number, typeof medicinesTable.$inferSelect>();
    for (const [medicineId, quantity] of requestedQuantities) {
      const [medicine] = await tx
        .select()
        .from(medicinesTable)
        .where(eq(medicinesTable.id, medicineId))
        .for("update")
        .limit(1);
      if (!medicine) {
        return { error: `Medicine ${medicineId} is no longer available`, status: 404 as const };
      }
      if (medicine.quantity < quantity) {
        return {
          error: `Insufficient stock for ${medicine.name}; ${medicine.quantity} available`,
          status: 409 as const,
        };
      }
      inventory.set(medicineId, medicine);
    }

    const lines = input.lines.map((line) => {
      const medicine = inventory.get(line.medicineId)!;
      return {
        medicineId: medicine.id,
        medicineName: medicine.name,
        batchNumber: medicine.batchNumber,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: roundMoney(line.quantity * line.unitPrice),
      };
    });
    const medicineSubtotal = roundMoney(
      lines.reduce((sum, line) => sum + line.lineTotal, 0),
    );
    const gross = roundMoney(
      medicineSubtotal + input.opdFee + input.ipdFee + input.labFee,
    );
    if (input.discount > gross) {
      return { error: "Discount cannot exceed the invoice amount", status: 400 as const };
    }

    const [createdBill] = await tx
      .insert(billsTable)
      .values({
        invoiceNumber: `PENDING-${randomBytes(12).toString("hex")}`,
        patientName: input.patientName,
        patientContact: input.patientContact,
        medicineSubtotal,
        opdFee: input.opdFee,
        ipdFee: input.ipdFee,
        labFee: input.labFee,
        discount: input.discount,
        total: roundMoney(gross - input.discount),
      })
      .returning();
    const invoiceNumber = `INV-${String(1000 + createdBill.id).padStart(5, "0")}`;
    const [bill] = await tx
      .update(billsTable)
      .set({ invoiceNumber })
      .where(eq(billsTable.id, createdBill.id))
      .returning();

    for (const [medicineId, quantity] of requestedQuantities) {
      const medicine = inventory.get(medicineId)!;
      await tx
        .update(medicinesTable)
        .set({ quantity: sql`${medicinesTable.quantity} - ${quantity}` })
        .where(eq(medicinesTable.id, medicineId));
      await tx.insert(inventoryLogsTable).values({
        medicineId,
        medicineName: medicine.name,
        batchNumber: medicine.batchNumber,
        action: "sale",
        quantityChange: -quantity,
        quantityBefore: medicine.quantity,
        quantityAfter: medicine.quantity - quantity,
        billId: bill.id,
        notes: `Invoice ${invoiceNumber}`,
      });
    }
    const savedLines = await tx
      .insert(billLinesTable)
      .values(lines.map((line) => ({ ...line, billId: bill.id })))
      .returning();
    return { bill, lines: savedLines };
  });

  if ("error" in detail && detail.status !== undefined) {
    res.status(detail.status).json({ error: detail.error });
    return;
  }
  res.status(201).json(
    CreateBillResponse.parse(billDetailResponse(detail.bill, detail.lines)),
  );
});

router.get("/bills/:id", async (req, res): Promise<void> => {
  const params = GetBillParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [bill] = await db
    .select()
    .from(billsTable)
    .where(eq(billsTable.id, params.data.id))
    .limit(1);
  if (!bill) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  const lines = await db
    .select()
    .from(billLinesTable)
    .where(eq(billLinesTable.billId, bill.id))
    .orderBy(billLinesTable.id);
  res.json(GetBillResponse.parse(billDetailResponse(bill, lines)));
});

export default router;
