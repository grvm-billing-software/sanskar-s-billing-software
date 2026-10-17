import {
  date,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const medicinesTable = pgTable(
  "hospital_medicines",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    batchNumber: text("batch_number").notNull(),
    dispatchDate: date("dispatch_date", { mode: "string" }),
    receiveDate: date("receive_date", { mode: "string" }),
    expiryDate: date("expiry_date", { mode: "string" }).notNull(),
    quantity: integer("quantity").notNull().default(0),
    sellingCost: numeric("selling_cost", { precision: 12, scale: 2, mode: "number" }).notNull(),
    mrp: numeric("mrp", { precision: 12, scale: 2, mode: "number" }).notNull(),
    supplier: text("supplier").notNull().default(""),
    location: text("location").notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("hospital_medicines_name_idx").on(table.name)],
);

export const billsTable = pgTable(
  "hospital_bills",
  {
    id: serial("id").primaryKey(),
    invoiceNumber: text("invoice_number").notNull().unique(),
    patientName: text("patient_name").notNull(),
    patientContact: text("patient_contact").notNull().default(""),
    invoiceDate: timestamp("invoice_date", { withTimezone: true }).notNull().defaultNow(),
    medicineSubtotal: numeric("medicine_subtotal", { precision: 12, scale: 2, mode: "number" }).notNull(),
    opdFee: numeric("opd_fee", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
    ipdFee: numeric("ipd_fee", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
    labFee: numeric("lab_fee", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
    discount: numeric("discount", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
    total: numeric("total", { precision: 12, scale: 2, mode: "number" }).notNull(),
  },
  (table) => [index("hospital_bills_invoice_date_idx").on(table.invoiceDate)],
);

export const billLinesTable = pgTable(
  "hospital_bill_lines",
  {
    id: serial("id").primaryKey(),
    billId: integer("bill_id")
      .notNull()
      .references(() => billsTable.id, { onDelete: "cascade" }),
    medicineId: integer("medicine_id").notNull(),
    medicineName: text("medicine_name").notNull(),
    batchNumber: text("batch_number").notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2, mode: "number" }).notNull(),
    lineTotal: numeric("line_total", { precision: 12, scale: 2, mode: "number" }).notNull(),
  },
  (table) => [index("hospital_bill_lines_bill_idx").on(table.billId)],
);

export const inventoryLogsTable = pgTable(
  "hospital_inventory_logs",
  {
    id: serial("id").primaryKey(),
    medicineId: integer("medicine_id").notNull(),
    medicineName: text("medicine_name").notNull(),
    batchNumber: text("batch_number").notNull(),
    action: text("action").notNull(),
    quantityChange: integer("quantity_change").notNull(),
    quantityBefore: integer("quantity_before").notNull(),
    quantityAfter: integer("quantity_after").notNull(),
    billId: integer("bill_id"),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("hospital_inventory_logs_created_idx").on(table.createdAt),
    index("hospital_inventory_logs_medicine_idx").on(table.medicineId),
  ],
);

export const opdVisitsTable = pgTable(
  "hospital_opd_visits",
  {
    id: serial("id").primaryKey(),
    appointmentNumber: text("appointment_number").notNull().unique(),
    patientName: text("patient_name").notNull(),
    age: integer("age").notNull(),
    gender: text("gender").notNull(),
    contact: text("contact").notNull().default(""),
    doctor: text("doctor").notNull().default(""),
    fee: numeric("fee", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
    visitDate: timestamp("visit_date", { withTimezone: true }).notNull(),
  },
  (table) => [index("hospital_opd_visits_date_idx").on(table.visitDate)],
);

export const ipdAdmissionsTable = pgTable(
  "hospital_ipd_admissions",
  {
    id: serial("id").primaryKey(),
    patientName: text("patient_name").notNull(),
    patientContact: text("patient_contact").notNull().default(""),
    admissionAt: timestamp("admission_at", { withTimezone: true }).notNull(),
    dischargeAt: timestamp("discharge_at", { withTimezone: true }),
    room: text("room").notNull().default(""),
    doctor: text("doctor").notNull().default(""),
    reason: text("reason").notNull().default(""),
    status: text("status").notNull().default("admitted"),
  },
  (table) => [index("hospital_ipd_admissions_status_idx").on(table.status)],
);

export const referralsTable = pgTable(
  "hospital_referrals",
  {
    id: serial("id").primaryKey(),
    patientName: text("patient_name").notNull(),
    referringDoctor: text("referring_doctor").notNull().default(""),
    center: text("center").notNull().default(""),
    testName: text("test_name").notNull().default(""),
    referralDate: date("referral_date", { mode: "string" }).notNull(),
    status: text("status").notNull().default("pending"),
  },
  (table) => [index("hospital_referrals_date_idx").on(table.referralDate)],
);

export const staffTable = pgTable(
  "hospital_staff",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    designation: text("designation").notNull().default(""),
    phone: text("phone").notNull().default(""),
    joiningDate: date("joining_date", { mode: "string" }).notNull(),
    monthlySalary: numeric("monthly_salary", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("hospital_staff_name_idx").on(table.name)],
);

export const attendanceTable = pgTable(
  "hospital_attendance",
  {
    id: serial("id").primaryKey(),
    staffId: integer("staff_id").notNull(),
    staffName: text("staff_name").notNull(),
    date: date("attendance_date", { mode: "string" }).notNull(),
    status: text("status").notNull(),
  },
  (table) => [
    uniqueIndex("hospital_attendance_staff_date_idx").on(table.staffId, table.date),
    index("hospital_attendance_date_idx").on(table.date),
  ],
);

export const sessionsTable = pgTable(
  "hospital_sessions",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("hospital_sessions_expiry_idx").on(table.expiresAt)],
);
