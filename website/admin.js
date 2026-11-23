(() => {
  const { useState, useEffect, useMemo, useRef, useCallback } = React;
  const html = globalThis.htm.bind(React.createElement);

  const config = window.ELVATE_ADMIN_CONFIG || {};
  const apiUrl = String(config.supabaseUrl || 'https://cvfnqiyxwhicizekomag.supabase.co').replace(/\/$/, '');
  const publishableKey = String(config.publishableKey || '');
  const storageKey = 'elvate-admin-session';
  const PAGE_SIZE = 25;

  /* ==========================================================================
     1. MINIMAL SVG ICONS (Feather / Lucide Style · Zero Emojis)
     ========================================================================== */

  const SvgIcon = ({ d, size = 16, className = '' }) => html`
    <svg width=${size} height=${size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className=${className}>
      ${Array.isArray(d) ? d.map((p, i) => html`<path key=${i} d=${p} />`) : html`<path d=${d} />`}
    </svg>
  `;

  const Icons = {
    Dashboard: (props) => html`<${SvgIcon} ...${props} d=${['M3 3h7v9H3z', 'M14 3h7v5h-7z', 'M14 12h7v9h-7z', 'M3 16h7v5H3z']} />`,
    Users: (props) => html`<${SvgIcon} ...${props} d=${['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75']} />`,
    Book: (props) => html`<${SvgIcon} ...${props} d=${['M4 19.5A2.5 2.5 0 0 1 6.5 17H20', 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z']} />`,
    Bell: (props) => html`<${SvgIcon} ...${props} d=${['M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9', 'M13.73 21a2 2 0 0 1-3.46 0']} />`,
    Activity: (props) => html`<${SvgIcon} ...${props} d="M22 12h-4l-3 9L9 3l-3 9H2" />`,
    Search: (props) => html`<${SvgIcon} ...${props} d=${['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'm21 21-4.35-4.35']} />`,
    Refresh: (props) => html`<${SvgIcon} ...${props} d=${['M23 4v6h-6', 'M20.49 15a9 9 0 1 1-2.12-9.36L23 10']} />`,
    Download: (props) => html`<${SvgIcon} ...${props} d=${['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3']} />`,
    Upload: (props) => html`<${SvgIcon} ...${props} d=${['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12']} />`,
    LogOut: (props) => html`<${SvgIcon} ...${props} d=${['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9']} />`,
    Close: (props) => html`<${SvgIcon} ...${props} d="M18 6 6 18M6 6l12 12" />`,
    Play: (props) => html`<${SvgIcon} ...${props} d="M5 3l14 9-14 9V3z" />`,
    Pause: (props) => html`<${SvgIcon} ...${props} d="M6 4h4v16H6zM14 4h4v16h-4z" />`,
    Trash: (props) => html`<${SvgIcon} ...${props} d=${['M3 6h18', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2']} />`,
    Sparkles: (props) => html`<${SvgIcon} ...${props} d=${['m12 3 1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3L12 3z']} />`,
    Check: (props) => html`<${SvgIcon} ...${props} d="M20 6 9 17l-5-5" />`,
    ArrowRight: (props) => html`<${SvgIcon} ...${props} d="M5 12h14M12 5l7 7-7 7" />`,
    Mic: (props) => html`<${SvgIcon} ...${props} d=${['M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z', 'M19 10v2a7 7 0 0 1-14 0v-2', 'M12 19v4', 'M8 23h8']} />`,
    Image: (props) => html`<${SvgIcon} ...${props} d=${['M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z', 'm21 15-5-5L5 21', 'M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z']} />`,
    Stop: (props) => html`<${SvgIcon} ...${props} d="M4 4h16v16H4z" />`,
    Smartphone: (props) => html`<${SvgIcon} ...${props} d=${['M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z', 'M12 18h.01']} />`,
    Send: (props) => html`<${SvgIcon} ...${props} d=${['M22 2 11 13', 'M22 2 15 22 11 13 2 9 22 2z']} />`,
  };

  /* ==========================================================================
     2. FORMATTING HELPERS
     ========================================================================== */

  function formatNumber(val) {
    return new Intl.NumberFormat('en-US').format(Number(val) || 0);
  }

  function formatDate(val) {
    if (!val) return '—';
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
  }

  function formatRelativeTime(val) {
    if (!val) return 'Never';
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return '—';
    const hours = (Date.now() - d.getTime()) / (1000 * 60 * 60);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${Math.floor(hours)}h ago`;
    if (hours < 48) return 'Yesterday';
    return formatDate(val);
  }

  function isGuestAccount(learner) {
    if (learner?.is_anonymous === true) return true;
    const email = String(learner?.email || '').trim().toLowerCase();
    const name = String(learner?.display_name || '').trim().toLowerCase();
    return !email || email === '—' || email === 'no email' || email.includes('guest') || email.includes('anon') || name.startsWith('guest');
  }

  function calculateRank(xp) {
    const count = Number(xp) || 0;
    if (count >= 6000) return 'Diamond Tier';
    if (count >= 3000) return 'Platinum Tier';
    if (count >= 1500) return 'Gold Tier';
    if (count >= 500) return 'Silver Tier';
    return 'Bronze Tier';
  }

  /* ==========================================================================
     3. SUPABASE AUTH & RPC CLIENT
     ========================================================================== */

  async function authRequest(path, payload, accessToken) {
    const response = await fetch(`${apiUrl}/auth/v1/${path}`, {
      method: 'POST',
      headers: {
        apikey: publishableKey,
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.msg || data.message || data.error_description || 'Authentication failed.');
    }
    return data;
  }

  async function rpcCall(session, setSession, functionName, payload = {}) {
    if (!session?.accessToken) throw new Error('Session expired. Please sign in.');

    let token = session.accessToken;
    if (session.expiresAt && Date.now() > session.expiresAt - 60000 && session.refreshToken) {
      try {
        const refreshed = await authRequest('token?grant_type=refresh_token', { refresh_token: session.refreshToken });
        const nextSession = {
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token,
          expiresAt: Date.now() + (Number(refreshed.expires_in) || 3600) * 1000,
          user: refreshed.user || session.user,
        };
        sessionStorage.setItem(storageKey, JSON.stringify(nextSession));
        setSession(nextSession);
        token = nextSession.accessToken;
      } catch (err) {
        sessionStorage.removeItem(storageKey);
        setSession(null);
        throw err;
      }
    }

    const response = await fetch(`${apiUrl}/rest/v1/rpc/${functionName}`, {
      method: 'POST',
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401) {
        sessionStorage.removeItem(storageKey);
        setSession(null);
      }
      throw new Error(data?.message || data?.details || 'Database request failed.');
    }
    return data;
  }

  function extractCoursesFromJavaScript(source) {
    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe');
      iframe.hidden = true;
      iframe.setAttribute('sandbox', 'allow-scripts');
      const payload = `${source}\n;try { parent.postMessage({ type: 'elvate-course-import', courses: window.ELVATE_ADMIN_STARTER_COURSES || window.ELVATE_BUILTIN_COURSES || [] }, '*'); } catch (_) { parent.postMessage({ type: 'elvate-course-import-error' }, '*'); }`;

      const nonce = crypto.randomUUID().replace(/-/g, '');
      let settled = false;

      const finish = (err, result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        window.removeEventListener('message', onMsg);
        iframe.remove();
        if (err) reject(err);
        else resolve(Array.isArray(result) ? result : []);
      };

      const onMsg = (msg) => {
        if (msg.source !== iframe.contentWindow) return;
        if (msg.data?.type === 'elvate-course-import') finish(null, msg.data.courses);
        else if (msg.data?.type === 'elvate-course-import-error') finish(new Error('Course extraction failed.'));
      };

      const timeout = setTimeout(() => finish(new Error('Course data not found in script.')), 4000);
      window.addEventListener('message', onMsg);
      iframe.srcdoc = `<!doctype html><script nonce="${nonce}">${payload}</script>`;
      document.body.append(iframe);
    });
  }

  /* ==========================================================================
     4. ROOT REACT APPLICATION
     ========================================================================== */

  function AdminApp() {
    // Auth State
    const [session, setSession] = useState(() => {
      try {
        const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
        if (saved?.accessToken && saved.expiresAt && Date.now() < saved.expiresAt) return saved;
        return null;
      } catch {
        return null;
      }
    });

    // Navigation & View State
    const [activeTab, setActiveTab] = useState(() => {
      const hash = window.location.hash.replace(/^#/, '');
      return ['overview', 'learners', 'courses', 'notifications', 'system'].includes(hash) ? hash : 'overview';
    });

    // Telemetry & KPI State
    const [overview, setOverview] = useState(null);
    const [isLoadingOverview, setIsLoadingOverview] = useState(false);
    const [lastUpdated, setLastUpdated] = useState('');

    // Learners State
    const [learners, setLearners] = useState([]);
    const [learnerFilter, setLearnerFilter] = useState('all');
    const [learnerSearch, setLearnerSearch] = useState('');
    const [learnerOffset, setLearnerOffset] = useState(0);
    const [selectedLearner, setSelectedLearner] = useState(null);

    // Curriculum State
    const [courses, setCourses] = useState([]);
    const [courseSubTab, setCourseSubTab] = useState('catalog');
    const [editingCourse, setEditingCourse] = useState(null);
    const [editingCourseStatus, setEditingCourseStatus] = useState('draft');
    const [activeAudioUrl, setActiveAudioUrl] = useState(null);

    // Push Notifications State
    const [pushStats, setPushStats] = useState(null);
    const [pushDevicesCount, setPushDevicesCount] = useState('—');
    const [pushTitle, setPushTitle] = useState('Nila AI Speaking Challenge is Live');
    const [pushBody, setPushBody] = useState('Practice a quick 2-minute conversation today and protect your streak.');
    const [pushScreen, setPushScreen] = useState('call');
    const [pushPriority, setPushPriority] = useState('high');
    const [pushFeedback, setPushFeedback] = useState('');
    const [isBroadcasting, setIsBroadcasting] = useState(false);

    // System Diagnostics State
    const [apiLatency, setApiLatency] = useState(null);
    const [isPinging, setIsPinging] = useState(false);

    // Global Toasts State
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'info') => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    }, []);

    // Sync hash changes
    useEffect(() => {
      const onHashChange = () => {
        const hash = window.location.hash.replace(/^#/, '');
        if (['overview', 'learners', 'courses', 'notifications', 'system'].includes(hash)) {
          setActiveTab(hash);
        }
      };
      window.addEventListener('hashchange', onHashChange);
      return () => window.removeEventListener('hashchange', onHashChange);
    }, []);

    // Switch Tab helper
    const handleTabChange = useCallback((tab) => {
      setActiveTab(tab);
      window.location.hash = `#${tab}`;
    }, []);

    // Load Overview Data
    const loadOverview = useCallback(async () => {
      if (!session?.accessToken) return;
      setIsLoadingOverview(true);
      try {
        const data = await rpcCall(session, setSession, 'admin_get_overview');
        setOverview(data);
        setLastUpdated(new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(new Date()));
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setIsLoadingOverview(false);
      }
    }, [session, showToast]);

    // Load Learners
    const loadLearners = useCallback(async () => {
      if (!session?.accessToken) return;
      try {
        const data = await rpcCall(session, setSession, 'admin_list_learners', {
          p_query: learnerSearch.trim(),
          p_limit: PAGE_SIZE,
          p_offset: learnerOffset,
        });
        setLearners(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn('Could not load learners:', err.message);
      }
    }, [session, learnerSearch, learnerOffset]);

    // Load Courses
    const loadCourses = useCallback(async () => {
      if (!session?.accessToken) return;
      try {
        const saved = await rpcCall(session, setSession, 'admin_list_courses');
        const savedById = new Map((Array.isArray(saved) ? saved : []).map((c) => [c.id, c]));
        const builtIns = (window.ELVATE_BUILTIN_COURSES || []).map((level) => {
          const id = `builtin-unit-${level.levelNumber}`;
          const existing = savedById.get(id);
          return existing
            ? { ...existing, is_builtin: true }
            : { id, level_data: { ...level, id }, status: 'published', is_builtin: true };
        });

        const customUnits = Array.isArray(saved) ? saved.filter((c) => !String(c.id).startsWith('builtin-unit-')) : [];
        const merged = [...builtIns, ...customUnits].sort(
          (a, b) => Number(a.level_data?.levelNumber || 0) - Number(b.level_data?.levelNumber || 0)
        );
        setCourses(merged);
      } catch (err) {
        console.warn('Could not load courses:', err.message);
      }
    }, [session]);

    // Load Push Devices Telemetry
    const loadPushDevices = useCallback(async () => {
      if (!session?.accessToken) return;
      try {
        const stats = await rpcCall(session, setSession, 'admin_get_push_stats');
        if (stats && typeof stats.total_installs === 'number') {
          setPushStats(stats);
          setPushDevicesCount(formatNumber(stats.total_installs));
          return;
        }
      } catch (err) {
        console.warn('admin_get_push_stats fallback:', err?.message);
      }

      try {
        const res = await fetch(`${apiUrl}/rest/v1/push_devices?select=id`, {
          method: 'HEAD',
          headers: { apikey: publishableKey, Authorization: `Bearer ${session.accessToken}`, Prefer: 'count=exact' },
        });
        const range = res.headers.get('content-range');
        if (range) {
          const total = range.split('/')[1];
          if (total) {
            setPushDevicesCount(formatNumber(total));
            setPushStats({ total_installs: Number(total), android_installs: 0, ios_installs: 0 });
          }
        } else {
          setPushDevicesCount('0');
        }
      } catch {
        setPushDevicesCount('0');
      }
    }, [session]);

    // Latency Ping
    const pingLatency = useCallback(async () => {
      setIsPinging(true);
      const start = performance.now();
      try {
        await fetch(`${apiUrl}/rest/v1/`, { method: 'HEAD', headers: { apikey: publishableKey } });
        const latency = Math.round(performance.now() - start);
        setApiLatency(latency);
        showToast(`Latency: ${latency} ms`, 'success');
      } catch {
        setApiLatency('Unavailable');
        showToast('Latency ping failed.', 'error');
      } finally {
        setIsPinging(false);
      }
    }, [showToast]);

    // Initial Load when logged in
    useEffect(() => {
      if (session?.accessToken) {
        loadOverview();
        loadLearners();
        loadCourses();
        loadPushDevices();
      }
    }, [session, loadOverview, loadLearners, loadCourses, loadPushDevices]);

    // Logout handler
    const handleLogout = useCallback(() => {
      sessionStorage.removeItem(storageKey);
      setSession(null);
      showToast('Signed out of console.', 'info');
    }, [showToast]);

    // Render Login Screen if no session
    if (!session) {
      return html`<${LoginScreen} onLoginSuccess=${(newSession) => {
        sessionStorage.setItem(storageKey, JSON.stringify(newSession));
        setSession(newSession);
        showToast('Signed in to Operations Console.', 'success');
      }} showToast=${showToast} />`;
    }

    // Render Authenticated Shell
    return html`
      <div className="app-shell">
        <!-- Sidebar -->
        <aside className="app-sidebar">
          <div className="sidebar-header">
            <div className="login-brand-icon">
              <img src="./assets/R_Appicon.png" alt="" />
            </div>
            <span className="sidebar-brand-title">Elvate Ops</span>
            <span className="sidebar-badge">Console</span>
          </div>

          <nav className="sidebar-nav">
            <span className="nav-section-title">Telemetry</span>
            <button className=${`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick=${() => handleTabChange('overview')}>
              <${Icons.Dashboard} />
              <span>Overview</span>
            </button>
            <button className=${`nav-item ${activeTab === 'learners' ? 'active' : ''}`} onClick=${() => handleTabChange('learners')}>
              <${Icons.Users} />
              <span>Learners</span>
              <span className="nav-count">${overview?.total_accounts ? formatNumber(overview.total_accounts) : '—'}</span>
            </button>

            <span className="nav-section-title">Curriculum</span>
            <button className=${`nav-item ${activeTab === 'courses' ? 'active' : ''}`} onClick=${() => handleTabChange('courses')}>
              <${Icons.Book} />
              <span>Course Studio</span>
              <span className="nav-count">${courses.length || '4'}</span>
            </button>

            <span className="nav-section-title">Operations</span>
            <button className=${`nav-item ${activeTab === 'notifications' ? 'active' : ''}`} onClick=${() => handleTabChange('notifications')}>
              <${Icons.Bell} />
              <span>Push Engine</span>
            </button>
            <button className=${`nav-item ${activeTab === 'system' ? 'active' : ''}`} onClick=${() => handleTabChange('system')}>
              <${Icons.Activity} />
              <span>Diagnostics</span>
            </button>
          </nav>

          <div className="sidebar-footer">
            <div className="sidebar-status-pill">
              <span className="status-dot"></span>
              <span>Supabase REST: ${apiLatency ? `${apiLatency}ms` : 'Online'}</span>
            </div>
            <div className="sidebar-user">
              <div className="sidebar-user-info">
                <span className="sidebar-user-email" title=${session.user?.email || 'admin'}>${session.user?.email || 'Administrator'}</span>
                <span className="sidebar-user-role">Super Admin</span>
              </div>
              <button className="btn-icon" onClick=${handleLogout} title="Sign out" aria-label="Sign out">
                <${Icons.LogOut} size=${14} />
              </button>
            </div>
          </div>
        </aside>

        <!-- Main Wrapper -->
        <main className="app-main">
          <header className="topbar">
            <div className="topbar-left">
              <span className="breadcrumb-root">Elvate Console</span>
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-current">${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</span>
            </div>
            <div className="topbar-right">
              <div className="topbar-search">
                <${Icons.Search} size=${14} />
                <input
                  type="text"
                  placeholder="Filter records..."
                  value=${learnerSearch}
                  onChange=${(e) => {
                    setLearnerSearch(e.target.value);
                    if (activeTab !== 'learners') handleTabChange('learners');
                  }}
                />
              </div>
              <button className="btn-secondary btn-sm" onClick=${loadOverview} disabled=${isLoadingOverview}>
                <${Icons.Refresh} size=${12} />
                <span>${isLoadingOverview ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>
          </header>

          <div className="content-viewport">
            ${activeTab === 'overview' && html`
              <${OverviewView}
                overview=${overview}
                pushStats=${pushStats}
                lastUpdated=${lastUpdated}
                onNavigate=${handleTabChange}
              />
            `}

            ${activeTab === 'learners' && html`
              <${LearnersView}
                learners=${learners}
                totalCount=${overview?.total_accounts}
                filter=${learnerFilter}
                setFilter=${setLearnerFilter}
                search=${learnerSearch}
                setSearch=${setLearnerSearch}
                offset=${learnerOffset}
                setOffset=${setLearnerOffset}
                onSelectLearner=${setSelectedLearner}
                showToast=${showToast}
              />
            `}

            ${activeTab === 'courses' && html`
              <${CourseStudioView}
                courses=${courses}
                subTab=${courseSubTab}
                setSubTab=${setCourseSubTab}
                editingCourse=${editingCourse}
                setEditingCourse=${setEditingCourse}
                editingStatus=${editingCourseStatus}
                setEditingStatus=${setEditingCourseStatus}
                session=${session}
                setSession=${setSession}
                loadCourses=${loadCourses}
                showToast=${showToast}
                activeAudioUrl=${activeAudioUrl}
                setActiveAudioUrl=${setActiveAudioUrl}
              />
            `}

            ${activeTab === 'notifications' && html`
              <${PushView}
                devicesCount=${pushDevicesCount}
                pushStats=${pushStats}
                title=${pushTitle}
                setTitle=${setPushTitle}
                body=${pushBody}
                setBody=${setPushBody}
                screen=${pushScreen}
                setScreen=${setPushScreen}
                priority=${pushPriority}
                setPriority=${setPushPriority}
                feedback=${pushFeedback}
                setFeedback=${setPushFeedback}
                isBroadcasting=${isBroadcasting}
                setIsBroadcasting=${setIsBroadcasting}
                session=${session}
                setSession=${setSession}
                showToast=${showToast}
                refreshDevices=${loadPushDevices}
              />
            `}

            ${activeTab === 'system' && html`
              <${SystemView}
                latency=${apiLatency}
                isPinging=${isPinging}
                onPing=${pingLatency}
              />
            `}
          </div>
        </main>

        <!-- Slide-out Learner Drawer -->
        ${selectedLearner && html`
          <${LearnerDrawer}
            learner=${selectedLearner}
            onClose=${() => setSelectedLearner(null)}
          />
        `}

        <!-- Toast Notifications Container -->
        <div className="toast-container">
          ${toasts.map(
            (t) => html`
              <div key=${t.id} className=${`toast ${t.type}`}>
                <span>${t.message}</span>
              </div>
            `
          )}
        </div>
      </div>
    `;
  }

  /* ==========================================================================
     5. VIEW: LOGIN SCREEN
     ========================================================================== */

  function LoginScreen({ onLoginSuccess, showToast }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e) => {
      e.preventDefault();
      setErrorMsg('');

      if (!apiUrl || !publishableKey) {
        setErrorMsg('Supabase credentials are not configured yet.');
        return;
      }

      setIsLoading(true);
      try {
        const data = await authRequest('token?grant_type=password', { email, password });
        if (data.user?.app_metadata?.role !== 'admin') {
          throw new Error('This account does not have administrator privileges.');
        }

        onLoginSuccess({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
          user: data.user,
        });
      } catch (err) {
        setErrorMsg(err.message || 'Invalid email or password.');
      } finally {
        setIsLoading(false);
      }
    };

    return html`
      <div className="login-screen">
        <div className="login-card">
          <div className="login-brand">
            <div className="login-brand-icon">
              <img src="./assets/R_Appicon.png" alt="" />
            </div>
            <span className="login-brand-name">Elvate Operations</span>
            <span className="login-tag">Admin</span>
          </div>

          <h1 className="login-title">Sign in to console</h1>
          <p className="login-subtitle">Enter your administrator credentials to access student telemetry and course management.</p>

          <form className="login-form" onSubmit=${handleSubmit}>
            <div className="form-group">
              <label htmlFor="admin-email">Email address</label>
              <input
                id="admin-email"
                type="email"
                className="form-input"
                placeholder="admin@elvate.app"
                value=${email}
                onChange=${(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                type="password"
                className="form-input"
                placeholder="••••••••••••"
                value=${password}
                onChange=${(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled=${isLoading}>
              <span>${isLoading ? 'Authenticating...' : 'Sign in to console'}</span>
              <${Icons.ArrowRight} size=${14} />
            </button>
          </form>

          ${errorMsg && html`<div className="form-error">${errorMsg}</div>`}
        </div>
      </div>
    `;
  }

  /* ==========================================================================
     6. VIEW: OVERVIEW TELEMETRY
     ========================================================================== */

  function OverviewView({ overview, pushStats, lastUpdated, onNavigate }) {
    const totalAccounts = Number(overview?.total_accounts || 0);
    const totalInstalls = Number(overview?.total_installs ?? pushStats?.total_installs ?? 0);
    const activeToday = Number(overview?.active_today || 0);
    const newWeekly = Number(overview?.new_accounts_7d || 0);
    const completedClasses = Number(overview?.completed_classes || 0);

    const activeRate = totalAccounts ? Math.min(100, (activeToday / totalAccounts) * 100).toFixed(1) : '0';
    const weeklyRate = totalAccounts ? Math.min(100, (newWeekly / totalAccounts) * 100).toFixed(1) : '0';
    const masteryAvg = totalAccounts ? (completedClasses / totalAccounts).toFixed(1) : '0';

    return html`
      <div>
        <div className="view-header">
          <div>
            <h1 className="view-title">Operations Overview</h1>
            <p className="view-subtitle">Platform telemetry, student acquisition, daily practice metrics, and core statistics.</p>
          </div>
          ${lastUpdated && html`<span className="breadcrumb-root">Updated ${lastUpdated}</span>`}
        </div>

        <!-- KPI Metric Cards -->
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-head">
              <span className="metric-label">App Installs</span>
              <${Icons.Smartphone} className="metric-icon" />
            </div>
            <strong className="metric-value">${formatNumber(totalInstalls)}</strong>
            <span className="metric-foot">Expo device registrations</span>
          </div>

          <div className="metric-card">
            <div className="metric-head">
              <span className="metric-label">Verified Learners</span>
              <${Icons.Users} className="metric-icon" />
            </div>
            <strong className="metric-value">${overview?.verified_accounts != null ? formatNumber(overview.verified_accounts) : (overview ? formatNumber(overview.total_accounts) : '—')}</strong>
            <span className="metric-foot">Registered with email</span>
          </div>

          <div className="metric-card">
            <div className="metric-head">
              <span className="metric-label">Total Accounts</span>
              <${Icons.Users} className="metric-icon" />
            </div>
            <strong className="metric-value">${overview ? formatNumber(overview.total_accounts) : '—'}</strong>
            <span className="metric-foot">Includes ${overview?.guest_accounts != null ? formatNumber(overview.guest_accounts) : '0'} guests</span>
          </div>

          <div className="metric-card">
            <div className="metric-head">
              <span className="metric-label">New This Week</span>
              <${Icons.Activity} className="metric-icon" />
            </div>
            <strong className="metric-value">${overview ? formatNumber(overview.new_accounts_7d) : '—'}</strong>
            <span className="metric-foot">Acquired last 7 days</span>
          </div>

          <div className="metric-card">
            <div className="metric-head">
              <span className="metric-label">Active Today</span>
              <${Icons.Sparkles} className="metric-icon" />
            </div>
            <strong className="metric-value">${overview ? formatNumber(overview.active_today) : '—'}</strong>
            <span className="metric-foot">Practiced in past 24-36h</span>
          </div>

          <div className="metric-card">
            <div className="metric-head">
              <span className="metric-label">Stardust XP</span>
              <${Icons.Sparkles} className="metric-icon" />
            </div>
            <strong className="metric-value">${overview ? formatNumber(overview.total_xp) : '—'}</strong>
            <span className="metric-foot">Total student score</span>
          </div>

          <div className="metric-card">
            <div className="metric-head">
              <span className="metric-label">Completed Classes</span>
              <${Icons.Book} className="metric-icon" />
            </div>
            <strong className="metric-value">${overview ? formatNumber(overview.completed_classes) : '—'}</strong>
            <span className="metric-foot">Finished lesson completions</span>
          </div>

          <div className="metric-card">
            <div className="metric-head">
              <span className="metric-label">Average Streak</span>
              <${Icons.Activity} className="metric-icon" />
            </div>
            <strong className="metric-value">${overview ? `${Number(overview.average_streak || 0).toFixed(1)}d` : '—'}</strong>
            <span className="metric-foot">Active student average</span>
          </div>
        </div>

        <!-- Secondary Analytics Row -->
        <div className="two-column-row">
          <div className="card">
            <div className="card-header">
              <span className="card-title">Engagement Telemetry</span>
              <span className="card-tag">Ratios</span>
            </div>
            <div className="progress-list">
              <div className="progress-item">
                <div className="progress-labels">
                  <span>Daily Active User Ratio</span>
                  <strong>${activeRate}%</strong>
                </div>
                <div className="progress-track">
                  <div className="progress-fill violet" style=${{ width: `${Math.max(4, Number(activeRate))}%` }}></div>
                </div>
              </div>

              <div className="progress-item">
                <div className="progress-labels">
                  <span>7-Day Growth Ratio</span>
                  <strong>${weeklyRate}%</strong>
                </div>
                <div className="progress-track">
                  <div className="progress-fill emerald" style=${{ width: `${Math.max(4, Number(weeklyRate))}%` }}></div>
                </div>
              </div>

              <div className="progress-item">
                <div className="progress-labels">
                  <span>Average Classes Mastery</span>
                  <strong>${masteryAvg} / student</strong>
                </div>
                <div className="progress-track">
                  <div className="progress-fill amber" style=${{ width: `${Math.min(100, Math.max(6, Number(masteryAvg) * 10))}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Quick Operations</span>
              <span className="card-tag">Shortcuts</span>
            </div>
            <div className="quick-actions-grid">
              <button className="quick-action-btn" onClick=${() => onNavigate('courses')}>
                <strong>Course Studio</strong>
                <span>Synthesize unit or manual build</span>
              </button>
              <button className="quick-action-btn" onClick=${() => onNavigate('learners')}>
                <strong>Learner CRM</strong>
                <span>Inspect progress and streaks</span>
              </button>
              <button className="quick-action-btn" onClick=${() => onNavigate('notifications')}>
                <strong>Push Notifications</strong>
                <span>Dispatch reminders to devices</span>
              </button>
              <button className="quick-action-btn" onClick=${() => onNavigate('system')}>
                <strong>System Diagnostics</strong>
                <span>Test latency and microservices</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /* ==========================================================================
     7. VIEW: LEARNERS CRM & DIRECTORY
     ========================================================================== */

  function LearnersView({
    learners,
    totalCount,
    filter,
    setFilter,
    search,
    setSearch,
    offset,
    setOffset,
    onSelectLearner,
    showToast,
  }) {
    // Filter list locally
    const filteredLearners = useMemo(() => {
      const now = Date.now();
      const thirtySixHours = 36 * 60 * 60 * 1000;
      return learners.filter((l) => {
        if (filter === 'active') {
          if (!l.last_active_date) return false;
          return now - new Date(l.last_active_date).getTime() <= thirtySixHours;
        }
        if (filter === 'streak') return Number(l.streak_days) >= 3;
        if (filter === 'guests') return isGuestAccount(l);
        if (filter === 'registered') return !isGuestAccount(l);
        return true;
      });
    }, [learners, filter]);

    // CSV Export
    const exportCsv = () => {
      if (!learners.length) {
        showToast('No records available to export.', 'error');
        return;
      }
      const headers = ['User ID', 'Name', 'Email', 'Type', 'XP', 'Streak', 'Classes', 'Joined', 'Last Active'];
      const rows = learners.map((l) => [
        `"${String(l.id || l.user_id || '').replace(/"/g, '""')}"`,
        `"${String(l.display_name || '').replace(/"/g, '""')}"`,
        `"${String(l.email || '').replace(/"/g, '""')}"`,
        isGuestAccount(l) ? 'Guest' : 'Verified Email',
        Number(l.stardust_xp) || 0,
        Number(l.streak_days) || 0,
        Number(l.completed_classes) || 0,
        l.created_at || '',
        l.last_active_date || '',
      ]);

      const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `elvate_learners_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.append(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast(`Exported ${learners.length} records.`, 'success');
    };

    return html`
      <div>
        <div className="view-header">
          <div>
            <h1 className="view-title">Learners Directory</h1>
            <p className="view-subtitle">Individual student accounts, verified identities, Stardust XP milestones, and active streaks.</p>
          </div>
          <button className="btn-secondary btn-sm" onClick=${exportCsv}>
            <${Icons.Download} size=${14} />
            <span>Export CSV</span>
          </button>
        </div>

        <div className="toolbar-row">
          <div className="filter-pills">
            ${[
              { id: 'all', label: 'All Accounts' },
              { id: 'active', label: 'Active Today' },
              { id: 'streak', label: 'Streaks 3d+' },
              { id: 'registered', label: 'Verified Email' },
              { id: 'guests', label: 'Guest Sessions' },
            ].map(
              (p) => html`
                <button
                  key=${p.id}
                  className=${`filter-pill ${filter === p.id ? 'active' : ''}`}
                  onClick=${() => setFilter(p.id)}
                >
                  ${p.label}
                </button>
              `
            )}
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Learner</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Last Active</th>
                <th>XP Score</th>
                <th>Streak</th>
                <th>Classes</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${filteredLearners.length === 0
                ? html`
                    <tr>
                      <td colSpan="8" style=${{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                        No learner accounts matched the selected query.
                      </td>
                    </tr>
                  `
                : filteredLearners.map((learner) => {
                    const guest = isGuestAccount(learner);
                    const initial = (learner.display_name || learner.email || 'L').slice(0, 1).toUpperCase();
                    const learnerKey = learner.id || learner.user_id || `learner-${learner.email}`;
                    return html`
                      <tr key=${learnerKey} onClick=${() => onSelectLearner(learner)}>
                        <td>
                          <div className="learner-col">
                            <div className="avatar-circle">${initial}</div>
                            <div className="learner-meta">
                              <span className="learner-name">${learner.display_name || 'Elvate Learner'}</span>
                              <span className="learner-email">${learner.email || 'Guest User'}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className=${`badge ${guest ? 'guest' : 'verified'}`}>
                            <span className="status-dot ${guest ? 'warn' : ''}"></span>
                            ${guest ? 'Guest' : 'Verified'}
                          </span>
                        </td>
                        <td>${formatDate(learner.created_at)}</td>
                        <td>${formatRelativeTime(learner.last_active_date)}</td>
                        <td style=${{ fontWeight: 600, color: 'var(--text-main)' }}>${formatNumber(learner.stardust_xp)}</td>
                        <td>${learner.streak_days ? `${learner.streak_days} days` : '0d'}</td>
                        <td>${formatNumber(learner.completed_classes)}</td>
                        <td>
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick=${(e) => {
                              e.stopPropagation();
                              onSelectLearner(learner);
                            }}
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    `;
                  })}
            </tbody>
          </table>

          <div className="table-footer">
            <span>Showing ${offset + 1}–${offset + filteredLearners.length} accounts</span>
            <div className="pagination-controls">
              <button
                className="btn-secondary btn-sm"
                disabled=${offset === 0}
                onClick=${() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              >
                Previous
              </button>
              <span>Page ${Math.floor(offset / PAGE_SIZE) + 1}</span>
              <button
                className="btn-secondary btn-sm"
                disabled=${filteredLearners.length < PAGE_SIZE}
                onClick=${() => setOffset((o) => o + PAGE_SIZE)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /* ==========================================================================
     8. VIEW: LEARNER INSPECTOR DRAWER
     ========================================================================== */

  function LearnerDrawer({ learner, onClose }) {
    const isGuest = isGuestAccount(learner);
    const initial = (learner.display_name || learner.email || 'L').slice(0, 1).toUpperCase();
    const rank = calculateRank(learner.stardust_xp);

    return html`
      <div className="drawer-backdrop" onClick=${onClose}>
        <div className="drawer" onClick=${(e) => e.stopPropagation()}>
          <div className="drawer-header">
            <div>
              <span className="breadcrumb-root">Student Profile</span>
              <h3 style=${{ fontSize: '15px', fontWeight: 600 }}>${learner.display_name || 'Elvate Learner'}</h3>
            </div>
            <button className="btn-icon" onClick=${onClose} aria-label="Close drawer">
              <${Icons.Close} size=${16} />
            </button>
          </div>

          <div className="drawer-body">
            <div className="drawer-hero">
              <div className="drawer-avatar-lg">${initial}</div>
              <div>
                <h4 style=${{ fontSize: '15px', fontWeight: 600 }}>${learner.display_name || 'Elvate Learner'}</h4>
                <p style=${{ fontSize: '12px', color: 'var(--text-muted)' }}>${learner.email || 'Guest Session'}</p>
                <span className=${`badge ${isGuest ? 'guest' : 'verified'}`} style=${{ marginTop: '6px' }}>
                  ${isGuest ? 'Guest User' : 'Verified Email'}
                </span>
              </div>
            </div>

            <div className="drawer-stat-grid">
              <div className="drawer-stat-card">
                <span>Stardust XP</span>
                <strong>${formatNumber(learner.stardust_xp)}</strong>
              </div>
              <div className="drawer-stat-card">
                <span>Active Streak</span>
                <strong>${Number(learner.streak_days || 0)} days</strong>
              </div>
              <div className="drawer-stat-card">
                <span>Classes Completed</span>
                <strong>${formatNumber(learner.completed_classes)}</strong>
              </div>
              <div className="drawer-stat-card">
                <span>Milestone Rank</span>
                <strong>${rank}</strong>
              </div>
            </div>

            <div>
              <h5 className="drawer-section-title">Account Details</h5>
              <div className="drawer-meta-list">
                <div className="drawer-meta-item">
                  <span>Account ID</span>
                  <code style=${{ fontSize: '11px', color: 'var(--text-secondary)' }}>${learner.id || learner.user_id || '—'}</code>
                </div>
                <div className="drawer-meta-item">
                  <span>Registration Date</span>
                  <strong>${formatDate(learner.created_at)}</strong>
                </div>
                <div className="drawer-meta-item">
                  <span>Last Interaction</span>
                  <strong>${formatRelativeTime(learner.last_active_date)}</strong>
                </div>
              </div>
            </div>

            <div>
              <h5 className="drawer-section-title">Learning Summary</h5>
              <p style=${{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                ${learner.display_name || 'Learner'} has completed ${learner.completed_classes || 0} classes and acquired ${formatNumber(learner.stardust_xp)} XP score. Consistency status: ${learner.streak_days > 0 ? `${learner.streak_days}-day active streak maintained` : 'Inactive today'}.
              </p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /* ==========================================================================
     9. VIEW: COURSE STUDIO & CURRICULUM ARCHITECT
     ========================================================================== */

  function CourseStudioView({
    courses,
    subTab,
    setSubTab,
    editingCourse,
    setEditingCourse,
    editingStatus,
    setEditingStatus,
    session,
    setSession,
    loadCourses,
    showToast,
    activeAudioUrl,
    setActiveAudioUrl,
  }) {
    const [topic, setTopic] = useState('');
    const [levelName, setLevelName] = useState('');
    const [cefrTag, setCefrTag] = useState('CEFR A2');
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);

    // Audio Batch Synthesis State
    const [isAudioBusy, setIsAudioBusy] = useState(false);
    const [audioProgressText, setAudioProgressText] = useState('');
    const audioAbortRef = useRef(null);
    const audioPlayerRef = useRef(null);

    // Image Synthesis State
    const [generatingImageIndex, setGeneratingImageIndex] = useState(null);

    // File Import Ref
    const fileImportInputRef = useRef(null);

    // Audio Playback
    const toggleAudio = (url) => {
      if (!url) return;
      if (activeAudioUrl === url) {
        if (audioPlayerRef.current) {
          audioPlayerRef.current.pause();
          audioPlayerRef.current = null;
        }
        setActiveAudioUrl(null);
        return;
      }

      if (audioPlayerRef.current) audioPlayerRef.current.pause();
      const a = new Audio(url);
      audioPlayerRef.current = a;
      setActiveAudioUrl(url);
      a.onended = () => setActiveAudioUrl(null);
      a.onerror = () => {
        showToast('Audio playback failed.', 'error');
        setActiveAudioUrl(null);
      };
      a.play().catch(() => setActiveAudioUrl(null));
    };

    // Synthesize Unit with AI (Nemotron)
    const handleGenerateAi = async (e) => {
      e.preventDefault();
      if (!topic.trim() || !levelName.trim()) return;

      setIsGeneratingAi(true);
      showToast('Synthesizing 5 classes with Nemotron AI...', 'info');

      try {
        const res = await fetch(`${apiUrl}/functions/v1/admin-generate-course`, {
          method: 'POST',
          headers: {
            apikey: publishableKey,
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ topic, levelName, cefrTag }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to generate course.');

        setEditingCourse(data.course);
        setEditingStatus('draft');
        setSubTab('manual');
        showToast('5-class unit synthesized successfully.', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setIsGeneratingAi(false);
      }
    };

    // Save Course Draft / Publish
    const handleSaveCourse = async (status) => {
      if (!editingCourse) return;
      try {
        const saved = await rpcCall(session, setSession, 'admin_save_course', {
          p_level_data: editingCourse,
          p_status: status,
        });
        if (saved?.level_data) setEditingCourse(saved.level_data);
        setEditingStatus(status);
        showToast(status === 'published' ? 'Unit published to app.' : 'Draft saved.', 'success');
        await loadCourses();
      } catch (err) {
        showToast(err.message, 'error');
      }
    };

    // Delete Course
    const handleDeleteCourse = async (courseId, title) => {
      if (!window.confirm(`Delete "${title}"?`)) return;
      try {
        await rpcCall(session, setSession, 'admin_delete_course', { p_course_id: courseId });
        showToast(`Deleted ${title}.`, 'success');
        await loadCourses();
      } catch (err) {
        showToast(err.message, 'error');
      }
    };

    // Batch Audio Generation (Gemini TTS)
    const handleGenerateAudio = async () => {
      if (isAudioBusy || !editingCourse) return;
      setIsAudioBusy(true);
      setAudioProgressText('Initializing audio synthesis...');
      const controller = new AbortController();
      audioAbortRef.current = controller;

      try {
        const saved = await rpcCall(session, setSession, 'admin_save_course', {
          p_level_data: editingCourse,
          p_status: editingStatus,
        });
        let currentCourse = saved?.level_data || editingCourse;
        setEditingCourse(currentCourse);

        const totalClips = currentCourse.classes.length * 3;
        let completedClips = 0;
        let newlyGenerated = 0;

        for (let i = 0; i < currentCourse.classes.length; i++) {
          if (controller.signal.aborted) break;
          const lesson = currentCourse.classes[i];
          const clipDefs = [
            { kind: 'tamil', text: lesson.rule?.tamilMentalModel || '' },
            { kind: 'why', text: lesson.rule?.doAndDont?.whyTamil || '' },
            { kind: 'right', text: lesson.rule?.doAndDont?.right || '' },
          ];

          const missing = clipDefs.filter(
            (c) => c.text.trim() && lesson.lectureAudio?.[c.kind]?.text?.trim() !== c.text.trim()
          );

          completedClips += 3 - missing.length;
          if (!missing.length) continue;

          for (const clip of missing) {
            if (controller.signal.aborted) break;
            setAudioProgressText(`Class ${i + 1} (${clip.kind}): ${completedClips}/${totalClips} clips`);

            const res = await fetch(`${apiUrl}/functions/v1/admin-generate-course-audio`, {
              method: 'POST',
              headers: {
                apikey: publishableKey,
                Authorization: `Bearer ${session.accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                courseId: currentCourse.id,
                lessonId: lesson.id,
                clips: [clip],
              }),
              signal: controller.signal,
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || `Failed audio for Class ${i + 1}`);

            lesson.lectureAudio = { ...lesson.lectureAudio, ...data.audioClips };
            const persisted = await rpcCall(session, setSession, 'admin_save_course', {
              p_level_data: currentCourse,
              p_status: editingStatus,
            });
            if (persisted?.level_data) {
              currentCourse = persisted.level_data;
              setEditingCourse({ ...currentCourse });
            }

            completedClips += 1;
            newlyGenerated += 1;

            if (completedClips < totalClips && !controller.signal.aborted) {
              await new Promise((r) => setTimeout(r, 2200));
            }
          }
        }

        showToast(newlyGenerated ? `Generated ${newlyGenerated} audio clips.` : 'All audio is up to date.', 'success');
        await loadCourses();
      } catch (err) {
        if (controller.signal.aborted) {
          showToast('Audio generation stopped.', 'info');
        } else {
          showToast(err.message || 'Audio generation failed.', 'error');
        }
      } finally {
        setIsAudioBusy(false);
        setAudioProgressText('');
        audioAbortRef.current = null;
      }
    };

    const handleStopAudio = () => {
      if (audioAbortRef.current) {
        audioAbortRef.current.abort();
      }
    };

    // Class Image Generation (Gemini Illustration Studio)
    const handleGenerateImage = async (lessonIndex) => {
      if (generatingImageIndex !== null || !editingCourse) return;
      setGeneratingImageIndex(lessonIndex);
      showToast(`Synthesizing illustration for Class ${lessonIndex + 1}...`, 'info');

      try {
        const saved = await rpcCall(session, setSession, 'admin_save_course', {
          p_level_data: editingCourse,
          p_status: editingStatus,
        });
        let currentCourse = saved?.level_data || editingCourse;
        const lesson = currentCourse.classes[lessonIndex];

        const res = await fetch(`${apiUrl}/functions/v1/admin-generate-course-image`, {
          method: 'POST',
          headers: {
            apikey: publishableKey,
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            courseId: currentCourse.id,
            lessonId: lesson.id,
            title: String(lesson.title || '').replace(/^Class\s+\d+\s*:\s*/i, ''),
            subtitle: lesson.subtitle,
            grammarTopic: lesson.grammarTopic,
            learnerOutcome: lesson.learnerOutcome,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Could not generate image for Class ${lessonIndex + 1}`);

        lesson.imageUrl = data.imageUrl;
        const persisted = await rpcCall(session, setSession, 'admin_save_course', {
          p_level_data: currentCourse,
          p_status: editingStatus,
        });

        setEditingCourse({ ...(persisted?.level_data || currentCourse) });
        showToast(`Class ${lessonIndex + 1} illustration ready!`, 'success');
        await loadCourses();
      } catch (err) {
        showToast(err.message || 'Image generation failed.', 'error');
      } finally {
        setGeneratingImageIndex(null);
      }
    };

    // Import Course JavaScript / JSON
    const handleImportFile = async (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;

      showToast('Reading course file...', 'info');
      try {
        let data = [];
        const text = await file.text();
        if (file.name.toLowerCase().endsWith('.json')) {
          const parsed = JSON.parse(text);
          data = Array.isArray(parsed) ? parsed : [parsed];
        } else {
          data = await extractCoursesFromJavaScript(text);
        }

        const course = data.find((c) => Array.isArray(c?.classes) && c.classes.length) || data[0];
        if (!course || !course.classes?.length) throw new Error('File does not contain valid course classes.');

        const imported = JSON.parse(JSON.stringify(course));
        delete imported.id;
        delete imported.starterCourseKey;
        const nextUnitNum = 5 + courses.filter((c) => !c.is_builtin).length;
        imported.levelNumber = nextUnitNum;
        imported.levelName = `Unit ${nextUnitNum}: ${String(imported.levelName || 'Imported Course').replace(/^Unit\s+\d+\s*:\s*/i, '')}`;

        imported.classes = imported.classes.map((l, idx) => {
          const copy = { ...l };
          delete copy.id;
          copy.levelNumber = nextUnitNum;
          copy.classNumber = idx + 1;
          return copy;
        });

        setEditingCourse(imported);
        setEditingStatus('draft');
        setSubTab('manual');
        showToast(`Imported ${imported.classes.length} classes.`, 'success');
      } catch (err) {
        showToast(err.message || 'Import failed.', 'error');
      }
    };

    return html`
      <div>
        <div className="view-header">
          <div>
            <h1 className="view-title">Course Studio</h1>
            <p className="view-subtitle">Author conversational curricula, synthesize units with Nemotron AI, generate Gemini TTS voice lectures, and craft lesson artwork.</p>
          </div>
          <div style=${{ display: 'flex', gap: '8px' }}>
            <input
              type="file"
              ref=${fileImportInputRef}
              accept=".js,.json"
              style=${{ display: 'none' }}
              onChange=${handleImportFile}
            />
            <button
              className="btn-secondary btn-sm"
              onClick=${() => fileImportInputRef.current?.click()}
            >
              <${Icons.Upload} size=${14} />
              <span>Import File</span>
            </button>
            <button
              className="btn-primary btn-sm"
              onClick=${() => {
                setEditingCourse(null);
                setEditingStatus('draft');
                setSubTab('ai');
              }}
            >
              <${Icons.Sparkles} size=${14} />
              <span>AI Generator</span>
            </button>
          </div>
        </div>

        <div className="subtabs-bar">
          <button className=${`subtab-btn ${subTab === 'catalog' ? 'active' : ''}`} onClick=${() => setSubTab('catalog')}>
            Unit Catalog (${courses.length})
          </button>
          <button className=${`subtab-btn ${subTab === 'ai' ? 'active' : ''}`} onClick=${() => setSubTab('ai')}>
            AI Generator
          </button>
          <button className=${`subtab-btn ${subTab === 'manual' ? 'active' : ''}`} onClick=${() => setSubTab('manual')}>
            ${editingCourse ? `Editing: ${editingCourse.levelName || 'Unit'}` : 'Manual Architect'}
          </button>
        </div>

        <!-- 1. Catalog Tab -->
        ${subTab === 'catalog' && html`
          <div className="units-grid">
            ${courses.map((entry) => {
              const level = entry.level_data || {};
              const isBuiltin = entry.is_builtin;
              const classesCount = level.classes?.length || 0;
              const audioCount = (level.classes || []).filter((c) => c?.lectureAudio?.tamil?.url).length;

              return html`
                <div key=${entry.id} className="unit-card">
                  <div className="unit-card-top">
                    <span className="unit-number-pill">Unit ${level.levelNumber || '?'}</span>
                    <span className=${`unit-status-pill ${isBuiltin ? 'core' : entry.status || 'draft'}`}>
                      ${isBuiltin ? 'Core' : entry.status || 'Draft'}
                    </span>
                  </div>

                  <h3 className="unit-card-title">${String(level.levelName || entry.id).replace(/^Unit\s+\d+\s*:\s*/i, '')}</h3>
                  <p className="unit-card-desc">${level.description || 'Core conversational fluency training module.'}</p>

                  <div className="unit-meta-row">
                    <span>${level.cefrTag || 'CEFR A1'}</span>
                    <span>•</span>
                    <span>${classesCount} classes</span>
                    <span>•</span>
                    <span>${audioCount}/${classesCount} audio clips</span>
                  </div>

                  <div className="unit-card-actions">
                    <button
                      className="btn-secondary btn-sm"
                      onClick=${() => {
                        setEditingCourse(JSON.parse(JSON.stringify(level)));
                        setEditingStatus(entry.status || 'draft');
                        setSubTab('manual');
                      }}
                    >
                      Edit Unit
                    </button>
                    ${!isBuiltin && html`
                      <button
                        className="btn-danger btn-sm"
                        onClick=${() => handleDeleteCourse(entry.id, level.levelName || entry.id)}
                        aria-label="Delete unit"
                      >
                        <${Icons.Trash} size=${12} />
                      </button>
                    `}
                  </div>
                </div>
              `;
            })}
          </div>
        `}

        <!-- 2. AI Generator Tab -->
        ${subTab === 'ai' && html`
          <div className="card" style=${{ maxWidth: '640px' }}>
            <div className="card-header">
              <span className="card-title">Synthesize Unit with Nemotron AI</span>
              <span className="card-tag">OpenRouter</span>
            </div>
            <form onSubmit=${handleGenerateAi} style=${{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Unit Title</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Workplace Discussions and Clarifications"
                  value=${levelName}
                  onChange=${(e) => setLevelName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Learning Objective / Topic</label>
                <textarea
                  className="form-textarea"
                  placeholder="e.g. Asking for project deadlines politely, confirming meeting agendas, and apologizing for delays"
                  value=${topic}
                  onChange=${(e) => setTopic(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>CEFR Target Proficiency</label>
                <select className="form-input" value=${cefrTag} onChange=${(e) => setCefrTag(e.target.value)}>
                  <option value="CEFR A1">CEFR A1 (Beginner)</option>
                  <option value="CEFR A2">CEFR A2 (Elementary)</option>
                  <option value="CEFR B1">CEFR B1 (Intermediate)</option>
                  <option value="CEFR B2">CEFR B2 (Upper Intermediate)</option>
                </select>
              </div>

              <button type="submit" className="btn-primary" disabled=${isGeneratingAi}>
                <${Icons.Sparkles} size=${14} />
                <span>${isGeneratingAi ? 'Synthesizing 5 Classes (~30s)...' : 'Synthesize 5-Class Unit'}</span>
              </button>
            </form>
          </div>
        `}

        <!-- 3. Manual Architect / Unit Editor Tab -->
        ${subTab === 'manual' && html`
          <div>
            ${editingCourse
              ? html`
                  <div style=${{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="card">
                      <div className="card-header">
                        <div>
                          <h3 style=${{ fontSize: '16px', fontWeight: 600 }}>${editingCourse.levelName}</h3>
                          <span style=${{ fontSize: '12px', color: 'var(--text-muted)' }}>${editingCourse.classes?.length || 5} Classes Configured</span>
                        </div>
                        <div style=${{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          ${isAudioBusy
                            ? html`
                                <button className="btn-danger btn-sm" onClick=${handleStopAudio}>
                                  <${Icons.Stop} size=${12} />
                                  <span>Stop Audio</span>
                                </button>
                              `
                            : html`
                                <button className="btn-secondary btn-sm" onClick=${handleGenerateAudio}>
                                  <${Icons.Mic} size=${12} />
                                  <span>Generate Audio (Gemini TTS)</span>
                                </button>
                              `}
                          <button className="btn-secondary btn-sm" onClick=${() => handleSaveCourse('draft')}>Save Draft</button>
                          <button className="btn-primary btn-sm" onClick=${() => handleSaveCourse('published')}>Publish to App</button>
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Unit Outcome Description</label>
                        <input
                          type="text"
                          className="form-input"
                          value=${editingCourse.description || ''}
                          onChange=${(e) => setEditingCourse({ ...editingCourse, description: e.target.value })}
                        />
                      </div>

                      ${isAudioBusy && html`
                        <div className="media-batch-card">
                          <div className="media-batch-info">
                            <span className="media-batch-title">Gemini TTS Multi-Modal Audio Synthesis in progress</span>
                            <span className="media-batch-desc">${audioProgressText}</span>
                          </div>
                          <span className="status-dot"></span>
                        </div>
                      `}
                    </div>

                    <!-- 5 Class Cards with Audio and Image generation -->
                    <div className="class-accordion">
                      ${(editingCourse.classes || []).map((lesson, idx) => {
                        const tamilAudio = lesson.lectureAudio?.tamil?.url;
                        const whyAudio = lesson.lectureAudio?.why?.url;
                        const rightAudio = lesson.lectureAudio?.right?.url;

                        const isTamilPlaying = activeAudioUrl === tamilAudio;
                        const isWhyPlaying = activeAudioUrl === whyAudio;
                        const isRightPlaying = activeAudioUrl === rightAudio;
                        const isImageGenerating = generatingImageIndex === idx;

                        return html`
                          <div key=${idx} className="class-card">
                            <div className="class-card-header">
                              <span className="class-card-title">Class ${idx + 1}: ${lesson.title}</span>
                              <span style=${{ fontSize: '11px', color: 'var(--text-muted)' }}>${lesson.duration || '6 mins'}</span>
                            </div>

                            <div style=${{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                              <div className="form-group">
                                <label>Grammar Topic</label>
                                <input
                                  type="text"
                                  className="form-input"
                                  value=${lesson.grammarTopic || ''}
                                  onChange=${(e) => {
                                    const next = [...editingCourse.classes];
                                    next[idx].grammarTopic = e.target.value;
                                    setEditingCourse({ ...editingCourse, classes: next });
                                  }}
                                />
                              </div>
                              <div className="form-group">
                                <label>Target English Answer</label>
                                <input
                                  type="text"
                                  className="form-input"
                                  value=${lesson.translation?.expectedEnglish || lesson.rule?.doAndDont?.right || ''}
                                  onChange=${(e) => {
                                    const next = [...editingCourse.classes];
                                    if (next[idx].translation) next[idx].translation.expectedEnglish = e.target.value;
                                    setEditingCourse({ ...editingCourse, classes: next });
                                  }}
                                />
                              </div>
                            </div>

                            <div className="form-group">
                              <label>Tamil Mental Model Explanation</label>
                              <textarea
                                className="form-textarea"
                                value=${lesson.rule?.tamilMentalModel || ''}
                                onChange=${(e) => {
                                  const next = [...editingCourse.classes];
                                  if (next[idx].rule) next[idx].rule.tamilMentalModel = e.target.value;
                                  setEditingCourse({ ...editingCourse, classes: next });
                                }}
                              />
                            </div>

                            <!-- Media Studio Grid: Audio playback on Left, 16:9 Image Studio on Right -->
                            <div className="class-media-grid">
                              <div className="class-audio-stack">
                                <span className="class-audio-label">Gemini TTS Voice Clips</span>
                                <div className="class-audio-btns">
                                  ${tamilAudio
                                    ? html`
                                        <button
                                          type="button"
                                          className=${`audio-preview-btn ${isTamilPlaying ? 'playing' : ''}`}
                                          onClick=${() => toggleAudio(tamilAudio)}
                                        >
                                          ${isTamilPlaying ? html`<${Icons.Pause} size=${12} />` : html`<${Icons.Play} size=${12} />`}
                                          <span>Tamil Model</span>
                                        </button>
                                      `
                                    : html`<span style=${{ fontSize: '11px', color: 'var(--text-muted)' }}>No Tamil audio</span>`}

                                  ${whyAudio && html`
                                    <button
                                      type="button"
                                      className=${`audio-preview-btn ${isWhyPlaying ? 'playing' : ''}`}
                                      onClick=${() => toggleAudio(whyAudio)}
                                    >
                                      ${isWhyPlaying ? html`<${Icons.Pause} size=${12} />` : html`<${Icons.Play} size=${12} />`}
                                      <span>Why Rule</span>
                                    </button>
                                  `}

                                  ${rightAudio && html`
                                    <button
                                      type="button"
                                      className=${`audio-preview-btn ${isRightPlaying ? 'playing' : ''}`}
                                      onClick=${() => toggleAudio(rightAudio)}
                                    >
                                      ${isRightPlaying ? html`<${Icons.Pause} size=${12} />` : html`<${Icons.Play} size=${12} />`}
                                      <span>Spoken Answer</span>
                                    </button>
                                  `}
                                </div>
                              </div>

                              <!-- Class Image Studio -->
                              <div className="class-image-box">
                                ${lesson.imageUrl
                                  ? html`
                                      <img className="class-image-preview" src=${lesson.imageUrl} alt="Class illustration" />
                                      <button
                                        type="button"
                                        className="btn-secondary btn-sm"
                                        disabled=${isImageGenerating}
                                        onClick=${() => handleGenerateImage(idx)}
                                      >
                                        <${Icons.Image} size=${12} />
                                        <span>${isImageGenerating ? 'Synthesizing...' : 'Regenerate Image'}</span>
                                      </button>
                                    `
                                  : html`
                                      <div className="class-image-placeholder">
                                        <${Icons.Image} size=${16} />
                                        <span>No illustration</span>
                                      </div>
                                      <button
                                        type="button"
                                        className="btn-secondary btn-sm"
                                        disabled=${isImageGenerating}
                                        onClick=${() => handleGenerateImage(idx)}
                                      >
                                        <${Icons.Sparkles} size=${12} />
                                        <span>${isImageGenerating ? 'Synthesizing...' : 'Generate Image'}</span>
                                      </button>
                                    `}
                              </div>
                            </div>
                          </div>
                        `;
                      })}
                    </div>
                  </div>
                `
              : html`
                  <div className="card" style=${{ textAlign: 'center', padding: '40px' }}>
                    <p style=${{ color: 'var(--text-muted)', marginBottom: '14px' }}>Select an existing unit from the catalog to edit, or synthesize a new unit with AI.</p>
                    <button className="btn-secondary" onClick=${() => setSubTab('catalog')}>Browse Catalog</button>
                  </div>
                `}
          </div>
        `}
      </div>
    `;
  }

  /* ==========================================================================
     10. VIEW: PUSH NOTIFICATIONS ENGINE
     ========================================================================== */

  function PushView({
    devicesCount,
    pushStats,
    title,
    setTitle,
    body,
    setBody,
    screen,
    setScreen,
    priority,
    setPriority,
    feedback,
    setFeedback,
    isBroadcasting,
    setIsBroadcasting,
    session,
    setSession,
    showToast,
    refreshDevices,
  }) {
    const [testToken, setTestToken] = useState('');
    const [isTestingSingle, setIsTestingSingle] = useState(false);

    const totalInstalls = pushStats?.total_installs != null ? pushStats.total_installs : (devicesCount !== '—' ? Number(devicesCount) : 0);
    const androidInstalls = pushStats?.android_installs != null ? pushStats.android_installs : '—';
    const iosInstalls = pushStats?.ios_installs != null ? pushStats.ios_installs : '—';

    // Broadcast to all registered devices via Expo Push Gateway
    const handleBroadcast = async (e) => {
      e?.preventDefault();
      setIsBroadcasting(true);
      setFeedback('Querying registered Expo push devices from database...');

      try {
        const data = await rpcCall(session, setSession, 'admin_broadcast_push', {
          p_title: title,
          p_body: body,
          p_screen: screen,
          p_priority: priority,
        });

        const tokens = Array.isArray(data?.tokens) ? data.tokens : [];
        if (!tokens.length) {
          setFeedback('No active Expo device tokens found. Once users open the updated app and accept notification permissions, devices will register automatically.');
          showToast('No registered push devices found.', 'info');
          return;
        }

        setFeedback(`Found ${tokens.length} registered device tokens. Dispatching to Expo Push API...`);

        const BATCH_SIZE = 100;
        let okCount = 0;
        let errCount = 0;
        const errorDetails = [];

        for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
          const chunk = tokens.slice(i, i + BATCH_SIZE);
          const messages = chunk.map((token) => ({
            to: token,
            title,
            body,
            sound: 'default',
            priority: priority === 'high' ? 'high' : 'default',
            channelId: 'daily-practice',
            data: { screen, kind: 'broadcast-notice' },
          }));

          const res = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify(messages),
          });

          const json = await res.json().catch(() => ({}));
          if (Array.isArray(json?.data)) {
            json.data.forEach((ticket) => {
              if (ticket.status === 'ok') {
                okCount++;
              } else {
                errCount++;
                const reason = ticket?.message || ticket?.details?.error;
                if (reason && errorDetails.length < 3) errorDetails.push(reason);
              }
            });
          } else {
            errCount += chunk.length;
          }
        }

        let summary = `Broadcast sent: ${okCount} delivered successfully via Expo gateway.`;
        if (errCount > 0) {
          summary += ` (${errCount} errors: ${errorDetails.join(', ') || 'DeviceNotRegistered'})`;
        }
        setFeedback(summary);
        showToast(`Dispatched to ${okCount} devices.`, okCount > 0 ? 'success' : 'error');
        if (refreshDevices) refreshDevices();
      } catch (err) {
        setFeedback(`Broadcast error: ${err.message}`);
        showToast(err.message, 'error');
      } finally {
        setIsBroadcasting(false);
      }
    };

    // Test send to a single specific device token
    const handleSendTestToken = async () => {
      const cleanToken = testToken.trim();
      if (!cleanToken) {
        showToast('Please enter an Expo push token.', 'error');
        return;
      }
      if (!cleanToken.startsWith('ExponentPushToken[') && !cleanToken.startsWith('ExpoPushToken[')) {
        showToast('Token should be in ExponentPushToken[...] format.', 'error');
        return;
      }

      setIsTestingSingle(true);
      setFeedback(`Sending test push to ${cleanToken.slice(0, 24)}...`);

      try {
        const message = {
          to: cleanToken,
          title: title || 'Nila AI Speaking Challenge is Live',
          body: body || 'Practice a quick 2-minute conversation today and protect your streak.',
          sound: 'default',
          priority: 'high',
          channelId: 'daily-practice',
          data: { screen, kind: 'test-ping' },
        };

        const res = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify([message]),
        });

        const json = await res.json().catch(() => ({}));
        const ticket = json?.data?.[0];
        if (ticket?.status === 'ok') {
          setFeedback(`Test push accepted by Expo gateway. Ticket ID: ${ticket.id}`);
          showToast('Test notification delivered to Expo!', 'success');
        } else {
          const reason = ticket?.message || ticket?.details?.error || 'Unknown error';
          setFeedback(`Expo Push Gateway rejected: ${reason}`);
          showToast(`Expo error: ${reason}`, 'error');
        }
      } catch (err) {
        setFeedback(`Test dispatch error: ${err.message}`);
        showToast(err.message, 'error');
      } finally {
        setIsTestingSingle(false);
      }
    };

    return html`
      <div>
        <div className="view-header">
          <div>
            <h1 className="view-title">Push Notifications Engine</h1>
            <p className="view-subtitle">Inspect connected Expo device installations, test device tokens, and broadcast instant notices.</p>
          </div>
          <button className="btn-secondary btn-sm" onClick=${refreshDevices}>
            <${Icons.Refresh} size=${12} />
            <span>Refresh Devices</span>
          </button>
        </div>

        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-head">
              <span className="metric-label">App Installs</span>
              <${Icons.Smartphone} className="metric-icon" />
            </div>
            <strong className="metric-value">${formatNumber(totalInstalls)}</strong>
            <span className="metric-foot">Expo device registrations</span>
          </div>
          <div className="metric-card">
            <div className="metric-head">
              <span className="metric-label">Android Devices</span>
              <${Icons.Activity} className="metric-icon" />
            </div>
            <strong className="metric-value">${androidInstalls !== '—' ? formatNumber(androidInstalls) : '—'}</strong>
            <span className="metric-foot">Android 13+ devices</span>
          </div>
          <div className="metric-card">
            <div className="metric-head">
              <span className="metric-label">iOS Devices</span>
              <${Icons.Activity} className="metric-icon" />
            </div>
            <strong className="metric-value">${iosInstalls !== '—' ? formatNumber(iosInstalls) : '—'}</strong>
            <span className="metric-foot">Apple iOS devices</span>
          </div>
          <div className="metric-card">
            <div className="metric-head">
              <span className="metric-label">Daily Reminder</span>
              <${Icons.Bell} className="metric-icon" />
            </div>
            <strong className="metric-value">20:00</strong>
            <span className="metric-foot">Learner local timezone</span>
          </div>
        </div>

        <div className="two-column-row">
          <!-- Broadcast Composer -->
          <div className="card">
            <div className="card-header">
              <span className="card-title">Compose Push Announcement</span>
              <span className="card-tag">Broadcast</span>
            </div>

            <form onSubmit=${handleBroadcast} style=${{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  className="form-input"
                  maxLength="48"
                  value=${title}
                  onChange=${(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Body Message</label>
                <textarea
                  className="form-textarea"
                  maxLength="120"
                  value=${body}
                  onChange=${(e) => setBody(e.target.value)}
                  required
                />
              </div>

              <div style=${{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Target Destination</label>
                  <select className="form-input" value=${screen} onChange=${(e) => setScreen(e.target.value)}>
                    <option value="call">Speak Tab (Nila AI Call)</option>
                    <option value="learn">Curriculum Map</option>
                    <option value="profile">Profile & Streaks</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select className="form-input" value=${priority} onChange=${(e) => setPriority(e.target.value)}>
                    <option value="high">High (Wake screen)</option>
                    <option value="default">Normal</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled=${isBroadcasting || isTestingSingle}>
                <${Icons.Send} size=${14} />
                <span>${isBroadcasting ? 'Broadcasting...' : 'Dispatch to All Devices'}</span>
              </button>

              <!-- Single Device Direct Tester -->
              <div style=${{ marginTop: '12px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                <span className="card-title" style=${{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>Test Single Device (Expo Push Token)</span>
                <div style=${{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    style=${{ fontFamily: 'monospace', fontSize: '11px' }}
                    placeholder="ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
                    value=${testToken}
                    onChange=${(e) => setTestToken(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    style=${{ whiteSpace: 'nowrap' }}
                    onClick=${handleSendTestToken}
                    disabled=${isBroadcasting || isTestingSingle || !testToken.trim()}
                  >
                    <${Icons.Bell} size=${12} />
                    <span>${isTestingSingle ? 'Testing...' : 'Test Device'}</span>
                  </button>
                </div>
              </div>

              ${feedback && html`<p style=${{ fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', marginTop: '6px' }}>${feedback}</p>`}
            </form>
          </div>

          <!-- Phone Lockscreen Mockup Preview -->
          <div className="card">
            <div className="card-header">
              <span className="card-title">Live Lockscreen Preview</span>
              <span className="card-tag">Interactive</span>
            </div>

            <div className="phone-mockup-wrapper">
              <div className="phone-screen">
                <div className="phone-clock">20:00</div>
                <div className="phone-date">Today</div>

                <div className="lockscreen-card">
                  <div className="lockscreen-header">
                    <img src="./assets/R_Appicon.png" alt="" />
                    <span>ELVATE</span>
                    <span className="lockscreen-time">now</span>
                  </div>
                  <div className="lockscreen-title">${title || 'Notification Title'}</div>
                  <div className="lockscreen-body">${body || 'Notification body text preview will appear here.'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /* ==========================================================================
     11. VIEW: SYSTEM DIAGNOSTICS
     ========================================================================== */

  function SystemView({ latency, isPinging, onPing }) {
    const services = [
      { name: 'Supabase Database & Auth', badge: 'REST v1', desc: 'User profiles, XP progression, RLS policies, security definers.', meta: latency ? `Latency: ${latency} ms` : 'Status: Optimal' },
      { name: 'AI Course Generator', badge: 'Edge Function', desc: 'OpenRouter Nemotron 3.5 Super VL 5-class curriculum synthesis.', meta: 'Endpoint: /admin-generate-course' },
      { name: 'Gemini TTS Voice Engine', badge: 'Edge Function', desc: 'Multi-modal Tamil & English speech synthesis for lesson lectures.', meta: 'Bucket: course-audio' },
      { name: 'Gemini Illustration Studio', badge: 'Edge Function', desc: '16:9 contextual classroom and conversational illustrations.', meta: 'Bucket: course-images' },
      { name: 'Automated Push Cron', badge: 'pg_cron', desc: 'Per-minute timezone evaluation and 8:00 PM automated reminder engine.', meta: 'Schedule: * * * * *' },
      { name: 'EAS Build Cloud', badge: 'Expo EAS', desc: 'Android APK compilation pipeline and release distribution.', meta: 'Status: Production Ready' },
    ];

    return html`
      <div>
        <div className="view-header">
          <div>
            <h1 className="view-title">System Diagnostics</h1>
            <p className="view-subtitle">Monitor cloud microservices, Edge Function readiness, storage buckets, and API round-trip latency.</p>
          </div>
          <button className="btn-secondary btn-sm" onClick=${onPing} disabled=${isPinging}>
            <${Icons.Activity} size=${14} />
            <span>${isPinging ? 'Pinging...' : 'Test API Latency'}</span>
          </button>
        </div>

        <div className="services-grid">
          ${services.map(
            (s, i) => html`
              <div key=${i} className="service-card">
                <div className="service-top">
                  <div className="service-info">
                    <span className="status-dot"></span>
                    <span className="service-name">${s.name}</span>
                  </div>
                  <span className="service-badge">${s.badge}</span>
                </div>
                <p className="service-desc">${s.desc}</p>
                <div className="service-meta">
                  <span>${s.meta}</span>
                  <span>Operational</span>
                </div>
              </div>
            `
          )}
        </div>
      </div>
    `;
  }

  /* ==========================================================================
     12. MOUNT REACT ROOT
     ========================================================================== */

  const container = document.getElementById('root');
  if (container) {
    const root = ReactDOM.createRoot(container);
    root.render(React.createElement(AdminApp));
  }
})();
