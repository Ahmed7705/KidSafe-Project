import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "./api/client.js";
import { getLanguage, getLanguages, setLanguage, t } from "./i18n/index.js";

const TOKEN_KEY = "kidsafe_token";

export default function App() {
  const [token, setToken] = useState(window.localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [profileImage, setProfileImage] = useState("");
  const [language, setLanguageState] = useState(getLanguage());
  const [activeSection, setActiveSection] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    setLoading(true);
    apiRequest("/api/auth/me", { token })
      .then((data) => {
        setUser(data);
        setError("");
      })
      .catch((err) => {
        setError(err.message || t("status.error"));
        setUser(null);
        window.localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [token, language]);

  useEffect(() => {
    if (user?.id) {
      setProfileImage(loadProfileImage(user.id));
    } else {
      setProfileImage("");
    }
  }, [user?.id]);

  const handleAuth = (nextToken, nextUser) => {
    window.localStorage.setItem(TOKEN_KEY, nextToken);
    setToken(nextToken);
    setUser(nextUser);
    setActiveSection("overview");
  };

  const handleLogout = () => {
    window.localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setActiveSection("overview");
  };

  const handleLanguageChange = (event) => {
    const next = event.target.value;
    setLanguage(next);
    setLanguageState(next);
  };

  const handleProfileImageChange = (nextImage) => {
    if (!user?.id) {
      return;
    }
    saveProfileImage(user.id, nextImage);
    setProfileImage(nextImage || "");
  };

  const handleProfileNav = () => {
    if (user) {
      setActiveSection("profile");
    }
  };

  const initials = getInitials(user?.fullName || "");

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark">
            <img src="/logo.png" alt="KidSafe logo" className="brand-logo" />
          </div>
          <div>
            <h1>{t("app.title")}</h1>
            <p>{t("app.tagline")}</p>
          </div>
        </div>
        <div className="header-actions">
          <div className="header-language">
            <select value={language} onChange={handleLanguageChange} aria-label="Language">
              {Object.entries(getLanguages()).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>
          </div>
          {user && (
            <div className="header-user">
              <button className="header-profile" type="button" onClick={handleProfileNav}>
                <div className="header-avatar">
                  {profileImage ? (
                    <img src={profileImage} alt={t("profile.photoAlt")} />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <div className="header-info">
                  <strong>{user.fullName}</strong>
                </div>
              </button>
              <button className="logout-button" type="button" onClick={handleLogout}>
                {t("dashboard.signOut")}
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="app-main">
        {loading && <div className="status">{t("status.loading")}</div>}
        {error && <div className="status error">{error}</div>}
        {!token && !loading && <AuthPanel onAuth={handleAuth} />}
        {token && user && (
          <Dashboard
            token={token}
            user={user}
            onUserUpdate={setUser}
            language={language}
            profileImage={profileImage}
            onProfileImageChange={handleProfileImageChange}
            activeSection={activeSection}
            onNavigate={setActiveSection}
          />
        )}
      </main>
    </div>
  );
}

function AuthPanel({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", fullName: "" });
  const [status, setStatus] = useState({ loading: false, error: "" });

  const toggleMode = () => {
    setMode((prev) => (prev === "login" ? "register" : "login"));
    setStatus({ loading: false, error: "" });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ loading: true, error: "" });
    try {
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "login"
          ? { email: form.email, password: form.password }
          : { email: form.email, password: form.password, fullName: form.fullName };
      const data = await apiRequest(path, { method: "POST", body });
      onAuth(data.token, data.user);
    } catch (error) {
      const msg = error.message || "";
      const isEmailDup = msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("email");
      setStatus({ loading: false, error: isEmailDup && mode === "register" ? t("auth.emailExists") : (msg || t("status.error")) });
    }
  };

  return (
    <section className="auth-card">
      <div className="auth-header">
        <h2>{mode === "login" ? t("auth.login") : t("auth.register")}</h2>
        <p>{mode === "login" ? t("auth.switchToRegister") : t("auth.switchToLogin")}</p>
      </div>
      <form onSubmit={handleSubmit} className="auth-form">
        {mode === "register" && (
          <label>
            <span>{t("auth.fullName")}</span>
            <input name="fullName" value={form.fullName} onChange={handleChange} required />
          </label>
        )}
        <label>
          <span>{t("auth.email")}</span>
          <input name="email" type="email" value={form.email} onChange={handleChange} required />
        </label>
        <label>
          <span>{t("auth.password")}</span>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
            minLength={8}
          />
        </label>
        {status.error && <div className="status error">{status.error}</div>}
        <button className="primary" type="submit" disabled={status.loading}>
          {mode === "login" ? t("auth.signIn") : t("auth.createAccount")}
        </button>
      </form>
      <button className="link" type="button" onClick={toggleMode}>
        {mode === "login" ? t("auth.switchToRegister") : t("auth.switchToLogin")}
      </button>
    </section>
  );
}

function Dashboard({
  token,
  user,
  onUserUpdate,
  language,
  profileImage,
  onProfileImageChange,
  activeSection,
  onNavigate
}) {
  const sections = useMemo(
    () => {
      if (user?.isAdmin) {
        return [
          { id: "overview", label: t("admin.overview") },
          { id: "profile", label: t("nav.profile") },
          { id: "children", label: t("nav.children") },
          { id: "categories", label: t("nav.categories") },
          { id: "alerts", label: t("nav.alerts") },
          { id: "admin_users", label: t("admin.usersManagement") },
          { id: "admin_alerts", label: t("admin.globalActivity") },
          { id: "admin_recs", label: t("admin.manageRecommendations") }
        ];
      }

      return [
        { id: "overview", label: t("nav.overview") },
        { id: "profile", label: t("nav.profile") },
        { id: "children", label: t("nav.children") },
        { id: "categories", label: t("nav.categories") },
        { id: "blocklist", label: t("nav.blocklist") },
        { id: "screentime", label: t("nav.screentime") },
        { id: "apps", label: t("nav.apps") },
        { id: "logs", label: t("nav.logs") },
        { id: "alerts", label: t("nav.alerts") },
        { id: "extension", label: t("nav.extension") }
      ];
    },
    [language, user]
  );

  const active = activeSection || "overview";
  const [children, setChildren] = useState([]);
  const [activeChild, setActiveChild] = useState(null);
  const [childrenStatus, setChildrenStatus] = useState({ loading: false, error: "" });
  const [alertCount, setAlertCount] = useState(0);
  const [toasts, setToasts] = useState([]);

  const addToast = (alertMsg, alertId) => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p, { id, msg: alertMsg, alertId }]);
    setTimeout(() => {
      setToasts((p) => p.filter((t) => t.id !== id));
    }, 6000);
  };

  const handleNavigate = (sectionId) => {
    if (onNavigate) {
      onNavigate(sectionId);
    }
  };

  const loadChildren = async () => {
    setChildrenStatus({ loading: true, error: "" });
    try {
      const data = await apiRequest("/api/children", { token });
      const mapped = data.map(c => {
        if (c.parentEmail && c.parentEmail !== user?.email) {
          return { ...c, name: `${c.name} (${c.parentEmail})` };
        }
        return c;
      });
      setChildren(mapped);
      setChildrenStatus({ loading: false, error: "" });
    } catch (error) {
      setChildrenStatus({ loading: false, error: error.message || t("status.error") });
    }
  };

  const loadAlertCount = async () => {
    try {
      const data = await apiRequest("/api/alerts/unread-count", { token });
      setAlertCount(Number(data.count || 0));
    } catch (error) {
      setAlertCount(0);
    }
  };

  useEffect(() => {
    loadChildren();
  }, [token]);

  useEffect(() => {
    loadAlertCount();
    const id = window.setInterval(loadAlertCount, 15000);

    // SSE connection for real-time alerts
    let eventSource;
    try {
      const url = new URL("/api/extension/alerts/stream", window.location.origin);
      if (token) url.searchParams.append("token", token);
      eventSource = new window.EventSource(url.toString());
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.alert) {
            setAlertCount((prev) => prev + 1);
            addToast(`⚠️ ${data.alert.message || t("alerts.newAlert")}`, data.alert.id);
          }
        } catch (err) {}
      };
    } catch (e) {}

    return () => {
      window.clearInterval(id);
      if (eventSource) eventSource.close();
    };
  }, [token]);

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-panel">
          <nav className="nav">
            {sections.map((section) => (
              <button
                key={section.id}
                className={active === section.id ? "nav-item active" : "nav-item"}
                onClick={() => handleNavigate(section.id)}
              >
                <span>{section.label}</span>
                {section.id === "alerts" && alertCount > 0 && (
                  <span className="nav-badge">{alertCount}</span>
                )}
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div>
              <span className="muted">{t("sidebar.children")}</span>
              <strong>{children.length}</strong>
            </div>
            <div>
              <span className="muted">{t("sidebar.alerts")}</span>
              <strong>{alertCount}</strong>
            </div>
          </div>
        </div>
      </aside>

      <section className="content">
        {childrenStatus.error && <div className="status error">{childrenStatus.error}</div>}
        {active === "overview" && !user?.isAdmin && (
          <OverviewSection
            token={token}
            user={user}
            children={children}
            alertCount={alertCount}
            onNavigate={handleNavigate}
            language={language}
          />
        )}
        {active === "overview" && user?.isAdmin && <AdminSection token={token} activeTab="overview" />}
        {active === "admin_users" && user?.isAdmin && <AdminSection token={token} activeTab="users" />}
        {active === "admin_alerts" && user?.isAdmin && <AdminSection token={token} activeTab="alerts" />}
        {active === "admin_recs" && user?.isAdmin && <AdminSection token={token} activeTab="recommendations" />}
        {active === "profile" && (
          <ProfileSection
            token={token}
            user={user}
            profileImage={profileImage}
            onProfileImageChange={onProfileImageChange}
            onUserUpdate={onUserUpdate}
          />
        )}
        {active === "children" && <ChildrenSection token={token} onUpdate={loadChildren} children={children} />}
        {active === "categories" && (
          <CategoriesSection token={token} children={children} activeChild={activeChild} setActiveChild={setActiveChild} />
        )}
        {active === "blocklist" && (
          <BlocklistSection token={token} children={children} activeChild={activeChild} setActiveChild={setActiveChild} />
        )}
        {active === "screentime" && (
          <ScreenTimeSection token={token} children={children} activeChild={activeChild} setActiveChild={setActiveChild} />
        )}
        {active === "logs" && (
          <LogsSection token={token} children={children} activeChild={activeChild} setActiveChild={setActiveChild} />
        )}
        {active === "alerts" && (
          <AlertsSection token={token} children={children} activeChild={activeChild} setActiveChild={setActiveChild} />
        )}
        {active === "apps" && (
          <AppsSection token={token} children={children} />
        )}
        {active === "extension" && <ExtensionSection />}
      </section>

      {/* Toast Notifications */}
      <div className="toast-container" style={{ position: "fixed", bottom: "20px", left: "20px", display: "flex", flexDirection: "column", gap: "10px", zIndex: 9999 }}>
        {toasts.map((toast) => (
          <div key={toast.id} className="toast" style={{
            background: "var(--danger)", color: "white", padding: "16px 20px", borderRadius: "12px",
            boxShadow: "0 10px 25px rgba(255, 69, 58, 0.4)", cursor: "pointer",
            display: "flex", flexDirection: "column", gap: "4px", animation: "slideUp 0.3s ease-out forwards"
          }} onClick={() => { handleNavigate("alerts"); setToasts(p => p.filter(t => t.id !== toast.id)); }}>
            <strong style={{ fontSize: "1rem" }}>{t("alerts.newAlert")}</strong>
            <span style={{ fontSize: "0.9rem", opacity: 0.9 }}>{toast.msg}</span>
            <span style={{ fontSize: "0.75rem", opacity: 0.7, marginTop: "4px" }}>{t("alerts.clickToView")}</span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
    </div>
  );
}

function OverviewSection({
  token,
  user,
  children: childProfiles,
  alertCount,
  onNavigate,
  language
}) {
  const [overviewStatus, setOverviewStatus] = useState({ loading: true, error: "" });
  const [overview, setOverview] = useState({
    stats: { total: 0, allowed: 0, blocked: 0, malicious: 0 },
    activity: buildActivitySeries([], language),
    recentAlerts: [],
    topSites: []
  });

  useEffect(() => {
    let active = true;
    const loadOverview = async () => {
      setOverviewStatus({ loading: true, error: "" });
      try {
        const [logs, alerts] = await Promise.all([
          apiRequest("/api/logs?limit=200", { token }),
          apiRequest("/api/alerts?limit=6", { token })
        ]);
        if (!active) {
          return;
        }
        const stats = {
          total: logs.length,
          allowed: 0,
          blocked: 0,
          malicious: 0
        };
        logs.forEach((log) => {
          if (stats[log.verdict] !== undefined) {
            stats[log.verdict] += 1;
          }
        });
        setOverview({
          stats,
          activity: buildActivitySeries(logs, language),
          recentAlerts: alerts.slice(0, 4),
          topSites: buildTopSites(logs)
        });
        setOverviewStatus({ loading: false, error: "" });
      } catch (error) {
        if (!active) {
          return;
        }
        setOverviewStatus({ loading: false, error: error.message || t("status.error") });
      }
    };

    loadOverview();
    return () => {
      active = false;
    };
  }, [token]);

  const totalActivity = overview.stats.total;
  const blockedTotal = overview.stats.blocked;
  const maliciousTotal = overview.stats.malicious;
  const allowedTotal = overview.stats.allowed;
  const safeScore =
    totalActivity === 0
      ? 100
      : Math.max(
          0,
          Math.round(100 - ((blockedTotal + maliciousTotal) / Math.max(totalActivity, 1)) * 100)
        );
  const activityMax = Math.max(
    ...overview.activity.map((item) => item.count),
    1
  );
  const hasActivity = totalActivity > 0;
  const allowedSlice = hasActivity ? (allowedTotal / totalActivity) * 100 : 0;
  const blockedSlice = hasActivity ? (blockedTotal / totalActivity) * 100 : 0;
  const maliciousSlice = hasActivity ? Math.max(0, 100 - allowedSlice - blockedSlice) : 0;
  const pieGradient = hasActivity
    ? `conic-gradient(
        var(--accent) 0 ${allowedSlice}%,
        var(--danger) ${allowedSlice}% ${allowedSlice + blockedSlice}%,
        #2f67d8 ${allowedSlice + blockedSlice}% 100%
      )`
    : "conic-gradient(rgba(31, 42, 55, 0.12) 0 100%)";

  return (
    <div className="overview-layout">
      <div className="overview-main">
        <div className="card overview-hero">
          <div>
            <span className="eyebrow">{t("overview.welcome")}</span>
            <h2>
              {t("overview.title")}, {user.fullName}
            </h2>
            <p className="muted">{t("overview.snapshot")}</p>
            {overviewStatus.error && <div className="status error">{overviewStatus.error}</div>}
          </div>
          <div className="score-card">
            <span>{t("overview.score")}</span>
            <strong>{safeScore}%</strong>
            <p className="muted">{t("overview.scoreNote")}</p>
            <button className="secondary" onClick={() => onNavigate?.("alerts")}>
              {t("actions.viewAlerts")}
            </button>
          </div>
        </div>

        <div className="card stats-strip">
          <div className="stats-item accent-1">
            <span>{t("overview.metrics.total")}</span>
            <strong>{totalActivity}</strong>
          </div>
          <div className="stats-item accent-2">
            <span>{t("overview.metrics.blocked")}</span>
            <strong>{blockedTotal}</strong>
          </div>
          <div className="stats-item accent-3">
            <span>{t("overview.metrics.allowed")}</span>
            <strong>{allowedTotal}</strong>
          </div>
          <div className="stats-item accent-4">
            <span>{t("overview.metrics.alerts")}</span>
            <strong>{alertCount}</strong>
          </div>
          <div className="stats-item accent-5">
            <span>{t("overview.metrics.children")}</span>
            <strong>{childProfiles.length}</strong>
          </div>
        </div>

        <div className="chart-grid">
          <div className="card chart-card">
            <div className="card-header">
              <h3>{t("overview.activityTitle")}</h3>
              {overviewStatus.loading && <span className="muted">{t("status.loading")}</span>}
            </div>
            <div className="chart-bars">
              {overview.activity.map((item) => (
                <div key={item.label} className="chart-bar">
                  <div
                    className="bar"
                    style={{ height: `${Math.round((item.count / activityMax) * 100)}%` }}
                  ></div>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card chart-card">
            <div className="card-header">
              <h3>{t("overview.safetyMix")}</h3>
              <span className="muted">
                {totalActivity === 0
                  ? t("overview.noActivity")
                  : `${totalActivity} ${t("overview.totalLabel")}`}
              </span>
            </div>
            <div className="safety-mix">
              <div className="safety-columns">
                <div className="safety-column allowed">
                  <div className="column-track">
                    <div className="column-bar" style={{ height: `${allowedSlice}%` }}></div>
                  </div>
                  <span>{t("overview.metrics.allowed")}</span>
                  <strong>{allowedTotal}</strong>
                </div>
                <div className="safety-column blocked">
                  <div className="column-track">
                    <div className="column-bar" style={{ height: `${blockedSlice}%` }}></div>
                  </div>
                  <span>{t("overview.metrics.blocked")}</span>
                  <strong>{blockedTotal}</strong>
                </div>
                <div className="safety-column malicious">
                  <div className="column-track">
                    <div className="column-bar" style={{ height: `${maliciousSlice}%` }}></div>
                  </div>
                  <span>{t("overview.metrics.malicious")}</span>
                  <strong>{maliciousTotal}</strong>
                </div>
              </div>
              <div className="safety-pie">
                <div className="pie-chart" style={{ background: pieGradient }}>
                  <div className="pie-hole">
                    <strong>{totalActivity}</strong>
                    <span>{t("overview.totalLabel")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card quick-actions">
          <h3>{t("overview.quickActions")}</h3>
          <p className="muted">{t("overview.actionNote")}</p>
          <div className="actions-grid">
            <button className="secondary" type="button" onClick={() => onNavigate?.("children")}>
              {t("actions.addChild")}
            </button>
            <button className="secondary" type="button" onClick={() => onNavigate?.("blocklist")}>
              {t("actions.createRule")}
            </button>
            <button className="secondary" type="button" onClick={() => onNavigate?.("screentime")}>
              {t("actions.screentime")}
            </button>
            <button className="secondary" type="button" onClick={() => onNavigate?.("apps")}>
              {t("actions.manageApps")}
            </button>
            <button className="ghost" type="button" onClick={() => onNavigate?.("logs")}>
              {t("actions.viewLogs")}
            </button>
          </div>
        </div>

        <div className="split-grid">
          <div className="card">
            <div className="card-header">
              <h3>{t("overview.recentAlerts")}</h3>
              <button className="ghost" onClick={() => onNavigate?.("alerts")}>
                {t("actions.viewAlerts")}
              </button>
            </div>
            {overview.recentAlerts.length === 0 && (
              <div className="empty">{t("overview.emptyAlerts")}</div>
            )}
            <div className="stack-list">
              {overview.recentAlerts.map((alert) => (
                <div key={alert.id} className="list-item">
                  <div className="list-primary">
                    <strong>{formatAlertMessage(alert)}</strong>
                    <span className="muted">{alert.childName}</span>
                  </div>
                  <span className="pill">{formatVerdictLabel(alert.alertType)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <h3>{t("overview.topSites")}</h3>
              <button className="ghost" onClick={() => onNavigate?.("logs")}>
                {t("actions.viewLogs")}
              </button>
            </div>
            {overview.topSites.length === 0 && (
              <div className="empty">{t("overview.emptySites")}</div>
            )}
            <div className="stack-list">
              {overview.topSites.map((site) => (
                <div key={site.host} className="list-item">
                  <div className="list-primary">
                    <strong>{site.host}</strong>
                    <span className="muted">
                      {site.count} {t("overview.attempts")}
                    </span>
                  </div>
                  <span className="pill neutral">{site.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileSection({ token, user, profileImage, onProfileImageChange, onUserUpdate }) {
  const [form, setForm] = useState({ fullName: user.fullName, alertEmail: user.alertEmail || "" });
  const [status, setStatus] = useState({ loading: false, message: "", error: "" });
  const [photoStatus, setPhotoStatus] = useState("");

  useEffect(() => {
    setForm({ fullName: user.fullName, alertEmail: user.alertEmail || "" });
  }, [user.fullName, user.alertEmail]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setStatus({ loading: true, message: "", error: "" });
    try {
      const data = await apiRequest("/api/auth/profile", {
        method: "PUT",
        token,
        body: { fullName: form.fullName, alertEmail: form.alertEmail }
      });
      onUserUpdate((prev) => ({ ...prev, ...data }));
      setStatus({ loading: false, message: t("actions.saved"), error: "" });
    } catch (error) {
      setStatus({ loading: false, message: "", error: error.message || t("status.error") });
    }
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setPhotoStatus(t("profile.photoInvalid"));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setPhotoStatus(t("profile.photoTooLarge"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onProfileImageChange(reader.result);
        setPhotoStatus(t("profile.photoSaved"));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    onProfileImageChange("");
    setPhotoStatus(t("profile.photoRemoved"));
  };

  return (
    <div className="profile-layout">
      <div className="card">
        <h2>{t("profile.title")}</h2>
        <p className="muted">{t("profile.subtitle")}</p>
        <form onSubmit={handleSave} className="form-grid">
          <label>
            <span>{t("profile.fullName")}</span>
            <input name="fullName" value={form.fullName} onChange={handleChange} required />
          </label>
          <label>
            <span>{t("profile.alertEmail")}</span>
            <input
              name="alertEmail"
              type="email"
              value={form.alertEmail}
              onChange={handleChange}
            />
          </label>
          <button className="primary" type="submit" disabled={status.loading}>
            {t("profile.save")}
          </button>
          {status.message && <div className="status">{status.message}</div>}
          {status.error && <div className="status error">{status.error}</div>}
        </form>
      </div>

      <div className="card profile-photo-card">
        <h3>{t("profile.photoTitle")}</h3>
        <div className="profile-photo">
          {profileImage ? (
            <img src={profileImage} alt={t("profile.photoAlt")} />
          ) : (
            <span>{getInitials(user.fullName)}</span>
          )}
        </div>
        <div className="profile-actions">
          <label className="upload-button secondary">
            {t("profile.uploadPhoto")}
            <input type="file" accept="image/*" onChange={handlePhotoChange} />
          </label>
          <button
            className="ghost"
            type="button"
            onClick={handleRemovePhoto}
            disabled={!profileImage}
          >
            {t("profile.removePhoto")}
          </button>
        </div>
        <p className="profile-note">{t("profile.photoHint")}</p>
        {photoStatus && <div className="status">{photoStatus}</div>}
      </div>
    </div>
  );
}

function ChildrenSection({ token, children, onUpdate }) {
  const [form, setForm] = useState({ name: "", birthYear: "" });
  const [status, setStatus] = useState({ loading: false, error: "" });
  const [editingChild, setEditingChild] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", birthYear: "" });
  const [devicesByChild, setDevicesByChild] = useState({});
  const [deviceName, setDeviceName] = useState({});
  const [guardiansByChild, setGuardiansByChild] = useState({});
  const [guardianEmail, setGuardianEmail] = useState({});
  const [guardianStatus, setGuardianStatus] = useState({});

  const handleCreateChild = async (event) => {
    event.preventDefault();
    setStatus({ loading: true, error: "" });
    try {
      await apiRequest("/api/children", {
        method: "POST",
        token,
        body: { name: form.name, birthYear: form.birthYear }
      });
      setForm({ name: "", birthYear: "" });
      await onUpdate();
      setStatus({ loading: false, error: "" });
    } catch (error) {
      setStatus({ loading: false, error: error.message || t("status.error") });
    }
  };

  const loadDevices = async (childId) => {
    const data = await apiRequest(`/api/children/${childId}/devices`, { token });
    setDevicesByChild((prev) => ({ ...prev, [childId]: data }));
  };

  const createDevice = async (childId) => {
    const name = deviceName[childId];
    if (!name) return;
    await apiRequest(`/api/children/${childId}/devices`, {
      method: "POST", token, body: { deviceName: name }
    });
    setDeviceName((prev) => ({ ...prev, [childId]: "" }));
    await loadDevices(childId);
  };

  const loadGuardians = async (childId) => {
    const data = await apiRequest(`/api/children/${childId}/guardians`, { token });
    setGuardiansByChild((prev) => ({ ...prev, [childId]: data }));
  };

  const inviteGuardian = async (childId) => {
    const email = guardianEmail[childId];
    if (!email) return;
    setGuardianStatus((prev) => ({ ...prev, [childId]: { loading: true, msg: "" } }));
    try {
      await apiRequest(`/api/children/${childId}/guardians`, {
        method: "POST", token, body: { email }
      });
      setGuardianEmail((prev) => ({ ...prev, [childId]: "" }));
      setGuardianStatus((prev) => ({ ...prev, [childId]: { loading: false, msg: t("children.guardianAdded") } }));
      await loadGuardians(childId);
    } catch (error) {
      setGuardianStatus((prev) => ({ ...prev, [childId]: { loading: false, msg: error.message || t("status.error"), error: true } }));
    }
  };

  const removeGuardian = async (childId, guardianId) => {
    await apiRequest(`/api/children/${childId}/guardians/${guardianId}`, { method: "DELETE", token });
    await loadGuardians(childId);
  };

  const handleEditClick = (child) => {
    setEditingChild(child.id);
    setEditForm({ name: child.name, birthYear: child.birthYear || "" });
  };

  const handleUpdateChild = async (childId) => {
    try {
      await apiRequest(`/api/children/${childId}`, {
        method: "PUT",
        token,
        body: { name: editForm.name, birthYear: editForm.birthYear || null }
      });
      setEditingChild(null);
      await onUpdate();
    } catch (error) {
      alert(error.message || t("status.error"));
    }
  };

  const handleDeleteChild = async (childId) => {
    if (!window.confirm("هل أنت متأكد من حذف ملف هذا الطفل؟ لا يمكن التراجع عن هذا الإجراء.")) return;
    try {
      await apiRequest(`/api/children/${childId}`, { method: "DELETE", token });
      await onUpdate();
    } catch (error) {
      alert(error.message || t("status.error"));
    }
  };

  return (
    <div className="section-stack">
      <div className="card">
        <h2>{t("children.title")}</h2>
        <form onSubmit={handleCreateChild} className="form-grid">
          <label>
            <span>{t("children.name")}</span>
            <input name="name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
          </label>
          <label>
            <span>{t("children.birthYear")}</span>
            <input name="birthYear" value={form.birthYear} onChange={(e) => setForm((p) => ({ ...p, birthYear: e.target.value }))} />
          </label>
          <button className="primary" type="submit" disabled={status.loading}>{t("children.create")}</button>
        </form>
        {status.error && <div className="status error">{status.error}</div>}
      </div>

      {children.length === 0 && <div className="empty">{t("children.noChildren")}</div>}

      {children.map((child) => (
        <div key={child.id} className="card">
          <div className="card-header">
            {editingChild === child.id ? (
              <div style={{ display: "flex", gap: "8px", flex: 1, alignItems: "center", flexWrap: "wrap" }}>
                <input 
                  value={editForm.name} 
                  onChange={(e) => setEditForm(p => ({ ...p, name: e.target.value }))} 
                  placeholder={t("children.name")}
                  style={{ flex: 1, minWidth: "150px" }}
                />
                <input 
                  value={editForm.birthYear} 
                  onChange={(e) => setEditForm(p => ({ ...p, birthYear: e.target.value }))} 
                  placeholder={t("children.birthYear")}
                  style={{ width: "120px" }}
                />
                <button className="secondary" onClick={() => handleUpdateChild(child.id)}>{t("admin.save") || "حفظ"}</button>
                <button className="ghost" onClick={() => setEditingChild(null)}>{t("admin.cancel") || "إلغاء"}</button>
              </div>
            ) : (
              <div>
                <strong>{child.name}</strong>
                <span className="muted">{child.birthYear ? `${t("children.born")} ${child.birthYear}` : ""}</span>
              </div>
            )}
            
            {editingChild !== child.id && (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button className="ghost" onClick={() => handleEditClick(child)}>تعديل</button>
                <button className="ghost" style={{ color: "var(--danger)" }} onClick={() => handleDeleteChild(child.id)}>{t("actions.remove")}</button>
                <button className="ghost" onClick={() => loadDevices(child.id)}>{t("children.devices")}</button>
                <button className="ghost" onClick={() => loadGuardians(child.id)}>{t("children.guardians")}</button>
              </div>
            )}
          </div>

          {/* Devices */}
          <div className="device-form">
            <input placeholder={t("children.deviceName")} value={deviceName[child.id] || ""}
              onChange={(e) => setDeviceName((p) => ({ ...p, [child.id]: e.target.value }))} />
            <button className="secondary" type="button" onClick={() => createDevice(child.id)}>{t("children.addDevice")}</button>
          </div>
          <div className="device-list">
            {(devicesByChild[child.id] || []).map((device) => (
              <div key={device.id} className="device-item">
                <div>
                  <strong>{device.device_name}</strong>
                  <span className="muted">{t("children.token")}: {device.api_token}</span>
                </div>
                <span className="muted">{t("children.lastSeen")}: {device.last_seen_at ? formatDate(device.last_seen_at) : t("children.never")}</span>
              </div>
            ))}
          </div>

          {/* Guardians */}
          {guardiansByChild[child.id] && (
            <div style={{ marginTop: "16px", borderTop: "1px dashed var(--border)", paddingTop: "16px" }}>
              <h4 style={{ margin: "0 0 12px" }}>{t("children.guardians")}</h4>
              <div className="device-form">
                <input type="email" placeholder={t("children.guardianEmail")} value={guardianEmail[child.id] || ""}
                  onChange={(e) => setGuardianEmail((p) => ({ ...p, [child.id]: e.target.value }))} />
                <button className="secondary" type="button" onClick={() => inviteGuardian(child.id)}
                  disabled={guardianStatus[child.id]?.loading}>{t("children.inviteGuardian")}</button>
              </div>
              {guardianStatus[child.id]?.msg && (
                <div className={`status ${guardianStatus[child.id]?.error ? "error" : ""}`} style={{ marginTop: "8px" }}>
                  {guardianStatus[child.id].msg}
                </div>
              )}
              <div className="device-list">
                {guardiansByChild[child.id].map((g) => (
                  <div key={g.id} className="device-item">
                    <div>
                      <strong>{g.fullName}</strong>
                      <span className="muted">{g.email}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span className="pill">{g.role === "primary" ? t("children.primaryGuardian") : t("children.guardian")}</span>
                      {g.role !== "primary" && (
                        <button className="ghost" style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                          onClick={() => removeGuardian(child.id, g.id)}>{t("children.removeGuardian")}</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CategoriesSection({ token, children }) {
  const [selectedChild, setSelectedChild] = useState(children[0]?.id || "");
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState({ loading: false, message: "" });

  useEffect(() => {
    if (children.length > 0 && !selectedChild) {
      setSelectedChild(children[0].id);
    }
  }, [children, selectedChild]);

  useEffect(() => {
    if (!selectedChild) {
      return;
    }
    setStatus({ loading: true, message: "" });
    apiRequest(`/api/children/${selectedChild}/categories`, { token })
      .then((data) => {
        setCategories(data);
        setStatus({ loading: false, message: "" });
      })
      .catch((error) => {
        setStatus({ loading: false, message: error.message || t("status.error") });
      });
  }, [selectedChild, token]);

  const handleToggle = (categoryId) => {
    setCategories((prev) =>
      prev.map((category) =>
        category.id === categoryId ? { ...category, isBlocked: !category.isBlocked } : category
      )
    );
  };

  const handleSave = async () => {
    if (!selectedChild) {
      return;
    }
    setStatus({ loading: true, message: "" });
    try {
      await apiRequest(`/api/children/${selectedChild}/categories`, {
        method: "PUT",
        token,
        body: { categories }
      });
      setStatus({ loading: false, message: t("actions.saved") });
    } catch (error) {
      setStatus({ loading: false, message: error.message || t("status.error") });
    }
  };

  if (children.length === 0) {
    return <div className="empty">{t("categories.noChild")}</div>;
  }

  return (
    <div className="section-stack">
      <div className="card">
        <h2>{t("categories.title")}</h2>
        <label className="select-inline">
          <span>{t("categories.selectChild")}</span>
          <select value={selectedChild} onChange={(event) => setSelectedChild(event.target.value)}>
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.name}
              </option>
            ))}
          </select>
        </label>
        <div className="category-list">
          {categories.map((category) => {
            const label = formatCategoryLabel(category);
            return (
              <label key={category.id} className="category-item">
                <div>
                  <strong>{label.name}</strong>
                  {label.description && <span className="muted">{label.description}</span>}
                </div>
                <input
                  type="checkbox"
                  checked={category.isBlocked}
                  onChange={() => handleToggle(category.id)}
                />
              </label>
            );
          })}
        </div>
        <button className="primary" onClick={handleSave} disabled={status.loading}>
          {t("categories.save")}
        </button>
        {status.message && <div className="status">{status.message}</div>}
      </div>
    </div>
  );
}

function BlocklistSection({ token, children, activeChild, setActiveChild }) {
  const [rules, setRules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ pattern: "", ruleType: "domain", categoryId: "" });
  const [status, setStatus] = useState({ loading: false, error: "" });

  useEffect(() => {
    if (children && children.length > 0 && !activeChild) {
      setActiveChild(children[0].id);
    }
  }, [children, activeChild, setActiveChild]);

  const loadData = async () => {
    let url = "/api/blocklist/rules";
    if (activeChild && children) {
      const child = children.find(c => c.id === activeChild);
      if (child?.parentId) url += `?userId=${child.parentId}`;
    }
    const [rulesData, categoriesData] = await Promise.all([
      apiRequest(url, { token }),
      apiRequest("/api/blocklist/categories", { token })
    ]);
    setRules(rulesData);
    setCategories(categoriesData);
  };

  useEffect(() => {
    if (children && children.length > 0 && !activeChild) return;
    loadData().catch(() => undefined);
  }, [token, activeChild]);

  const handleCreate = async (event) => {
    event.preventDefault();
    setStatus({ loading: true, error: "" });
    try {
      let body = {
        pattern: form.pattern,
        ruleType: form.ruleType,
        categoryId: form.categoryId || null,
        childId: activeChild || null
      };
      if (activeChild && children) {
        const child = children.find(c => c.id === activeChild);
        if (child?.parentId) body.userId = child.parentId;
      }
      
      await apiRequest("/api/blocklist/rules", {
        method: "POST",
        token,
        body
      });
      setForm({ pattern: "", ruleType: "domain", categoryId: "" });
      await loadData();
      setStatus({ loading: false, error: "" });
    } catch (error) {
      setStatus({ loading: false, error: error.message || t("status.error") });
    }
  };

  const handleDelete = async (ruleId) => {
    await apiRequest(`/api/blocklist/rules/${ruleId}`, { method: "DELETE", token });
    await loadData();
  };

  return (
    <div className="section-stack">
      <div className="card">
        <h2>{t("blocklist.title")}</h2>
        
        {children && children.length > 0 && (
          <label className="select-inline" style={{ marginBottom: "24px", display: "inline-block" }}>
            <span>{t("nav.children")}</span>
            <select value={activeChild || ""} onChange={(e) => setActiveChild(parseInt(e.target.value, 10))}>
              {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        )}

        <form onSubmit={handleCreate} className="form-grid">
          <label>
            <span>{t("blocklist.pattern")}</span>
            <input
              value={form.pattern}
              onChange={(event) => setForm((prev) => ({ ...prev, pattern: event.target.value }))}
              required
            />
          </label>
          <label>
            <span>{t("blocklist.ruleType")}</span>
            <select
              value={form.ruleType}
              onChange={(event) => setForm((prev) => ({ ...prev, ruleType: event.target.value }))}
            >
              <option value="domain">{t("blocklist.domain")}</option>
              <option value="keyword">{t("blocklist.keyword")}</option>
              <option value="regex">{t("blocklist.regex")}</option>
            </select>
          </label>
          <label>
            <span>{t("blocklist.category")}</span>
            <select
              value={form.categoryId}
              onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value }))}
            >
              <option value="">{t("actions.none")}</option>
              {categories.map((category) => {
                const label = formatCategoryLabel(category);
                return (
                  <option key={category.id} value={category.id}>
                    {label.name}
                  </option>
                );
              })}
            </select>
          </label>
          <button className="primary" type="submit" disabled={status.loading}>
            {t("blocklist.create")}
          </button>
        </form>
        {status.error && <div className="status error">{status.error}</div>}
      </div>

      <div className="card">
        <h3>{t("blocklist.addRule")}</h3>
        {rules.length === 0 && <div className="empty">{t("blocklist.noRules")}</div>}
        <div className="rule-list">
          {rules.map((rule) => (
            <div key={rule.id} className="rule-item">
              <div>
                <strong>{rule.pattern}</strong>
                <span className="muted">{formatRuleType(rule.ruleType)}</span>
                {rule.childName && <span className="muted" style={{ marginInlineStart: "8px" }}>({rule.childName})</span>}
              </div>
              <button className="ghost" type="button" onClick={() => handleDelete(rule.id)}>
                {t("actions.remove")}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LogsSection({ token, children }) {
  const [logs, setLogs] = useState([]);
  const [filterChild, setFilterChild] = useState("");
  const [status, setStatus] = useState({ loading: false, error: "" });

  const loadLogs = async (childId) => {
    setStatus({ loading: true, error: "" });
    try {
      const query = childId ? `?childId=${childId}` : "";
      const data = await apiRequest(`/api/logs${query}`, { token });
      setLogs(data);
      setStatus({ loading: false, error: "" });
    } catch (error) {
      setStatus({ loading: false, error: error.message || t("status.error") });
    }
  };

  useEffect(() => {
    loadLogs(filterChild);
  }, [filterChild, token]);

  return (
    <div className="section-stack">
      <div className="card">
        <div className="card-header">
          <h2>{t("logs.title")}</h2>
          <label className="select-inline">
            <span>{t("logs.filterChild")}</span>
            <select value={filterChild} onChange={(event) => setFilterChild(event.target.value)}>
              <option value="">{t("actions.all")}</option>
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {status.error && <div className="status error">{status.error}</div>}
        {logs.length === 0 && !status.loading && <div className="empty">{t("logs.noLogs")}</div>}
        <div className="table">
          {logs.map((log) => (
            <div key={log.id} className={`table-row ${log.verdict}`}>
              <div>
                <strong>{log.hostname || log.url}</strong>
                <span className="muted">{log.childName}</span>
              </div>
              <div className="table-meta">
                <span>{formatVerdictLabel(log.verdict)}</span>
                <span className="muted">{formatDate(log.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AlertsSection({ token, children, onRefreshCount }) {
  const [alerts, setAlerts] = useState([]);
  const [filterChild, setFilterChild] = useState("");
  const [status, setStatus] = useState({ loading: false, error: "" });

  const loadAlerts = async (childId) => {
    setStatus({ loading: true, error: "" });
    try {
      const query = childId ? `?childId=${childId}` : "";
      const data = await apiRequest(`/api/alerts${query}`, { token });
      setAlerts(data);
      setStatus({ loading: false, error: "" });
      if (onRefreshCount) {
        onRefreshCount();
      }
    } catch (error) {
      setStatus({ loading: false, error: error.message || t("status.error") });
    }
  };

  useEffect(() => {
    loadAlerts(filterChild);
  }, [filterChild, token]);

  const markRead = async (alertId) => {
    await apiRequest(`/api/alerts/${alertId}/read`, { method: "PUT", token });
    await loadAlerts(filterChild);
    if (onRefreshCount) {
      onRefreshCount();
    }
  };

  return (
    <div className="section-stack">
      <div className="card">
        <div className="card-header">
          <h2>{t("alerts.title")}</h2>
          <label className="select-inline">
            <span>{t("logs.filterChild")}</span>
            <select value={filterChild} onChange={(event) => setFilterChild(event.target.value)}>
              <option value="">{t("actions.all")}</option>
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {status.error && <div className="status error">{status.error}</div>}
        {alerts.length === 0 && !status.loading && <div className="empty">{t("alerts.noAlerts")}</div>}
        <div className="table">
          {alerts.map((alert) => (
            <div key={alert.id} className={`table-row ${alert.isRead ? "read" : ""}`}>
              <div className="table-primary">
                <strong>{formatAlertMessage(alert)}</strong>
                <span className="muted">{alert.childName}</span>
              </div>
              <div className="table-meta">
                <span>{formatVerdictLabel(alert.alertType)}</span>
                <span className="muted">{formatDate(alert.createdAt)}</span>
                {!alert.isRead && (
                  <button className="ghost" onClick={() => markRead(alert.id)}>
                    {t("alerts.markRead")}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExtensionSection() {
  return (
    <div className="section-stack">
      <div className="card">
        <h2>{t("extension.title")}</h2>
        <p>{t("extension.steps")}</p>
        <ol className="steps">
          <li>{t("extension.step1")}</li>
          <li>{t("extension.step2")}</li>
          <li>{t("extension.step3")}</li>
          <li>{t("extension.step4")}</li>
        </ol>
      </div>
    </div>
  );
}

function ScreenTimeSection({ token, children }) {
  const [selectedChild, setSelectedChild] = useState(children[0]?.id || "");
  const [rules, setRules] = useState({ dailyLimitMinutes: null, bedtimeStart: null, bedtimeEnd: null, daysOfWeek: "0,1,2,3,4,5,6", isActive: false });
  const [usage, setUsage] = useState([]);
  const [siteLimits, setSiteLimits] = useState([]);
  const [newSiteLimit, setNewSiteLimit] = useState({ hostname: "", limitMinutes: "" });
  const [status, setStatus] = useState({ loading: false, message: "" });
  const dayLabels = [t("screentime.sun"), t("screentime.mon"), t("screentime.tue"), t("screentime.wed"), t("screentime.thu"), t("screentime.fri"), t("screentime.sat")];

  useEffect(() => { if (children.length > 0 && !selectedChild) setSelectedChild(children[0].id); }, [children]);

  useEffect(() => {
    if (!selectedChild) return;
    setStatus({ loading: true, message: "" });
    Promise.all([
      apiRequest(`/api/screentime/${selectedChild}`, { token }),
      apiRequest(`/api/screentime/${selectedChild}/usage?days=7`, { token }),
      apiRequest(`/api/screentime/${selectedChild}/sites`, { token })
    ]).then(([r, u, s]) => { setRules(r); setUsage(u); setSiteLimits(s); setStatus({ loading: false, message: "" }); })
      .catch((e) => setStatus({ loading: false, message: e.message }));
  }, [selectedChild, token]);

  const loadSiteLimits = async () => {
    const data = await apiRequest(`/api/screentime/${selectedChild}/sites`, { token });
    setSiteLimits(data);
  };

  const handleAddSiteLimit = async (e) => {
    e.preventDefault();
    if (!newSiteLimit.hostname || !newSiteLimit.limitMinutes) return;
    try {
      await apiRequest(`/api/screentime/${selectedChild}/sites`, {
        method: "POST", token, body: newSiteLimit
      });
      setNewSiteLimit({ hostname: "", limitMinutes: "" });
      await loadSiteLimits();
    } catch (err) {
      setStatus({ loading: false, message: err.message });
    }
  };

  const handleRemoveSiteLimit = async (siteId) => {
    try {
      await apiRequest(`/api/screentime/${selectedChild}/sites/${siteId}`, { method: "DELETE", token });
      await loadSiteLimits();
    } catch (err) {
      setStatus({ loading: false, message: err.message });
    }
  };

  const activeDays = new Set((rules.daysOfWeek || "0,1,2,3,4,5,6").split(",").map(Number));
  const toggleDay = (d) => {
    const next = new Set(activeDays);
    next.has(d) ? next.delete(d) : next.add(d);
    setRules((p) => ({ ...p, daysOfWeek: [...next].sort().join(",") }));
  };

  const handleSave = async () => {
    setStatus({ loading: true, message: "" });
    try {
      const data = await apiRequest(`/api/screentime/${selectedChild}`, { method: "PUT", token, body: rules });
      setRules(data);
      setStatus({ loading: false, message: t("actions.saved") });
    } catch (e) { setStatus({ loading: false, message: e.message }); }
  };

  if (children.length === 0) return <div className="empty">{t("categories.noChild")}</div>;

  const todayUsage = usage[0]?.usageMinutes || 0;
  const limit = rules.dailyLimitMinutes || 0;
  const pct = limit > 0 ? Math.min(100, Math.round((todayUsage / limit) * 100)) : 0;

  return (
    <div className="section-stack">
      <div className="card">
        <h2>{t("screentime.title")}</h2>
        <p className="muted">{t("screentime.subtitle")}</p>
        <label className="select-inline">
          <span>{t("screentime.selectChild")}</span>
          <select value={selectedChild} onChange={(e) => setSelectedChild(parseInt(e.target.value, 10))}>
            {children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      </div>

      <div className="card">
        <div className="card-header"><h3>{t("screentime.usage")}</h3>
          <span className="pill">{todayUsage} {t("screentime.minutes")}</span></div>
        {limit > 0 && (
          <div>
            <div className="stacked-bar" style={{ marginBottom: "8px" }}>
              <div className={`stacked-segment ${pct >= 100 ? "blocked" : "allowed"}`} style={{ width: `${pct}%` }}></div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
              <span className="muted">{t("screentime.used")}: {todayUsage} {t("screentime.minutes")}</span>
              <span className="muted">{pct >= 100 ? t("screentime.limitReached") : `${t("screentime.remaining")}: ${limit - todayUsage} ${t("screentime.minutes")}`}</span>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h3>{t("screentime.dailyLimit")}</h3>
        <p className="muted">{t("screentime.dailyLimitDesc")}</p>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <input type="range" min="0" max="480" step="15" value={rules.dailyLimitMinutes || 0}
            style={{ flex: 1 }}
            onChange={(e) => setRules((p) => ({ ...p, dailyLimitMinutes: Number(e.target.value) || null, isActive: true }))} />
          <strong style={{ minWidth: "80px", textAlign: "center" }}>
            {rules.dailyLimitMinutes ? `${Math.floor(rules.dailyLimitMinutes / 60)}h ${rules.dailyLimitMinutes % 60}m` : t("screentime.unlimited")}
          </strong>
        </div>
      </div>

      <div className="card">
        <h3>{t("screentime.bedtime")}</h3>
        <p className="muted">{t("screentime.bedtimeDesc")}</p>
        <div className="form-grid">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <label><span>{t("screentime.bedtimeStart")}</span>
              <input type="time" value={rules.bedtimeStart || ""} onChange={(e) => setRules((p) => ({ ...p, bedtimeStart: e.target.value, isActive: true }))} /></label>
            <label><span>{t("screentime.bedtimeEnd")}</span>
              <input type="time" value={rules.bedtimeEnd || ""} onChange={(e) => setRules((p) => ({ ...p, bedtimeEnd: e.target.value, isActive: true }))} /></label>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>{t("screentime.daysOfWeek")}</h3>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {dayLabels.map((label, i) => (
            <button key={i} className={activeDays.has(i) ? "primary" : "ghost"} type="button"
              style={{ minWidth: "50px", padding: "8px 12px" }} onClick={() => toggleDay(i)}>{label}</button>
          ))}
        </div>
      </div>

      <button className="primary" onClick={handleSave} disabled={status.loading}>{t("screentime.save")}</button>
      {status.message && <div className="status">{status.message}</div>}

      <div className="card">
        <h3>{t("screentime.siteLimitsTitle")}</h3>
        <p className="muted">{t("screentime.siteLimitsDesc")}</p>
        {selectedChild && children.length > 0 && (
          <div style={{ marginBottom: "12px", padding: "8px 12px", background: "var(--surface-alt, #f0f7f4)", borderRadius: "8px", fontSize: "0.9rem" }}>
            <strong>{children.find(c => c.id == selectedChild)?.name}</strong>
          </div>
        )}
        <form onSubmit={handleAddSiteLimit} className="device-form" style={{ marginBottom: "16px" }}>
          <input type="text" placeholder={t("screentime.hostname")} value={newSiteLimit.hostname} required
            onChange={(e) => setNewSiteLimit(p => ({...p, hostname: e.target.value}))} />
          <input type="number" placeholder={t("screentime.limitMinutes")} value={newSiteLimit.limitMinutes} min="1" required
            onChange={(e) => setNewSiteLimit(p => ({...p, limitMinutes: e.target.value}))} style={{ maxWidth: "150px" }} />
          <button className="secondary" type="submit">{t("screentime.addSite")}</button>
        </form>
        {siteLimits.length === 0 && <div className="empty">{t("screentime.noSites")}</div>}
        <div className="device-list">
          {siteLimits.map(site => (
            <div key={site.id} className="device-item">
              <div>
                <strong>{site.hostname}</strong>
                <span className="muted">{t("screentime.timeSpent")}: {site.usageMinutes} / {site.limitMinutes} {t("screentime.minutes")}</span>
                <span className="muted" style={{ marginInlineStart: "8px" }}>({children.find(c => c.id == selectedChild)?.name})</span>
              </div>
              <button className="ghost" style={{ padding: "6px 12px", fontSize: "0.8rem", color: "var(--danger)" }}
                onClick={() => handleRemoveSiteLimit(site.id)}>{t("screentime.remove")}</button>
            </div>
          ))}
        </div>
      </div>

      {usage.length > 0 && (
        <div className="card">
          <h3>{t("screentime.usageHistory")}</h3>
          <div className="chart-bars" style={{ gridTemplateColumns: `repeat(${Math.min(usage.length, 7)}, 1fr)` }}>
            {usage.slice(0, 7).reverse().map((u) => {
              const max = Math.max(...usage.map((x) => x.usageMinutes), 1);
              return (
                <div key={u.date} className="chart-bar">
                  <div className="bar" style={{ height: `${Math.round((u.usageMinutes / max) * 100)}%` }}></div>
                  <span>{u.usageMinutes}m</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function AppsSection({ token, children }) {
  const [selectedChild, setSelectedChild] = useState(children[0]?.id || "");
  const [appSettings, setAppSettings] = useState({ blockGamingSites: false, blockAppStores: false, blockInAppPurchases: true, maxGameTimeMinutes: null });
  const [safeSearch, setSafeSearch] = useState({ googleSafeSearch: true, youtubeRestricted: true, bingSafeSearch: true });
  const [recommendations, setRecommendations] = useState([]);
  const [recFilter, setRecFilter] = useState("");
  const [status, setStatus] = useState({ loading: false, message: "" });
  const [ssStatus, setSsStatus] = useState({ loading: false, message: "" });

  const childAge = children.find((c) => c.id == selectedChild)?.birthYear
    ? new Date().getFullYear() - children.find((c) => c.id == selectedChild).birthYear : null;

  useEffect(() => { if (children.length > 0 && !selectedChild) setSelectedChild(children[0].id); }, [children]);

  useEffect(() => {
    if (!selectedChild) return;
    Promise.all([
      apiRequest(`/api/apps/${selectedChild}/settings`, { token }),
      apiRequest(`/api/apps/${selectedChild}/safesearch`, { token }),
      apiRequest(`/api/apps/recommendations${childAge ? `?age=${childAge}` : ""}`, { token })
    ]).then(([a, s, r]) => { setAppSettings(a); setSafeSearch(s); setRecommendations(r); })
      .catch(() => {});
  }, [selectedChild, token]);

  const handleSaveApps = async () => {
    setStatus({ loading: true, message: "" });
    try {
      await apiRequest(`/api/apps/${selectedChild}/settings`, { method: "PUT", token, body: appSettings });
      setStatus({ loading: false, message: t("actions.saved") });
    } catch (e) { setStatus({ loading: false, message: e.message }); }
  };

  const handleSaveSafeSearch = async () => {
    setSsStatus({ loading: true, message: "" });
    try {
      await apiRequest(`/api/apps/${selectedChild}/safesearch`, { method: "PUT", token, body: safeSearch });
      setSsStatus({ loading: false, message: t("actions.saved") });
    } catch (e) { setSsStatus({ loading: false, message: e.message }); }
  };

  if (children.length === 0) return <div className="empty">{t("categories.noChild")}</div>;

  const cats = ["", "education", "entertainment", "games", "social", "tools"];
  const catLabels = { "": t("apps.allCategories"), education: t("apps.education"), entertainment: t("apps.entertainment"), games: t("apps.games"), social: t("apps.social"), tools: t("apps.tools") };
  const filtered = recFilter ? recommendations.filter((r) => r.category === recFilter) : recommendations;

  return (
    <div className="section-stack">
      <div className="card">
        <h2>{t("apps.title")}</h2>
        <p className="muted">{t("apps.subtitle")}</p>
        <label className="select-inline">
          <span>{t("apps.selectChild")}</span>
          <select value={selectedChild} onChange={(e) => setSelectedChild(e.target.value)}>
            {children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      </div>

      <div className="card">
        <h3>{t("apps.safeSearch")}</h3>
        <p className="muted">{t("apps.safeSearchDesc")}</p>
        <div className="category-list">
          <label className="category-item"><div><strong>{t("apps.googleSafe")}</strong><span className="muted">{t("apps.googleSafeDesc")}</span></div>
            <input type="checkbox" checked={safeSearch.googleSafeSearch} onChange={() => setSafeSearch((p) => ({ ...p, googleSafeSearch: !p.googleSafeSearch }))} /></label>
          <label className="category-item"><div><strong>{t("apps.youtubeRestricted")}</strong><span className="muted">{t("apps.youtubeRestrictedDesc")}</span></div>
            <input type="checkbox" checked={safeSearch.youtubeRestricted} onChange={() => setSafeSearch((p) => ({ ...p, youtubeRestricted: !p.youtubeRestricted }))} /></label>
          <label className="category-item"><div><strong>{t("apps.bingSafe")}</strong><span className="muted">{t("apps.bingSafeDesc")}</span></div>
            <input type="checkbox" checked={safeSearch.bingSafeSearch} onChange={() => setSafeSearch((p) => ({ ...p, bingSafeSearch: !p.bingSafeSearch }))} /></label>
        </div>
        <button className="primary" style={{ marginTop: "12px" }} onClick={handleSaveSafeSearch} disabled={ssStatus.loading}>{t("apps.save")}</button>
        {ssStatus.message && <div className="status" style={{ marginTop: "8px" }}>{ssStatus.message}</div>}
      </div>

      <div className="card">
        <h3>{t("apps.settings")}</h3>
        <div className="category-list">
          <label className="category-item"><div><strong>{t("apps.blockGaming")}</strong><span className="muted">{t("apps.blockGamingDesc")}</span></div>
            <input type="checkbox" checked={appSettings.blockGamingSites} onChange={() => setAppSettings((p) => ({ ...p, blockGamingSites: !p.blockGamingSites }))} /></label>
          <label className="category-item"><div><strong>{t("apps.blockStores")}</strong><span className="muted">{t("apps.blockStoresDesc")}</span></div>
            <input type="checkbox" checked={appSettings.blockAppStores} onChange={() => setAppSettings((p) => ({ ...p, blockAppStores: !p.blockAppStores }))} /></label>
          <label className="category-item"><div><strong>{t("apps.blockPurchases")}</strong><span className="muted">{t("apps.blockPurchasesDesc")}</span></div>
            <input type="checkbox" checked={appSettings.blockInAppPurchases} onChange={() => setAppSettings((p) => ({ ...p, blockInAppPurchases: !p.blockInAppPurchases }))} /></label>
        </div>
        <button className="primary" style={{ marginTop: "12px" }} onClick={handleSaveApps} disabled={status.loading}>{t("apps.save")}</button>
        {status.message && <div className="status" style={{ marginTop: "8px" }}>{status.message}</div>}
      </div>

      <div className="card">
        <div className="card-header">
          <h3>{t("apps.recommendations")}</h3>
          {childAge && <span className="pill">{t("apps.ages")} {childAge}</span>}
        </div>
        <p className="muted">{t("apps.recommendationsDesc")}</p>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
          {cats.map((c) => (
            <button key={c} className={recFilter === c ? "primary" : "ghost"} type="button"
              style={{ padding: "6px 14px", fontSize: "0.85rem" }} onClick={() => setRecFilter(c)}>{catLabels[c]}</button>
          ))}
        </div>
        {filtered.length === 0 && <div className="empty">{t("apps.noRecommendations")}</div>}
        <div className="rule-list">
          {filtered.map((app) => (
            <div key={app.id} className="rule-item" style={{ gridTemplateColumns: "1fr auto" }}>
              <div>
                <strong>{app.name}</strong>
                <span className="muted">{app.description}</span>
                <span className="muted" style={{ fontSize: "0.8rem" }}>{t("apps.ages")} {app.minAge}-{app.maxAge} · {catLabels[app.category] || app.category}</span>
              </div>
              {app.url && <a href={app.url} target="_blank" rel="noopener noreferrer" className="pill" style={{ textDecoration: "none" }}>{t("apps.visitSite")}</a>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  try {
    return new Intl.DateTimeFormat(getLanguage(), {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  } catch (error) {
    return date.toLocaleString();
  }
}

function getInitials(name) {
  if (!name) {
    return "KS";
  }
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0].toUpperCase()).join("");
}

function getProfileImageKey(userId) {
  return `kidsafe_profile_image_${userId}`;
}

function loadProfileImage(userId) {
  if (!userId) {
    return "";
  }
  return window.localStorage.getItem(getProfileImageKey(userId)) || "";
}

function saveProfileImage(userId, dataUrl) {
  if (!userId) {
    return;
  }
  const key = getProfileImageKey(userId);
  if (!dataUrl) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, dataUrl);
}

function buildActivitySeries(logs, locale = "en") {
  const now = new Date();
  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);
    const key = day.toISOString().slice(0, 10);
    const label = new Intl.DateTimeFormat(locale, { weekday: "short" }).format(day);
    days.push({ key, label, count: 0 });
  }
  const map = new Map(days.map((item) => [item.key, item]));
  logs.forEach((log) => {
    const date = new Date(log.createdAt);
    if (Number.isNaN(date.getTime())) {
      return;
    }
    const key = date.toISOString().slice(0, 10);
    const slot = map.get(key);
    if (slot) {
      slot.count += 1;
    }
  });
  return days;
}

function buildTopSites(logs) {
  const counts = new Map();
  logs
    .filter((log) => log.verdict === "blocked" || log.verdict === "malicious")
    .forEach((log) => {
      const host = log.hostname || extractHostname(log.url);
      if (!host) {
        return;
      }
      counts.set(host, (counts.get(host) || 0) + 1);
    });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([host, count]) => ({ host, count }));
}

function extractHostname(url) {
  if (!url) {
    return "";
  }
  try {
    return new URL(url).hostname;
  } catch (error) {
    return "";
  }
}

function formatVerdictLabel(verdict) {
  if (!verdict) {
    return "";
  }
  const key = `verdict.${verdict}`;
  const label = t(key);
  return label === key ? verdict : label;
}

function formatAlertMessage(alert) {
  if (!alert) {
    return "";
  }
  const site =
    alert.hostname ||
    extractHostname(alert.url) ||
    extractHostnameFromMessage(alert.message);
  const key =
    alert.alertType === "malicious"
      ? "alerts.maliciousAccess"
      : "alerts.attemptedAccess";
  const template = t(key);
  if (template === key) {
    return alert.message || site || "";
  }
  const displaySite = site || t("alerts.unknownSite");
  return template.replace("{site}", displaySite);
}

function formatRuleType(ruleType) {
  if (!ruleType) {
    return "";
  }
  const map = {
    domain: "blocklist.domain",
    keyword: "blocklist.keyword",
    regex: "blocklist.regex"
  };
  const key = map[ruleType];
  if (!key) {
    return ruleType;
  }
  const label = t(key);
  return label === key ? ruleType : label;
}

function extractHostnameFromMessage(message) {
  if (!message) {
    return "";
  }
  const match = message.match(/([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/);
  return match ? match[0] : "";
}

const CATEGORY_KEY_MAP = {
  "Adult Content": "adult_content",
  Gambling: "gambling",
  Violence: "violence",
  "Social Media": "social_media",
  Downloads: "downloads",
  Games: "games"
};

function formatCategoryLabel(category) {
  if (!category || !category.name) {
    return { name: "", description: "" };
  }
  const key = CATEGORY_KEY_MAP[category.name];
  if (!key) {
    return { name: category.name, description: category.description || "" };
  }
  const nameKey = `categoryLabels.${key}.name`;
  const descriptionKey = `categoryLabels.${key}.description`;
  const name = t(nameKey);
  const description = t(descriptionKey);
  return {
    name: name === nameKey ? category.name : name,
    description:
      description === descriptionKey ? category.description || "" : description
  };
}

function AdminSection({ token, activeTab }) {
  const [stats, setStats] = useState({ totalUsers: 0, totalChildren: 0, totalDevices: 0, totalAlerts: 0 });
  const [users, setUsers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: "" });

  // User Details Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState({ loading: false, children: [], alerts: [], error: "" });

  // Recommendations Form State
  const [showRecForm, setShowRecForm] = useState(false);
  const [editingRec, setEditingRec] = useState(null);
  const [recForm, setRecForm] = useState({ name: "", description: "", category: "education", url: "", minAge: 0, maxAge: 18 });

  const loadData = async () => {
    setStatus({ loading: true, error: "" });
    try {
      const [statsData, usersData, alertsData, recData] = await Promise.all([
        apiRequest("/api/admin/stats", { token }),
        apiRequest("/api/admin/users", { token }),
        apiRequest("/api/admin/alerts", { token }),
        apiRequest("/api/admin/recommendations", { token })
      ]);
      setStats(statsData);
      setUsers(usersData);
      setAlerts(alertsData);
      setRecommendations(recData);
      setStatus({ loading: false, error: "" });
    } catch (error) {
      setStatus({ loading: false, error: error.message });
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const handleDeleteUser = async (userId) => {
    if (!window.confirm(t("admin.deleteConfirm"))) return;
    setStatus((p) => ({ ...p, loading: true }));
    try {
      await apiRequest(`/api/admin/users/${userId}`, { method: "DELETE", token });
      await loadData();
    } catch (error) {
      setStatus({ loading: false, error: error.message });
    }
  };

  const loadUserDetails = async (user) => {
    setSelectedUser(user);
    setUserDetails({ loading: true, children: [], alerts: [], error: "" });
    try {
      const data = await apiRequest(`/api/admin/users/${user.id}/details`, { token });
      setUserDetails({ loading: false, children: data.children, alerts: data.alerts, error: "" });
    } catch (err) {
      setUserDetails({ loading: false, children: [], alerts: [], error: err.message });
    }
  };

  const handleSaveRecommendation = async (e) => {
    e.preventDefault();
    setStatus({ ...status, loading: true });
    try {
      if (editingRec) {
        await apiRequest(`/api/admin/recommendations/${editingRec.id}`, { method: "PUT", body: recForm, token });
      } else {
        await apiRequest("/api/admin/recommendations", { method: "POST", body: recForm, token });
      }
      setShowRecForm(false);
      setEditingRec(null);
      await loadData();
    } catch (err) {
      setStatus({ loading: false, error: err.message });
    }
  };

  const handleDeleteRecommendation = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    setStatus({ ...status, loading: true });
    try {
      await apiRequest(`/api/admin/recommendations/${id}`, { method: "DELETE", token });
      await loadData();
    } catch (err) {
      setStatus({ loading: false, error: err.message });
    }
  };

  if (status.loading && users.length === 0) return <div className="status">{t("status.loading")}</div>;

  return (
    <div className="section-stack">
      <div className="card" style={{ paddingBottom: 0, borderBottom: "none", display: "none" }}>
        <h2>{t("admin.title")}</h2>
      </div>

      {status.error && <div className="status error">{status.error}</div>}

      {activeTab === "overview" && (
        <div className="card">
          <h3>{t("admin.overview")}</h3>
          <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginTop: "16px" }}>
            <div className="stat-card" style={{ padding: "20px", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--primary)" }}>{stats.totalUsers}</div>
              <div className="muted">{t("admin.totalUsers")}</div>
            </div>
            <div className="stat-card" style={{ padding: "20px", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--primary)" }}>{stats.totalChildren}</div>
              <div className="muted">{t("admin.totalChildren")}</div>
            </div>
            <div className="stat-card" style={{ padding: "20px", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--primary)" }}>{stats.totalDevices}</div>
              <div className="muted">{t("admin.totalDevices")}</div>
            </div>
            <div className="stat-card" style={{ padding: "20px", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--danger)" }}>{stats.totalAlerts}</div>
              <div className="muted">{t("admin.totalAlerts")}</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "users" && (
        <div className="card">
          <h3>{t("admin.usersManagement")}</h3>
          {users.length === 0 ? (
            <div className="empty">{t("admin.noUsers")}</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "16px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                    <th style={{ padding: "12px 8px" }}>{t("admin.fullName")}</th>
                    <th style={{ padding: "12px 8px" }}>{t("admin.email")}</th>
                    <th style={{ padding: "12px 8px" }}>{t("admin.registered")}</th>
                    <th style={{ padding: "12px 8px" }}>{t("admin.childrenCount")}</th>
                    <th style={{ padding: "12px 8px", textAlign: "right" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "12px 8px" }}>
                        {u.fullName} {u.isAdmin ? <span className="pill" style={{background: "var(--primary)", color: "white", fontSize: "0.7rem"}}>Admin</span> : ""}
                      </td>
                      <td style={{ padding: "12px 8px" }}>{u.email}</td>
                      <td style={{ padding: "12px 8px" }} className="muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: "12px 8px" }}>{u.childCount}</td>
                      <td style={{ padding: "12px 8px", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          <button className="secondary" style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                                  onClick={() => loadUserDetails(u)}>
                            {t("admin.viewDetails")}
                          </button>
                          {!u.isAdmin && (
                            <button className="ghost" style={{ color: "var(--danger)", padding: "6px 12px", fontSize: "0.85rem" }}
                                    onClick={() => handleDeleteUser(u.id)}>
                              {t("admin.deleteUser")}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "alerts" && (
        <div className="card">
          <h3>{t("admin.globalActivity")}</h3>
          {alerts.length === 0 ? (
            <div className="empty">{t("alerts.noAlerts")}</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "16px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                    <th style={{ padding: "12px 8px" }}>{t("admin.date")}</th>
                    <th style={{ padding: "12px 8px" }}>{t("admin.parentEmail")}</th>
                    <th style={{ padding: "12px 8px" }}>{t("admin.childName")}</th>
                    <th style={{ padding: "12px 8px" }}>{t("admin.type")}</th>
                    <th style={{ padding: "12px 8px" }}>{t("admin.message")}</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map(a => (
                    <tr key={a.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "12px 8px", whiteSpace: "nowrap" }} className="muted">{new Date(a.created_at).toLocaleString()}</td>
                      <td style={{ padding: "12px 8px" }}>{a.parentEmail}</td>
                      <td style={{ padding: "12px 8px" }}>{a.childName}</td>
                      <td style={{ padding: "12px 8px" }}>
                        <span className={`pill ${a.alert_type === 'emergency' ? 'danger' : 'warning'}`}>
                          {t(`alerts.${a.alert_type}`) || a.alert_type}
                        </span>
                      </td>
                      <td style={{ padding: "12px 8px" }}>{a.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {activeTab === "recommendations" && (
        <div className="card">
          <div className="card-header">
            <h3>{t("admin.manageRecommendations")}</h3>
            {!showRecForm && (
              <button className="primary" onClick={() => { setEditingRec(null); setRecForm({ name: "", description: "", category: "education", url: "", minAge: 0, maxAge: 18 }); setShowRecForm(true); }}>
                {t("admin.addRecommendation")}
              </button>
            )}
          </div>
          
          {showRecForm && (
            <form onSubmit={handleSaveRecommendation} className="auth-form" style={{ background: "var(--bg-secondary)", padding: "16px", borderRadius: "8px", marginBottom: "16px" }}>
              <label><span>{t("admin.recName")}</span> <input required value={recForm.name} onChange={e => setRecForm(p => ({...p, name: e.target.value}))} /></label>
              <label><span>{t("admin.recDesc")}</span> <input value={recForm.description} onChange={e => setRecForm(p => ({...p, description: e.target.value}))} /></label>
              <label><span>{t("admin.recCategory")}</span>
                <select value={recForm.category} onChange={e => setRecForm(p => ({...p, category: e.target.value}))}>
                  <option value="education">Education</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="games">Games</option>
                  <option value="social">Social</option>
                  <option value="tools">Tools</option>
                </select>
              </label>
              <label><span>{t("admin.recUrl")}</span> <input type="url" value={recForm.url} onChange={e => setRecForm(p => ({...p, url: e.target.value}))} /></label>
              <div style={{ display: "flex", gap: "16px" }}>
                <label style={{ flex: 1 }}><span>{t("admin.recMinAge")}</span> <input type="number" value={recForm.minAge} onChange={e => setRecForm(p => ({...p, minAge: e.target.value}))} /></label>
                <label style={{ flex: 1 }}><span>{t("admin.recMaxAge")}</span> <input type="number" value={recForm.maxAge} onChange={e => setRecForm(p => ({...p, maxAge: e.target.value}))} /></label>
              </div>
              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <button type="submit" className="primary">{t("admin.save")}</button>
                <button type="button" className="ghost" onClick={() => setShowRecForm(false)}>{t("admin.cancel")}</button>
              </div>
            </form>
          )}

          <div className="rule-list">
            {recommendations.map(r => (
              <div key={r.id} className="rule-item" style={{ gridTemplateColumns: "1fr auto" }}>
                <div>
                  <strong>{r.name}</strong> <span className="pill">{r.category}</span>
                  <div className="muted">{r.description}</div>
                  <div className="muted" style={{ fontSize: "0.8rem" }}>{t("admin.recMinAge")}: {r.minAge} - {t("admin.recMaxAge")}: {r.maxAge}</div>
                </div>
                <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
                  <button className="secondary" style={{ padding: "4px 8px", fontSize: "0.8rem" }} onClick={() => { setEditingRec(r); setRecForm({ name: r.name, description: r.description, category: r.category, url: r.url, minAge: r.minAge, maxAge: r.maxAge }); setShowRecForm(true); }}>{t("admin.editRecommendation")}</button>
                  <button className="ghost" style={{ padding: "4px 8px", fontSize: "0.8rem", color: "var(--danger)" }} onClick={() => handleDeleteRecommendation(r.id)}>{t("admin.deleteRecommendation")}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedUser && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div className="card" style={{ width: "100%", maxWidth: "600px", maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
            <button className="ghost" style={{ position: "absolute", top: "16px", right: "16px" }} onClick={() => setSelectedUser(null)}>✕</button>
            <h3>{selectedUser.fullName}</h3>
            <p className="muted">{selectedUser.email}</p>
            
            {userDetails.loading ? <div className="status">{t("status.loading")}</div> : (
              <div style={{ marginTop: "24px" }}>
                <h4>{t("admin.childrenCount")} ({userDetails.children.length})</h4>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "24px", marginTop: "8px" }}>
                  {userDetails.children.map(c => <span key={c.id} className="pill" style={{ fontSize: "0.9rem" }}>{c.name} (Age: {new Date().getFullYear() - c.birthYear})</span>)}
                </div>

                <h4>{t("nav.alerts")} ({userDetails.alerts.length})</h4>
                {userDetails.alerts.length === 0 ? <div className="empty">No alerts</div> : (
                  <div className="rule-list" style={{ marginTop: "8px" }}>
                    {userDetails.alerts.map(a => (
                      <div key={a.id} className="rule-item">
                        <div>
                          <strong>{a.childName}</strong> <span className={`pill ${a.alert_type === 'emergency' ? 'danger' : 'warning'}`}>{a.alert_type}</span>
                          <div className="muted">{a.message}</div>
                          <div className="muted" style={{ fontSize: "0.8rem" }}>{new Date(a.created_at).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
