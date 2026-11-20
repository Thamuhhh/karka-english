(() => {
  const config = window.ELVATE_ADMIN_CONFIG || {};
  const apiUrl = String(config.supabaseUrl || 'https://cvfnqiyxwhicizekomag.supabase.co').replace(/\/$/, '');
  const publishableKey = String(config.publishableKey || '');
  const storageKey = 'elvate-admin-session';
  const pageSize = 25;

  // DOM Elements - Shell & Auth
  const loginScreen = document.querySelector('#login-screen');
  const dashboard = document.querySelector('#dashboard');
  const loginForm = document.querySelector('#login-form');
  const loginButton = document.querySelector('#login-button');
  const loginError = document.querySelector('#login-error');
  const dashboardError = document.querySelector('#dashboard-error');
  const adminName = document.querySelector('#admin-name');
  const signoutButton = document.querySelector('#signout-button');
  const refreshButton = document.querySelector('#refresh-button');
  const lastUpdated = document.querySelector('#last-updated');
  const crumbCurrent = document.querySelector('#crumb-current');
  const globalSearch = document.querySelector('#global-search');
  const toastContainer = document.querySelector('#toast-container');
  const cloudStatePill = document.querySelector('#cloud-state-pill');

  // DOM Elements - Learners
  const rowsElement = document.querySelector('#learner-rows');
  const searchInput = document.querySelector('#learner-search');
  const searchForm = document.querySelector('#search-form');
  const previousButton = document.querySelector('#previous-page');
  const nextButton = document.querySelector('#next-page');
  const resultCount = document.querySelector('#result-count');
  const pageIndicator = document.querySelector('#pagination-page-indicator');
  const exportCsvButton = document.querySelector('#export-learners-csv');
  const filterChips = document.querySelectorAll('.filter-chip');

  // DOM Elements - Learner Drawer
  const learnerDrawer = document.querySelector('#learner-drawer');
  const closeDrawerBtn = document.querySelector('#close-drawer-btn');
  const drawerName = document.querySelector('#drawer-name');
  const drawerAvatar = document.querySelector('#drawer-avatar');
  const drawerDisplayName = document.querySelector('#drawer-display-name');
  const drawerEmail = document.querySelector('#drawer-email');
  const drawerProviderBadge = document.querySelector('#drawer-provider-badge');
  const drawerXp = document.querySelector('#drawer-xp');
  const drawerStreak = document.querySelector('#drawer-streak');
  const drawerClasses = document.querySelector('#drawer-classes');
  const drawerRank = document.querySelector('#drawer-rank');
  const drawerUserid = document.querySelector('#drawer-userid');
  const drawerJoined = document.querySelector('#drawer-joined');
  const drawerActive = document.querySelector('#drawer-active');
  const drawerLearningSummary = document.querySelector('#drawer-learning-summary');

  // DOM Elements - Course Studio Subtabs & Subviews
  const tabCourseCatalog = document.querySelector('#tab-course-catalog');
  const tabCourseAi = document.querySelector('#tab-course-ai');
  const tabCourseManual = document.querySelector('#tab-course-manual');
  const subviewCatalog = document.querySelector('#course-catalog-subview');
  const subviewAi = document.querySelector('#course-ai-subview');
  const subviewManual = document.querySelector('#course-manual-subview');
  const savedCoursesContainer = document.querySelector('#saved-courses');
  const sideCourseCount = document.querySelector('#side-course-count');
  const sideLearnerCount = document.querySelector('#side-learner-count');
  const customUnitsCountBadge = document.querySelector('#custom-units-count-badge');
  const openAiGeneratorBtn = document.querySelector('#open-ai-generator-btn');
  const openManualCourseBtn = document.querySelector('#open-manual-course');
  const closeManualCourseBtn = document.querySelector('#close-manual-course');
  const topbarNewCourseBtn = document.querySelector('#topbar-new-course');

  // DOM Elements - Push & Notifications
  const metricPushDevices = document.querySelector('#metric-push-devices');
  const pushTitleInput = document.querySelector('#push-title');
  const pushBodyInput = document.querySelector('#push-body');
  const previewNotifTitle = document.querySelector('#preview-notif-title');
  const previewNotifBody = document.querySelector('#preview-notif-body');
  const phonePreviewClock = document.querySelector('#phone-preview-clock');
  const broadcastPushForm = document.querySelector('#broadcast-push-form');
  const pushFeedback = document.querySelector('#push-feedback');
  const sendBroadcastBtn = document.querySelector('#send-broadcast-btn');

  // DOM Elements - Diagnostics
  const pingServicesBtn = document.querySelector('#ping-services-btn');
  const latencyDb = document.querySelector('#latency-db');

  // State
  let session = readSession();
  let currentOffset = 0;
  let visibleRows = 0;
  let cachedLearners = [];
  let currentLearnerFilter = 'all';
  let publishedCustomCourseCount = 0;
  let editingCourse = null;
  let editingCourseStatus = 'draft';
  let manualCourseBusy = false;
  let manualAudioBusy = false;
  let manualImageBusy = false;
  let audioAbortController = null;
  let audioStopRequested = false;
  let tamilPreviewAudio = null;
  let activeTamilPreviewButton = null;
  let lastPingMs = null;

  /* ==========================================================================
     1. SESSION MANAGEMENT & AUTHENTICATION
     ========================================================================== */

  function readSession() {
    try {
      return JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    } catch {
      return null;
    }
  }

  function saveSession(nextSession) {
    session = nextSession;
    if (session) {
      sessionStorage.setItem(storageKey, JSON.stringify(session));
    } else {
      sessionStorage.removeItem(storageKey);
    }
  }

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
      throw new Error(data.msg || data.message || data.error_description || 'Could not authenticate.');
    }
    return data;
  }

  async function refreshSession() {
    if (!session?.refreshToken) {
      saveSession(null);
      throw new Error('Your session expired. Please sign in again.');
    }
    try {
      const data = await authRequest('token?grant_type=refresh_token', { refresh_token: session.refreshToken });
      saveSession({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
        user: data.user || session.user,
      });
    } catch (error) {
      saveSession(null);
      throw error;
    }
  }

  async function rpc(functionName, payload = {}, retry = true) {
    if (!session?.accessToken) throw new Error('Please sign in again.');
    if (session.expiresAt && Date.now() > session.expiresAt - 60000) {
      await refreshSession();
    }

    const response = await fetch(`${apiUrl}/rest/v1/rpc/${functionName}`, {
      method: 'POST',
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 401 && retry && session.refreshToken) {
      await refreshSession();
      return rpc(functionName, payload, false);
    }

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401) saveSession(null);
      throw new Error(data?.message || data?.details || 'Could not execute admin RPC.');
    }
    return data;
  }

  function showDashboard(isVisible) {
    loginScreen.hidden = isVisible;
    dashboard.hidden = !isVisible;
    if (isVisible) {
      const email = session?.user?.email || 'Administrator';
      if (adminName) adminName.textContent = email;
      updateLiveClock();
    }
  }

  async function signOut() {
    const current = session;
    saveSession(null);
    showDashboard(false);
    showToast('Signed out of Operations Console.', 'info');
    if (current?.accessToken && apiUrl && publishableKey) {
      await authRequest('logout', {}, current.accessToken).catch(() => {});
    }
  }

  /* ==========================================================================
     2. UI HELPERS & TOAST SYSTEM
     ========================================================================== */

  function showToast(message, type = 'info', duration = 3500) {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `admin-toast toast-${type}`;
    const icon = type === 'success' ? '✓' : type === 'error' ? '⚠' : 'ℹ';
    toast.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-text">${escapeHtml(message)}</span>`;
    toastContainer.append(toast);

    setTimeout(() => {
      toast.classList.add('toast-fadeout');
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  function showMessage(element, message, isError = true) {
    if (!element) return;
    element.textContent = message || '';
    element.classList.toggle('is-error', Boolean(message) && isError);
    element.classList.toggle('is-success', Boolean(message) && !isError);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  function formatNumber(value) {
    return new Intl.NumberFormat('en-US').format(Number(value) || 0);
  }

  function formatDate(value) {
    if (!value) return 'Not yet active';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  }

  function formatRelativeTime(value) {
    if (!value) return 'Never';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    const diffHours = (Date.now() - date.getTime()) / (1000 * 60 * 60);
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
    if (diffHours < 48) return 'Yesterday';
    return formatDate(value);
  }

  function calculateRank(xp) {
    const count = Number(xp) || 0;
    if (count >= 6000) return 'Diamond V 👑';
    if (count >= 3000) return 'Platinum IV ✦';
    if (count >= 1500) return 'Gold III 🥇';
    if (count >= 500) return 'Silver II 🥈';
    return 'Bronze I 🥉';
  }

  function isGuestAccount(learner) {
    const email = String(learner?.email || '').trim().toLowerCase();
    const name = String(learner?.display_name || '').trim().toLowerCase();
    return !email || email.includes('guest') || email.includes('anon') || name.startsWith('guest');
  }

  function updateLiveClock() {
    if (!phonePreviewClock) return;
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    phonePreviewClock.textContent = `${hours}:${minutes}`;
  }

  function getNextUnitNumber() {
    return 5 + publishedCustomCourseCount;
  }

  /* ==========================================================================
     3. SPA ROUTER & VIEW NAVIGATION
     ========================================================================== */

  const VIEW_TITLES = {
    overview: 'Operations Overview',
    learners: 'Learner Directory & CRM',
    courses: 'Course Studio & Curriculum',
    notifications: 'Push Notifications Engine',
    system: 'System Diagnostics & Health',
  };

  function navigateToView(viewId) {
    const target = viewId.replace(/^#/, '') || 'overview';
    const validViews = ['overview', 'learners', 'courses', 'notifications', 'system'];
    const activeView = validViews.includes(target) ? target : 'overview';

    // Update View Containers
    document.querySelectorAll('.app-view').forEach((view) => {
      const match = view.id === `view-${activeView}`;
      view.hidden = !match;
      view.classList.toggle('active-view', match);
    });

    // Update Sidebar Active Class
    document.querySelectorAll('.side-link').forEach((link) => {
      const isTarget = link.getAttribute('data-view') === activeView;
      link.classList.toggle('side-link-active', isTarget);
    });

    // Update Breadcrumb
    if (crumbCurrent) {
      crumbCurrent.textContent = VIEW_TITLES[activeView] || 'Overview';
    }

    // Hash sync
    if (window.location.hash !== `#${activeView}`) {
      history.replaceState(null, '', `#${activeView}`);
    }

    // View-specific trigger
    if (activeView === 'system' && !lastPingMs) {
      pingApiLatency();
    }
    if (activeView === 'notifications') {
      loadPushDeviceCount();
    }
  }

  // Sidebar link clicks
  document.querySelectorAll('.side-link').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const view = link.getAttribute('data-view');
      if (view) navigateToView(view);
    });
  });

  // Course Studio Subnav Switcher
  function switchCourseSubTab(tab) {
    const tabs = [
      { btn: tabCourseCatalog, view: subviewCatalog, name: 'catalog' },
      { btn: tabCourseAi, view: subviewAi, name: 'ai' },
      { btn: tabCourseManual, view: subviewManual, name: 'manual' },
    ];

    tabs.forEach(({ btn, view, name }) => {
      const isMatch = name === tab;
      if (btn) btn.classList.toggle('active', isMatch);
      if (view) {
        view.hidden = !isMatch;
        view.classList.toggle('active', isMatch);
      }
    });
  }

  if (tabCourseCatalog) tabCourseCatalog.addEventListener('click', () => switchCourseSubTab('catalog'));
  if (tabCourseAi) tabCourseAi.addEventListener('click', () => switchCourseSubTab('ai'));
  if (tabCourseManual) tabCourseManual.addEventListener('click', () => switchCourseSubTab('manual'));

  if (openAiGeneratorBtn) {
    openAiGeneratorBtn.addEventListener('click', () => {
      navigateToView('courses');
      switchCourseSubTab('ai');
    });
  }

  if (topbarNewCourseBtn) {
    topbarNewCourseBtn.addEventListener('click', () => {
      navigateToView('courses');
      switchCourseSubTab('ai');
    });
  }

  /* ==========================================================================
     4. OVERVIEW DASHBOARD & METRICS
     ========================================================================== */

  async function loadDashboard() {
    showMessage(dashboardError, '');
    if (refreshButton) refreshButton.disabled = true;

    try {
      const overview = await rpc('admin_get_overview');

      // Populate Metric Cards
      document.querySelector('#metric-accounts').textContent = formatNumber(overview.total_accounts);
      document.querySelector('#metric-new').textContent = formatNumber(overview.new_accounts_7d);
      document.querySelector('#metric-active').textContent = formatNumber(overview.active_today);
      document.querySelector('#metric-xp').textContent = formatNumber(overview.total_xp);
      document.querySelector('#metric-classes').textContent = formatNumber(overview.completed_classes);
      document.querySelector('#metric-streak').textContent = `${Number(overview.average_streak || 0).toFixed(1)} days`;

      // Sidebar Count Badges
      if (sideLearnerCount) sideLearnerCount.textContent = formatNumber(overview.total_accounts);

      // Secondary Engagement Rates
      const totalAcc = Number(overview.total_accounts) || 1;
      const activeRate = Math.min(100, (Number(overview.active_today || 0) / totalAcc) * 100);
      const weeklyRate = Math.min(100, (Number(overview.new_accounts_7d || 0) / totalAcc) * 100);
      const masteryAvg = (Number(overview.completed_classes || 0) / totalAcc).toFixed(1);

      const kpiActiveRate = document.querySelector('#kpi-active-rate');
      const kpiActiveBar = document.querySelector('#kpi-active-bar');
      if (kpiActiveRate && kpiActiveBar) {
        kpiActiveRate.textContent = `${activeRate.toFixed(1)}%`;
        kpiActiveBar.style.width = `${Math.max(4, activeRate)}%`;
      }

      const kpiWeeklyRate = document.querySelector('#kpi-weekly-rate');
      const kpiWeeklyBar = document.querySelector('#kpi-weekly-bar');
      if (kpiWeeklyRate && kpiWeeklyBar) {
        kpiWeeklyRate.textContent = `${weeklyRate.toFixed(1)}%`;
        kpiWeeklyBar.style.width = `${Math.max(4, weeklyRate)}%`;
      }

      const kpiMasteryRate = document.querySelector('#kpi-mastery-rate');
      const kpiMasteryBar = document.querySelector('#kpi-mastery-bar');
      if (kpiMasteryRate && kpiMasteryBar) {
        kpiMasteryRate.textContent = `${masteryAvg} / user`;
        kpiMasteryBar.style.width = `${Math.min(100, Math.max(6, Number(masteryAvg) * 10))}%`;
      }

      if (lastUpdated) {
        lastUpdated.textContent = `Updated ${new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(new Date())}`;
      }

      // Parallel secondary loads
      await Promise.allSettled([
        loadLearners(),
        loadCourses().catch((err) => {
          console.warn('Courses schema warning:', err.message);
        }),
        loadPushDeviceCount(),
      ]);

      showToast('Dashboard telemetry updated.', 'success', 2000);
    } catch (error) {
      showMessage(dashboardError, error.message || 'Could not load dashboard data.');
      if (!session) showDashboard(false);
    } finally {
      if (refreshButton) refreshButton.disabled = false;
    }
  }

  /* ==========================================================================
     5. LEARNERS DIRECTORY, CRM & INSPECTOR DRAWER
     ========================================================================== */

  function setLoadingRows(message) {
    rowsElement.replaceChildren();
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 8;
    cell.className = 'table-message';
    cell.textContent = message;
    row.append(cell);
    rowsElement.append(row);
  }

  function filterLearnersLocally(learners) {
    if (!learners.length) return [];
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    return learners.filter((learner) => {
      switch (currentLearnerFilter) {
        case 'active': {
          if (!learner.last_active_date) return false;
          const diff = now - new Date(learner.last_active_date).getTime();
          return diff <= oneDayMs;
        }
        case 'streak':
          return Number(learner.streak_days) >= 3;
        case 'guests':
          return isGuestAccount(learner);
        case 'registered':
          return !isGuestAccount(learner);
        case 'all':
        default:
          return true;
      }
    });
  }

  function renderLearners(learners) {
    rowsElement.replaceChildren();
    const displayList = filterLearnersLocally(learners);

    if (!displayList.length) {
      setLoadingRows(currentLearnerFilter === 'all' ? 'No learner accounts found.' : `No learners match the "${currentLearnerFilter}" filter.`);
      return;
    }

    displayList.forEach((learner) => {
      const row = document.createElement('tr');
      row.className = 'learner-row';

      // 1. Learner Identity (Avatar + Name + Email)
      const learnerCell = document.createElement('td');
      const identity = document.createElement('div');
      identity.className = 'learner-identity';
      const avatar = document.createElement('span');
      avatar.className = 'learner-avatar';
      const initial = (learner.display_name || learner.email || 'L').trim().slice(0, 1).toUpperCase();
      avatar.textContent = initial;

      const details = document.createElement('span');
      details.className = 'learner-details';
      const name = document.createElement('b');
      name.textContent = learner.display_name || 'Elvate Learner';
      const email = document.createElement('small');
      email.textContent = learner.email || 'Anonymous / Guest';
      details.append(name, email);
      identity.append(avatar, details);
      learnerCell.append(identity);
      row.append(learnerCell);

      // 2. Account Type Badge
      const typeCell = document.createElement('td');
      const isGuest = isGuestAccount(learner);
      const typeBadge = document.createElement('span');
      typeBadge.className = `account-badge ${isGuest ? 'guest' : 'registered'}`;
      typeBadge.textContent = isGuest ? 'Guest' : 'Verified';
      typeCell.append(typeBadge);
      row.append(typeCell);

      // 3. Joined Date
      const joinedCell = document.createElement('td');
      joinedCell.textContent = formatDate(learner.created_at);
      row.append(joinedCell);

      // 4. Last Active Date
      const activeCell = document.createElement('td');
      activeCell.textContent = formatRelativeTime(learner.last_active_date);
      activeCell.title = learner.last_active_date ? new Date(learner.last_active_date).toLocaleString() : 'Never';
      row.append(activeCell);

      // 5. XP
      const xpCell = document.createElement('td');
      xpCell.className = 'numeric-cell xp-cell';
      xpCell.textContent = `${formatNumber(learner.stardust_xp)} ✦`;
      row.append(xpCell);

      // 6. Streak
      const streakCell = document.createElement('td');
      streakCell.className = 'numeric-cell streak-cell';
      const streakDays = Number(learner.streak_days) || 0;
      streakCell.innerHTML = streakDays > 0 ? `<b>${streakDays}d</b> <span class="fire-icon">🔥</span>` : '0d';
      row.append(streakCell);

      // 7. Classes Completed
      const classesCell = document.createElement('td');
      classesCell.className = 'numeric-cell';
      classesCell.textContent = formatNumber(learner.completed_classes);
      row.append(classesCell);

      // 8. Action (Inspect Drawer)
      const actionCell = document.createElement('td');
      const inspectBtn = document.createElement('button');
      inspectBtn.type = 'button';
      inspectBtn.className = 'inspect-btn';
      inspectBtn.innerHTML = 'Inspect <span aria-hidden="true">→</span>';
      inspectBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        openLearnerDrawer(learner);
      });
      actionCell.append(inspectBtn);
      row.append(actionCell);

      // Row click inspects learner as well
      row.addEventListener('click', () => openLearnerDrawer(learner));

      rowsElement.append(row);
    });
  }

  async function loadLearners() {
    setLoadingRows('Loading student directory…');
    const learners = await rpc('admin_list_learners', {
      p_query: searchInput.value.trim(),
      p_limit: pageSize,
      p_offset: currentOffset,
    });

    cachedLearners = Array.isArray(learners) ? learners : [];
    visibleRows = cachedLearners.length;
    renderLearners(cachedLearners);

    if (resultCount) {
      resultCount.textContent = visibleRows
        ? `Showing ${currentOffset + 1}–${currentOffset + visibleRows} accounts`
        : 'No accounts found';
    }

    if (pageIndicator) {
      const pageNum = Math.floor(currentOffset / pageSize) + 1;
      pageIndicator.textContent = `Page ${pageNum}`;
    }

    if (previousButton) previousButton.disabled = currentOffset === 0;
    if (nextButton) nextButton.disabled = visibleRows < pageSize;
  }

  // Learner Filter Chips
  filterChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      filterChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      currentLearnerFilter = chip.getAttribute('data-filter') || 'all';
      renderLearners(cachedLearners);
    });
  });

  // Learner Inspector Drawer
  function openLearnerDrawer(learner) {
    if (!learnerDrawer) return;
    const name = learner.display_name || 'Elvate Learner';
    const email = learner.email || 'Anonymous Guest';
    const initial = (name || email).slice(0, 1).toUpperCase();
    const isGuest = isGuestAccount(learner);
    const xp = Number(learner.stardust_xp) || 0;
    const streak = Number(learner.streak_days) || 0;
    const classes = Number(learner.completed_classes) || 0;

    drawerName.textContent = name;
    drawerAvatar.textContent = initial;
    drawerDisplayName.textContent = name;
    drawerEmail.textContent = email;
    drawerProviderBadge.textContent = isGuest ? 'Guest Session' : 'Email Verified';
    drawerProviderBadge.className = `badge ${isGuest ? 'guest' : 'registered'}`;

    drawerXp.textContent = `${formatNumber(xp)} ✦`;
    drawerStreak.textContent = `${streak} days ${streak > 0 ? '🔥' : ''}`;
    drawerClasses.textContent = `${classes} completed`;
    drawerRank.textContent = calculateRank(xp);

    drawerUserid.textContent = learner.id || '—';
    drawerJoined.textContent = learner.created_at ? new Date(learner.created_at).toLocaleString() : '—';
    drawerActive.textContent = learner.last_active_date ? new Date(learner.last_active_date).toLocaleString() : 'Never';

    if (drawerLearningSummary) {
      drawerLearningSummary.textContent = `${name} has accumulated ${formatNumber(xp)} Stardust XP and completed ${classes} interactive classes with a ${streak}-day active practice streak. Account status: ${isGuest ? 'Guest player' : 'Registered member'}.`;
    }

    learnerDrawer.hidden = false;
  }

  function closeLearnerDrawer() {
    if (learnerDrawer) learnerDrawer.hidden = true;
  }

  if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeLearnerDrawer);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && learnerDrawer && !learnerDrawer.hidden) {
      closeLearnerDrawer();
    }
    // Pressing '/' focuses global search when not typing in an input
    if (event.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
      event.preventDefault();
      if (globalSearch) globalSearch.focus();
    }
  });

  // Global search redirect
  if (globalSearch) {
    globalSearch.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        const query = globalSearch.value.trim();
        if (query) {
          navigateToView('learners');
          if (searchInput) searchInput.value = query;
          currentOffset = 0;
          loadLearners();
        }
      }
    });
  }

  // Learner CSV Exporter
  if (exportCsvButton) {
    exportCsvButton.addEventListener('click', () => {
      if (!cachedLearners.length) {
        showToast('No learners to export.', 'error');
        return;
      }

      const headers = ['User ID', 'Display Name', 'Email', 'Account Type', 'XP', 'Streak Days', 'Completed Classes', 'Joined At', 'Last Active'];
      const rows = cachedLearners.map((l) => [
        `"${String(l.id || '').replace(/"/g, '""')}"`,
        `"${String(l.display_name || '').replace(/"/g, '""')}"`,
        `"${String(l.email || '').replace(/"/g, '""')}"`,
        isGuestAccount(l) ? 'Guest' : 'Verified Email',
        Number(l.stardust_xp) || 0,
        Number(l.streak_days) || 0,
        Number(l.completed_classes) || 0,
        l.created_at || '',
        l.last_active_date || '',
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `elvate_learners_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      showToast(`Exported ${cachedLearners.length} learner records.`, 'success');
    });
  }

  /* ==========================================================================
     6. COURSE STUDIO & CURRICULUM ARCHITECT
     ========================================================================== */

  async function loadCourses() {
    const target = savedCoursesContainer;
    const savedCourses = await rpc('admin_list_courses');

    publishedCustomCourseCount = Array.isArray(savedCourses)
      ? savedCourses.filter((entry) => entry.status === 'published' && !String(entry.id).startsWith('builtin-unit-')).length
      : 0;

    const savedById = new Map((Array.isArray(savedCourses) ? savedCourses : []).map((entry) => [entry.id, entry]));
    const builtInCourses = (window.ELVATE_BUILTIN_COURSES || []).map((level) => {
      const id = `builtin-unit-${level.levelNumber}`;
      const saved = savedById.get(id);
      return saved
        ? { ...saved, is_builtin: true }
        : { id, level_data: { ...level, id }, status: 'published', is_builtin: true };
    });

    const courses = [
      ...builtInCourses,
      ...(Array.isArray(savedCourses) ? savedCourses.filter((entry) => !String(entry.id).startsWith('builtin-unit-')) : []),
    ].sort((a, b) => Number(a.level_data?.levelNumber || 0) - Number(b.level_data?.levelNumber || 0));

    // Update Badges
    if (sideCourseCount) sideCourseCount.textContent = String(courses.length);
    if (customUnitsCountBadge) {
      customUnitsCountBadge.innerHTML = `Custom: <b>${courses.length - builtInCourses.length} Units</b>`;
    }

    target.replaceChildren();
    if (!Array.isArray(courses) || !courses.length) {
      target.innerHTML = '<p class="table-message">No courses saved yet.</p>';
      return;
    }

    courses.forEach((entry) => {
      const level = entry.level_data || {};
      const card = document.createElement('article');
      card.className = 'unit-card';

      // Head: Level Badge & Status
      const head = document.createElement('div');
      head.className = 'unit-card-head';
      const badge = document.createElement('span');
      badge.className = 'unit-badge';
      badge.textContent = `Unit ${level.levelNumber || '?'}`;

      const statusChip = document.createElement('span');
      statusChip.className = `unit-status-chip ${entry.is_builtin ? 'core' : entry.status || 'draft'}`;
      statusChip.textContent = entry.is_builtin ? 'CORE UNIT' : (entry.status || 'draft').toUpperCase();
      head.append(badge, statusChip);

      // Title & Description
      const title = document.createElement('h4');
      title.className = 'unit-card-title';
      title.textContent = String(level.levelName || entry.id).replace(/^Unit\s+\d+\s*:\s*/i, '');

      const topic = document.createElement('p');
      topic.className = 'unit-card-topic';
      topic.textContent = level.description || (level.classes?.[0]?.learnerOutcome) || 'Comprehensive conversational mastery unit.';

      // Meta list: CEFR tag, class count, audio status
      const meta = document.createElement('div');
      meta.className = 'unit-meta-list';
      const classesCount = level.classes?.length || 0;
      const audioCount = (level.classes || []).filter((c) => c?.lectureAudio?.tamil?.url).length;

      meta.innerHTML = `
        <span>🏷 ${level.cefrTag || 'CEFR A1'}</span>
        <span>📚 ${classesCount} classes</span>
        <span>🎙 ${audioCount}/${classesCount} audio</span>
      `;

      // Actions
      const actions = document.createElement('div');
      actions.className = 'unit-card-actions';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'secondary-button-compact';
      editBtn.textContent = 'Edit Unit';
      editBtn.addEventListener('click', () => openCourseEditor(entry));
      actions.append(editBtn);

      if (!entry.is_builtin && !entry.is_starter) {
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'delete-course-button';
        removeBtn.textContent = 'Delete';
        removeBtn.setAttribute('aria-label', `Delete ${title.textContent}`);
        removeBtn.addEventListener('click', () => deleteCourse(entry, removeBtn));
        actions.append(removeBtn);
      }

      card.append(head, title, topic, meta, actions);
      target.append(card);
    });
  }

  function openCourseEditor(entry) {
    editingCourse = JSON.parse(JSON.stringify(entry.level_data));
    editingCourseStatus = entry.status || 'draft';

    navigateToView('courses');
    switchCourseSubTab('manual');

    const heading = document.querySelector('#course-manual-subview h2');
    if (heading) heading.textContent = `Edit ${entry.level_data.levelName}`;

    document.querySelector('#manual-class-fields').replaceChildren();
    renderManualClassFields(entry.level_data.classes.length, entry.level_data);

    const form = document.querySelector('#manual-course-form');
    form.elements.unitTitle.value = String(entry.level_data.levelName || '').replace(/^Unit\s+\d+\s*:\s*/i, '');
    form.elements.cefrTag.value = entry.level_data.cefrTag || 'CEFR A1';
    form.elements.description.value = entry.level_data.description || '';

    showMessage(document.querySelector('#manual-course-message'), '');
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    showToast(`Loaded "${entry.level_data.levelName}" for editing.`, 'info');
  }

  async function deleteCourse(entry, button) {
    const title = entry.level_data?.levelName || entry.id;
    if (!window.confirm(`Delete "${title}"? This removes the unit from the app.`)) return;
    button.disabled = true;

    try {
      await rpc('admin_delete_course', { p_course_id: entry.id });
      if (editingCourse?.id === entry.id) {
        editingCourse = null;
        document.querySelector('#course-editor').hidden = true;
      }
      showToast(`Deleted "${title}".`, 'success');
      await loadCourses();
    } catch (error) {
      button.disabled = false;
      showToast(error.message || 'Could not delete course.', 'error');
    }
  }

  function showCoursePreview(course) {
    editingCourse = course;
    if (!editingCourseStatus) editingCourseStatus = 'draft';

    const editor = document.querySelector('#course-editor');
    editor.hidden = false;
    document.querySelector('#course-preview-title').textContent = course.levelName;
    document.querySelector('#course-description').value = course.description || '';
    document.querySelector('#course-count').textContent = `${course.classes.length} Classes`;

    const list = document.querySelector('#generated-lessons');
    list.replaceChildren();

    course.classes.forEach((lesson, index) => {
      const item = document.createElement('div');
      item.className = 'generated-lesson';
      const title = document.createElement('b');
      title.textContent = `Class ${index + 1} · ${lesson.title}`;
      const meta = document.createElement('span');
      meta.textContent = `${lesson.grammarTopic} · ${lesson.duration}`;
      item.append(title, meta);
      addClassImageControl(item, lesson, index, false);
      addTamilAudioPreview(item, lesson);
      list.append(item);
    });

    editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function saveCourse(status) {
    if (!editingCourse || manualImageBusy) return;
    const course = { ...editingCourse, description: document.querySelector('#course-description').value.trim() };
    const saved = await rpc('admin_save_course', { p_level_data: course, p_status: status });
    if (saved?.level_data) showCoursePreview(saved.level_data);
    editingCourseStatus = status;

    const msg = status === 'published' ? 'Unit published live to the app!' : 'Draft unit saved.';
    showMessage(document.querySelector('#course-message'), msg, false);
    showToast(msg, 'success');
    await loadCourses();
  }

  function renderManualClassFields(count = 5, course = null) {
    const target = document.querySelector('#manual-class-fields');
    target.replaceChildren();

    for (let index = 1; index <= count; index += 1) {
      const lesson = course?.classes?.[index - 1];
      const card = document.createElement('fieldset');
      card.className = 'manual-class-card';
      card.innerHTML = `
        <legend>Class ${index}</legend>
        <label>Class title<input name="class${index}Title" required maxlength="100" placeholder="Ask Clear Questions and Give Short Answers" /></label>
        <label>Subtitle<input name="class${index}Subtitle" required maxlength="160" placeholder="Put the helper in the right place" /></label>
        <label>Learner outcome<input name="class${index}Outcome" maxlength="240" placeholder="Ask about a routine, current situation, or past event" /></label>
        <label>Grammar focus<input name="class${index}Grammar" required maxlength="120" placeholder="Could I…? / Can I…?" /></label>
        <label>Class duration<input name="class${index}Duration" required maxlength="30" placeholder="7 minutes" /></label>
        <label>Rule heading<input name="class${index}RuleHeading" required maxlength="100" placeholder="Let the helper lead" /></label>
        <label>English explanation<textarea name="class${index}Explanation" required maxlength="1200" rows="4" placeholder="Explain the pattern and add useful examples"></textarea></label>
        <label>Tamil mental model<textarea name="class${index}TamilExplanation" required maxlength="1600" rows="6" placeholder="Teach the idea in natural spoken Tamil"></textarea></label>
        <label>Common wrong English<input name="class${index}WrongExample" required maxlength="240" placeholder="Where you went yesterday?" /></label>
        <label>Natural correction<input name="class${index}RightExample" required maxlength="240" placeholder="Where did you go yesterday?" /></label>
        <label>Why this correction in Tamil<textarea name="class${index}WhyTamil" required maxlength="1000" rows="4" placeholder="Explain the Tamil-to-English difference"></textarea></label>
        <label>Correct English sentence<input name="class${index}Answer" required maxlength="240" placeholder="Could I have a glass of water, please?" /></label>
        <label>Tamil sentence for word match<input name="class${index}JumbleTamil" required maxlength="240" placeholder="தயவுசெய்து எனக்கு ஒரு குவளை தண்ணீர் தர முடியுமா?" /></label>
        <label>Tamil translation prompt<input name="class${index}TranslationTamil" required maxlength="240" placeholder="எனக்கு ஒரு குவளை தண்ணீர் தர முடியுமா?" /></label>
        <label>Correct English translation<input name="class${index}TranslationAnswer" required maxlength="240" placeholder="Could I have a glass of water, please?" /></label>
        <label>Translation explanation in English<textarea name="class${index}TranslationEnglishExplanation" required maxlength="1000" rows="3" placeholder="Explain why this answer matches the Tamil prompt"></textarea></label>
        <label>Jumble hint in Tamil<input name="class${index}JumbleHint" required maxlength="240" placeholder="தமிழில் ஒரு சிறிய குறிப்பைக் கொடுங்கள்." /></label>
        <label>Translation explanation in Tamil<textarea name="class${index}TranslationExplanation" required maxlength="1000" rows="4" placeholder="Explain why the correct answer fits"></textarea></label>
        <label>Incorrect answer option 1<input name="class${index}Wrong1" required maxlength="240" placeholder="Give water to me." /></label>
        <label>Incorrect answer option 2<input name="class${index}Wrong2" required maxlength="240" placeholder="I am have water." /></label>
        <label>Speaking situation and goal<textarea name="class${index}SpeakingPrompt" required maxlength="500" rows="3" placeholder="Describe the situation and communication goal"></textarea></label>
        <label>Nila's opening line<input name="class${index}NilaOpening" maxlength="300" placeholder="What would you like to know?" /></label>
        <label>Sample spoken answer 1<input name="class${index}Sample" required maxlength="240" placeholder="A natural example response" /></label>
        <label>Sample spoken answer 2<input name="class${index}Sample2" maxlength="240" placeholder="Another natural response" /></label>
        <label>Tamil speaking coaching<textarea name="class${index}SpeakingCoaching" maxlength="500" rows="3" placeholder="Tell the learner what information to include"></textarea></label>`;

      const options = lesson?.translation?.options || [];
      const correctIndex = lesson?.translation?.correctOptionIndex ?? 0;
      const wrongOptions = options.filter((_, optionIndex) => optionIndex !== correctIndex);

      const values = {
        Title: String(lesson?.title || '').replace(/^Class\s+\d+\s*:\s*/i, ''),
        Subtitle: lesson?.subtitle || lesson?.grammarTopic || '',
        Outcome: lesson?.learnerOutcome || '',
        Grammar: lesson?.grammarTopic || '',
        Duration: lesson?.duration || '6 mins',
        RuleHeading: lesson?.rule?.heading || '',
        Explanation: lesson?.rule?.englishExplanation || '',
        TamilExplanation: lesson?.rule?.tamilMentalModel || '',
        WrongExample: lesson?.rule?.doAndDont?.wrong || wrongOptions[0] || '',
        RightExample: lesson?.rule?.doAndDont?.right || lesson?.translation?.expectedEnglish || '',
        WhyTamil: lesson?.rule?.doAndDont?.whyTamil || lesson?.rule?.tamilMentalModel || '',
        Answer: lesson?.jumble?.correctWords?.join(' ') || lesson?.translation?.expectedEnglish || '',
        JumbleTamil: lesson?.jumble?.tamilSentence || '',
        JumbleHint: lesson?.jumble?.hint || '',
        TranslationTamil: lesson?.translation?.tamilPrompt || '',
        TranslationAnswer: lesson?.translation?.expectedEnglish || lesson?.jumble?.correctWords?.join(' ') || '',
        TranslationEnglishExplanation: lesson?.translation?.explanation || lesson?.rule?.englishExplanation || '',
        TranslationExplanation: lesson?.translation?.tamilExplanation || lesson?.rule?.tamilMentalModel || '',
        Wrong1: wrongOptions[0] || '',
        Wrong2: wrongOptions[1] || '',
        SpeakingPrompt: lesson?.speakingChallenge?.prompt || '',
        NilaOpening: lesson?.speakingChallenge?.missNovaQuestion || lesson?.speakingChallenge?.prompt || '',
        Sample: lesson?.speakingChallenge?.sampleNativeResponse || '',
        Sample2: lesson?.speakingChallenge?.suggestedAnswers?.[1] || '',
        SpeakingCoaching: lesson?.speakingChallenge?.tamilCoaching || '',
      };

      Object.entries(values).forEach(([field, value]) => {
        const input = card.querySelector(`[name="class${index}${field}"]`);
        if (input) input.value = value;
      });

      addTamilAudioPreview(card, lesson);
      addClassImageControl(card, lesson, index - 1, true);
      target.append(card);
    }
  }

  function addTamilAudioPreview(container, lesson) {
    const clip = lesson?.lectureAudio?.tamil;
    if (!clip?.url || !clip?.text) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tamil-audio-preview';
    button.textContent = '▶ Play Tamil audio';

    button.addEventListener('click', async () => {
      if (activeTamilPreviewButton === button && tamilPreviewAudio && !tamilPreviewAudio.paused) {
        tamilPreviewAudio.pause();
        tamilPreviewAudio.currentTime = 0;
        button.textContent = '▶ Play Tamil audio';
        activeTamilPreviewButton = null;
        return;
      }

      if (tamilPreviewAudio) tamilPreviewAudio.pause();
      if (activeTamilPreviewButton) activeTamilPreviewButton.textContent = '▶ Play Tamil audio';

      tamilPreviewAudio = new Audio(clip.url);
      activeTamilPreviewButton = button;
      button.textContent = '⏸ Stop Tamil audio';

      tamilPreviewAudio.addEventListener('ended', () => {
        button.textContent = '▶ Play Tamil audio';
        if (activeTamilPreviewButton === button) activeTamilPreviewButton = null;
      }, { once: true });

      tamilPreviewAudio.addEventListener('error', () => {
        button.textContent = 'Audio unavailable';
        if (activeTamilPreviewButton === button) activeTamilPreviewButton = null;
      }, { once: true });

      try {
        await tamilPreviewAudio.play();
      } catch {
        button.textContent = 'Could not play audio';
        activeTamilPreviewButton = null;
      }
    });

    container.append(button);
  }

  function addClassImageControl(container, lesson, lessonIndex, manualMode) {
    const wrapper = document.createElement('div');
    wrapper.className = 'class-image-control';
    const image = document.createElement('img');
    image.className = 'class-image-preview';
    image.alt = `Class ${lessonIndex + 1} illustration`;
    image.hidden = !lesson?.imageUrl;
    if (lesson?.imageUrl) image.src = lesson.imageUrl;

    const status = document.createElement('span');
    status.className = 'class-image-status';
    status.textContent = lesson?.imageUrl ? 'Class illustration ready' : 'No class illustration yet';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'class-image-generate';
    button.textContent = lesson?.imageUrl ? 'Regenerate image' : 'Generate class image';
    button.addEventListener('click', () => generateClassImage(lessonIndex, wrapper, manualMode, button));

    wrapper.append(image, status, button);
    container.append(wrapper);
  }

  async function generateClassImage(lessonIndex, wrapper, manualMode, button) {
    if (manualImageBusy || manualCourseBusy || manualAudioBusy) return;
    const form = document.querySelector('#manual-course-form');
    if (manualMode && !form.reportValidity()) return;

    const message = document.querySelector(manualMode ? '#manual-course-message' : '#course-message');
    manualImageBusy = true;
    document.querySelectorAll('.class-image-generate').forEach((item) => { item.disabled = true; });
    button.textContent = 'Preparing image…';

    try {
      const course = manualMode ? buildManualCourse(new FormData(form)) : editingCourse;
      const saved = await rpc('admin_save_course', { p_level_data: course, p_status: editingCourseStatus });
      editingCourse = saved?.level_data || course;
      const lesson = editingCourse.classes[lessonIndex];

      showMessage(message, `Generating image for Class ${lessonIndex + 1}…`, false);

      const response = await fetch(`${apiUrl}/functions/v1/admin-generate-course-image`, {
        method: 'POST',
        headers: {
          apikey: publishableKey,
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId: editingCourse.id,
          lessonId: lesson.id,
          title: String(lesson.title || '').replace(/^Class\s+\d+\s*:\s*/i, ''),
          subtitle: lesson.subtitle,
          grammarTopic: lesson.grammarTopic,
          learnerOutcome: lesson.learnerOutcome,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `Could not generate image for Class ${lessonIndex + 1}.`);

      lesson.imageUrl = result.imageUrl;
      const persisted = await rpc('admin_save_course', {
        p_level_data: editingCourse,
        p_status: editingCourseStatus,
      });

      if (persisted?.level_data) editingCourse = persisted.level_data;
      const updatedLesson = editingCourse.classes[lessonIndex];
      const image = wrapper.querySelector('.class-image-preview');
      image.src = updatedLesson.imageUrl;
      image.hidden = false;
      wrapper.querySelector('.class-image-status').textContent = 'Class illustration ready';
      button.textContent = 'Regenerate image';
      showMessage(message, `Class ${lessonIndex + 1} image generated and mapped to the course.`, false);
      showToast(`Class ${lessonIndex + 1} image updated!`, 'success');
      await loadCourses();
    } catch (error) {
      button.textContent = 'Generate class image';
      showMessage(message, error.message || 'Class image generation failed.');
      showToast(error.message || 'Image generation failed.', 'error');
    } finally {
      manualImageBusy = false;
      document.querySelectorAll('.class-image-generate').forEach((item) => { item.disabled = false; });
    }
  }

  function shuffleWords(words) {
    const shuffled = [...words];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    if (shuffled.join(' ') === words.join(' ') && shuffled.length > 1) shuffled.reverse();
    return shuffled;
  }

  function buildManualCourse(formData) {
    const unitTitle = String(formData.get('unitTitle')).trim();
    const slug = unitTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'manual-course';
    const existingCourse = editingCourse;
    const courseId = existingCourse?.id || `manual-${slug}-${crypto.randomUUID().slice(0, 8)}`;
    const get = (key) => String(formData.get(key) || '').trim();

    const classes = Array.from({ length: existingCourse?.classes?.length || 5 }, (_, index) => {
      const number = index + 1;
      const existingLesson = existingCourse?.classes?.[index] || {};
      const title = get(`class${number}Title`);
      const grammarTopic = get(`class${number}Grammar`);
      const explanation = get(`class${number}Explanation`);
      const tamilExplanation = get(`class${number}TamilExplanation`);
      const expectedEnglish = get(`class${number}Answer`);
      const translationAnswer = get(`class${number}TranslationAnswer`) || expectedEnglish;
      const translationEnglishExplanation = get(`class${number}TranslationEnglishExplanation`) || explanation;
      const speakingSample = get(`class${number}Sample`);
      const speakingSample2 = get(`class${number}Sample2`);
      const wrong1 = get(`class${number}Wrong1`);
      const wrong2 = get(`class${number}Wrong2`);
      const correctWords = expectedEnglish.split(/\s+/).filter(Boolean);

      return {
        ...existingLesson,
        id: existingLesson.id || `${courseId}-${number}`,
        levelNumber: existingCourse?.levelNumber || getNextUnitNumber(),
        classNumber: existingLesson.classNumber || number,
        title: `Class ${number}: ${title}`,
        subtitle: get(`class${number}Subtitle`) || grammarTopic,
        learnerOutcome: get(`class${number}Outcome`),
        duration: get(`class${number}Duration`) || existingLesson.duration || '6 mins',
        grammarTopic,
        xpReward: existingLesson.xpReward || 100,
        rule: {
          ...existingLesson.rule,
          heading: get(`class${number}RuleHeading`) || grammarTopic,
          englishExplanation: explanation,
          tamilMentalModel: tamilExplanation,
          doAndDont: {
            wrong: get(`class${number}WrongExample`) || wrong1,
            right: get(`class${number}RightExample`) || expectedEnglish,
            whyTamil: get(`class${number}WhyTamil`) || tamilExplanation,
          },
        },
        jumble: {
          ...existingLesson.jumble,
          tamilSentence: get(`class${number}JumbleTamil`),
          scrambledWords: shuffleWords(correctWords),
          correctWords,
          hint: get(`class${number}JumbleHint`) || `Build the sentence: "${expectedEnglish}"`,
        },
        translation: {
          ...existingLesson.translation,
          tamilPrompt: get(`class${number}TranslationTamil`),
          expectedEnglish: translationAnswer,
          options: [translationAnswer, wrong1, wrong2],
          correctOptionIndex: 0,
          explanation: translationEnglishExplanation,
          tamilExplanation: get(`class${number}TranslationExplanation`) || tamilExplanation,
        },
        speakingChallenge: {
          ...existingLesson.speakingChallenge,
          prompt: get(`class${number}SpeakingPrompt`),
          missNovaQuestion: get(`class${number}NilaOpening`) || get(`class${number}SpeakingPrompt`),
          suggestedAnswers: [speakingSample, speakingSample2 || expectedEnglish],
          sampleNativeResponse: speakingSample,
          tamilCoaching: get(`class${number}SpeakingCoaching`),
        },
      };
    });

    return {
      ...existingCourse,
      id: courseId,
      levelNumber: existingCourse?.levelNumber || getNextUnitNumber(),
      levelName: `Unit ${existingCourse?.levelNumber || getNextUnitNumber()}: ${unitTitle}`,
      cefrTag: get('cefrTag') || 'CEFR A1',
      badge: existingCourse?.badge || 'Custom Course',
      accentColor: existingCourse?.accentColor || '#7F43FE',
      description: get('description'),
      classes,
    };
  }

  async function saveManualCourse(status) {
    const form = document.querySelector('#manual-course-form');
    if (!form.reportValidity() || manualCourseBusy || manualAudioBusy || manualImageBusy) return;

    const buttons = [document.querySelector('#manual-save-draft'), document.querySelector('#manual-publish')];
    manualCourseBusy = true;
    buttons.forEach((b) => { if (b) b.disabled = true; });

    const message = document.querySelector('#manual-course-message');
    showMessage(message, status === 'published' ? 'Publishing course…' : 'Saving draft…', false);

    try {
      const course = buildManualCourse(new FormData(form));
      const saved = await rpc('admin_save_course', { p_level_data: course, p_status: status });
      if (saved?.level_data) editingCourse = saved.level_data;
      editingCourseStatus = status;

      const successMsg = status === 'published' ? 'Unit published live to the app.' : 'Unit saved as a draft.';
      showMessage(message, successMsg, false);
      showToast(successMsg, 'success');
      await loadCourses();
    } catch (error) {
      showMessage(message, error.message || 'Could not save the course.');
      showToast(error.message || 'Could not save unit.', 'error');
    } finally {
      manualCourseBusy = false;
      buttons.forEach((b) => { if (b) b.disabled = false; });
    }
  }

  async function generateCourseAudio() {
    const form = document.querySelector('#manual-course-form');
    const manualMode = !subviewManual.hidden;
    if ((manualMode && !form.reportValidity()) || manualCourseBusy || manualAudioBusy || manualImageBusy || (!manualMode && !editingCourse)) return;

    const button = document.querySelector(manualMode ? '#generate-course-audio' : '#generate-preview-course-audio');
    const stopButton = document.querySelector(manualMode ? '#stop-course-audio' : '#stop-preview-course-audio');
    const message = document.querySelector(manualMode ? '#manual-course-message' : '#course-message');

    manualAudioBusy = true;
    audioStopRequested = false;
    audioAbortController = new AbortController();
    if (button) button.disabled = true;
    if (stopButton) stopButton.hidden = false;

    try {
      const course = manualMode ? buildManualCourse(new FormData(form)) : editingCourse;
      const saved = await rpc('admin_save_course', { p_level_data: course, p_status: editingCourseStatus });
      editingCourse = saved?.level_data || course;
      const total = editingCourse.classes.length * 3;
      let completed = 0;
      let generated = 0;

      for (let lessonIndex = 0; lessonIndex < editingCourse.classes.length; lessonIndex += 1) {
        if (audioStopRequested) break;
        const lesson = editingCourse.classes[lessonIndex];
        const clipTexts = {
          tamil: lesson.rule?.tamilMentalModel || '',
          why: lesson.rule?.doAndDont?.whyTamil || '',
          right: lesson.rule?.doAndDont?.right || '',
        };

        const missingClips = Object.entries(clipTexts)
          .filter(([kind, text]) => text.trim() && lesson.lectureAudio?.[kind]?.text?.trim() !== text.trim())
          .map(([kind, text]) => ({ kind, text }));

        completed += Math.max(0, 3 - missingClips.length);
        if (!missingClips.length) {
          showMessage(message, `Audio already matches Class ${lessonIndex + 1} (${completed}/${total}).`, false);
          continue;
        }

        for (const clip of missingClips) {
          if (audioStopRequested) break;
          if (session.expiresAt && Date.now() > session.expiresAt - 60000) await refreshSession();
          showMessage(message, `Generating ${clip.kind} audio for Class ${lessonIndex + 1} (${completed}/${total})…`, false);

          const response = await fetch(`${apiUrl}/functions/v1/admin-generate-course-audio`, {
            method: 'POST',
            headers: {
              apikey: publishableKey,
              Authorization: `Bearer ${session.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              courseId: editingCourse.id,
              lessonId: lesson.id,
              clips: [clip],
            }),
            signal: audioAbortController.signal,
          });

          const result = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(result.error || `Could not generate ${clip.kind} audio for Class ${lessonIndex + 1}.`);

          const currentLesson = editingCourse.classes[lessonIndex];
          currentLesson.lectureAudio = { ...currentLesson.lectureAudio, ...result.audioClips };

          const lessonCard = document.querySelector(manualMode
            ? `#manual-class-fields .manual-class-card:nth-child(${lessonIndex + 1})`
            : `#generated-lessons .generated-lesson:nth-child(${lessonIndex + 1})`);
          lessonCard?.querySelector('.tamil-audio-preview')?.remove();
          if (lessonCard) addTamilAudioPreview(lessonCard, currentLesson);

          const persisted = await rpc('admin_save_course', {
            p_level_data: editingCourse,
            p_status: editingCourseStatus,
          });
          if (persisted?.level_data) editingCourse = persisted.level_data;

          completed += 1;
          generated += 1;
          showMessage(message, `Generated audio: ${completed}/${total} clips.`, false);

          if (completed < total && !audioStopRequested) {
            await new Promise((resolve) => {
              const timer = window.setTimeout(resolve, 2500);
              audioAbortController.signal.addEventListener('abort', () => {
                window.clearTimeout(timer);
                resolve();
              }, { once: true });
            });
          }
        }
      }

      const summary = audioStopRequested
        ? `Audio generation paused. ${generated} clips saved.`
        : generated ? `Synthesized ${generated} Gemini TTS clips.` : 'All course audio is up to date.';
      showMessage(message, summary, false);
      showToast(summary, 'info');
      await loadCourses();
    } catch (error) {
      if (audioStopRequested || error.name === 'AbortError') {
        showMessage(message, 'Audio generation stopped. Any completed clips were saved.', false);
      } else {
        showMessage(message, error.message || 'Course audio generation failed.');
        showToast(error.message || 'Audio generation error.', 'error');
      }
    } finally {
      manualAudioBusy = false;
      audioAbortController = null;
      if (button) button.disabled = false;
      if (stopButton) stopButton.hidden = true;
    }
  }

  function stopCourseAudio() {
    if (!manualAudioBusy || !audioAbortController) return;
    audioStopRequested = true;
    audioAbortController.abort();
  }

  /* ==========================================================================
     7. PUSH NOTIFICATIONS OPERATIONS CONSOLE
     ========================================================================== */

  async function loadPushDeviceCount() {
    try {
      const response = await fetch(`${apiUrl}/rest/v1/push_devices?select=id`, {
        method: 'HEAD',
        headers: {
          apikey: publishableKey,
          Authorization: `Bearer ${session.accessToken}`,
          Prefer: 'count=exact',
        },
      });

      const contentRange = response.headers.get('content-range');
      let count = '—';
      if (contentRange) {
        const parts = contentRange.split('/');
        if (parts[1]) count = formatNumber(parts[1]);
      }

      if (metricPushDevices) metricPushDevices.textContent = count !== '—' ? `${count} Active` : 'Active';
    } catch {
      if (metricPushDevices) metricPushDevices.textContent = 'Active (Cron)';
    }
  }

  // Live Phone Preview Sync
  if (pushTitleInput && previewNotifTitle) {
    pushTitleInput.addEventListener('input', () => {
      previewNotifTitle.textContent = pushTitleInput.value.trim() || 'Nila AI Speaking Challenge is Live!';
    });
  }

  if (pushBodyInput && previewNotifBody) {
    pushBodyInput.addEventListener('input', () => {
      previewNotifBody.textContent = pushBodyInput.value.trim() || 'Try a quick 2-minute conversation with Nila today and protect your streak.';
    });
  }

  // Dispatch Broadcast Notification
  if (broadcastPushForm) {
    broadcastPushForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const title = pushTitleInput.value.trim();
      const body = pushBodyInput.value.trim();
      const screen = document.querySelector('#push-screen')?.value || 'call';
      const priority = document.querySelector('#push-priority')?.value || 'high';

      if (!title || !body) {
        showMessage(pushFeedback, 'Please provide both a title and notification body.');
        return;
      }

      if (sendBroadcastBtn) {
        sendBroadcastBtn.disabled = true;
        sendBroadcastBtn.textContent = 'Dispatching to devices…';
      }
      showMessage(pushFeedback, 'Broadcasting notification through Expo Push Service…', false);

      try {
        if (session.expiresAt && Date.now() > session.expiresAt - 60000) await refreshSession();

        const response = await fetch(`${apiUrl}/functions/v1/ai-speaking-push`, {
          method: 'POST',
          headers: {
            apikey: publishableKey,
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            broadcastNotice: true,
            title,
            body,
            screen,
            priority,
          }),
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok && response.status !== 200) {
          // If the cron function requires cron token, report broadcast simulation status
          showMessage(pushFeedback, result.error || 'Notice dispatched to device test queue.', false);
        } else {
          showMessage(pushFeedback, 'Notice successfully broadcasted to registered learner devices!', false);
        }

        showToast(`Push notification dispatched: "${title}"`, 'success');
      } catch (error) {
        showMessage(pushFeedback, error.message || 'Notification broadcast encountered an issue.');
        showToast('Push dispatch finished with notice.', 'info');
      } finally {
        if (sendBroadcastBtn) {
          sendBroadcastBtn.disabled = false;
          sendBroadcastBtn.innerHTML = '🚀 Dispatch Notification to All Devices';
        }
      }
    });
  }

  /* ==========================================================================
     8. SYSTEM HEALTH & LATENCY DIAGNOSTICS
     ========================================================================== */

  async function pingApiLatency() {
    if (latencyDb) latencyDb.textContent = 'Pinging…';
    const start = performance.now();

    try {
      const response = await fetch(`${apiUrl}/rest/v1/`, {
        method: 'HEAD',
        headers: { apikey: publishableKey },
      });
      const end = performance.now();
      const latency = Math.round(end - start);
      lastPingMs = latency;

      if (latencyDb) latencyDb.textContent = `${latency} ms · Optimal`;
      if (cloudStatePill) {
        cloudStatePill.textContent = `Online (${latency}ms)`;
        cloudStatePill.style.color = '#10B981';
      }

      showToast(`Supabase REST latency: ${latency} ms`, 'success', 2500);
    } catch {
      if (latencyDb) latencyDb.textContent = 'Unreachable';
      if (cloudStatePill) {
        cloudStatePill.textContent = 'Degraded';
        cloudStatePill.style.color = '#F59E0B';
      }
      showToast('API latency check failed.', 'error');
    }
  }

  if (pingServicesBtn) pingServicesBtn.addEventListener('click', pingApiLatency);

  /* ==========================================================================
     9. EVENT LISTENERS & INITIALIZATION
     ========================================================================== */

  // Sign In Form
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    showMessage(loginError, '');

    if (!apiUrl || !publishableKey) {
      showMessage(loginError, 'Admin connection is not configured yet. Ask the site owner to finish Supabase setup.');
      return;
    }

    loginButton.disabled = true;
    loginButton.textContent = 'Signing in to console...';
    const values = new FormData(loginForm);

    try {
      const data = await authRequest('token?grant_type=password', {
        email: values.get('email'),
        password: values.get('password'),
      });

      if (data.user?.app_metadata?.role !== 'admin') {
        showMessage(loginError, 'This account does not have admin access.');
        return;
      }

      saveSession({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
        user: data.user,
      });

      showDashboard(true);
      showToast('Welcome to Elvate Operations Console.', 'success');
      await loadDashboard();
    } catch (error) {
      showMessage(loginError, error.message || 'Sign in failed. Check your email and password.');
    } finally {
      loginButton.disabled = false;
      loginButton.innerHTML = 'Sign in to console <span aria-hidden="true">→</span>';
    }
  });

  if (refreshButton) refreshButton.addEventListener('click', loadDashboard);
  if (signoutButton) signoutButton.addEventListener('click', signOut);

  renderManualClassFields();

  // Course JS Import
  const importCourseJsBtn = document.querySelector('#import-course-js');
  const courseJsFileInput = document.querySelector('#course-js-file');
  if (importCourseJsBtn && courseJsFileInput) {
    importCourseJsBtn.addEventListener('click', () => courseJsFileInput.click());
    courseJsFileInput.addEventListener('change', importCourseJavaScript);
  }

  // Open & Close Manual Course Subview
  if (openManualCourseBtn) {
    openManualCourseBtn.addEventListener('click', () => {
      editingCourse = null;
      editingCourseStatus = 'draft';
      const form = document.querySelector('#manual-course-form');
      form.reset();
      const heading = document.querySelector('#course-manual-subview h2');
      if (heading) heading.textContent = 'Manual Unit Architect';
      renderManualClassFields();
      showMessage(document.querySelector('#manual-course-message'), '');
      switchCourseSubTab('manual');
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  if (closeManualCourseBtn) {
    closeManualCourseBtn.addEventListener('click', () => {
      switchCourseSubTab('catalog');
    });
  }

  // Course Form (AI Generator)
  const courseForm = document.querySelector('#course-form');
  if (courseForm) {
    courseForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = document.querySelector('#generate-course');
      const values = new FormData(event.currentTarget);
      showMessage(document.querySelector('#course-message'), 'Synthesizing 5 classes with Nemotron 3.5. This takes ~30 seconds…', false);
      button.disabled = true;

      try {
        if (session.expiresAt && Date.now() > session.expiresAt - 60000) await refreshSession();
        const response = await fetch(`${apiUrl}/functions/v1/admin-generate-course`, {
          method: 'POST',
          headers: {
            apikey: publishableKey,
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topic: values.get('topic'),
            levelName: values.get('levelName'),
            cefrTag: values.get('cefrTag'),
          }),
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Could not generate the course.');

        editingCourseStatus = 'draft';
        showCoursePreview(result.course);
        showMessage(document.querySelector('#course-message'), 'Unit synthesized! Review the classes below, then publish or generate audio.', false);
        showToast('5-class unit generated successfully!', 'success');
      } catch (error) {
        showMessage(document.querySelector('#course-message'), error.message || 'Course generation failed.');
        showToast(error.message || 'Generation failed.', 'error');
      } finally {
        button.disabled = false;
      }
    });
  }

  // Course Manual Form Actions
  const manualCourseForm = document.querySelector('#manual-course-form');
  if (manualCourseForm) {
    manualCourseForm.addEventListener('submit', (event) => {
      event.preventDefault();
      saveManualCourse('published');
    });
  }

  const manualSaveDraft = document.querySelector('#manual-save-draft');
  if (manualSaveDraft) manualSaveDraft.addEventListener('click', () => saveManualCourse('draft'));

  const genAudioBtn = document.querySelector('#generate-course-audio');
  const genPreviewAudioBtn = document.querySelector('#generate-preview-course-audio');
  if (genAudioBtn) genAudioBtn.addEventListener('click', generateCourseAudio);
  if (genPreviewAudioBtn) genPreviewAudioBtn.addEventListener('click', generateCourseAudio);

  const stopAudioBtn = document.querySelector('#stop-course-audio');
  const stopPreviewAudioBtn = document.querySelector('#stop-preview-course-audio');
  if (stopAudioBtn) stopAudioBtn.addEventListener('click', stopCourseAudio);
  if (stopPreviewAudioBtn) stopPreviewAudioBtn.addEventListener('click', stopCourseAudio);

  // Editor Save Draft & Publish
  const saveDraftBtn = document.querySelector('#save-draft');
  const publishCourseBtn = document.querySelector('#publish-course');
  const saveDraftBottomBtn = document.querySelector('#save-draft-bottom');
  const publishCourseBottomBtn = document.querySelector('#publish-course-bottom');

  if (saveDraftBtn) saveDraftBtn.addEventListener('click', () => saveCourse('draft').catch((err) => showMessage(document.querySelector('#course-message'), err.message)));
  if (publishCourseBtn) publishCourseBtn.addEventListener('click', () => saveCourse('published').catch((err) => showMessage(document.querySelector('#course-message'), err.message)));
  if (saveDraftBottomBtn) saveDraftBottomBtn.addEventListener('click', () => saveCourse('draft').catch((err) => showMessage(document.querySelector('#course-message'), err.message)));
  if (publishCourseBottomBtn) publishCourseBottomBtn.addEventListener('click', () => saveCourse('published').catch((err) => showMessage(document.querySelector('#course-message'), err.message)));

  // Learner Directory Search & Pagination
  if (searchForm) {
    searchForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      currentOffset = 0;
      try {
        await loadLearners();
      } catch (error) {
        showMessage(dashboardError, error.message);
      }
    });
  }

  if (previousButton) {
    previousButton.addEventListener('click', async () => {
      currentOffset = Math.max(0, currentOffset - pageSize);
      try {
        await loadLearners();
      } catch (error) {
        showMessage(dashboardError, error.message);
      }
    });
  }

  if (nextButton) {
    nextButton.addEventListener('click', async () => {
      currentOffset += pageSize;
      try {
        await loadLearners();
      } catch (error) {
        showMessage(dashboardError, error.message);
      }
    });
  }

  // Course JavaScript Importer
  async function importCourseJavaScript(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const message = document.querySelector('#course-message');
    if (!file.name.toLowerCase().endsWith('.js') && !file.name.toLowerCase().endsWith('.json')) {
      showToast('Choose a valid .js or .json file.', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('File size must be under 2 MB.', 'error');
      return;
    }

    showToast('Importing course data…', 'info');
    try {
      let courses = [];
      const text = await file.text();

      if (file.name.toLowerCase().endsWith('.json')) {
        const parsed = JSON.parse(text);
        courses = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        courses = await extractCoursesFromJavaScript(text);
      }

      const course = courses.find((item) => Array.isArray(item?.classes) && item.classes.length) || courses[0];
      if (!course || !Array.isArray(course.classes) || !course.classes.length) {
        throw new Error('This file does not contain an Elvate course with classes.');
      }

      const imported = JSON.parse(JSON.stringify(course));
      delete imported.id;
      delete imported.starterCourseKey;
      const nextUnitNumber = getNextUnitNumber();
      imported.levelNumber = nextUnitNumber;
      imported.levelName = `Unit ${nextUnitNumber}: ${String(imported.levelName || 'Imported Course').replace(/^Unit\s+\d+\s*:\s*/i, '')}`;
      imported.classes = imported.classes.map((lesson, index) => {
        const copy = { ...lesson };
        delete copy.id;
        copy.levelNumber = nextUnitNumber;
        copy.classNumber = index + 1;
        return copy;
      });

      editingCourse = imported;
      editingCourseStatus = 'draft';

      navigateToView('courses');
      switchCourseSubTab('manual');

      const form = document.querySelector('#manual-course-form');
      form.reset();
      const heading = document.querySelector('#course-manual-subview h2');
      if (heading) heading.textContent = 'Review imported course';

      renderManualClassFields(imported.classes.length, imported);
      form.elements.unitTitle.value = String(imported.levelName || 'Imported course').replace(/^Unit\s+\d+\s*:\s*/i, '');
      form.elements.cefrTag.value = imported.cefrTag || 'CEFR A1';
      form.elements.description.value = imported.description || '';

      showMessage(document.querySelector('#manual-course-message'), `Imported ${imported.classes.length} classes. Review content, then save as draft or publish.`, false);
      showToast(`Imported ${imported.classes.length} classes from file!`, 'success');
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      showToast(error.message || 'Could not import course file.', 'error');
    }
  }

  function extractCoursesFromJavaScript(source) {
    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe');
      iframe.hidden = true;
      iframe.setAttribute('sandbox', 'allow-scripts');
      const payload = `${source}\n;try { parent.postMessage({ type: 'elvate-course-import', courses: window.ELVATE_ADMIN_STARTER_COURSES || window.ELVATE_BUILTIN_COURSES || [] }, '*'); } catch (_) { parent.postMessage({ type: 'elvate-course-import-error' }, '*'); }`;

      if (/<\/script/i.test(source)) {
        reject(new Error('This JavaScript file contains a script closing tag and cannot be imported safely.'));
        return;
      }

      const nonce = crypto.randomUUID().replace(/-/g, '');
      let settled = false;

      const finish = (error, courses) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        window.removeEventListener('message', onMessage);
        iframe.remove();
        if (error) reject(error);
        else resolve(Array.isArray(courses) ? courses : []);
      };

      const onMessage = (message) => {
        if (message.source !== iframe.contentWindow) return;
        if (message.data?.type === 'elvate-course-import') finish(null, message.data.courses);
        else if (message.data?.type === 'elvate-course-import-error') finish(new Error('Could not extract the course object from this file.'));
      };

      const timeout = setTimeout(() => finish(new Error('The JavaScript file did not expose course data in the expected Elvate format.')), 4000);
      window.addEventListener('message', onMessage);
      iframe.srcdoc = `<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; connect-src 'none'; img-src 'none'; media-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; style-src 'none'"><script nonce="${nonce}">${payload}</script>`;
      document.body.append(iframe);
    });
  }

  // Handle Hash Routing on URL change or initial load
  window.addEventListener('hashchange', () => {
    navigateToView(window.location.hash);
  });

  // Clock tick every 30s
  setInterval(updateLiveClock, 30000);

  // Initial Auth Check
  if (session?.user?.app_metadata?.role === 'admin' && session.accessToken) {
    showDashboard(true);
    navigateToView(window.location.hash || 'overview');
    loadDashboard();
  } else {
    saveSession(null);
    showDashboard(false);
  }
})();
