import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, getErrorMessage } from "../api";
import { startAuthentication } from "@simplewebauthn/browser";

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
    menu: <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>,
    close: <><path d="m6 6 12 12" /><path d="M18 6 6 18" /></>,
    workflow: <><path d="M5 6h5" /><path d="M14 6h5" /><path d="M5 12h14" /><path d="M5 18h5" /><path d="M14 18h5" /><path d="M10 6a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z" /><path d="M10 18a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z" /></>,
    login: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>,
    contact: <><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Z" /><path d="M8 9h8" /><path d="M8 13h5" /><path d="M8 17h3" /></>,
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
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const slowTimerRef = useRef(null);

  useEffect(() => {
    api.get("/api/health").catch(() => {});
    // Check if this browser/device supports WebAuthn (Windows Hello, Touch ID, etc.)
    if (window.PublicKeyCredential) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then((available) => setBiometricSupported(available))
        .catch(() => {});
    }
  }, []);

  const loginWithBiometric = async () => {
    setError("");
    setIsBiometricLoading(true);
    try {
      const { data: options } = await api.get("/api/auth/webauthn/login-options");
      const assertion = await startAuthentication({ optionsJSON: options });
      const { data } = await api.post("/api/auth/webauthn/login", { assertion });
      onLogin({ token: data.token, user: data.user });
      navigate("/dashboard");
    } catch (err) {
      if (err.name === "NotAllowedError") {
        setError("Biometric cancelled or not recognised.");
      } else {
        setError(getErrorMessage(err) || "Biometric login failed.");
      }
    } finally {
      setIsBiometricLoading(false);
    }
  };

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

    const handleEscape = (event) => {
      if (event.key === "Escape") closeHomeMenu();
    };

    document.body.classList.add("home-menu-lock");
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.body.classList.remove("home-menu-lock");
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isHomeMenuOpen]);

  return (
    <main className={isHomeMenuOpen ? "landing-page pro-home home-menu-open min-h-screen bg-slate-50 text-slate-950" : "landing-page pro-home min-h-screen bg-slate-50 text-slate-950"}>
      <header className="pro-home-header border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-xl">
        <a className="pro-brand" href="#home" aria-label="School Manager home">
          <span className="brand-logo-mark shadow-lg shadow-blue-600/20"><img alt="" src="/app-logo.png" /></span>
          <div>
            <strong>School Manager</strong>
            <small>Smart academic ERP</small>
          </div>
        </a>
        <button className="home-menu-button" type="button" aria-label="Open homepage menu" aria-expanded={isHomeMenuOpen} onClick={() => setIsHomeMenuOpen((value) => !value)}>
          <Icon name="menu" />
        </button>
        <button className={isHomeMenuOpen ? "home-menu-backdrop show" : "home-menu-backdrop"} type="button" aria-label="Close homepage menu" onClick={closeHomeMenu} />
        <nav className={isHomeMenuOpen ? "pro-nav text-sm open" : "pro-nav text-sm"} aria-label="Homepage navigation">
          <div className="home-nav-head">
            <span className="home-nav-mark"><img alt="" src="/app-logo.png" /></span>
            <div>
              <strong>School Manager</strong>
              <small>Smart academic ERP</small>
            </div>
            <button className="home-nav-close" type="button" aria-label="Close homepage menu" onClick={closeHomeMenu}>
              <Icon name="close" />
            </button>
          </div>
          <a className="home-nav-link" href="#features" onClick={closeHomeMenu}><Icon name="student" /><span>Features</span></a>
          <a className="home-nav-link" href="#workflow" onClick={closeHomeMenu}><Icon name="workflow" /><span>Workflow</span></a>
          <a className="home-nav-link" href="#login" onClick={closeHomeMenu}><Icon name="login" /><span>Login</span></a>
          <a className="home-nav-link" href="#contact" onClick={closeHomeMenu}><Icon name="contact" /><span>Contact</span></a>
          <a className="pro-nav-demo-link home-nav-link" href="#login" onClick={closeHomeMenu}><Icon name="login" /><span>Sign In</span></a>
          <div className="home-nav-profile">
            <img alt="Md. Al Amin Hossain" decoding="async" src="/owner-alamin-small.jpg" />
            <span>
              <strong>Md. Al Amin Hossain</strong>
              <small>School Manager Owner</small>
            </span>
          </div>
        </nav>
        <a className="pro-header-action shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5" href="#login" onClick={closeHomeMenu}>Sign In</a>
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
          <p>Enter your credentials to access your dashboard.</p>
          {error && <p className="alert error">{error}</p>}
          {isSubmitting && isSlowStart && (
            <p className="alert info" style={{ textAlign: "center", fontSize: "0.82rem" }}>
              Server is starting up, please wait...
            </p>
          )}
          <div className="auth-grid">
            <label className="auth-field text-sm font-bold text-slate-700">
              Email
              <input autoComplete="email" placeholder="admin@school.test" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
            </label>
            <label className="auth-field text-sm font-bold text-slate-700">
              Password
              <input autoComplete="current-password" minLength={6} placeholder="test1234" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
            </label>
            <button className="btn primary wide" disabled={isSubmitting || isBiometricLoading}>
              {isSlowStart ? "Starting server..." : isSubmitting ? "Logging in..." : "Login"}
            </button>
          </div>

          {biometricSupported && (
            <div style={{ margin: "4px 0 8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0 12px" }}>
                <hr style={{ flex: 1, border: "none", borderTop: "1px solid #e2e8f0" }} />
                <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>OR</span>
                <hr style={{ flex: 1, border: "none", borderTop: "1px solid #e2e8f0" }} />
              </div>
              <button
                type="button"
                className="btn outline wide"
                disabled={isBiometricLoading || isSubmitting}
                onClick={loginWithBiometric}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                  <path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04.054-.09A13.916 13.916 0 0 0 8 11a4 4 0 1 1 8 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0 0 15.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 0 0 8 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                </svg>
                {isBiometricLoading ? "Waiting for biometric..." : "Use Fingerprint / Windows Hello"}
              </button>
            </div>
          )}

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
          <img alt="Md. Al Amin Hossain" decoding="async" loading="lazy" src="/owner-alamin-small.jpg" />
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
