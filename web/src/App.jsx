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
      setStatus({ loading: false, error: error.message || t("status.error") });
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
    () => [
      { id: "overview", label: t("nav.overview") },
      { id: "profile", label: t("nav.profile") },
      { id: "children", label: t("nav.children") },
      { id: "categories", label: t("nav.categories") },
      { id: "blocklist", label: t("nav.blocklist") },
      { id: "logs", label: t("nav.logs") },
      { id: "alerts", label: t("nav.alerts") },
      { id: "extension", label: t("nav.extension") }
    ],
    [language]
  );

  const active = activeSection || "overview";
  const [children, setChildren] = useState([]);
  const [childrenStatus, setChildrenStatus] = useState({ loading: false, error: "" });
  const [alertCount, setAlertCount] = useState(0);
  const handleNavigate = (sectionId) => {
    if (onNavigate) {
      onNavigate(sectionId);
    }
  };

  const loadChildren = async () => {
    setChildrenStatus({ loading: true, error: "" });
    try {
      const data = await apiRequest("/api/children", { token });
      setChildren(data);
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
    return () => window.clearInterval(id);
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
        {active === "overview" && (
          <OverviewSection
            token={token}
            user={user}
            children={children}
            alertCount={alertCount}
            onNavigate={handleNavigate}
            language={language}
          />
        )}
        {active === "profile" && (
          <ProfileSection
            token={token}
            user={user}
            profileImage={profileImage}
            onProfileImageChange={onProfileImageChange}
            onUserUpdate={onUserUpdate}
          />
        )}
        {active === "children" && (
          <ChildrenSection token={token} children={children} onRefresh={loadChildren} />
        )}
        {active === "categories" && (
          <CategoriesSection token={token} children={children} />
        )}
        {active === "blocklist" && <BlocklistSection token={token} />}
        {active === "logs" && <LogsSection token={token} children={children} />}
        {active === "alerts" && (
          <AlertsSection
            token={token}
            children={children}
            onRefreshCount={loadAlertCount}
          />
        )}
        {active === "extension" && <ExtensionSection />}
      </section>
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

function ChildrenSection({ token, children, onRefresh }) {
  const [form, setForm] = useState({ name: "", birthYear: "" });
  const [status, setStatus] = useState({ loading: false, error: "" });
  const [devicesByChild, setDevicesByChild] = useState({});
  const [deviceName, setDeviceName] = useState({});

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
      await onRefresh();
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
    if (!name) {
      return;
    }
    const data = await apiRequest(`/api/children/${childId}/devices`, {
      method: "POST",
      token,
      body: { deviceName: name }
    });
    setDeviceName((prev) => ({ ...prev, [childId]: "" }));
    await loadDevices(childId);
    return data;
  };

  return (
    <div className="section-stack">
      <div className="card">
        <h2>{t("children.title")}</h2>
        <form onSubmit={handleCreateChild} className="form-grid">
          <label>
            <span>{t("children.name")}</span>
            <input
              name="name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
          </label>
          <label>
            <span>{t("children.birthYear")}</span>
            <input
              name="birthYear"
              value={form.birthYear}
              onChange={(event) => setForm((prev) => ({ ...prev, birthYear: event.target.value }))}
            />
          </label>
          <button className="primary" type="submit" disabled={status.loading}>
            {t("children.create")}
          </button>
        </form>
        {status.error && <div className="status error">{status.error}</div>}
      </div>

      {children.length === 0 && <div className="empty">{t("children.noChildren")}</div>}

      {children.map((child) => (
        <div key={child.id} className="card">
          <div className="card-header">
            <div>
              <strong>{child.name}</strong>
              <span className="muted">
                {child.birthYear ? `${t("children.born")} ${child.birthYear}` : ""}
              </span>
            </div>
            <button className="ghost" onClick={() => loadDevices(child.id)}>
              {t("children.devices")}
            </button>
          </div>
          <div className="device-form">
            <input
              placeholder={t("children.deviceName")}
              value={deviceName[child.id] || ""}
              onChange={(event) =>
                setDeviceName((prev) => ({ ...prev, [child.id]: event.target.value }))
              }
            />
            <button className="secondary" type="button" onClick={() => createDevice(child.id)}>
              {t("children.addDevice")}
            </button>
          </div>
          <div className="device-list">
            {(devicesByChild[child.id] || []).map((device) => (
              <div key={device.id} className="device-item">
                <div>
                  <strong>{device.device_name}</strong>
                  <span className="muted">
                    {t("children.token")}: {device.api_token}
                  </span>
                </div>
                <span className="muted">
                  {t("children.lastSeen")}:{" "}
                  {device.last_seen_at ? formatDate(device.last_seen_at) : t("children.never")}
                </span>
              </div>
            ))}
          </div>
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

function BlocklistSection({ token }) {
  const [rules, setRules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ pattern: "", ruleType: "domain", categoryId: "" });
  const [status, setStatus] = useState({ loading: false, error: "" });

  const loadData = async () => {
    const [rulesData, categoriesData] = await Promise.all([
      apiRequest("/api/blocklist/rules", { token }),
      apiRequest("/api/blocklist/categories", { token })
    ]);
    setRules(rulesData);
    setCategories(categoriesData);
  };

  useEffect(() => {
    loadData().catch(() => undefined);
  }, [token]);

  const handleCreate = async (event) => {
    event.preventDefault();
    setStatus({ loading: true, error: "" });
    try {
      await apiRequest("/api/blocklist/rules", {
        method: "POST",
        token,
        body: {
          pattern: form.pattern,
          ruleType: form.ruleType,
          categoryId: form.categoryId || null
        }
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
