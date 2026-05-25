import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

// allowedRoles: if set, item only appears for users whose role is in the list.
// If omitted, item is visible to everyone.
const FINANCE_ROLES = ["admin", "accounts", "accountant"];
const OFFICE_ROLES  = ["admin", "accounts", "accountant", "staff"];

const navSections = [
  {
    title: "Main",
    items: [
      { key: "dashboard", label: "Dashboard", icon: "dashboard" },
      { key: "students", label: "Students", icon: "student" },
      { key: "employees", label: "Employees", icon: "users", allowedRoles: OFFICE_ROLES },
      { key: "attendance", label: "Attendance", icon: "attendance", allowedRoles: OFFICE_ROLES },
      { key: "classTeachers", label: "Class Teachers", icon: "users", allowedRoles: ["admin"] },
      { key: "sections", label: "Sections", icon: "sections", allowedRoles: ["admin"] },
      { key: "classrooms", label: "Classrooms", icon: "classroom", allowedRoles: ["admin"] },
      { key: "marks", label: "Marks", icon: "marks" },
      { key: "resultCards", label: "Results", icon: "report" },
      { key: "classwiseResults", label: "Class Results", icon: "classwiseResults" },
      { key: "routines", label: "Routine", icon: "calendar" },
    ],
  },
  {
    title: "Finance",
    items: [
      { key: "fees", label: "Fees", icon: "card" },
      { key: "expenses", label: "Expenses", icon: "receipt", allowedRoles: FINANCE_ROLES },
      { key: "salaries", label: "Salary", icon: "briefcase", allowedRoles: FINANCE_ROLES },
      { key: "reports", label: "Reports", icon: "chart", allowedRoles: [...FINANCE_ROLES, "audit"] },
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
  attendance: "Daily and monthly employee attendance register and biometric terminal.",
  expenses: "School expenses — asset purchases, tours, food, events, stationery, utility bills, and more.",
  classTeachers: "Class teacher assignments and scoped access.",
  sections: "Manage class sections and assign class teachers.",
  classrooms: "Manage physical classrooms — room number, benches, capacity, and shift assignments.",
  marks: "Monthly, semester, and class-test marks.",
  classwiseResults: "View student results grouped by class and section.",
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
    attendance: <><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>,
    sections: <><path d="M4 8h7"/><path d="M4 12h7"/><path d="M13 5v14"/><path d="M3 5h18"/><path d="M3 19h18"/><path d="M17 8h3"/><path d="M17 12h3"/></>,
    classwiseResults: <><path d="M4 3h16"/><path d="M4 9h16"/><path d="M4 15h8"/><path d="M15 13l4 4"/><path d="M19 13l-4 4"/></>,
    classroom: <><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 10h20"/><path d="M7 7V4"/><path d="M17 7V4"/><path d="M7 14h2"/><path d="M11 14h2"/><path d="M15 14h2"/><path d="M7 17h2"/><path d="M11 17h2"/></>,
    receipt: <><path d="M4 2v20l2-1.5 2 1.5 2-1.5 2 1.5 2-1.5 2 1.5 2-1.5 2 1.5V2l-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5Z"/><path d="M8 8h8"/><path d="M8 12h8"/><path d="M8 16h5"/></>,
    menu: <><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></>,
    collapse: <><path d="M15 18 9 12l6-6"/><path d="M20 4v16"/></>,
    sun: <><path d="M12 4V2"/><path d="M12 22v-2"/><path d="m4.93 4.93-1.41-1.41"/><path d="m20.48 20.48-1.41-1.41"/><path d="M4 12H2"/><path d="M22 12h-2"/><path d="m4.93 19.07-1.41 1.41"/><path d="m20.48 3.52-1.41 1.41"/><path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/></>,
    moon: <><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.7 6.7 0 0 0 9.8 9.8Z"/></>,
    user: <><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M4 21c.8-4.2 3.5-6.5 8-6.5s7.2 2.3 8 6.5"/></>,
    help: <><circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.6 2.6 0 0 1 4.8 1.4c0 1.9-2.4 2.1-2.4 4"/><path d="M12 18h.01"/></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></>,
    close: <><path d="m6 6 12 12"/><path d="M18 6 6 18"/></>,
    chevron: <><path d="m6 9 6 6 6-6"/></>,
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const sidebarRef = useRef(null);
  const sidebarNavRef = useRef(null);
  const visibleNavSections = useMemo(() =>
    navSections.map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!item.allowedRoles) return true;
        return item.allowedRoles.includes(user?.role);
      }),
    })).filter((section) => section.items.length),
    [user?.role]
  );
  const visibleNavItems = useMemo(() => visibleNavSections.flatMap((section) => section.items), [visibleNavSections]);
  const activeItem = useMemo(() => visibleNavItems.find((item) => item.key === activeView) || visibleNavItems[0] || navItems[0], [visibleNavItems, activeView]);
  const shellClassName = useMemo(() => [
    isCollapsed ? "erp-shell sidebar-collapsed" : "erp-shell",
    isMobileMenuOpen ? "mobile-menu-open" : "",
    "bg-slate-100 text-slate-900",
  ].filter(Boolean).join(" "), [isCollapsed, isMobileMenuOpen]);

  const handleViewChange = useCallback((view) => {
    onViewChange(view);
    setIsMobileMenuOpen(false);
  }, [onViewChange]);

  const handleLogout = useCallback(() => {
    setIsMobileMenuOpen(false);
    onLogout();
  }, [onLogout]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    }

    document.body.classList.add("app-mobile-menu-lock");
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.body.classList.remove("app-mobile-menu-lock");
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMobileMenuOpen]);

  // Forward wheel events from anywhere on the sidebar to the nav scroll region.
  // Without this, scrolling over the top/bottom areas of the sidebar does nothing
  // because only the inner .modern-sidebar-nav element is the scroll container.
  useEffect(() => {
    const sidebar = sidebarRef.current;
    const nav = sidebarNavRef.current;
    if (!sidebar || !nav) return undefined;

    function handleSidebarWheel(e) {
      // If the wheel event already originates from inside the nav, leave it alone
      if (nav.contains(e.target)) return;
      const canScrollDown = nav.scrollTop < nav.scrollHeight - nav.clientHeight;
      const canScrollUp = nav.scrollTop > 0;
      if ((e.deltaY > 0 && canScrollDown) || (e.deltaY < 0 && canScrollUp)) {
        e.preventDefault();
        nav.scrollTop += e.deltaY;
      }
    }

    sidebar.addEventListener("wheel", handleSidebarWheel, { passive: false });
    return () => sidebar.removeEventListener("wheel", handleSidebarWheel);
  }, []);

  return (
    <div className={shellClassName}>
      {/* ── Mobile top bar — fixed at top, replaces topbar on mobile/tablet ── */}
      {isMobile && (
        <header className="mobile-topbar">
          <button className="mobile-nav-trigger" type="button" aria-expanded={isMobileMenuOpen} aria-controls="mobile-app-menu" onClick={() => setIsMobileMenuOpen(true)}>
            <span className="nav-icon"><Icon name="menu" /></span>
            <span className="mobile-nav-label">{activeItem.label}</span>
          </button>
          <button className="topbar-icon-btn" type="button" onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")} title={theme === "dark" ? "Light mode" : "Dark mode"}>
            <Icon name={theme === "dark" ? "sun" : "moon"} />
          </button>
          <div className="user-menu" ref={userMenuRef}>
            <button className="topbar-icon-btn" type="button" onClick={() => setIsUserMenuOpen((v) => !v)} title="Settings">
              <Icon name="settings" />
            </button>
            {isUserMenuOpen && (
              <div className="user-menu-panel overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <button type="button" onClick={() => { setIsUserMenuOpen(false); onOpenUserSettings(); }}><Icon name="user" /> Profile settings</button>
                <button type="button" onClick={() => { setIsUserMenuOpen(false); handleViewChange("settings"); }}><Icon name="settings" /> App settings</button>
                <button type="button" onClick={handleLogout}><Icon name="logout" /> Logout</button>
              </div>
            )}
          </div>
        </header>
      )}

      {/* ── Full-width topbar — desktop only ── */}
      {!isMobile && <header className="erp-topbar clean-topbar">
        {/* LEFT — user identity */}
        <div className="topbar-user-info">
          <UserAvatar user={user} small />
          <div className="topbar-user-copy">
            <p className="topbar-greeting">Hello, <strong>{user?.name || "User"}</strong></p>
            <span className="topbar-role">{user?.role || "user"}</span>
          </div>
        </div>
        {/* RIGHT — controls */}
        <div className="topbar-actions flex items-center gap-2">
          <button className="mobile-nav-trigger" type="button" aria-expanded={isMobileMenuOpen} aria-controls="mobile-app-menu" onClick={() => setIsMobileMenuOpen(true)}>
            <span className="nav-icon"><Icon name="menu" /></span>
            <span className="mobile-nav-label">{activeItem.label}</span>
          </button>
          <button className="topbar-icon-btn" type="button" onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")} title={theme === "dark" ? "Light mode" : "Dark mode"} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
            <Icon name={theme === "dark" ? "sun" : "moon"} />
          </button>
          <div className="user-menu topbar-settings-menu" ref={userMenuRef}>
            <button className="topbar-icon-btn topbar-settings-btn" type="button" onClick={() => setIsUserMenuOpen((value) => !value)} title="Settings" aria-label="Open settings">
              <Icon name="settings" />
            </button>
            {isUserMenuOpen && (
              <div className="user-menu-panel overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <button type="button" onClick={() => { setIsUserMenuOpen(false); onOpenUserSettings(); }}><Icon name="user" /> Profile settings</button>
                <button type="button" onClick={() => { setIsUserMenuOpen(false); handleViewChange("settings"); }}><Icon name="settings" /> App settings</button>
                <button type="button" onClick={handleLogout}><Icon name="logout" /> Logout</button>
              </div>
            )}
          </div>
        </div>
      </header>}

      {/* ── Sidebar — desktop only ── */}
      {!isMobile && <aside className="erp-sidebar premium-sidebar" ref={sidebarRef}>
        <nav className="sidebar-nav modern-sidebar-nav" aria-label="School modules" ref={sidebarNavRef}>
          {visibleNavSections.map((section) => (
            <div className="nav-section" key={section.title}>
              <span className="nav-section-title">{section.title}</span>
              {section.items.map((item) => (
                <button aria-label={item.label} data-label={item.label} className={activeView === item.key ? "nav-button active" : "nav-button"} key={item.key} type="button" onClick={() => handleViewChange(item.key)} title={item.label}>
                  <span className="nav-icon"><Icon name={item.icon} /></span>
                  <span className="nav-text">{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom-actions">
          <button aria-label={isCollapsed ? "Expand menu" : "Minimize menu"} className="nav-button sidebar-toggle-btn" type="button" onClick={() => setIsCollapsed((value) => !value)} title={isCollapsed ? "Expand menu" : "Minimize menu"}>
            <span className="nav-icon"><Icon name="collapse" /></span>
            <span className="nav-text">{isCollapsed ? "Expand menu" : "Minimize"}</span>
          </button>
          <button aria-label="Help" data-label="Help" className="nav-button" type="button" title="Help" onClick={() => handleViewChange("settings")}>
            <span className="nav-icon"><Icon name="help" /></span>
            <span className="nav-text">Help</span>
          </button>
          <button aria-label="Logout" data-label="Logout" className="nav-button logout-nav" type="button" title="Logout" onClick={handleLogout}>
            <span className="nav-icon"><Icon name="logout" /></span>
            <span className="nav-text">Logout</span>
          </button>
        </div>
      </aside>}

      <button aria-label="Close navigation menu" className="mobile-menu-backdrop" type="button" onClick={() => setIsMobileMenuOpen(false)} />
      <aside id="mobile-app-menu" aria-label="Mobile navigation" className="mobile-menu-drawer" aria-hidden={!isMobileMenuOpen}>
        <div className="mobile-menu-head">
          <div className="app-brand-simple" />
          <div className="sidebar-user-simple">
            <UserAvatar user={user} />
            <div className="sidebar-user-copy">
              <span>Hello</span>
              <strong>{user?.name || "User"}</strong>
              <small>{user?.role || "user"}</small>
            </div>
          </div>
          <button aria-label="Close menu" className="mobile-menu-close" type="button" onClick={() => setIsMobileMenuOpen(false)}>
            <Icon name="close" />
          </button>
        </div>

        <nav className="mobile-menu-nav" aria-label="School modules on mobile">
          {visibleNavSections.map((section) => (
            <div className="nav-section" key={section.title}>
              <span className="nav-section-title">{section.title}</span>
              {section.items.map((item) => (
                <button aria-label={item.label} data-label={item.label} className={activeView === item.key ? "nav-button active" : "nav-button"} key={item.key} type="button" onClick={() => handleViewChange(item.key)}>
                  <span className="nav-icon"><Icon name={item.icon} /></span>
                  <span className="nav-text">{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="mobile-menu-footer">
          <button className="nav-button" type="button" onClick={() => handleViewChange("settings")}>
            <span className="nav-icon"><Icon name="help" /></span>
            <span className="nav-text">Help</span>
          </button>
          <button className="nav-button logout-nav" type="button" onClick={handleLogout}>
            <span className="nav-icon"><Icon name="logout" /></span>
            <span className="nav-text">Logout</span>
          </button>
        </div>
      </aside>

      <div className="erp-main">
        <main className="content-area bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.10),transparent_34%),linear-gradient(180deg,#f8fafc,#eef4ff)]">{children}</main>
      </div>
    </div>
  );
}
