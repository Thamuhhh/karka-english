(() => {
  const config = window.ELVATE_ADMIN_CONFIG || {};
  const apiUrl = String(config.supabaseUrl || '').replace(/\/$/, '');
  const publishableKey = String(config.publishableKey || '');
  const storageKey = 'elvate-admin-session';
  const pageSize = 30;

  const loginScreen = document.querySelector('#login-screen');
  const dashboard = document.querySelector('#dashboard');
  const loginForm = document.querySelector('#login-form');
  const loginButton = document.querySelector('#login-button');
  const loginError = document.querySelector('#login-error');
  const dashboardError = document.querySelector('#dashboard-error');
  const rowsElement = document.querySelector('#learner-rows');
  const searchInput = document.querySelector('#learner-search');
  const previousButton = document.querySelector('#previous-page');
  const nextButton = document.querySelector('#next-page');
  let session = readSession();
  let currentOffset = 0;
  let visibleRows = 0;
  let editingCourse = null;

  function readSession() {
    try {
      return JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    } catch {
      return null;
    }
  }

  function saveSession(nextSession) {
    session = nextSession;
    if (session) sessionStorage.setItem(storageKey, JSON.stringify(session));
    else sessionStorage.removeItem(storageKey);
  }

  function showMessage(element, message, isError = true) {
    element.textContent = message || '';
    element.classList.toggle('is-error', Boolean(message) && isError);
    element.classList.toggle('is-success', Boolean(message) && !isError);
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
    if (!response.ok) throw new Error(data.msg || data.message || data.error_description || 'Could not authenticate.');
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
    if (session.expiresAt && Date.now() > session.expiresAt - 60000) await refreshSession();

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
      throw new Error(data?.message || data?.details || 'Could not load admin data.');
    }
    return data;
  }

  function setLoadingRows(message) {
    rowsElement.replaceChildren();
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.className = 'table-message';
    cell.textContent = message;
    row.append(cell);
    rowsElement.append(row);
  }

  function renderLearners(learners) {
    rowsElement.replaceChildren();
    if (!learners.length) {
      setLoadingRows('No learner accounts found.');
      return;
    }

    learners.forEach((learner) => {
      const row = document.createElement('tr');
      const learnerCell = document.createElement('td');
      const identity = document.createElement('div');
      const avatar = document.createElement('span');
      const details = document.createElement('span');
      const name = document.createElement('b');
      const email = document.createElement('small');

      identity.className = 'learner-identity';
      avatar.className = 'learner-avatar';
      avatar.textContent = (learner.display_name || 'L').trim().slice(0, 1).toUpperCase();
      details.className = 'learner-details';
      name.textContent = learner.display_name || 'Elvate Learner';
      email.textContent = learner.email || 'No email';
      details.append(name, email);
      identity.append(avatar, details);
      learnerCell.append(identity);
      row.append(learnerCell);

      [
        formatDate(learner.created_at),
        formatDate(learner.last_active_date),
        formatNumber(learner.stardust_xp),
        `${formatNumber(learner.streak_days)} days`,
        formatNumber(learner.completed_classes),
      ].forEach((value, index) => {
        const cell = document.createElement('td');
        cell.textContent = value;
        if (index === 2) cell.className = 'numeric-cell';
        row.append(cell);
      });

      rowsElement.append(row);
    });
  }

  async function loadLearners() {
    setLoadingRows('Loading learners...');
    const learners = await rpc('admin_list_learners', {
      p_query: searchInput.value.trim(),
      p_limit: pageSize,
      p_offset: currentOffset,
    });
    visibleRows = Array.isArray(learners) ? learners.length : 0;
    renderLearners(Array.isArray(learners) ? learners : []);
    document.querySelector('#result-count').textContent = visibleRows
      ? `Showing ${currentOffset + 1}–${currentOffset + visibleRows}`
      : 'No results';
    previousButton.disabled = currentOffset === 0;
    nextButton.disabled = visibleRows < pageSize;
  }

  async function loadDashboard() {
    showMessage(dashboardError, '');
    document.querySelector('#refresh-button').disabled = true;
    try {
      const overview = await rpc('admin_get_overview');
      await loadLearners();
      await loadCourses().catch((error) => {
        const target = document.querySelector('#saved-courses');
        target.textContent = 'Apply the latest Supabase schema to enable course management.';
        console.warn('Course management schema is not ready:', error.message);
      });
      document.querySelector('#metric-accounts').textContent = formatNumber(overview.total_accounts);
      document.querySelector('#metric-new').textContent = formatNumber(overview.new_accounts_7d);
      document.querySelector('#metric-active').textContent = formatNumber(overview.active_today);
      document.querySelector('#metric-xp').textContent = formatNumber(overview.total_xp);
      document.querySelector('#metric-classes').textContent = formatNumber(overview.completed_classes);
      document.querySelector('#metric-streak').textContent = `${Number(overview.average_streak || 0).toFixed(1)} days`;
      document.querySelector('#last-updated').textContent = `Updated ${new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date())}`;
    } catch (error) {
      showMessage(dashboardError, error.message || 'Could not load dashboard data.');
      if (!session) showDashboard(false);
    } finally {
      document.querySelector('#refresh-button').disabled = false;
    }
  }

  async function loadCourses() {
    const target = document.querySelector('#saved-courses');
    const courses = await rpc('admin_list_courses');
    target.replaceChildren();
    if (!Array.isArray(courses) || !courses.length) {
      target.textContent = 'No courses saved yet.';
      return;
    }
    courses.forEach((entry) => {
      const row = document.createElement('div');
      row.className = 'saved-course';
      const title = document.createElement('b');
      title.textContent = entry.level_data?.levelName || entry.id;
      const detail = document.createElement('span');
      detail.textContent = `${entry.status} · ${entry.level_data?.classes?.length || 0} classes`;
      row.append(title, detail);
      target.append(row);
    });
  }

  function showCoursePreview(course) {
    editingCourse = course;
    document.querySelector('#course-editor').hidden = false;
    document.querySelector('#course-preview-title').textContent = course.levelName;
    document.querySelector('#course-description').value = course.description || '';
    document.querySelector('#course-count').textContent = `${course.classes.length} classes`;
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
      list.append(item);
    });
  }

  async function saveCourse(status) {
    if (!editingCourse) return;
    const course = { ...editingCourse, description: document.querySelector('#course-description').value.trim() };
    const saved = await rpc('admin_save_course', { p_level_data: course, p_status: status });
    if (saved?.level_data) showCoursePreview(saved.level_data);
    showMessage(document.querySelector('#course-message'), status === 'published' ? 'Course published to the app.' : 'Draft saved.', false);
    await loadCourses();
  }

  function showDashboard(isVisible) {
    loginScreen.hidden = isVisible;
    dashboard.hidden = !isVisible;
    if (isVisible) {
      const email = session?.user?.email || 'Administrator';
      document.querySelector('#admin-name').textContent = email;
    }
  }

  async function signOut() {
    const current = session;
    saveSession(null);
    showDashboard(false);
    if (current?.accessToken && apiUrl && publishableKey) {
      await authRequest('logout', {}, current.accessToken).catch(() => {});
    }
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    showMessage(loginError, '');
    if (!apiUrl || !publishableKey) {
      showMessage(loginError, 'Admin connection is not configured yet. Ask the site owner to finish Supabase setup.');
      return;
    }

    loginButton.disabled = true;
    loginButton.textContent = 'Signing in...';
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
      await loadDashboard();
    } catch (error) {
      showMessage(loginError, error.message || 'Sign in failed. Check your email and password.');
    } finally {
      loginButton.disabled = false;
      loginButton.innerHTML = 'Sign in <span aria-hidden="true">→</span>';
    }
  });

  document.querySelector('#refresh-button').addEventListener('click', loadDashboard);
  document.querySelector('#course-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = document.querySelector('#generate-course');
    const values = new FormData(event.currentTarget);
    showMessage(document.querySelector('#course-message'), 'Generating five classes. This may take a minute...', false);
    button.disabled = true;
    try {
      if (session.expiresAt && Date.now() > session.expiresAt - 60000) await refreshSession();
      const response = await fetch(`${apiUrl}/functions/v1/admin-generate-course`, {
        method: 'POST',
        headers: { apikey: publishableKey, Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: values.get('topic'), levelName: values.get('levelName'), cefrTag: values.get('cefrTag') }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not generate the course.');
      showCoursePreview(result.course);
      showMessage(document.querySelector('#course-message'), 'Review the generated unit, then save it as a draft or publish it.', false);
    } catch (error) {
      showMessage(document.querySelector('#course-message'), error.message || 'Course generation failed.');
    } finally {
      button.disabled = false;
    }
  });
  document.querySelector('#save-draft').addEventListener('click', () => saveCourse('draft').catch((error) => showMessage(document.querySelector('#course-message'), error.message)));
  document.querySelector('#publish-course').addEventListener('click', () => saveCourse('published').catch((error) => showMessage(document.querySelector('#course-message'), error.message)));
  document.querySelector('#signout-button').addEventListener('click', signOut);
  document.querySelector('#search-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    currentOffset = 0;
    try { await loadLearners(); } catch (error) { showMessage(dashboardError, error.message); }
  });
  previousButton.addEventListener('click', async () => {
    currentOffset = Math.max(0, currentOffset - pageSize);
    try { await loadLearners(); } catch (error) { showMessage(dashboardError, error.message); }
  });
  nextButton.addEventListener('click', async () => {
    currentOffset += pageSize;
    try { await loadLearners(); } catch (error) { showMessage(dashboardError, error.message); }
  });

  if (session?.user?.app_metadata?.role === 'admin' && session.accessToken) {
    showDashboard(true);
    loadDashboard();
  } else {
    saveSession(null);
    showDashboard(false);
  }
})();
