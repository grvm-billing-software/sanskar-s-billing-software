import { useMemo, useState } from "react";
import type React from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { Route, Switch, Link, useLocation } from "wouter";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  BadgeIndianRupee,
  BedDouble,
  Boxes,
  CalendarDays,
  Check,
  ChevronDown,
  CircleAlert,
  ClipboardList,
  Clock3,
  FileBarChart2,
  FilePlus2,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Pill,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  Stethoscope,
  Trash2,
  Users,
  X,
  UserRound,
  HeartPulse,
} from "lucide-react";
import {
  getGetSessionQueryKey,
  getGetDashboardQueryKey,
  getListMedicinesQueryKey,
  getListBillsQueryKey,
  getListOpdVisitsQueryKey,
  getListIpdAdmissionsQueryKey,
  getListReferralsQueryKey,
  getListStaffQueryKey,
  getListAttendanceQueryKey,
  getGetSalaryReportsQueryKey,
  getGetBillQueryKey,
  useGetSession,
  useLogin,
  useLogout,
  useGetDashboard,
  useListMedicines,
  useCreateMedicine,
  useUpdateMedicine,
  useDeleteMedicine,
  useListBills,
  useCreateBill,
  useGetBill,
  useListOpdVisits,
  useCreateOpdVisit,
  useUpdateOpdVisit,
  useDeleteOpdVisit,
  useListIpdAdmissions,
  useCreateIpdAdmission,
  useUpdateIpdAdmission,
  useDeleteIpdAdmission,
  useListReferrals,
  useCreateReferral,
  useUpdateReferral,
  useDeleteReferral,
  useListStaff,
  useCreateStaff,
  useUpdateStaff,
  useDeleteStaff,
  useListAttendance,
  useSaveAttendance,
  useGetSalaryReports,
  useExportBillingCsv,
  useExportInventoryCsv,
  useExportSalaryCsv,
  getExportBillingCsvQueryKey,
  getExportInventoryCsvQueryKey,
  getExportSalaryCsvQueryKey,
} from "@workspace/api-client-react";
import type {
  Medicine,
  Bill,
  OpdVisit,
  IpdAdmission,
  Referral,
  StaffMember,
} from "@workspace/api-client-react";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import "./index.css";

const client = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 20_000 },
  },
});
const money = (value?: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
const dateText = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const monthNow = today.slice(0, 7);
type AttendanceStatus = "present" | "absent" | "half-day" | "paid-leave";
const attendanceStatuses: AttendanceStatus[] = [
  "present",
  "absent",
  "half-day",
  "paid-leave",
];

function Button({
  children,
  kind = "primary",
  className = "",
  ...props
}: {
  children: React.ReactNode;
  kind?: "primary" | "quiet" | "danger" | "line";
  className?: string;
  [key: string]: any;
}) {
  return (
    <button className={`btn btn-${kind} ${className}`} {...props}>
      {children}
    </button>
  );
}
function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function Modal({
  title,
  sub,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  sub?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="modal-shade"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className={`modal ${wide ? "modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
      >
        <header className="modal-head">
          <div>
            <h2>{title}</h2>
            {sub && <p>{sub}</p>}
          </div>
          <button className="icon-btn" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
function PageHead({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && <div className="page-action">{action}</div>}
    </div>
  );
}
function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="skeleton-stack">
      {Array.from({ length: rows }, (_, i) => (
        <div className="skeleton" key={i} />
      ))}
    </div>
  );
}
function Problem({ retry }: { retry: () => void }) {
  return (
    <div className="empty-state">
      <div className="empty-icon error-icon">
        <CircleAlert size={22} />
      </div>
      <b>Couldn’t load this view</b>
      <p>Check your connection and try again.</p>
      <Button kind="line" onClick={retry}>
        Try again
      </Button>
    </div>
  );
}
function Empty({
  title = "Nothing here yet",
  detail = "Records will appear here once they are added.",
  action,
}: {
  title?: string;
  detail?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <ClipboardList size={21} />
      </div>
      <b>{title}</b>
      <p>{detail}</p>
      {action}
    </div>
  );
}
function SearchBox({
  value,
  onChange,
  placeholder = "Search records",
}: {
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="searchbox">
      <Search size={16} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        data-testid="input-search"
      />
    </div>
  );
}
function Status({
  children,
  tone = "green",
}: {
  children: React.ReactNode;
  tone?: "green" | "amber" | "red" | "blue" | "gray";
}) {
  return (
    <span className={`status status-${tone}`}>
      <i />
      {children}
    </span>
  );
}
function Table({
  headers,
  children,
  min = 760,
}: {
  headers: string[];
  children: React.ReactNode;
  min?: number;
}) {
  return (
    <div className="table-wrap">
      <table style={{ minWidth: min }}>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
function FormActions({
  cancel,
  saving,
  label = "Save record",
}: {
  cancel: () => void;
  saving?: boolean;
  label?: string;
}) {
  return (
    <div className="form-actions">
      <Button kind="line" type="button" onClick={cancel}>
        Cancel
      </Button>
      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : label}
      </Button>
    </div>
  );
}
function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />;
}
function Select({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className="input" {...props}>
      {children}
    </select>
  );
}
function Textarea({
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="input textarea" {...props} />;
}

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/inventory", label: "Medicine inventory", icon: Pill },
  { href: "/billing", label: "Billing", icon: BadgeIndianRupee },
  { href: "/patients", label: "Patient services", icon: HeartPulse },
  { href: "/staff", label: "Staff & attendance", icon: Users },
  { href: "/reports", label: "Reports & exports", icon: FileBarChart2 },
];

function LoginScreen() {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const login = useLogin({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getGetSessionQueryKey(),
        });
        setLocation("/");
      },
      onError: () =>
        setLoginError("That password was not accepted. Please try again."),
    },
  });
  return (
    <main className="login-screen">
      <div className="login-left">
        <div className="brand brand-login">
          <span className="brand-mark">
            <Activity size={20} />
          </span>
          <span>
            GRVM HOSPITAL<span className="brand-light">Care</span>
          </span>
        </div>
        <div className="login-copy">
          <div className="eyebrow">HOSPITAL OPERATIONS</div>
          <h1>
            Good care begins
            <br />
            with a clear view.
          </h1>
          <p>
            One calm place to keep the moving parts of your hospital in sync.
          </p>
          <div className="login-assurance">
            <ShieldCheck size={17} />
            <span>Private staff access · Secure session</span>
          </div>
        </div>
        <div className="login-foot">
          GRVM MEDICAL HOSPITAL <span>•</span> STAFF PORTAL
        </div>
      </div>
      <div className="login-right">
        <div className="login-card">
          <div className="login-mobile-brand">
            <span className="brand-mark">
              <Activity size={18} />
            </span>{" "}
            GRVMCare
          </div>
          <div className="login-title-bar">SOFTWARE BY SANSKAR SIR</div>
          <div className="eyebrow">STAFF PORTAL</div>
          <h2>Welcome back</h2>
          <p className="muted">Sign in to continue to your operations desk.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setLoginError("");
              login.mutate({ data: { password } });
            }}
          >
            <Field label="Password">
              <div className="password-wrap">
                <Input
                  data-testid="input-password"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your staff password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="show-password"
                >
                  {show ? "Hide" : "Show"}
                </button>
              </div>
            </Field>
            {loginError && (
              <div className="inline-error" role="alert">
                <CircleAlert size={15} />
                {loginError}
              </div>
            )}
            <Button
              className="login-submit"
              type="submit"
              disabled={!password || login.isPending}
            >
              {login.isPending ? (
                "Signing in…"
              ) : (
                <>
                  Sign in <ArrowRight size={17} />
                </>
              )}
            </Button>
          </form>
          <div className="login-security">
            <ShieldCheck size={16} />
            <span>
              Your session is protected and only available to authorized staff.
            </span>
          </div>
        </div>
        <div className="login-copyright">
          Need access? Contact your hospital administrator.
        </div>
      </div>
    </main>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const [path] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const queryClient = useQueryClient();
  const logout = useLogout({
    mutation: {
      onSuccess: () =>
        queryClient.setQueryData(getGetSessionQueryKey(), {
          authenticated: false,
        }),
    },
  });
  const active = navItems.find((n) => n.href === path)?.label || "Operations";
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <Link href="/" className="brand">
          <span className="brand-mark">
            <Activity size={19} />
          </span>
          <span>
            GRVMHOSPITAL<span className="brand-light">Care</span>
          </span>
        </Link>
        <div className="side-caption">WORKSPACE</div>
        <nav>
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={`nav-item ${path === href ? "nav-active" : ""}`}
            >
              <Icon size={18} />
              <span>{label}</span>
              {path === href && <i />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="shift-card">
            <div className="shift-top">
              <span className="shift-dot" />
              <span>Operations active</span>
            </div>
            <p>Keep the day moving, one clear decision at a time.</p>
          </div>
          <div className="sidebar-user">
            <div className="avatar">MC</div>
            <div className="user-meta">
              <b>Hospital staff</b>
              <small>Operations team</small>
            </div>
            <button
              className="icon-btn logout-btn"
              aria-label="Logout"
              title="Logout"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      {menuOpen && (
        <button
          className="mobile-scrim"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <main className="main-area">
        <header className="topbar">
          <button
            className="menu-toggle icon-btn"
            aria-label="Open navigation"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="crumb">
            <b className="software-title">SOFTWARE BY SANSKAR SIR</b>
            <span className="crumb-sep">·</span>
            <b>{active}</b>
          </div>
          <div className="topbar-right">
            <span className="system-status">
              <i /> All systems operational
            </span>
            <span className="top-date">
              <CalendarDays size={15} />
              {new Date().toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </span>
            <div className="avatar avatar-small">MC</div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

function Dashboard() {
  const { data, isLoading, isError, refetch } = useGetDashboard({
    query: { queryKey: getGetDashboardQueryKey() },
  });
  if (isLoading)
    return (
      <div className="content page-enter">
        <Skeleton rows={7} />
      </div>
    );
  if (isError || !data)
    return (
      <div className="content page-enter">
        <Problem retry={() => refetch()} />
      </div>
    );
  const statItems = [
    {
      label: "Medicines in stock",
      value: data.medicineCount,
      icon: Pill,
      tint: "mint",
      note: `${data.lowStockCount} running low`,
      noteTone: data.lowStockCount ? "amber-text" : "",
    },
    {
      label: "Current admissions",
      value: data.admittedCount,
      icon: BedDouble,
      tint: "blue",
      note: "Across inpatient rooms",
    },
    {
      label: "OPD visits today",
      value: data.todayOpdCount,
      icon: Stethoscope,
      tint: "sand",
      note: "Outpatient services",
    },
    {
      label: "Billing this month",
      value: money(data.monthlyBilling),
      icon: BadgeIndianRupee,
      tint: "lilac",
      note: "Collected and invoiced",
    },
  ];
  return (
    <div className="content page-enter">
      <PageHead
        eyebrow="TUESDAY · OPERATIONS OVERVIEW"
        title="Good morning."
        description="Here’s the operational pulse across your hospital today."
        action={
          <span className="date-chip">
            <Clock3 size={15} /> Live overview
          </span>
        }
      />
      <section className="stats-grid">
        {statItems.map(({ label, value, icon: Icon, tint, note, noteTone }) => (
          <article className="stat-card" key={label}>
            <div className={`stat-icon ${tint}`}>
              <Icon size={19} />
            </div>
            <div className="stat-label">{label}</div>
            <div className="stat-value">{value}</div>
            <div className={`stat-note ${noteTone || ""}`}>{note}</div>
          </article>
        ))}
      </section>
      <section className="dashboard-grid">
        <article className="panel inventory-pulse">
          <header className="panel-heading">
            <div>
              <div className="eyebrow">ATTENTION REQUIRED</div>
              <h2>Inventory pulse</h2>
            </div>
            <Link href="/inventory" className="text-link">
              Open inventory <ArrowRight size={15} />
            </Link>
          </header>
          <div className="pulse-list">
            <div className="pulse-row">
              <div className="pulse-icon amber">
                <CircleAlert size={18} />
              </div>
              <div className="pulse-copy">
                <b>Low stock</b>
                <small>Items below reorder threshold</small>
              </div>
              <strong>
                {data.lowStockCount}
                <small> items</small>
              </strong>
            </div>
            <div className="pulse-row">
              <div className="pulse-icon blue">
                <CalendarDays size={18} />
              </div>
              <div className="pulse-copy">
                <b>Near expiry</b>
                <small>Medicine expiring soon</small>
              </div>
              <strong>
                {data.nearExpiryCount}
                <small> items</small>
              </strong>
            </div>
            <div className="pulse-row">
              <div className="pulse-icon red">
                <CircleAlert size={18} />
              </div>
              <div className="pulse-copy">
                <b>Expired stock</b>
                <small>Review and remove from shelves</small>
              </div>
              <strong>
                {data.expiredCount}
                <small> items</small>
              </strong>
            </div>
          </div>
          <div className="panel-footer-note">
            <ShieldCheck size={16} /> Stock levels update as bills are
            completed.
          </div>
        </article>
        <article className="panel quick-panel">
          <div className="eyebrow">QUICK ACCESS</div>
          <h2>What needs doing?</h2>
          <div className="quick-links">
            <Link href="/billing" className="quick-link">
              <span className="quick-icon tint-mint">
                <FilePlus2 size={18} />
              </span>
              <span>
                <b>Create an invoice</b>
                <small>Bill a patient or service</small>
              </span>
              <ArrowRight size={16} />
            </Link>
            <Link href="/patients" className="quick-link">
              <span className="quick-icon tint-blue">
                <UserRound size={18} />
              </span>
              <span>
                <b>Register a patient</b>
                <small>OPD, IPD or referral</small>
              </span>
              <ArrowRight size={16} />
            </Link>
            <Link href="/staff" className="quick-link">
              <span className="quick-icon tint-sand">
                <Users size={18} />
              </span>
              <span>
                <b>Mark attendance</b>
                <small>Keep today's register current</small>
              </span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </article>
      </section>
      <section className="panel recent-panel">
        <header className="panel-heading">
          <div>
            <div className="eyebrow">LATEST ACTIVITY</div>
            <h2>Recent invoices</h2>
          </div>
          <Link href="/billing" className="text-link">
            View all invoices <ArrowRight size={15} />
          </Link>
        </header>
        {data.recentBills?.length ? (
          <Table
            headers={["INVOICE", "PATIENT", "DATE", "TOTAL", ""]}
            min={640}
          >
            {data.recentBills.slice(0, 6).map((bill: Bill) => (
              <tr key={bill.id}>
                <td>
                  <span className="mono">{bill.invoiceNumber}</span>
                </td>
                <td>
                  <b>{bill.patientName}</b>
                  <small className="table-sub">
                    {bill.patientContact || "No contact provided"}
                  </small>
                </td>
                <td>{dateText(bill.invoiceDate)}</td>
                <td className="amount">{money(bill.total)}</td>
                <td>
                  <Link
                    className="row-link"
                    href={`/billing?invoice=${bill.id}`}
                    aria-label={`Open ${bill.invoiceNumber}`}
                  >
                    <ArrowRight size={16} />
                  </Link>
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty
            title="No invoices yet"
            detail="Completed patient bills will appear here."
            action={
              <Link href="/billing" className="text-link">
                Create first invoice <ArrowRight size={15} />
              </Link>
            }
          />
        )}
      </section>
    </div>
  );
}

const medicineEmpty = {
  name: "",
  batchNumber: "",
  dispatchDate: "",
  receiveDate: "",
  expiryDate: "",
  quantity: 0,
  sellingCost: 0,
  mrp: 0,
  supplier: "",
  location: "",
  notes: "",
};
function Inventory() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Medicine | null>(null);
  const [form, setForm] = useState<any>(medicineEmpty);
  const [notice, setNotice] = useState("");
  const params = useMemo(
    () => ({
      search: search || undefined,
      stock:
        filter === "low"
          ? ("low" as const)
          : filter === "available"
            ? ("available" as const)
            : ("all" as const),
      expiry:
        filter === "near"
          ? ("near" as const)
          : filter === "expired"
            ? ("expired" as const)
            : ("all" as const),
    }),
    [search, filter],
  );
  const q = useListMedicines(params, {
    query: { queryKey: getListMedicinesQueryKey(params) },
  });
  const create = useCreateMedicine();
  const update = useUpdateMedicine();
  const remove = useDeleteMedicine();
  const invalidate = () =>
    qc.invalidateQueries({ queryKey: getListMedicinesQueryKey() });
  const open = (item?: Medicine) => {
    setEditing(item || null);
    setForm(
      item
        ? {
            ...item,
            dispatchDate: item.dispatchDate || "",
            receiveDate: item.receiveDate || "",
          }
        : medicineEmpty,
    );
    setModal(true);
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...form,
      quantity: Number(form.quantity),
      sellingCost: Number(form.sellingCost),
      mrp: Number(form.mrp),
      dispatchDate: form.dispatchDate || null,
      receiveDate: form.receiveDate || null,
    };
    const done = () => {
      invalidate();
      setModal(false);
      setNotice(
        editing ? "Medicine record updated." : "Medicine added to inventory.",
      );
      window.setTimeout(() => setNotice(""), 2800);
    };
    if (editing) update.mutate({ id: editing.id, data }, { onSuccess: done });
    else create.mutate({ data }, { onSuccess: done });
  };
  const del = (item: Medicine) => {
    if (window.confirm(`Remove ${item.name} from inventory?`))
      remove.mutate({ id: item.id }, { onSuccess: () => invalidate() });
  };
  return (
    <div className="content page-enter">
      <PageHead
        eyebrow="PHARMACY · STOCK CONTROL"
        title="Medicine inventory"
        description="Keep a reliable view of every batch, location and expiry date."
        action={
          <Button onClick={() => open()}>
            <Plus size={17} /> Add medicine
          </Button>
        }
      />
      <div className="summary-strip">
        <div>
          <span className="summary-number">{q.data?.length ?? "—"}</span>
          <span>matching records</span>
        </div>
        <div className="summary-separator" />
        <span className="summary-hint">
          <ShieldCheck size={15} /> Batch-level tracking
        </span>
      </div>
      <section className="panel data-panel">
        <div className="toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search medicine, batch or supplier"
          />
          <div className="toolbar-select">
            <Select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filter inventory"
            >
              <option value="all">All stock</option>
              <option value="low">Low stock</option>
              <option value="available">Available stock</option>
              <option value="near">Near expiry</option>
              <option value="expired">Expired</option>
            </Select>
            <ChevronDown size={15} />
          </div>
        </div>
        {q.isLoading ? (
          <Skeleton />
        ) : q.isError ? (
          <Problem retry={() => q.refetch()} />
        ) : q.data?.length ? (
          <Table
            headers={[
              "MEDICINE / BATCH",
              "STOCK",
              "COST / MRP",
              "EXPIRY",
              "SUPPLIER",
              "LOCATION",
              "",
            ]}
            min={950}
          >
            {q.data.map((m: Medicine) => {
              const exp = m.expiryDate < today;
              const expiryLimit = new Date(`${today}T00:00:00Z`);
              expiryLimit.setUTCDate(expiryLimit.getUTCDate() + 60);
              const near =
                !exp && m.expiryDate <= expiryLimit.toISOString().slice(0, 10);
              const low = m.quantity < 10;
              return (
                <tr key={m.id}>
                  <td>
                    <b>{m.name}</b>
                    <small className="table-sub mono">
                      Batch {m.batchNumber}
                    </small>
                  </td>
                  <td>
                    <span className="quantity">{m.quantity}</span>{" "}
                    <span className="unit">units</span>
                    <small className="table-sub">
                      <Status tone={low ? "amber" : "green"}>
                        {low ? "Low" : "In stock"}
                      </Status>
                    </small>
                  </td>
                  <td>
                    {money(m.sellingCost)}
                    <small className="table-sub">MRP {money(m.mrp)}</small>
                  </td>
                  <td>
                    <Status tone={exp ? "red" : near ? "amber" : "gray"}>
                      {exp ? "Expired" : near ? "Soon" : dateText(m.expiryDate)}
                    </Status>
                  </td>
                  <td>{m.supplier || "—"}</td>
                  <td>{m.location || "—"}</td>
                  <td>
                    <div className="row-actions">
                      <button className="small-action" onClick={() => open(m)}>
                        Edit
                      </button>
                      <button
                        className="small-action danger-action"
                        aria-label={`Delete ${m.name}`}
                        onClick={() => del(m)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </Table>
        ) : (
          <Empty
            title="No medicine records"
            detail={
              search
                ? "Try another medicine name, batch or supplier."
                : "Add your first medicine batch to start tracking stock."
            }
            action={
              !search && (
                <Button onClick={() => open()}>
                  <Plus size={16} /> Add medicine
                </Button>
              )
            }
          />
        )}
        {notice && (
          <div className="toast-inline">
            <Check size={16} />
            {notice}
          </div>
        )}
      </section>
      {modal && (
        <Modal
          title={editing ? "Update medicine" : "Add medicine"}
          sub="Record a single medicine batch and its stock details."
          onClose={() => setModal(false)}
          wide
        >
          <form className="form-grid" onSubmit={submit}>
            <Field label="Medicine name">
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Batch number">
              <Input
                required
                value={form.batchNumber}
                onChange={(e) =>
                  setForm({ ...form, batchNumber: e.target.value })
                }
              />
            </Field>
            <Field label="Quantity in stock">
              <Input
                required
                min="0"
                type="number"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </Field>
            <Field label="Expiry date">
              <Input
                required
                type="date"
                value={form.expiryDate}
                onChange={(e) =>
                  setForm({ ...form, expiryDate: e.target.value })
                }
              />
            </Field>
            <Field label="Selling cost">
              <Input
                min="0"
                step="0.01"
                type="number"
                value={form.sellingCost}
                onChange={(e) =>
                  setForm({ ...form, sellingCost: e.target.value })
                }
              />
            </Field>
            <Field label="MRP">
              <Input
                min="0"
                step="0.01"
                type="number"
                value={form.mrp}
                onChange={(e) => setForm({ ...form, mrp: e.target.value })}
              />
            </Field>
            <Field label="Supplier">
              <Input
                value={form.supplier}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })}
              />
            </Field>
            <Field label="Storage location">
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </Field>
            <Field label="Received date">
              <Input
                type="date"
                value={form.receiveDate}
                onChange={(e) =>
                  setForm({ ...form, receiveDate: e.target.value })
                }
              />
            </Field>
            <Field label="Dispatch date">
              <Input
                type="date"
                value={form.dispatchDate}
                onChange={(e) =>
                  setForm({ ...form, dispatchDate: e.target.value })
                }
              />
            </Field>
            <div className="span-two">
              <Field label="Notes">
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </Field>
            </div>
            <div className="span-two">
              <FormActions
                cancel={() => setModal(false)}
                saving={create.isPending || update.isPending}
                label={editing ? "Save changes" : "Add to inventory"}
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function InvoiceView({ id, onBack }: { id: number; onBack: () => void }) {
  const q = useGetBill(id, {
    query: { queryKey: getGetBillQueryKey(id), enabled: !!id },
  });
  if (q.isLoading)
    return (
      <div className="content">
        <Skeleton rows={5} />
      </div>
    );
  if (q.isError || !q.data)
    return (
      <div className="content">
        <Problem retry={() => q.refetch()} />
      </div>
    );
  return (
    <div className="content page-enter invoice-page">
      <div className="invoice-toolbar">
        <button className="text-link" onClick={onBack}>
          ← Back to billing
        </button>
        <Button kind="line" onClick={() => window.print()}>
          <Printer size={16} /> Print invoice
        </Button>
      </div>
      <article className="invoice-paper">
        <div className="invoice-brand">
          <div className="brand">
            <span className="brand-mark">
              <Activity size={18} />
            </span>
            <span>
              GRVM MEDICAL CENTER<span className="brand-light">Care</span>
            </span>
          </div>
          <div className="invoice-caption">PATIENT INVOICE</div>
        </div>
        <div className="invoice-title">
          <div>
            <h1>Invoice</h1>
            <p>Thank you for choosing Meridian Care.</p>
          </div>
          <div className="invoice-number">
            <small>INVOICE NUMBER</small>
            <b className="mono">{q.data.invoiceNumber}</b>
            <small>{dateText(q.data.invoiceDate)}</small>
          </div>
        </div>
        <div className="invoice-to">
          <small>BILLED TO</small>
          <b>{q.data.patientName}</b>
          <span>{q.data.patientContact || "Contact not provided"}</span>
        </div>
        <Table
          headers={["DESCRIPTION", "BATCH", "QTY", "UNIT PRICE", "AMOUNT"]}
          min={600}
        >
          {q.data.lines?.map((line: any) => (
            <tr key={line.id}>
              <td>{line.medicineName}</td>
              <td className="mono">{line.batchNumber}</td>
              <td>{line.quantity}</td>
              <td>{money(line.unitPrice)}</td>
              <td className="amount">{money(line.lineTotal)}</td>
            </tr>
          ))}
        </Table>
        <div className="invoice-totals">
          <div>
            <span>Medicine subtotal</span>
            <b>{money(q.data.medicineSubtotal)}</b>
          </div>
          <div>
            <span>OPD fee</span>
            <b>{money(q.data.opdFee)}</b>
          </div>
          <div>
            <span>IPD fee</span>
            <b>{money(q.data.ipdFee)}</b>
          </div>
          <div>
            <span>Lab fee</span>
            <b>{money(q.data.labFee)}</b>
          </div>
          <div>
            <span>Discount</span>
            <b>− {money(q.data.discount)}</b>
          </div>
          <div className="invoice-total">
            <span>Total due</span>
            <b>{money(q.data.total)}</b>
          </div>
        </div>
        <div className="invoice-thanks">
          <ShieldCheck size={17} /> This invoice is an official record of
          services rendered.
        </div>
      </article>
    </div>
  );
}
function Billing() {
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [invoiceId, setInvoiceId] = useState<number | null>(
    Number(new URLSearchParams(window.location.search).get("invoice")) || null,
  );
  const [creating, setCreating] = useState(false);
  const [patient, setPatient] = useState({
    patientName: "",
    patientContact: "",
  });
  const [fees, setFees] = useState({
    opdFee: "0",
    ipdFee: "0",
    labFee: "0",
    discount: "0",
  });
  const [lines, setLines] = useState<
    { medicineId: number; quantity: number; unitPrice: number }[]
  >([]);
  const bq = useListBills(
    { search: search || undefined },
    {
      query: {
        queryKey: getListBillsQueryKey({ search: search || undefined }),
      },
    },
  );
  const mq = useListMedicines(
    { stock: "available" },
    { query: { queryKey: getListMedicinesQueryKey({ stock: "available" }) } },
  );
  const create = useCreateBill();
  const subtotal = lines.reduce((n, l) => n + l.quantity * l.unitPrice, 0);
  const total =
    subtotal +
    Number(fees.opdFee || 0) +
    Number(fees.ipdFee || 0) +
    Number(fees.labFee || 0) -
    Number(fees.discount || 0);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(
      {
        data: {
          ...patient,
          lines,
          ...Object.fromEntries(
            Object.entries(fees).map(([k, v]) => [k, Number(v)]),
          ),
        } as any,
      },
      {
        onSuccess: (bill) => {
          qc.invalidateQueries({ queryKey: getListBillsQueryKey() });
          qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          qc.invalidateQueries({ queryKey: getListMedicinesQueryKey() });
          setCreating(false);
          setInvoiceId(bill.id);
        },
      },
    );
  };
  if (invoiceId)
    return (
      <InvoiceView
        id={invoiceId}
        onBack={() => {
          setInvoiceId(null);
          setLocation("/billing");
        }}
      />
    );
  return (
    <div className="content page-enter">
      <PageHead
        eyebrow="REVENUE · PATIENT SERVICES"
        title="Billing"
        description="Create clear invoices and keep patient charges in one place."
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus size={17} /> New invoice
          </Button>
        }
      />
      <div className="summary-strip">
        <div>
          <span className="summary-number">{bq.data?.length ?? "—"}</span>
          <span>invoices on record</span>
        </div>
        <div className="summary-separator" />
        <span className="summary-hint">
          <FileText size={15} /> Printable itemized invoices
        </span>
      </div>
      <section className="panel data-panel">
        <div className="toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search invoice or patient"
          />
          <span className="toolbar-caption">Invoice history</span>
        </div>
        {bq.isLoading ? (
          <Skeleton />
        ) : bq.isError ? (
          <Problem retry={() => bq.refetch()} />
        ) : bq.data?.length ? (
          <Table
            headers={[
              "INVOICE",
              "PATIENT",
              "CONTACT",
              "DATE",
              "MEDICINES",
              "TOTAL",
              "",
            ]}
            min={850}
          >
            {bq.data.map((bill: Bill) => (
              <tr key={bill.id}>
                <td className="mono">{bill.invoiceNumber}</td>
                <td>
                  <b>{bill.patientName}</b>
                </td>
                <td>{bill.patientContact || "—"}</td>
                <td>{dateText(bill.invoiceDate)}</td>
                <td>{money(bill.medicineSubtotal)}</td>
                <td className="amount">{money(bill.total)}</td>
                <td>
                  <button
                    className="row-link"
                    aria-label={`Print ${bill.invoiceNumber}`}
                    onClick={() => setInvoiceId(bill.id)}
                  >
                    <Printer size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty
            title="No invoices found"
            detail={
              search
                ? "Try a different patient name or invoice number."
                : "New invoices will be listed here."
            }
            action={
              !search && (
                <Button onClick={() => setCreating(true)}>
                  <Plus size={16} /> Create invoice
                </Button>
              )
            }
          />
        )}
      </section>
      {creating && (
        <Modal
          title="Create patient invoice"
          sub="Add services and medicines to prepare an itemized invoice."
          onClose={() => setCreating(false)}
          wide
        >
          <form onSubmit={submit}>
            <div className="form-grid">
              <Field label="Patient name">
                <Input
                  required
                  value={patient.patientName}
                  onChange={(e) =>
                    setPatient({ ...patient, patientName: e.target.value })
                  }
                />
              </Field>
              <Field label="Contact number">
                <Input
                  value={patient.patientContact}
                  onChange={(e) =>
                    setPatient({ ...patient, patientContact: e.target.value })
                  }
                />
              </Field>
            </div>
            <div className="modal-section-head">
              <div>
                <b>Medicine items</b>
                <small>
                  Choose available stock; quantities reduce inventory after
                  billing.
                </small>
              </div>
              <Button
                kind="line"
                type="button"
                onClick={() =>
                  setLines([
                    ...lines,
                    { medicineId: 0, quantity: 1, unitPrice: 0 },
                  ])
                }
              >
                <Plus size={15} /> Add item
              </Button>
            </div>
            {lines.map((line, i) => (
              <div className="bill-line" key={i}>
                <Select
                  required
                  value={line.medicineId || ""}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    const med = mq.data?.find((m: Medicine) => m.id === id);
                    setLines(
                      lines.map((x, j) =>
                        j === i
                          ? {
                              ...x,
                              medicineId: id,
                              unitPrice: med?.sellingCost || 0,
                            }
                          : x,
                      ),
                    );
                  }}
                >
                  <option value="">Select medicine</option>
                  {mq.data?.map((m: Medicine) => (
                    <option key={m.id} value={m.id}>
                      {m.name} · {m.batchNumber} · {m.quantity} available
                    </option>
                  ))}
                </Select>
                <Input
                  aria-label="Quantity"
                  min="1"
                  type="number"
                  value={line.quantity}
                  onChange={(e) =>
                    setLines(
                      lines.map((x, j) =>
                        j === i
                          ? { ...x, quantity: Number(e.target.value) }
                          : x,
                      ),
                    )
                  }
                />
                <Input
                  aria-label="Unit price"
                  min="0"
                  type="number"
                  step=".01"
                  value={line.unitPrice}
                  onChange={(e) =>
                    setLines(
                      lines.map((x, j) =>
                        j === i
                          ? { ...x, unitPrice: Number(e.target.value) }
                          : x,
                      ),
                    )
                  }
                />
                <b>{money(line.quantity * line.unitPrice)}</b>
                <button
                  className="small-action danger-action"
                  type="button"
                  aria-label="Remove item"
                  onClick={() => setLines(lines.filter((_, j) => j !== i))}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            {!lines.length && (
              <div className="line-empty">
                At least one medicine item is required to create an invoice.
              </div>
            )}
            <div className="form-grid fee-grid">
              {(["opdFee", "ipdFee", "labFee", "discount"] as const).map(
                (f) => (
                  <Field
                    key={f}
                    label={
                      f === "opdFee"
                        ? "OPD fee"
                        : f === "ipdFee"
                          ? "IPD fee"
                          : f === "labFee"
                            ? "Lab fee"
                            : "Discount"
                    }
                  >
                    <Input
                      min="0"
                      step=".01"
                      type="number"
                      value={fees[f]}
                      onChange={(e) =>
                        setFees({ ...fees, [f]: e.target.value })
                      }
                    />
                  </Field>
                ),
              )}
            </div>
            <div className="bill-total-row">
              <span>Invoice total</span>
              <b>{money(total)}</b>
            </div>
            <div className="form-actions">
              <Button
                kind="line"
                type="button"
                onClick={() => setCreating(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={create.isPending || !lines.length}
              >
                {create.isPending ? "Creating…" : "Create invoice"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Patients() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"OPD" | "IPD" | "Referrals">("OPD");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const opd = useListOpdVisits(
    { search: search || undefined },
    {
      query: {
        queryKey: getListOpdVisitsQueryKey({ search: search || undefined }),
      },
    },
  );
  const ipd = useListIpdAdmissions(
    { search: search || undefined, status: "all" },
    {
      query: {
        queryKey: getListIpdAdmissionsQueryKey({
          search: search || undefined,
          status: "all",
        }),
      },
    },
  );
  const ref = useListReferrals(
    { search: search || undefined, status: "all" },
    {
      query: {
        queryKey: getListReferralsQueryKey({
          search: search || undefined,
          status: "all",
        }),
      },
    },
  );
  const createOpd = useCreateOpdVisit();
  const updateOpd = useUpdateOpdVisit();
  const deleteOpd = useDeleteOpdVisit();
  const createIpd = useCreateIpdAdmission();
  const updateIpd = useUpdateIpdAdmission();
  const deleteIpd = useDeleteIpdAdmission();
  const createRef = useCreateReferral();
  const updateRef = useUpdateReferral();
  const deleteRef = useDeleteReferral();
  const inv = () => {
    qc.invalidateQueries({ queryKey: getListOpdVisitsQueryKey() });
    qc.invalidateQueries({ queryKey: getListIpdAdmissionsQueryKey() });
    qc.invalidateQueries({ queryKey: getListReferralsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
  };
  const open = (item?: any) => {
    setEditing(item || null);
    setForm(
      item
        ? {
            ...item,
            admissionAt: item.admissionAt
              ? new Date(item.admissionAt).toISOString().slice(0, 16)
              : "",
          }
        : tab === "OPD"
          ? {
              patientName: "",
              age: "",
              gender: "",
              contact: "",
              doctor: "",
              fee: 0,
              visitDate: today,
            }
          : tab === "IPD"
            ? {
                patientName: "",
                patientContact: "",
                admissionAt: new Date().toISOString().slice(0, 16),
                room: "",
                doctor: "",
                reason: "",
              }
            : {
                patientName: "",
                referringDoctor: "",
                center: "",
                testName: "",
                referralDate: today,
                status: "pending",
              },
    );
    setModal(true);
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const done = () => {
      inv();
      setModal(false);
    };
    if (tab === "OPD") {
      const data = { ...form, age: Number(form.age), fee: Number(form.fee) };
      if (editing)
        updateOpd.mutate({ id: editing.id, data }, { onSuccess: done });
      else createOpd.mutate({ data }, { onSuccess: done });
    } else if (tab === "IPD") {
      const data = {
        ...form,
        admissionAt: new Date(form.admissionAt).toISOString(),
      };
      if (editing)
        updateIpd.mutate({ id: editing.id, data }, { onSuccess: done });
      else createIpd.mutate({ data }, { onSuccess: done });
    } else if (editing)
      updateRef.mutate({ id: editing.id, data: form }, { onSuccess: done });
    else createRef.mutate({ data: form }, { onSuccess: done });
  };
  const remove = (kind: string, item: any) => {
    if (!window.confirm(`Delete this ${kind} record?`)) return;
    const onSuccess = inv;
    if (kind === "OPD") deleteOpd.mutate({ id: item.id }, { onSuccess });
    if (kind === "IPD") deleteIpd.mutate({ id: item.id }, { onSuccess });
    if (kind === "referral") deleteRef.mutate({ id: item.id }, { onSuccess });
  };
  const switchStatus = (kind: string, item: any) => {
    if (kind === "IPD")
      updateIpd.mutate(
        {
          id: item.id,
          data: {
            status: item.status === "admitted" ? "discharged" : "admitted",
            dischargeAt:
              item.status === "admitted" ? new Date().toISOString() : null,
          },
        },
        { onSuccess: inv },
      );
    else
      updateRef.mutate(
        {
          id: item.id,
          data: { status: item.status === "pending" ? "received" : "pending" },
        },
        { onSuccess: inv },
      );
  };
  const data = tab === "OPD" ? opd : tab === "IPD" ? ipd : ref;
  return (
    <div className="content page-enter">
      <PageHead
        eyebrow="CARE DELIVERY · PATIENT SERVICES"
        title="Patients"
        description="A clear, shared register for outpatient, inpatient and referred care."
        action={
          <Button onClick={open}>
            <Plus size={17} />{" "}
            {tab === "OPD"
              ? "Register OPD visit"
              : tab === "IPD"
                ? "New admission"
                : "Add referral"}
          </Button>
        }
      />
      <div className="tabs" role="tablist">
        {(["OPD", "IPD", "Referrals"] as const).map((x) => (
          <button
            key={x}
            className={`tab ${tab === x ? "tab-active" : ""}`}
            onClick={() => {
              setTab(x);
              setSearch("");
            }}
          >
            {x}
            <span>
              {x === "OPD"
                ? (opd.data?.length ?? "")
                : x === "IPD"
                  ? (ipd.data?.length ?? "")
                  : (ref.data?.length ?? "")}
            </span>
          </button>
        ))}
      </div>
      <section className="panel data-panel">
        <div className="toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder={`Search ${tab.toLowerCase()} records`}
          />
          <span className="toolbar-caption">
            {tab === "OPD"
              ? "Outpatient visits"
              : tab === "IPD"
                ? "Admissions & discharges"
                : "External test referrals"}
          </span>
        </div>
        {data.isLoading ? (
          <Skeleton />
        ) : data.isError ? (
          <Problem retry={() => data.refetch()} />
        ) : !data.data?.length ? (
          <Empty
            title={`No ${tab} records`}
            detail="New patient records will appear here."
            action={
              <Button onClick={open}>
                <Plus size={16} />{" "}
                {tab === "OPD"
                  ? "Register visit"
                  : tab === "IPD"
                    ? "New admission"
                    : "Add referral"}
              </Button>
            }
          />
        ) : tab === "OPD" ? (
          <Table
            headers={[
              "APPOINTMENT",
              "PATIENT",
              "AGE / GENDER",
              "CONTACT",
              "DOCTOR",
              "VISIT DATE",
              "FEE",
              "",
            ]}
            min={950}
          >
            {(opd.data as OpdVisit[]).map((v) => (
              <tr key={v.id}>
                <td className="mono">{v.appointmentNumber}</td>
                <td>
                  <b>{v.patientName}</b>
                </td>
                <td>
                  {v.age} / {v.gender}
                </td>
                <td>{v.contact || "—"}</td>
                <td>{v.doctor || "—"}</td>
                <td>{dateText(v.visitDate)}</td>
                <td className="amount">{money(v.fee)}</td>
                <td>
                  <div className="row-actions">
                    <button className="small-action" onClick={() => open(v)}>
                      Edit
                    </button>
                    <button
                      className="small-action danger-action"
                      onClick={() => remove("OPD", v)}
                      aria-label="Delete visit"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        ) : tab === "IPD" ? (
          <Table
            headers={[
              "PATIENT",
              "CONTACT",
              "ROOM",
              "DOCTOR",
              "ADMITTED",
              "REASON",
              "STATUS",
              "",
            ]}
            min={1050}
          >
            {(ipd.data as IpdAdmission[]).map((v) => (
              <tr key={v.id}>
                <td>
                  <b>{v.patientName}</b>
                </td>
                <td>{v.patientContact || "—"}</td>
                <td>{v.room || "—"}</td>
                <td>{v.doctor || "—"}</td>
                <td>{dateText(v.admissionAt)}</td>
                <td className="truncate-cell">{v.reason || "—"}</td>
                <td>
                  <Status tone={v.status === "admitted" ? "blue" : "gray"}>
                    {v.status}
                  </Status>
                </td>
                <td>
                  <div className="row-actions">
                    <button className="small-action" onClick={() => open(v)}>
                      Edit
                    </button>
                    <button
                      className="small-action"
                      onClick={() => switchStatus("IPD", v)}
                    >
                      {v.status === "admitted" ? "Discharge" : "Re-admit"}
                    </button>
                    <button
                      className="small-action danger-action"
                      onClick={() => remove("IPD", v)}
                      aria-label="Delete admission"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <Table
            headers={[
              "PATIENT",
              "REFERRING DOCTOR",
              "CENTER",
              "TEST",
              "DATE",
              "STATUS",
              "",
            ]}
            min={900}
          >
            {(ref.data as Referral[]).map((v) => (
              <tr key={v.id}>
                <td>
                  <b>{v.patientName}</b>
                </td>
                <td>{v.referringDoctor || "—"}</td>
                <td>{v.center || "—"}</td>
                <td>{v.testName || "—"}</td>
                <td>{dateText(v.referralDate)}</td>
                <td>
                  <Status tone={v.status === "pending" ? "amber" : "green"}>
                    {v.status}
                  </Status>
                </td>
                <td>
                  <div className="row-actions">
                    <button className="small-action" onClick={() => open(v)}>
                      Edit
                    </button>
                    <button
                      className="small-action"
                      onClick={() => switchStatus("referral", v)}
                    >
                      {v.status === "pending" ? "Mark received" : "Reopen"}
                    </button>
                    <button
                      className="small-action danger-action"
                      onClick={() => remove("referral", v)}
                      aria-label="Delete referral"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </section>
      {modal && (
        <Modal
          title={
            editing
              ? "Edit patient record"
              : tab === "OPD"
                ? "Register outpatient visit"
                : tab === "IPD"
                  ? "Record admission"
                  : "Create external referral"
          }
          sub="Enter patient details for the hospital register."
          onClose={() => setModal(false)}
        >
          <form className="form-grid" onSubmit={submit}>
            {tab === "OPD" ? (
              <>
                <Field label="Patient name">
                  <Input
                    required
                    value={form.patientName}
                    onChange={(e) =>
                      setForm({ ...form, patientName: e.target.value })
                    }
                  />
                </Field>
                <Field label="Contact number">
                  <Input
                    value={form.contact}
                    onChange={(e) =>
                      setForm({ ...form, contact: e.target.value })
                    }
                  />
                </Field>
                <Field label="Age">
                  <Input
                    type="number"
                    min="0"
                    required
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: e.target.value })}
                  />
                </Field>
                <Field label="Gender">
                  <Select
                    value={form.gender}
                    onChange={(e) =>
                      setForm({ ...form, gender: e.target.value })
                    }
                  >
                    <option value="">Select</option>
                    <option>Female</option>
                    <option>Male</option>
                    <option>Other</option>
                  </Select>
                </Field>
                <Field label="Doctor">
                  <Input
                    value={form.doctor}
                    onChange={(e) =>
                      setForm({ ...form, doctor: e.target.value })
                    }
                  />
                </Field>
                <Field label="Visit date">
                  <Input
                    type="date"
                    required
                    value={form.visitDate}
                    onChange={(e) =>
                      setForm({ ...form, visitDate: e.target.value })
                    }
                  />
                </Field>
                <Field label="Fee">
                  <Input
                    type="number"
                    min="0"
                    value={form.fee}
                    onChange={(e) => setForm({ ...form, fee: e.target.value })}
                  />
                </Field>
              </>
            ) : tab === "IPD" ? (
              <>
                <Field label="Patient name">
                  <Input
                    required
                    value={form.patientName}
                    onChange={(e) =>
                      setForm({ ...form, patientName: e.target.value })
                    }
                  />
                </Field>
                <Field label="Contact number">
                  <Input
                    value={form.patientContact}
                    onChange={(e) =>
                      setForm({ ...form, patientContact: e.target.value })
                    }
                  />
                </Field>
                <Field label="Room / bed">
                  <Input
                    value={form.room}
                    onChange={(e) => setForm({ ...form, room: e.target.value })}
                  />
                </Field>
                <Field label="Attending doctor">
                  <Input
                    value={form.doctor}
                    onChange={(e) =>
                      setForm({ ...form, doctor: e.target.value })
                    }
                  />
                </Field>
                <div className="span-two">
                  <Field label="Admission date and time">
                    <Input
                      type="datetime-local"
                      value={form.admissionAt}
                      onChange={(e) =>
                        setForm({ ...form, admissionAt: e.target.value })
                      }
                    />
                  </Field>
                </div>
                <div className="span-two">
                  <Field label="Reason for admission">
                    <Textarea
                      value={form.reason}
                      onChange={(e) =>
                        setForm({ ...form, reason: e.target.value })
                      }
                    />
                  </Field>
                </div>
              </>
            ) : (
              <>
                <Field label="Patient name">
                  <Input
                    required
                    value={form.patientName}
                    onChange={(e) =>
                      setForm({ ...form, patientName: e.target.value })
                    }
                  />
                </Field>
                <Field label="Referring doctor">
                  <Input
                    value={form.referringDoctor}
                    onChange={(e) =>
                      setForm({ ...form, referringDoctor: e.target.value })
                    }
                  />
                </Field>
                <Field label="External center">
                  <Input
                    value={form.center}
                    onChange={(e) =>
                      setForm({ ...form, center: e.target.value })
                    }
                  />
                </Field>
                <Field label="Test / service">
                  <Input
                    value={form.testName}
                    onChange={(e) =>
                      setForm({ ...form, testName: e.target.value })
                    }
                  />
                </Field>
                <Field label="Referral date">
                  <Input
                    type="date"
                    value={form.referralDate}
                    onChange={(e) =>
                      setForm({ ...form, referralDate: e.target.value })
                    }
                  />
                </Field>
              </>
            )}
            <div className="span-two">
              <FormActions
                cancel={() => setModal(false)}
                saving={
                  createOpd.isPending ||
                  updateOpd.isPending ||
                  createIpd.isPending ||
                  updateIpd.isPending ||
                  createRef.isPending ||
                  updateRef.isPending
                }
                label={editing ? "Save changes" : "Save patient record"}
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Staff() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"Directory" | "Attendance" | "Salary">(
    "Directory",
  );
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState(monthNow);
  const [attendanceDate, setAttendanceDate] = useState(today);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [form, setForm] = useState<any>({});
  const staff = useListStaff(
    { search: search || undefined },
    {
      query: {
        queryKey: getListStaffQueryKey({ search: search || undefined }),
      },
    },
  );
  const attendance = useListAttendance(
    { month },
    { query: { queryKey: getListAttendanceQueryKey({ month }) } },
  );
  const salary = useGetSalaryReports(
    { month },
    { query: { queryKey: getGetSalaryReportsQueryKey({ month }) } },
  );
  const create = useCreateStaff();
  const update = useUpdateStaff();
  const del = useDeleteStaff();
  const saveAttendance = useSaveAttendance();
  const inv = () => {
    qc.invalidateQueries({ queryKey: getListStaffQueryKey() });
    qc.invalidateQueries({ queryKey: getListAttendanceQueryKey({ month }) });
    qc.invalidateQueries({ queryKey: getGetSalaryReportsQueryKey({ month }) });
  };
  const open = (person?: StaffMember) => {
    setEditing(person || null);
    setForm(
      person
        ? { ...person }
        : {
            name: "",
            designation: "",
            phone: "",
            joiningDate: today,
            monthlySalary: "",
          },
    );
    setModal(true);
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...form, monthlySalary: Number(form.monthlySalary) };
    const done = () => {
      inv();
      setModal(false);
    };
    if (editing) update.mutate({ id: editing.id, data }, { onSuccess: done });
    else create.mutate({ data }, { onSuccess: done });
  };
  const remove = (p: StaffMember) => {
    if (window.confirm(`Remove ${p.name} from the staff directory?`))
      del.mutate({ id: p.id }, { onSuccess: inv });
  };
  const mark = (staffId: number, status: AttendanceStatus) =>
    saveAttendance.mutate(
      { data: { staffId, date: attendanceDate, status } },
      { onSuccess: inv },
    );
  const statusFor = (id: number) =>
    attendance.data?.find(
      (a: any) => a.staffId === id && a.date === attendanceDate,
    )?.status || "";
  const attendanceLastDay = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5, 7)),
    0,
  ).getDate();
  const attendanceMax = `${month}-${String(attendanceLastDay).padStart(2, "0")}`;
  const staffTab = tab === "Directory";
  const q = staffTab ? staff : tab === "Attendance" ? attendance : salary;
  return (
    <div className="content page-enter">
      <PageHead
        eyebrow="PEOPLE · TEAM OPERATIONS"
        title="Staff & attendance"
        description="Maintain the staff directory, daily attendance and monthly salary view."
        action={
          staffTab ? (
            <Button onClick={() => open()}>
              <Plus size={17} /> Add staff member
            </Button>
          ) : undefined
        }
      />
      <div className="tabs">
        {(["Directory", "Attendance", "Salary"] as const).map((x) => (
          <button
            key={x}
            className={`tab ${tab === x ? "tab-active" : ""}`}
            onClick={() => setTab(x)}
          >
            {x}
            {x === "Directory" && <span>{staff.data?.length ?? ""}</span>}
          </button>
        ))}
        <div className="tabs-spacer" />
        {tab !== "Directory" && (
          <label className="month-picker">
            <CalendarDays size={15} />
            <input
              type="month"
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                setAttendanceDate(`${e.target.value}-01`);
              }}
            />
          </label>
        )}
      </div>
      <section className="panel data-panel">
        {tab === "Directory" && (
          <div className="toolbar">
            <SearchBox
              value={search}
              onChange={setSearch}
              placeholder="Search staff member or role"
            />
            <span className="toolbar-caption">Staff directory</span>
          </div>
        )}
        {q.isLoading ? (
          <Skeleton />
        ) : q.isError ? (
          <Problem retry={() => q.refetch()} />
        ) : tab === "Directory" ? (
          staff.data?.length ? (
            <Table
              headers={[
                "STAFF MEMBER",
                "DESIGNATION",
                "PHONE",
                "JOINED",
                "MONTHLY SALARY",
                "",
              ]}
              min={850}
            >
              {(staff.data as StaffMember[]).map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="person-cell">
                      <div className="person-avatar">
                        {p.name
                          .split(" ")
                          .map((s) => s[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </div>
                      <b>{p.name}</b>
                    </div>
                  </td>
                  <td>{p.designation || "—"}</td>
                  <td>{p.phone || "—"}</td>
                  <td>{dateText(p.joiningDate)}</td>
                  <td className="amount">{money(p.monthlySalary)}</td>
                  <td>
                    <div className="row-actions">
                      <button className="small-action" onClick={() => open(p)}>
                        Edit
                      </button>
                      <button
                        className="small-action danger-action"
                        onClick={() => remove(p)}
                        aria-label={`Remove ${p.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <Empty
              title="No staff records"
              detail="Add your hospital team to start tracking attendance and payroll."
              action={
                <Button onClick={() => open()}>
                  <Plus size={16} /> Add staff member
                </Button>
              }
            />
          )
        ) : tab === "Attendance" ? (
          staff.data?.length ? (
            <>
              <div className="attendance-note">
                <Clock3 size={16} />
                <label className="attendance-date">
                  Record attendance for
                  <Input
                    data-testid="input-attendance-date"
                    type="date"
                    min={`${month}-01`}
                    max={attendanceMax}
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                  />
                </label>
                <span>
                  Choose any day in the selected month; changes save as you mark
                  each person.
                </span>
              </div>
              <Table
                headers={[
                  "STAFF MEMBER",
                  "ROLE",
                  "SELECTED DAY’S ATTENDANCE",
                  "",
                ]}
                min={760}
              >
                {(staff.data as StaffMember[]).map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="person-cell">
                        <div className="person-avatar">
                          {p.name
                            .split(" ")
                            .map((s) => s[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>
                        <b>{p.name}</b>
                      </div>
                    </td>
                    <td>{p.designation || "—"}</td>
                    <td>
                      <div className="attendance-options">
                        {attendanceStatuses.map((s) => (
                          <button
                            key={s}
                            className={`attendance-choice ${statusFor(p.id) === s ? "selected" : ""}`}
                            onClick={() => mark(p.id, s)}
                            disabled={saveAttendance.isPending}
                          >
                            {s === "paid-leave"
                              ? "Leave"
                              : s === "half-day"
                                ? "Half day"
                                : s[0].toUpperCase() + s.slice(1)}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td>
                      {statusFor(p.id) ? (
                        <Status
                          tone={statusFor(p.id) === "absent" ? "red" : "green"}
                        >
                          {statusFor(p.id)}
                        </Status>
                      ) : (
                        <span className="muted">Not marked</span>
                      )}
                    </td>
                  </tr>
                ))}
              </Table>
            </>
          ) : (
            <Empty
              title="Staff directory is empty"
              detail="Add team members before recording attendance."
              action={
                <Button
                  onClick={() => {
                    setTab("Directory");
                    open();
                  }}
                >
                  <Plus size={16} /> Add staff member
                </Button>
              }
            />
          )
        ) : salary.data?.length ? (
          <>
            <div className="salary-summary">
              <div>
                <span>Payroll month</span>
                <b>
                  {new Date(`${month}-01`).toLocaleDateString("en-IN", {
                    month: "long",
                    year: "numeric",
                  })}
                </b>
              </div>
              <div>
                <span>Net payroll</span>
                <b>
                  {money(
                    salary.data.reduce(
                      (n: number, x: any) => n + x.netSalary,
                      0,
                    ),
                  )}
                </b>
              </div>
              <div>
                <span>Team members</span>
                <b>{salary.data.length}</b>
              </div>
            </div>
            <Table
              headers={[
                "STAFF MEMBER",
                "DESIGNATION",
                "BASE SALARY",
                "ABSENCES",
                "DEDUCTION",
                "NET SALARY",
              ]}
              min={850}
            >
              {salary.data.map((p: any) => (
                <tr key={p.staffId}>
                  <td>
                    <b>{p.staffName}</b>
                  </td>
                  <td>{p.designation || "—"}</td>
                  <td>{money(p.monthlySalary)}</td>
                  <td>
                    {p.absentDays}{" "}
                    <small className="table-sub">{p.freeAbsences} free</small>
                  </td>
                  <td>{money(p.deduction)}</td>
                  <td className="amount">{money(p.netSalary)}</td>
                </tr>
              ))}
            </Table>
          </>
        ) : (
          <Empty
            title="No salary report for this month"
            detail="Salary summaries will appear once staff and attendance records are available."
          />
        )}
      </section>
      {modal && (
        <Modal
          title={editing ? "Edit staff member" : "Add staff member"}
          sub="Keep contact, role and pay details current."
          onClose={() => setModal(false)}
        >
          <form className="form-grid" onSubmit={submit}>
            <div className="span-two">
              <Field label="Full name">
                <Input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Designation">
              <Input
                value={form.designation}
                onChange={(e) =>
                  setForm({ ...form, designation: e.target.value })
                }
              />
            </Field>
            <Field label="Phone">
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label="Joining date">
              <Input
                type="date"
                value={form.joiningDate}
                onChange={(e) =>
                  setForm({ ...form, joiningDate: e.target.value })
                }
              />
            </Field>
            <Field label="Monthly salary">
              <Input
                type="number"
                min="0"
                step=".01"
                value={form.monthlySalary}
                onChange={(e) =>
                  setForm({ ...form, monthlySalary: e.target.value })
                }
              />
            </Field>
            <div className="span-two">
              <FormActions
                cancel={() => setModal(false)}
                saving={create.isPending || update.isPending}
                label={editing ? "Save changes" : "Add staff member"}
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Reports() {
  const [month, setMonth] = useState(monthNow);
  const [period, setPeriod] = useState({
    startDate: `${monthNow}-01`,
    endDate: today,
  });
  const billing = useExportBillingCsv(
    {
      startDate: period.startDate || undefined,
      endDate: period.endDate || undefined,
    },
    {
      query: {
        queryKey: getExportBillingCsvQueryKey({
          startDate: period.startDate || undefined,
          endDate: period.endDate || undefined,
        }),
        enabled: false,
      },
    },
  );
  const inventory = useExportInventoryCsv({
    query: { queryKey: getExportInventoryCsvQueryKey(), enabled: false },
  });
  const salary = useExportSalaryCsv(
    { month },
    {
      query: {
        queryKey: getExportSalaryCsvQueryKey({ month }),
        enabled: false,
      },
    },
  );
  const [feedback, setFeedback] = useState("");
  const download = (content: string, name: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    setFeedback(`${name} downloaded`);
    window.setTimeout(() => setFeedback(""), 3500);
  };
  return (
    <div className="content page-enter">
      <PageHead
        eyebrow="RECORDS · EXPORTS"
        title="Reports & exports"
        description="Take clean operational data into your monthly review or finance workflow."
      />
      <div className="report-intro">
        <div className="report-symbol">
          <FileBarChart2 size={23} />
        </div>
        <div>
          <b>Reports, ready when you are.</b>
          <p>Each export reflects the records currently held in GRVM CARE.</p>
        </div>
        <div className="report-format">
          CSV <span>·</span> Spreadsheet ready
        </div>
      </div>
      <div className="report-grid">
        <article className="report-card">
          <div className="report-card-top">
            <div className="report-icon green-report">
              <BadgeIndianRupee size={19} />
            </div>
            <Status tone="blue">FINANCE</Status>
          </div>
          <h2>Billing report</h2>
          <p>
            Invoice totals, patient contacts, and services billed over a
            selected period.
          </p>
          <div className="report-filter">
            <Field label="From">
              <Input
                type="date"
                value={period.startDate}
                onChange={(e) =>
                  setPeriod({ ...period, startDate: e.target.value })
                }
              />
            </Field>
            <Field label="To">
              <Input
                type="date"
                value={period.endDate}
                onChange={(e) =>
                  setPeriod({ ...period, endDate: e.target.value })
                }
              />
            </Field>
          </div>
          <Button
            className="export-button"
            disabled={billing.isFetching}
            onClick={async () => {
              const r = await billing.refetch();
              if (r.data)
                download(
                  r.data as string,
                  `billing-${period.startDate}-to-${period.endDate}.csv`,
                );
            }}
          >
            <ArrowDownToLine size={16} />
            {billing.isFetching ? "Preparing report…" : "Export billing CSV"}
          </Button>
        </article>
        <article className="report-card">
          <div className="report-card-top">
            <div className="report-icon amber-report">
              <Boxes size={19} />
            </div>
            <Status tone="amber">PHARMACY</Status>
          </div>
          <h2>Inventory movement log</h2>
          <p>
            Stock received, manual adjustments, billed quantities and removed
            batches.
          </p>
          <div className="report-filter single-filter">
            <div className="export-detail">
              <span>Coverage</span>
              <b>Recorded stock movements</b>
            </div>
            <div className="export-detail">
              <span>Format</span>
              <b>Comma-separated values</b>
            </div>
          </div>
          <Button
            className="export-button"
            disabled={inventory.isFetching}
            onClick={async () => {
              const r = await inventory.refetch();
              if (r.data)
                download(r.data as string, `inventory-log-${today}.csv`);
            }}
          >
            <ArrowDownToLine size={16} />
            {inventory.isFetching
              ? "Preparing report…"
              : "Export inventory log CSV"}
          </Button>
        </article>
        <article className="report-card">
          <div className="report-card-top">
            <div className="report-icon blue-report">
              <Users size={19} />
            </div>
            <Status tone="blue">PEOPLE</Status>
          </div>
          <h2>Salary report</h2>
          <p>Monthly salaries with attendance, free absences and deductions.</p>
          <div className="report-filter single-filter">
            <Field label="Payroll month">
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </Field>
            <div className="export-detail">
              <span>Includes</span>
              <b>Salary & attendance summary</b>
            </div>
          </div>
          <Button
            className="export-button"
            disabled={salary.isFetching}
            onClick={async () => {
              const r = await salary.refetch();
              if (r.data) download(r.data as string, `salary-${month}.csv`);
            }}
          >
            <ArrowDownToLine size={16} />
            {salary.isFetching ? "Preparing report…" : "Export salary CSV"}
          </Button>
        </article>
      </div>
      {(feedback || billing.isError || inventory.isError || salary.isError) && (
        <div className={feedback ? "toast-inline" : "inline-error"}>
          {feedback ? <Check size={16} /> : <CircleAlert size={16} />}{" "}
          {feedback || "The report could not be prepared. Please try again."}
        </div>
      )}
      <div className="reports-footnote">
        <ShieldCheck size={16} />
        <span>
          Exports are generated from your authenticated session and stay on this
          device.
        </span>
      </div>
    </div>
  );
}

function Gate() {
  const session = useGetSession({
    query: { queryKey: getGetSessionQueryKey(), retry: false },
  });
  const [path] = useLocation();
  if (session.isLoading)
    return (
      <div className="auth-loading">
        <div className="brand">
          <span className="brand-mark">
            <Activity size={19} />
          </span>
          <span>
            GRVM HOSPITAL<span className="brand-light">Care</span>
          </span>
        </div>
        <div className="loading-line" />
      </div>
    );
  if (session.isError || !session.data?.authenticated) return <LoginScreen />;
  return (
    <AppShell>
      <ErrorBoundary resetKey={path}>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/inventory" component={Inventory} />
          <Route path="/billing" component={Billing} />
          <Route path="/patients" component={Patients} />
          <Route path="/staff" component={Staff} />
          <Route path="/reports" component={Reports} />
          <Route component={NotFound} />
        </Switch>
      </ErrorBoundary>
    </AppShell>
  );
}
function App() {
  return (
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <Gate />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
export default App;
