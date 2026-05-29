import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, getErrorMessage } from "../api";

const DEMO_PASSWORD = "test1234";

const DEMO_ACCOUNTS = [
  { label: "Admin Demo",    email: "admin@school.test",      password: DEMO_PASSWORD, role: "Full access"       },
  { label: "Class Teacher", email: "teacher@school.test",    password: DEMO_PASSWORD, role: "Assigned class"    },
  { label: "Accountant",    email: "accountant@school.test", password: DEMO_PASSWORD, role: "Finance"           },
  { label: "Cashier Demo",  email: "cashier@school.test",    password: DEMO_PASSWORD, role: "Payment terminal"  },
  { label: "Student Demo",  email: "student@school.test",    password: DEMO_PASSWORD, role: "Student portal"    },
];

/* Three headline value propositions shown below the hero */
const pillars = [
  {
    icon: "result",
    bg: "#eef4ff",
    color: "#155eef",
    title: "Academic at the core",
    text: "Student enrollment, class sections, marks entry, weighted result cards with class positions, timetables with conflict detection, and PDF reports — built in.",
  },
  {
    icon: "payment",
    bg: "#ecfdf5",
    color: "#047857",
    title: "Finance, fully handled",
    text: "Fee structures per class, bulk payment generation, per-student due tracking, monthly salary ledger with increment history, and school expense logging.",
  },
  {
    icon: "roles",
    bg: "#f5f3ff",
    color: "#7c3aed",
    title: "Every role, perfectly scoped",
    text: "8 dedicated portals — admin, teacher, accountant, accounts, cashier, staff, student, and audit. Each user sees only what their role needs — nothing more.",
  },
];

const featureGroups = [
  { icon: "student",   title: "Student Management",          text: "Enrol students with class, section, roll number, guardian, and contact. Full payment history, marks summary, attendance records, and status on one profile page." },
  { icon: "sections",  title: "Class Sections",              text: "Unlimited sections per class, each with its own assigned teacher. Scoped per academic year and used as the filter basis for marks, results, and routines." },
  { icon: "classroom", title: "Classrooms",                  text: "Track every room: number, floor, bench count, and capacity. Live student count with multi-shift teacher assignments — Morning, Day, Evening, or any custom shift." },
  { icon: "payment",   title: "Fees & Payments",             text: "Fee structures per class: admission, session, monthly, and exam. Bulk-generate for a whole class, track per-student dues, and print payment receipts." },
  { icon: "roles",     title: "Cashier / Receptionist",      text: "Dedicated payment-station UI for front-desk staff. Search students by name or roll, auto-fill class fees, collect payment, and print a unique REC-YYYYMM receipt instantly." },
  { icon: "teacher",   title: "Class Teacher Portal",        text: "Teachers access only their assigned class — students, marks entry, routines, and result cards are fully scoped. No cross-section data visible." },
  { icon: "staff",     title: "Employee Management",         text: "Staff profiles with role, salary type, joining date, and status. People overview shows teacher count, monthly salary bill, and role breakdown cards." },
  { icon: "salary",    title: "Salaries & Increments",       text: "Record monthly salary payments and bulk-generate for all employees in one click. Pay a single employee's full dues with one click including an optional bonus." },
  { icon: "result",    title: "Marks & Result Cards",        text: "Enter marks by subject and exam type. Weighted scores, class positions, and PDF-ready result cards with filter by class, teacher, student, and exam." },
  { icon: "biometric", title: "Attendance",                  text: "Daily employee attendance: present, late, absent, leave, half-day. Manual, bulk, biometric scan (WebAuthn / ZKTeco), and monthly grid view." },
  { icon: "expense",   title: "Expenses",                    text: "Log school costs with title, category, amount, paid-to, and payment method. Nine categories, monthly + category filter, and totals breakdown." },
  { icon: "workflow",  title: "Leave & Absence Management",  text: "Teachers and staff submit leave applications with date range, substitute teacher assignments per class period, and reason. Admins approve or reject with a review note." },
  { icon: "routine",   title: "Class Routines",              text: "Timetable entries per class: day, subject, teacher, room, start and end time. Overlap detection prevents double-booking the same teacher or room. 792 entries seeded." },
  { icon: "settings",  title: "School Settings",             text: "Configure school name, logos, academic year, exam title, pass mark, principal name, admission notice, support email, and result remarks." },
  { icon: "database",  title: "Database Configuration",      text: "Each school connects their own MongoDB URI from Settings. Test, save, and the server reconnects live with accounts auto-seeded into any fresh database." },
];

const rolesList = [
  { role: "Admin",      code: "admin",      text: "Full access to all modules — students, fees, salaries, employees, leave requests, database config, and user account management." },
  { role: "Accountant", code: "accountant", text: "Fees, payments, expenses, and salaries — full read and write access to all finance modules." },
  { role: "Accounts",   code: "accounts",   text: "Finance read-only — view all fee, payment, salary, and report records without making changes." },
  { role: "Teacher",    code: "teacher",    text: "Marks entry, routines, and attendance scoped to the assigned class and section. Can submit leave applications with substitute assignments." },
  { role: "Staff",      code: "staff",      text: "Attendance view, own employee profile, and can submit leave applications." },
  { role: "Student",    code: "student",    text: "Own profile, full payment history, marks by subject, and printable result cards." },
  { role: "Audit",      code: "audit",      text: "Read-only access to all records across every module — students, fees, salaries, marks, attendance, and expenses." },
  { role: "Cashier",    code: "cashier",    text: "Simplified payment-station portal — collect guardian payments, print receipts, view class fees and student results. No access to salary, expenses, or settings." },
];

const workflowSteps = [
  "Create classes, sections, and fee rules",
  "Add employees and assign class teachers",
  "Enrol students with guardian details",
  "Cashier collects fees and prints receipts at front desk",
  "Teachers enter marks and submit leave applications",
  "Admins approve leaves, process salaries, and track expenses",
  "Print result cards, salary slips, and monthly reports",
];

const metrics = [
  { value: "8",    label: "Role portals" },
  { value: "15+",  label: "Feature modules" },
  { value: "100%", label: "Offline ready" },
];

function Icon({ name }) {
  const props = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" };
  const paths = {
    student:   <><path d="M4 8.5 12 4l8 4.5-8 4.5-8-4.5Z" /><path d="M6.5 11v4.2c0 1.7 2.5 3.1 5.5 3.1s5.5-1.4 5.5-3.1V11" /></>,
    teacher:   <><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /><path d="M4 21c.8-4.2 3.5-6.5 8-6.5s7.2 2.3 8 6.5" /><path d="M18 4h3v6" /></>,
    payment:   <><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z" /><path d="M3 9h18" /><path d="M7 15h4" /></>,
    result:    <><path d="M5 3h14v18H5V3Z" /><path d="M8 7h8" /><path d="M8 11h8" /><path d="M8 15h4" /><path d="M16 15l1.2 1.2L20 13.5" /></>,
    staff:     <><path d="M9 6V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1" /><path d="M4 8h16v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8Z" /><path d="M4 12h16" /></>,
    biometric: <><path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04.054-.09A13.916 13.916 0 0 0 8 11a4 4 0 1 1 8 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0 0 15.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 0 0 8 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" /></>,
    menu:      <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>,
    close:     <><path d="m6 6 12 12" /><path d="M18 6 6 18" /></>,
    workflow:  <><path d="M5 6h5" /><path d="M14 6h5" /><path d="M5 12h14" /><path d="M5 18h5" /><path d="M14 18h5" /><path d="M10 6a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z" /><path d="M10 18a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z" /></>,
    login:     <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>,
    contact:   <><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Z" /><path d="M8 9h8" /><path d="M8 13h5" /><path d="M8 17h3" /></>,
    sections:  <><path d="M12 3 2 8.5l10 5.5 10-5.5L12 3Z" /><path d="M2 14.5l10 5.5 10-5.5" /><path d="M2 11.5l10 5.5 10-5.5" /></>,
    classroom: <><path d="M3 21V9l9-6 9 6v12H3Z" /><path d="M9 21v-6h6v6" /><path d="M9 9h1" /><path d="M14 9h1" /></>,
    salary:    <><path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>,
    expense:   <><path d="M4 3h16v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5V3Z" /><path d="M8 9h8" /><path d="M8 13h5" /></>,
    routine:   <><path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z" /><path d="M3 10h18" /><path d="M8 2v3" /><path d="M16 2v3" /><path d="M7 14h2" /><path d="M15 14h2" /><path d="M7 18h2" /><path d="M15 18h2" /></>,
    settings:  <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></>,
    database:  <><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" /><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" /></>,
    roles:     <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  };
  return <svg className="home-icon" {...props}>{paths[name] || paths.student}</svg>;
}

const NAV_HR = <hr style={{ margin: "2px 0", border: "none", borderTop: "1px solid rgba(0,0,0,0.07)" }} />;

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSlowStart, setIsSlowStart] = useState(false);
  const [isHomeMenuOpen, setIsHomeMenuOpen] = useState(false);
  const slowTimerRef = useRef(null);

  useEffect(() => {
    api.get("/api/health").catch(() => {});
  }, []);

  const loginWithCredentials = async (credentials) => {
    setError("");
    setIsSubmitting(true);
    setIsSlowStart(false);
    setForm(credentials);
    slowTimerRef.current = setTimeout(() => setIsSlowStart(true), 4500);
    try {
      const { data } = await api.post("/api/auth/login", credentials);
      onLogin({ token: data.token, user: data.user });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      clearTimeout(slowTimerRef.current);
      setIsSubmitting(false);
      setIsSlowStart(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await loginWithCredentials(form);
  };

  const closeHomeMenu = () => setIsHomeMenuOpen(false);

  useEffect(() => {
    if (!isHomeMenuOpen) return undefined;
    const handleEscape = (event) => { if (event.key === "Escape") closeHomeMenu(); };
    document.body.classList.add("home-menu-lock");
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.body.classList.remove("home-menu-lock");
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isHomeMenuOpen]);

  return (
    <main className={isHomeMenuOpen ? "landing-page pro-home home-menu-open min-h-screen bg-slate-50 text-slate-950" : "landing-page pro-home min-h-screen bg-slate-50 text-slate-950"}>

      {/* ── Header ────────────────────────────────────────────── */}
      <header className="pro-home-header border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-xl">
        <a className="pro-brand" href="#home" aria-label="School Manager home">
          <span className="brand-logo-mark shadow-lg shadow-blue-600/20"><img alt="" src="/app-logo.png" /></span>
          <div>
            <strong>School Manager</strong>
            <small>Smart academic ERP</small>
          </div>
        </a>
        <button className="home-menu-button" type="button" aria-label="Open menu" aria-expanded={isHomeMenuOpen} onClick={() => setIsHomeMenuOpen((v) => !v)}>
          <Icon name="menu" />
        </button>
        <button className={isHomeMenuOpen ? "home-menu-backdrop show" : "home-menu-backdrop"} type="button" aria-label="Close menu" onClick={closeHomeMenu} />
        <nav className={isHomeMenuOpen ? "pro-nav text-sm open" : "pro-nav text-sm"} aria-label="Homepage navigation">
          <div className="home-nav-head">
            <span className="home-nav-mark"><img alt="" src="/app-logo.png" /></span>
            <div><strong>School Manager</strong><small>Smart academic ERP</small></div>
            <button className="home-nav-close" type="button" aria-label="Close menu" onClick={closeHomeMenu}><Icon name="close" /></button>
          </div>
          <a className="home-nav-link" href="#features"  onClick={closeHomeMenu}><Icon name="student"  /><span>Features</span></a>
          {NAV_HR}
          <a className="home-nav-link" href="#roles"     onClick={closeHomeMenu}><Icon name="roles"    /><span>Roles</span></a>
          {NAV_HR}
          <a className="home-nav-link" href="#workflow"  onClick={closeHomeMenu}><Icon name="workflow" /><span>Workflow</span></a>
          {NAV_HR}
          <a className="home-nav-link" href="#login"     onClick={closeHomeMenu}><Icon name="login"    /><span>Login</span></a>
          {NAV_HR}
          <a className="home-nav-link" href="#contact"   onClick={closeHomeMenu}><Icon name="contact"  /><span>Contact</span></a>
          {NAV_HR}
          <a className="pro-nav-demo-link home-nav-link" href="#login" onClick={closeHomeMenu}><Icon name="login" /><span>Sign In</span></a>
          <div className="home-nav-profile">
            <img alt="Md. Al Amin Hossain" decoding="async" src="/owner-alamin-small.jpg" />
            <span>
              <strong>Md. Al Amin Hossain</strong>
              <a href="https://alaminjava.github.io/" target="_blank" rel="noreferrer" style={{ fontSize: "12px", color: "#2563eb" }}>alaminjava.github.io</a>
            </span>
          </div>
        </nav>
        <a className="pro-header-action shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5" href="#login" onClick={closeHomeMenu}>Sign In</a>
      </header>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="pro-hero login-first-hero overflow-hidden" id="home">
        <div className="pro-hero-copy">
          <p className="pro-eyebrow">v1.5.0 &nbsp;·&nbsp; Production Ready</p>
          <h1>Run Your School From <em className="hero-highlight">One Dashboard</em></h1>
          <p>Every workflow your campus needs — students, fees, marks, staff, attendance, leave management, and expenses. Eight role-specific portals keep each user focused. Deploy to the cloud or run offline on Windows.</p>
          <div className="pro-hero-actions flex flex-wrap gap-3">
            <a className="pro-primary-link transition hover:-translate-y-0.5" href="#login">Try the Demo</a>
            <a className="pro-secondary-link border-white/25 bg-white/95 transition hover:-translate-y-0.5" href="#features">See All Features</a>
          </div>
          <div className="pro-metrics">
            {metrics.map((item) => (
              <span className="border border-white/20 bg-white/10 shadow-xl backdrop-blur-xl" key={item.label}>
                <b>{item.value}</b><small>{item.label}</small>
              </span>
            ))}
          </div>
        </div>

        <form className="pro-login-card hero-login-card rounded-3xl border border-white/80 bg-white/95 shadow-2xl backdrop-blur-xl" id="login" onSubmit={handleSubmit}>
          <span className="login-card-mark">Secure Login</span>
          <h2>Access your dashboard</h2>
          <p>Use a demo account or enter your credentials.</p>
          {error && <p className="alert error">{error}</p>}
          {isSubmitting && isSlowStart && (
            <p className="alert info" style={{ textAlign: "center", fontSize: "0.82rem" }}>
              Server is starting up, please wait...
            </p>
          )}
          <div className="auth-grid">
            <label className="auth-field text-sm font-bold text-slate-700">
              Email
              <input autoComplete="email" placeholder="admin@school.test" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </label>
            <label className="auth-field text-sm font-bold text-slate-700">
              Password
              <input autoComplete="current-password" minLength={6} placeholder="test1234" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </label>
            <button className="btn primary wide" disabled={isSubmitting}>
              {isSlowStart ? "Starting server…" : isSubmitting ? "Logging in…" : "Login"}
            </button>
          </div>
          <div className="demo-account-list pro-demo-list">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                className="demo-row-button border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                disabled={isSubmitting}
                key={account.email}
                onClick={() => loginWithCredentials({ email: account.email, password: account.password })}
                type="button"
              >
                <span><strong>{account.label}</strong><small>{account.role}</small></span>
              </button>
            ))}
          </div>
          <p className="auth-switch">Need a student account? <Link to="/register">Register</Link></p>
        </form>
      </section>

      {/* ── Three pillars ─────────────────────────────────────── */}
      <section className="pro-section pillars-section" id="pillars">
        <div className="pro-section-head section-head-center">
          <p>Why School Manager</p>
          <h2>Everything connected.<br />Every role covered.</h2>
          <span>One platform for your entire campus — from the finance desk to the classroom to the student portal.</span>
        </div>
        <div className="pillars-grid">
          {pillars.map((p) => (
            <div key={p.title} className="pillar-card">
              <span className="pillar-icon" style={{ background: p.bg, color: p.color }}>
                <Icon name={p.icon} />
              </span>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature modules ───────────────────────────────────── */}
      <section className="pro-section feature-overview" id="features">
        <div className="pro-section-head section-head-center">
          <p>Built-in Modules</p>
          <h2>All the tools. None of the complexity.</h2>
          <span>15 modules covering every academic, finance, HR, and operations workflow — no plugins, no extra subscriptions, no third-party integrations.</span>
        </div>
        <div className="pro-feature-grid">
          {featureGroups.map((feature) => (
            <article className="transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_24px_70px_rgba(15,23,42,0.10)]" key={feature.title}>
              <span className="home-icon-wrap"><Icon name={feature.icon} /></span>
              <strong>{feature.title}</strong>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Roles & Permissions ───────────────────────────────── */}
      <section className="pro-section bg-white" id="roles">
        <div className="pro-section-head section-head-center">
          <p>Access Control</p>
          <h2>One platform. Eight dedicated portals.</h2>
          <span>Each role has its own precisely scoped view — everyone sees exactly what they need, nothing more.</span>
        </div>
        <div className="roles-table">
          {rolesList.map((item) => (
            <div key={item.code} className="roles-table-row">
              <span className={`role-pill role-pill--${item.code}`}>{item.code}</span>
              <strong>{item.role}</strong>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────── */}
      <section className="pro-section workflow-demo-section compact-workflow" id="workflow">
        <div className="workflow-panel border border-slate-200/70 shadow-xl">
          <div className="pro-section-head compact">
            <p>Setup Guide</p>
            <h2>Up and running in five steps</h2>
          </div>
          <div className="workflow-list">
            {workflowSteps.map((step, i) => (
              <span key={step}><b>{i + 1}</b>{step}</span>
            ))}
          </div>
        </div>
        <div className="workflow-panel role-summary-panel border border-slate-200/70 shadow-xl">
          <div className="pro-section-head compact">
            <p>Deployment</p>
            <h2>Cloud or desktop — your call</h2>
          </div>
          <p>Deploy to <strong>Render.com</strong> in minutes with the included <code style={{ fontSize: "12px", background: "rgba(15,23,42,0.06)", padding: "1px 6px", borderRadius: "5px" }}>render.yaml</code>. Or build a one-click <strong>Windows installer</strong> (Electron + embedded MongoDB) — no server, no internet required. Switch databases live from Settings without ever restarting.</p>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="pro-home-footer footer-with-owner bg-slate-950" id="contact">
        <div>
          <strong>School Manager</strong>
          <span>Professional school management — v1.5.0 · React 18 · Node.js · MongoDB · Electron.</span>
        </div>
        <div className="footer-owner">
          <img alt="Md. Al Amin Hossain" decoding="async" loading="lazy" src="/owner-alamin-small.jpg" />
          <span>
            <strong>Md. Al Amin Hossain</strong>
            <a href="https://alaminjava.github.io/" target="_blank" rel="noreferrer">alaminjava.github.io</a>
          </span>
        </div>
        <small>Copyright {new Date().getFullYear()} School Manager. All rights reserved.</small>
      </footer>
    </main>
  );
}
