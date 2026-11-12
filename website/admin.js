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
  let manualCourseBusy = false;

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
      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'delete-course-button';
      removeButton.textContent = 'Delete';
      removeButton.setAttribute('aria-label', `Delete ${title.textContent}`);
      removeButton.addEventListener('click', () => deleteCourse(entry, removeButton));
      row.append(title, detail, removeButton);
      target.append(row);
    });
  }

  async function deleteCourse(entry, button) {
    const title = entry.level_data?.levelName || entry.id;
    if (!window.confirm(`Delete "${title}"? This removes the course from the app and cannot be undone.`)) return;
    button.disabled = true;
    try {
      await rpc('admin_delete_course', { p_course_id: entry.id });
      if (editingCourse?.id === entry.id) {
        editingCourse = null;
        document.querySelector('#course-editor').hidden = true;
      }
      showMessage(document.querySelector('#course-message'), 'Course deleted.', false);
      await loadCourses();
    } catch (error) {
      button.disabled = false;
      showMessage(document.querySelector('#course-message'), error.message || 'Could not delete the course.');
    }
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

  function renderManualClassFields() {
    const target = document.querySelector('#manual-class-fields');
    target.replaceChildren();
    for (let index = 1; index <= 5; index += 1) {
      const card = document.createElement('fieldset');
      card.className = 'manual-class-card';
      card.innerHTML = `
        <legend>Class ${index}</legend>
        <label>Class title<input name="class${index}Title" required maxlength="100" placeholder="Making a polite request" /></label>
        <label>Grammar focus<input name="class${index}Grammar" required maxlength="120" placeholder="Could I…? / Can I…?" /></label>
        <label>English explanation<textarea name="class${index}Explanation" required maxlength="500" rows="2" placeholder="Explain the useful pattern in simple English"></textarea></label>
        <label>Tamil explanation<textarea name="class${index}TamilExplanation" required maxlength="500" rows="2" placeholder="Explain the pattern in Tamil"></textarea></label>
        <label>Correct English sentence<input name="class${index}Answer" required maxlength="240" placeholder="Could I have a glass of water, please?" /></label>
        <label>Tamil sentence for word match<input name="class${index}JumbleTamil" required maxlength="240" placeholder="தயவுசெய்து எனக்கு ஒரு குவளை தண்ணீர் தர முடியுமா?" /></label>
        <label>Tamil translation prompt<input name="class${index}TranslationTamil" required maxlength="240" placeholder="எனக்கு ஒரு குவளை தண்ணீர் தர முடியுமா?" /></label>
        <label>Incorrect answer option 1<input name="class${index}Wrong1" required maxlength="240" placeholder="Give water to me." /></label>
        <label>Incorrect answer option 2<input name="class${index}Wrong2" required maxlength="240" placeholder="I am have water." /></label>
        <label>Speaking practice prompt<textarea name="class${index}SpeakingPrompt" required maxlength="300" rows="2" placeholder="Ask politely for a drink at a cafe."></textarea></label>
        <label>Sample spoken answer<input name="class${index}Sample" required maxlength="240" placeholder="Could I have a glass of water, please?" /></label>`;
      target.append(card);
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
    const courseId = `manual-${slug}-${crypto.randomUUID().slice(0, 8)}`;
    const get = (key) => String(formData.get(key) || '').trim();
    const classes = Array.from({ length: 5 }, (_, index) => {
      const number = index + 1;
      const title = get(`class${number}Title`);
      const grammarTopic = get(`class${number}Grammar`);
      const explanation = get(`class${number}Explanation`);
      const tamilExplanation = get(`class${number}TamilExplanation`);
      const expectedEnglish = get(`class${number}Answer`);
      const wrong1 = get(`class${number}Wrong1`);
      const wrong2 = get(`class${number}Wrong2`);
      const correctWords = expectedEnglish.split(/\s+/).filter(Boolean);
      return {
        id: `${courseId}-${number}`,
        levelNumber: 5,
        classNumber: number,
        title: `Class ${number}: ${title}`,
        subtitle: grammarTopic,
        duration: '6 mins',
        grammarTopic,
        xpReward: 100,
        rule: {
          heading: grammarTopic,
          englishExplanation: explanation,
          tamilMentalModel: tamilExplanation,
          doAndDont: { wrong: wrong1, right: expectedEnglish, whyTamil: tamilExplanation },
        },
        jumble: {
          tamilSentence: get(`class${number}JumbleTamil`),
          scrambledWords: shuffleWords(correctWords),
          correctWords,
          hint: `Build the sentence: “${expectedEnglish}”`,
        },
        translation: {
          tamilPrompt: get(`class${number}TranslationTamil`),
          expectedEnglish,
          options: [expectedEnglish, wrong1, wrong2],
          correctOptionIndex: 0,
          explanation,
          tamilExplanation,
        },
        speakingChallenge: {
          prompt: get(`class${number}SpeakingPrompt`),
          missNovaQuestion: get(`class${number}SpeakingPrompt`),
          suggestedAnswers: [get(`class${number}Sample`), expectedEnglish],
          sampleNativeResponse: get(`class${number}Sample`),
        },
      };
    });
    return {
      id: courseId,
      levelNumber: 5,
      levelName: `Unit 5: ${unitTitle}`,
      cefrTag: get('cefrTag') || 'CEFR A1',
      badge: 'Custom Course',
      accentColor: '#7F43FE',
      description: get('description'),
      classes,
    };
  }

  async function saveManualCourse(status) {
    const form = document.querySelector('#manual-course-form');
    if (!form.reportValidity() || manualCourseBusy) return;
    const buttons = [document.querySelector('#manual-save-draft'), document.querySelector('#manual-publish')];
    manualCourseBusy = true;
    buttons.forEach((button) => { button.disabled = true; });
    const message = document.querySelector('#manual-course-message');
    showMessage(message, status === 'published' ? 'Publishing course…' : 'Saving draft…', false);
    try {
      const course = buildManualCourse(new FormData(form));
      await rpc('admin_save_course', { p_level_data: course, p_status: status });
      showMessage(message, status === 'published' ? 'Course published to the app.' : 'Course saved as a draft.', false);
      await loadCourses();
    } catch (error) {
      showMessage(message, error.message || 'Could not save the course.');
    } finally {
      manualCourseBusy = false;
      buttons.forEach((button) => { button.disabled = false; });
    }
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
  renderManualClassFields();
  document.querySelector('#open-manual-course').addEventListener('click', () => {
    document.querySelector('#course-studio-view').hidden = true;
    document.querySelector('#manual-course-page').hidden = false;
    document.querySelector('#manual-course-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  document.querySelector('#close-manual-course').addEventListener('click', () => {
    document.querySelector('#manual-course-page').hidden = true;
    document.querySelector('#course-studio-view').hidden = false;
  });
  document.querySelector('#manual-course-form').addEventListener('submit', (event) => {
    event.preventDefault();
    saveManualCourse('published');
  });
  document.querySelector('#manual-save-draft').addEventListener('click', () => saveManualCourse('draft'));
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
