import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, getErrorMessage } from "../api";

const DEMO_PASSWORD = "test1234";

const DEMO_ACCOUNTS = [
  { label: "Admin Demo", email: "admin@school.test", password: DEMO_PASSWORD, role: "Full access", avatar: "AD" },
  { label: "Class Teacher", email: "teacher@school.test", password: DEMO_PASSWORD, role: "Assigned class", avatar: "CT" },
  { label: "Accountant", email: "accountant@school.test", password: DEMO_PASSWORD, role: "Finance", avatar: "AC" },
  { label: "Student Demo", email: "student@school.test", password: DEMO_PASSWORD, role: "Student portal", avatar: "ST" },
];

const featureGroups = [
  { icon: "student", title: "Student Management", text: "Admissions, profiles, guardians, roll or student ID, dues, marks, and status in one place." },
  { icon: "teacher", title: "Class Teacher Access", text: "Assign class teachers so they can manage only their own students, routines, marks, and result cards." },
  { icon: "payment", title: "Payments and Receipts", text: "Class fee rules, monthly fees, exam fees, payment collection, student ID search, and printable receipts." },
  { icon: "result", title: "Marks and Result Cards", text: "Monthly, semester, and class test marks with grades, class position, highest marks, and PDF-ready reports." },
  { icon: "staff", title: "Staff and Salary", text: "Employee records, salary ledgers, increments, staff roles, and controlled finance access for accounts teams." },
  { icon: "cloud", title: "Cloud Ready", text: "Prepared for GitHub, Render backend hosting, Vercel frontend hosting, MongoDB Atlas, and demo testing." },
];

const workflowSteps = [
  "Create classes and fee rules",
  "Assign class teachers",
  "Add students and employees",
  "Collect payments and enter marks",
  "Print receipts and result cards",
];

const metrics = [
  { value: "8", label: "Role portals" },
  { value: "20+", label: "School modules" },
  { value: "100%", label: "Deploy ready" },
];

function Icon({ name }) {
  const props = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" };
  const paths = {
    student: <><path d="M4 8.5 12 4l8 4.5-8 4.5-8-4.5Z" /><path d="M6.5 11v4.2c0 1.7 2.5 3.1 5.5 3.1s5.5-1.4 5.5-3.1V11" /></>,
    teacher: <><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /><path d="M4 21c.8-4.2 3.5-6.5 8-6.5s7.2 2.3 8 6.5" /><path d="M18 4h3v6" /></>,
    payment: <><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z" /><path d="M3 9h18" /><path d="M7 15h4" /></>,
    result: <><path d="M5 3h14v18H5V3Z" /><path d="M8 7h8" /><path d="M8 11h8" /><path d="M8 15h4" /><path d="M16 15l1.2 1.2L20 13.5" /></>,
    staff: <><path d="M9 6V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1" /><path d="M4 8h16v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8Z" /><path d="M4 12h16" /></>,
    cloud: <><path d="M7 18h10a4 4 0 0 0 .7-7.94A6 6 0 0 0 6.15 8.4 4.8 4.8 0 0 0 7 18Z" /><path d="M12 12v6" /><path d="m9.5 15.5 2.5 2.5 2.5-2.5" /></>,
  };
  return <svg className="home-icon" {...props}>{paths[name] || paths.student}</svg>;
}

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
    setIsSlowStart(false);
    setIsSubmitting(true);
    setForm(credentials);

    slowTimerRef.current = setTimeout(() => setIsSlowStart(true), 5000);

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

  return (
    <main className="landing-page pro-home min-h-screen bg-slate-50 text-slate-950">
      <header className="pro-home-header border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-xl">
        <a className="pro-brand" href="#home" aria-label="School Manager home">
          <span className="shadow-lg shadow-blue-600/20">SM</span>
          <div>
            <strong>School Manager</strong>
            <small>Smart academic ERP</small>
          </div>
        </a>
        <button className="home-menu-button" type="button" aria-label="Open homepage menu" aria-expanded={isHomeMenuOpen} onClick={() => setIsHomeMenuOpen((value) => !value)}>
          <span />
          <span />
          <span />
        </button>
        <button className={isHomeMenuOpen ? "home-menu-backdrop show" : "home-menu-backdrop"} type="button" aria-label="Close homepage menu" onClick={closeHomeMenu} />
        <nav className={isHomeMenuOpen ? "pro-nav text-sm open" : "pro-nav text-sm"} aria-label="Homepage navigation">
          <a href="#features" onClick={closeHomeMenu}>Features</a>
          <a href="#workflow" onClick={closeHomeMenu}>Workflow</a>
          <a href="#login" onClick={closeHomeMenu}>Demo Login</a>
          <a href="#contact" onClick={closeHomeMenu}>Contact</a>
          <a className="pro-nav-demo-link" href="#login" onClick={closeHomeMenu}>Try Demo</a>
        </nav>
        <a className="pro-header-action shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5" href="#login" onClick={closeHomeMenu}>Try Demo</a>
      </header>

      <section className="pro-hero login-first-hero overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700" id="home">
        <div className="pro-hero-copy">
          <p className="pro-eyebrow">Professional school ERP platform</p>
          <h1>Smart School Management for Modern Campuses</h1>
          <p>Manage students, staff, marks, routines, payments, and reports from one clean dashboard with secure role-based access.</p>
          <div className="pro-hero-actions flex flex-wrap gap-3">
            <a className="pro-primary-link transition hover:-translate-y-0.5" href="#login">Start Demo</a>
            <a className="pro-secondary-link border-white/25 bg-white/95 transition hover:-translate-y-0.5" href="#features">See Features</a>
          </div>
          <div className="pro-metrics">
            {metrics.map((item) => (
              <span className="border border-white/20 bg-white/10 shadow-xl backdrop-blur-xl" key={item.label}><b>{item.value}</b><small>{item.label}</small></span>
            ))}
          </div>
        </div>

        <form className="pro-login-card hero-login-card rounded-3xl border border-white/80 bg-white/95 shadow-2xl backdrop-blur-xl" id="login" onSubmit={handleSubmit}>
          <span className="login-card-mark">Secure Login</span>
          <h2>Access your dashboard</h2>
          <p>Use a demo account or enter your credentials.</p>
          {error && <p className="alert error">{error}</p>}
          {isSubmitting && isSlowStart && <p className="alert">Server is starting up, please wait a moment...</p>}
          <div className="auth-grid">
            <label className="auth-field text-sm font-bold text-slate-700">
              Email
              <input autoComplete="email" placeholder="admin@school.test" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
            </label>
            <label className="auth-field text-sm font-bold text-slate-700">
              Password
              <input autoComplete="current-password" minLength={6} placeholder="test1234" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
            </label>
            <button className="btn primary wide" disabled={isSubmitting}>
              {isSubmitting && isSlowStart ? "Starting server..." : isSubmitting ? "Logging in..." : "Login"}
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
                <span className="demo-avatar">{account.avatar}</span>
                <span><strong>{account.label}</strong><small>{account.role}</small></span>
                <em>-&gt;</em>
              </button>
            ))}
          </div>

          <p className="auth-switch">Need a student account? <Link to="/register">Register</Link></p>
        </form>
      </section>

      <section className="pro-section feature-overview bg-white" id="features">
        <div className="pro-section-head">
          <p>App Features</p>
          <h2>Everything users need, clearly organized</h2>
          <span>All core school workflows are grouped by role so the app stays simple for everyday use.</span>
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

      <section className="pro-section workflow-demo-section compact-workflow bg-slate-50" id="workflow">
        <div className="workflow-panel border border-white/80 bg-white/85 shadow-xl backdrop-blur-xl">
          <div className="pro-section-head compact">
            <p>User Friendly Workflow</p>
            <h2>From setup to reports in five simple steps</h2>
          </div>
          <div className="workflow-list">
            {workflowSteps.map((step, index) => (
              <span key={step}><b>{index + 1}</b>{step}</span>
            ))}
          </div>
        </div>
        <div className="workflow-panel role-summary-panel border border-white/80 bg-white/85 shadow-xl backdrop-blur-xl">
          <div className="pro-section-head compact">
            <p>Access Rules</p>
            <h2>Clean permissions for every user</h2>
          </div>
          <p>Admins control the full system. Class teachers manage only their assigned class. Accounts officers handle finance. Students see only their own profile, payments, marks, and result cards.</p>
        </div>
      </section>

      <footer className="pro-home-footer footer-with-owner bg-slate-950" id="contact">
        <div>
          <strong>School Manager</strong>
          <span>Professional school management system for academic, finance, and result operations.</span>
        </div>
        <div className="footer-owner">
          <img alt="Md. Al Amin Hossain" src="/owner-alamin.png" />
          <span>
            <strong>Md. Al Amin Hossain</strong>
            <a href="https://github.com/alaminjava" target="_blank" rel="noreferrer">github.com/alaminjava</a>
          </span>
        </div>
        <small>Copyright {new Date().getFullYear()} School Manager. All rights reserved.</small>
      </footer>
    </main>
  );
}
