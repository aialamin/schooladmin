import { useEffect, useRef, useState } from "react";

function useIsMobile(breakpoint = 960) {
  const query = `(max-width: ${breakpoint}px)`;
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    setIsMobile(mq.matches);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [query]);
  return isMobile;
}

const navSections = [
  {
    title: "Main",
    items: [
      { key: "dashboard", label: "Dashboard", icon: "dashboard" },
      { key: "students", label: "Students", icon: "student" },
      { key: "employees", label: "People", icon: "users" },
      { key: "classTeachers", label: "Class Teachers", icon: "users", adminOnly: true },
      { key: "marks", label: "Marks", icon: "marks" },
      { key: "resultCards", label: "Results", icon: "report" },
      { key: "routines", label: "Routine", icon: "calendar" },
    ],
  },
  {
    title: "Finance",
    items: [
      { key: "fees", label: "Fees", icon: "card" },
      { key: "salaries", label: "Salary", icon: "briefcase" },
      { key: "reports", label: "Reports", icon: "chart" },
    ],
  },
  {
    title: "System",
    items: [
      { key: "settings", label: "Settings", icon: "settings" },
    ],
  },
];

const navItems = navSections.flatMap((section) => section.items);

const viewDescriptions = {
  dashboard: "Overview of students, fees, marks, routines, and staff.",
  students: "Student profiles, class filter, dues, and marks.",
  fees: "Class fee rules, payments, and dues.",
  employees: "Teachers, staff, salary, and assignments.",
  classTeachers: "Class teacher assignments and scoped access.",
  marks: "Monthly, semester, and class-test marks.",
  resultCards: "Printable result cards and report settings.",
  routines: "Class routines by day, time, teacher, and room.",
  salaries: "Salary payments and increments.",
  reports: "Finance and academic summary.",
  settings: "Profile, appearance, school, and app settings.",
};

function Icon({ name }) {
  const props = { className: "app-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" };
  const icons = {
    dashboard: <><path d="M4 13h6V4H4v9Z"/><path d="M14 20h6V4h-6v16Z"/><path d="M4 20h6v-3H4v3Z"/></>,
    student: <><path d="M4 8.5 12 4l8 4.5-8 4.5-8-4.5Z"/><path d="M6.5 11v4.2c0 1.7 2.5 3.1 5.5 3.1s5.5-1.4 5.5-3.1V11"/><path d="M20 9v5"/></>,
    users: <><path d="M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M2.8 21c.6-3.9 2.9-6.2 6.2-6.2s5.6 2.3 6.2 6.2"/><path d="M17.5 10.2a3 3 0 1 0-.8-5.8"/><path d="M17.2 14.6c2.3.5 3.8 2.5 4.2 5.4"/></>,
    card: <><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z"/><path d="M3 9h18"/><path d="M7 15h4"/></>,
    marks: <><path d="M6 3.5h9l3 3V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M14 3.5v4h4"/><path d="M8 12h8"/><path d="M8 16h5"/></>,
    report: <><path d="M5 3h14v18H5V3Z"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h4"/><path d="M16 15l1.2 1.2L20 13.5"/></>,
    calendar: <><path d="M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M3 10h18"/><path d="M8 14h3"/><path d="M14 14h2"/><path d="M8 18h2"/></>,
    briefcase: <><path d="M9 6V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1"/><path d="M4 8h16v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8Z"/><path d="M4 12h16"/><path d="M10 12v2h4v-2"/></>,
    chart: <><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 16v-5"/><path d="M12 16V8"/><path d="M16 16v-7"/></>,
    settings: <><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.04.04a2 2 0 0 1-2.83 2.83l-.04-.04A1.7 1.7 0 0 0 15 19.37a1.7 1.7 0 0 0-1 1.55V21a2 2 0 0 1-4 0v-.08A1.7 1.7 0 0 0 9 19.37a1.7 1.7 0 0 0-1.88.34l-.04.04a2 2 0 0 1-2.83-2.83l.04-.04A1.7 1.7 0 0 0 4.63 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 0 1 0-4h.08A1.7 1.7 0 0 0 4.63 9a1.7 1.7 0 0 0-.34-1.88l-.04-.04a2 2 0 0 1 2.83-2.83l.04.04A1.7 1.7 0 0 0 9 4.63a1.7 1.7 0 0 0 1-1.55V3a2 2 0 0 1 4 0v.08A1.7 1.7 0 0 0 15 4.63a1.7 1.7 0 0 0 1.88-.34l.04-.04a2 2 0 0 1 2.83 2.83l-.04.04A1.7 1.7 0 0 0 19.37 9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 0 1 0 4h-.08A1.7 1.7 0 0 0 19.4 15Z"/></>,
    menu: <><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></>,
    collapse: <><path d="M15 18 9 12l6-6"/><path d="M20 4v16"/></>,
    sun: <><path d="M12 4V2"/><path d="M12 22v-2"/><path d="m4.93 4.93-1.41-1.41"/><path d="m20.48 20.48-1.41-1.41"/><path d="M4 12H2"/><path d="M22 12h-2"/><path d="m4.93 19.07-1.41 1.41"/><path d="m20.48 3.52-1.41 1.41"/><path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/></>,
    moon: <><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.7 6.7 0 0 0 9.8 9.8Z"/></>,
    user: <><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M4 21c.8-4.2 3.5-6.5 8-6.5s7.2 2.3 8 6.5"/></>,
    help: <><circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.6 2.6 0 0 1 4.8 1.4c0 1.9-2.4 2.1-2.4 4"/><path d="M12 18h.01"/></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></>,
  };
  return <svg {...props}>{icons[name] || icons.dashboard}</svg>;
}

function getInitials(name = "User") {
  return String(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
}

function UserAvatar({ user, small = false }) {
  const hasPhoto = Boolean(user?.photoUrl);
  const className = `${small ? "profile-avatar small" : "profile-avatar"}${hasPhoto ? "" : " default-avatar"}`;

  if (hasPhoto) {
    return <span className={className}><img alt={user.name || "User"} src={user.photoUrl} /></span>;
  }

  return (
    <span className={className} aria-label={user?.name || "User profile"}>
      <svg className="avatar-person-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 12.25a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2Z" />
        <path d="M4.75 20.2c.65-4.35 3.2-6.75 7.25-6.75s6.6 2.4 7.25 6.75" />
      </svg>
      <span className="avatar-initials">{getInitials(user?.name)}</span>
    </span>
  );
}

export default function AdminLayout({ activeView, children, onLogout, onOpenUserSettings, onThemeChange, onViewChange, theme = "light", user }) {
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const visibleNavSections = navSections.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.adminOnly || user?.role === "admin"),
  })).filter((section) => section.items.length);
  const visibleNavItems = visibleNavSections.flatMap((section) => section.items);
  const activeItem = visibleNavItems.find((item) => item.key === activeView) || visibleNavItems[0] || navItems[0];

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={isCollapsed ? "erp-shell sidebar-collapsed bg-slate-100 text-slate-900" : "erp-shell bg-slate-100 text-slate-900"}>
      {!isMobile && <aside className="erp-sidebar premium-sidebar border-r border-white/60 bg-slate-950/95 shadow-2xl backdrop-blur-xl">
        <button aria-label={isCollapsed ? "Expand menu" : "Minimize menu"} className="sidebar-toggle fixed-toggle" type="button" onClick={() => setIsCollapsed((value) => !value)} title={isCollapsed ? "Expand menu" : "Minimize menu"}>
          <Icon name="collapse" />
        </button>

        <div className="sidebar-head modern-sidebar-head">
          <div className="sidebar-user-simple rounded-2xl border border-white/10 bg-white/10 p-3 shadow-xl">
            <UserAvatar user={user} />
            <div className="sidebar-user-copy">
              <span>Hello</span>
              <strong>{user?.name || "User"}</strong>
              <small>{user?.role || "user"}</small>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav modern-sidebar-nav" aria-label="School modules">
          {visibleNavSections.map((section) => (
            <div className="nav-section" key={section.title}>
              <span className="nav-section-title">{section.title}</span>
              {section.items.map((item) => (
                <button aria-label={item.label} data-label={item.label} className={activeView === item.key ? "nav-button active" : "nav-button"} key={item.key} type="button" onClick={() => onViewChange(item.key)} title={item.label}>
                  <span className="nav-icon"><Icon name={item.icon} /></span>
                  <span className="nav-text">{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom-actions">
          <button aria-label="Help" data-label="Help" className="nav-button" type="button" title="Help" onClick={() => onViewChange("settings")}>
            <span className="nav-icon"><Icon name="help" /></span>
            <span className="nav-text">Help</span>
          </button>
          <button aria-label="Logout" data-label="Logout" className="nav-button logout-nav" type="button" title="Logout" onClick={onLogout}>
            <span className="nav-icon"><Icon name="logout" /></span>
            <span className="nav-text">Logout</span>
          </button>
        </div>
      </aside>}

      <div className="erp-main">
        <header className="mobile-app-bar">
          <select className="control mobile-nav-select" value="" onChange={(event) => { if (event.target.value) onViewChange(event.target.value); }}>
            <option value="" disabled>Navigate...</option>
            {visibleNavItems.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>
          <button className="btn icon-btn mobile-bar-btn" type="button" onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")} title={theme === "dark" ? "Light mode" : "Dark mode"}>
            <Icon name={theme === "dark" ? "sun" : "moon"} />
          </button>
          <div className="user-menu" ref={mobileMenuRef}>
            <button className="topbar-user-chip user-menu-trigger mobile-bar-user" type="button" onClick={() => setIsMobileMenuOpen((value) => !value)}>
              <UserAvatar user={user} small />
              <span className="menu-chevron">v</span>
            </button>
            {isMobileMenuOpen && (
              <div className="user-menu-panel overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <button type="button" onClick={() => { setIsMobileMenuOpen(false); onOpenUserSettings(); }}><Icon name="user" /> Profile settings</button>
                <button type="button" onClick={() => { setIsMobileMenuOpen(false); onViewChange("settings"); }}><Icon name="settings" /> App settings</button>
                <button type="button" onClick={onLogout}><Icon name="logout" /> Logout</button>
              </div>
            )}
          </div>
        </header>

        {!isMobile && <header className="erp-topbar clean-topbar">
          <div className="topbar-title min-w-0">
            <h2><span className="title-icon"><Icon name={activeItem.icon} /></span>{activeItem.label}</h2>
            <small>{viewDescriptions[activeView]}</small>
          </div>
          <div className="topbar-actions flex flex-wrap items-center gap-3">
            <button className="btn icon-btn border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50" type="button" onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")} title={theme === "dark" ? "Light mode" : "Dark mode"}>
              <Icon name={theme === "dark" ? "sun" : "moon"} />
              <span>{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
            <div className="user-menu" ref={userMenuRef}>
              <button className="topbar-user-chip user-menu-trigger border border-slate-200 bg-white shadow-sm hover:bg-slate-50" type="button" onClick={() => setIsUserMenuOpen((value) => !value)}>
                <UserAvatar user={user} small />
                <strong>{user?.name || "User"}</strong>
                <span className="menu-chevron">v</span>
              </button>
              {isUserMenuOpen && (
                <div className="user-menu-panel overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                  <button type="button" onClick={() => { setIsUserMenuOpen(false); onOpenUserSettings(); }}><Icon name="user" /> Profile settings</button>
                  <button type="button" onClick={() => { setIsUserMenuOpen(false); onViewChange("settings"); }}><Icon name="settings" /> App settings</button>
                  <button type="button" onClick={onLogout}><Icon name="logout" /> Logout</button>
                </div>
              )}
            </div>
          </div>
        </header>}
        <main className="content-area bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.10),transparent_34%),linear-gradient(180deg,#f8fafc,#eef4ff)]">{children}</main>
      </div>
    </div>
  );
}
