import { Router, type IRouter, type Response } from "express";
import { and, desc, gte, lt } from "drizzle-orm";
import {
  ExportBillingCsvQueryParams,
  ExportSalaryCsvQueryParams,
} from "@workspace/api-zod";
import {
  billsTable,
  db,
  inventoryLogsTable,
  medicinesTable,
} from "@workspace/db";
import { calculateSalaryReports } from "./staff";

const router: IRouter = Router();

function dateOnly(value: string | Date): string {
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

function escapeCsv(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  const safe =
    typeof value === "number" || !/^[\s]*[=+\-@]/.test(raw)
      ? raw
      : `'${raw}`;
  return `"${safe.replaceAll('"', '""')}"`;
}

function sendCsv(
  res: Response,
  filename: string,
  rows: (string | number | null | undefined)[][],
): void {
  res
    .type("text/csv")
    .setHeader("Content-Disposition", `attachment; filename="${filename}"`)
    .send(rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n"));
}

router.get("/reports/billing.csv", async (req, res): Promise<void> => {
  const queryDates: Record<string, unknown> = { ...req.query };
  for (const key of ["startDate", "endDate"] as const) {
    const value = req.query[key];
    if (typeof value === "string") {
      queryDates[key] = new Date(`${value}T00:00:00Z`);
    }
  }
  const parsed = ExportBillingCsvQueryParams.safeParse(queryDates);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const conditions = [];
  if (parsed.data.startDate) {
    conditions.push(gte(billsTable.invoiceDate, indiaMidnight(parsed.data.startDate)));
  }
  if (parsed.data.endDate) {
    conditions.push(lt(billsTable.invoiceDate, indiaMidnight(nextDay(parsed.data.endDate))));
  }
  const invoices = await db
    .select()
    .from(billsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(billsTable.invoiceDate));
  const csvRows: (string | number)[][] = [
    ["Invoice", "Patient", "Contact", "Date", "Medicine subtotal", "OPD", "IPD", "Lab/tests", "Discount", "Total"],
    ...invoices.map((bill) => [
      bill.invoiceNumber,
      bill.patientName,
      bill.patientContact,
      bill.invoiceDate.toISOString(),
      bill.medicineSubtotal,
      bill.opdFee,
      bill.ipdFee,
      bill.labFee,
      bill.discount,
      bill.total,
    ]),
  ];
  sendCsv(res, "billing-summary.csv", csvRows);
});

router.get("/reports/inventory.csv", async (_req, res): Promise<void> => {
  const logs = await db
    .select()
    .from(inventoryLogsTable)
    .orderBy(desc(inventoryLogsTable.createdAt));
  const csvRows: (string | number | null)[][] = [
    ["Date and time", "Medicine", "Batch", "Action", "Quantity change", "Quantity before", "Quantity after", "Invoice ID", "Notes"],
    ...logs.map((log) => [
      log.createdAt.toISOString(),
      log.medicineName,
      log.batchNumber,
      log.action,
      log.quantityChange,
      log.quantityBefore,
      log.quantityAfter,
      log.billId,
      log.notes,
    ]),
  ];
  sendCsv(res, "inventory-movement-log.csv", csvRows);
});

router.get("/reports/salary.csv", async (req, res): Promise<void> => {
  const parsed = ExportSalaryCsvQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const salaries = await calculateSalaryReports(parsed.data.month);
  if (!salaries) {
    res.status(400).json({ error: "Month must be a valid YYYY-MM value" });
    return;
  }
  const csvRows: (string | number)[][] = [
    ["Month", "Staff member", "Designation", "Monthly salary", "Absent days", "Free absences", "Deduction", "Net salary"],
    ...salaries.map((salary) => [
      salary.month,
      salary.staffName,
      salary.designation,
      salary.monthlySalary,
      salary.absentDays,
      salary.freeAbsences,
      salary.deduction,
      salary.netSalary,
    ]),
  ];
  sendCsv(res, `salary-${parsed.data.month}.csv`, csvRows);
});

export default router;
