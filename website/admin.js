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
  let manualAudioBusy = false;
  let manualImageBusy = false;
  let audioAbortController = null;
  let audioStopRequested = false;
  let tamilPreviewAudio = null;
  let activeTamilPreviewButton = null;
  let editingCourseStatus = 'draft';

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
    const savedCourses = await rpc('admin_list_courses');
    const savedById = new Map((Array.isArray(savedCourses) ? savedCourses : []).map((entry) => [entry.id, entry]));
    const builtInCourses = (window.ELVATE_BUILTIN_COURSES || []).map((level) => {
      const id = `builtin-unit-${level.levelNumber}`;
      const saved = savedById.get(id);
      return saved
        ? { ...saved, is_builtin: true }
        : { id, level_data: { ...level, id }, status: 'published', is_builtin: true };
    });
    const starterCourses = (window.ELVATE_ADMIN_STARTER_COURSES || []).flatMap((level) => {
      const alreadySaved = Array.isArray(savedCourses)
        ? savedCourses.find((entry) => entry.level_data?.starterCourseKey === level.starterCourseKey)
        : null;
      if (alreadySaved) return [];
      const existing = savedById.get(level.id) || (Array.isArray(savedCourses) ? savedCourses.find((entry) =>
        Number(entry.level_data?.levelNumber) === 5 || /^Unit\s+5\s*:/i.test(entry.level_data?.levelName || '')
      ) : null);
      return [{
        id: existing?.id || level.id,
        level_data: { ...level, id: existing?.id || level.id },
        status: existing?.status || 'draft',
        is_starter: true,
        replaces_existing: Boolean(existing),
      }];
    });
    const replacedCourseIds = new Set(starterCourses.filter((entry) => entry.replaces_existing).map((entry) => entry.id));
    const courses = [
      ...builtInCourses,
      ...starterCourses,
      ...(Array.isArray(savedCourses) ? savedCourses.filter((entry) =>
        !String(entry.id).startsWith('builtin-unit-') && !replacedCourseIds.has(entry.id)
      ) : []),
    ].sort((a, b) => Number(a.level_data?.levelNumber || 0) - Number(b.level_data?.levelNumber || 0));
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
      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'edit-course-button';
      editButton.textContent = 'Edit';
      editButton.addEventListener('click', () => openCourseEditor(entry));
      row.append(title, detail, editButton);
      if (entry.is_starter) {
        const publishButton = document.createElement('button');
        publishButton.type = 'button';
        publishButton.className = 'publish-starter-button';
        publishButton.textContent = entry.replaces_existing ? 'Replace & publish' : 'Publish Unit 5';
        publishButton.addEventListener('click', async () => {
          if (entry.replaces_existing && !window.confirm('Replace the current Unit 5 content with the complete Everyday Grammar That Connects course?')) return;
          publishButton.disabled = true;
          try {
            await rpc('admin_save_course', { p_level_data: entry.level_data, p_status: 'published' });
            showMessage(document.querySelector('#course-message'), 'Unit 5 published to the app.', false);
            await loadCourses();
          } catch (error) {
            publishButton.disabled = false;
            showMessage(document.querySelector('#course-message'), error.message || 'Could not publish Unit 5.');
          }
        });
        row.append(publishButton);
      }
      if (!entry.is_builtin && !entry.is_starter) {
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'delete-course-button';
        removeButton.textContent = 'Delete';
        removeButton.setAttribute('aria-label', `Delete ${title.textContent}`);
        removeButton.addEventListener('click', () => deleteCourse(entry, removeButton));
        row.append(removeButton);
      }
      target.append(row);
    });
  }

  function openCourseEditor(entry) {
    editingCourse = JSON.parse(JSON.stringify(entry.level_data));
    editingCourseStatus = entry.status || 'draft';
    document.querySelector('#course-studio-view').hidden = true;
    document.querySelector('#manual-course-page').hidden = false;
    document.querySelector('#manual-course-page h2').textContent = `Edit ${entry.level_data.levelName}`;
    document.querySelector('#manual-class-fields').replaceChildren();
    renderManualClassFields(entry.level_data.classes.length, entry.level_data);
    const form = document.querySelector('#manual-course-form');
    form.elements.unitTitle.value = String(entry.level_data.levelName || '').replace(/^Unit\s+\d+\s*:\s*/i, '');
    form.elements.cefrTag.value = entry.level_data.cefrTag || 'CEFR A1';
    form.elements.description.value = entry.level_data.description || '';
    showMessage(document.querySelector('#manual-course-message'), '');
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    if (!editingCourseStatus) editingCourseStatus = 'draft';
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
      addClassImageControl(item, lesson, index, false);
      addTamilAudioPreview(item, lesson);
      list.append(item);
    });
  }

  async function saveCourse(status) {
    if (!editingCourse || manualImageBusy) return;
    const course = { ...editingCourse, description: document.querySelector('#course-description').value.trim() };
    const saved = await rpc('admin_save_course', { p_level_data: course, p_status: status });
    if (saved?.level_data) showCoursePreview(saved.level_data);
    editingCourseStatus = status;
    showMessage(document.querySelector('#course-message'), status === 'published' ? 'Course published to the app.' : 'Draft saved.', false);
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
        Answer: lesson?.translation?.expectedEnglish || lesson?.jumble?.correctWords?.join(' ') || '',
        JumbleTamil: lesson?.jumble?.tamilSentence || '',
        JumbleHint: lesson?.jumble?.hint || '',
        TranslationTamil: lesson?.translation?.tamilPrompt || '',
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
      if (!response.ok) throw new Error(result.error || `Could not generate an image for Class ${lessonIndex + 1}.`);
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
      await loadCourses();
    } catch (error) {
      button.textContent = 'Generate class image';
      showMessage(message, error.message || 'Class image generation failed.');
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
      const speakingSample = get(`class${number}Sample`);
      const speakingSample2 = get(`class${number}Sample2`);
      const wrong1 = get(`class${number}Wrong1`);
      const wrong2 = get(`class${number}Wrong2`);
      const correctWords = expectedEnglish.split(/\s+/).filter(Boolean);
      return {
        ...existingLesson,
        id: existingLesson.id || `${courseId}-${number}`,
        levelNumber: existingCourse?.levelNumber || 5,
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
          expectedEnglish,
          options: [expectedEnglish, wrong1, wrong2],
          correctOptionIndex: 0,
          explanation,
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
      levelNumber: existingCourse?.levelNumber || 5,
      levelName: `Unit ${existingCourse?.levelNumber || 5}: ${unitTitle}`,
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
    buttons.forEach((button) => { button.disabled = true; });
    const message = document.querySelector('#manual-course-message');
    showMessage(message, status === 'published' ? 'Publishing course…' : 'Saving draft…', false);
    try {
      const course = buildManualCourse(new FormData(form));
      const saved = await rpc('admin_save_course', { p_level_data: course, p_status: status });
      if (saved?.level_data) editingCourse = saved.level_data;
      editingCourseStatus = status;
      showMessage(message, status === 'published' ? 'Course published to the app.' : 'Course saved as a draft.', false);
      await loadCourses();
    } catch (error) {
      showMessage(message, error.message || 'Could not save the course.');
    } finally {
      manualCourseBusy = false;
      buttons.forEach((button) => { button.disabled = false; });
    }
  }

  async function generateCourseAudio() {
    const form = document.querySelector('#manual-course-form');
    const manualMode = !document.querySelector('#manual-course-page').hidden;
    if ((manualMode && !form.reportValidity()) || manualCourseBusy || manualAudioBusy || manualImageBusy || (!manualMode && !editingCourse)) return;
    const button = document.querySelector(manualMode ? '#generate-course-audio' : '#generate-preview-course-audio');
    const stopButton = document.querySelector(manualMode ? '#stop-course-audio' : '#stop-preview-course-audio');
    const message = document.querySelector(manualMode ? '#manual-course-message' : '#course-message');
    manualAudioBusy = true;
    audioStopRequested = false;
    audioAbortController = new AbortController();
    button.disabled = true;
    stopButton.hidden = false;
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

      showMessage(message, audioStopRequested
        ? `Audio generation stopped. ${generated} clips were saved; you can resume later.`
        : generated ? `Generated ${generated} audio clips and saved them with the course.` : 'All course audio is already up to date.', false);
      await loadCourses();
    } catch (error) {
      if (audioStopRequested || error.name === 'AbortError') {
        showMessage(message, 'Audio generation stopped. Any completed clips were saved; you can resume later.', false);
      } else {
        showMessage(message, error.message || 'Course audio generation failed.');
      }
    } finally {
      manualAudioBusy = false;
      audioAbortController = null;
      button.disabled = false;
      stopButton.hidden = true;
    }
  }

  function stopCourseAudio() {
    if (!manualAudioBusy || !audioAbortController) return;
    audioStopRequested = true;
    audioAbortController.abort();
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
  document.querySelector('#import-course-js').addEventListener('click', () => {
    document.querySelector('#course-js-file').click();
  });
  document.querySelector('#course-js-file').addEventListener('change', importCourseJavaScript);
  document.querySelector('#open-manual-course').addEventListener('click', () => {
    editingCourse = null;
    editingCourseStatus = 'draft';
    document.querySelector('#manual-course-form').reset();
    document.querySelector('#manual-course-page h2').textContent = 'Create a course manually';
    renderManualClassFields();
    showMessage(document.querySelector('#manual-course-message'), '');
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
  document.querySelector('#generate-course-audio').addEventListener('click', generateCourseAudio);
  document.querySelector('#generate-preview-course-audio').addEventListener('click', generateCourseAudio);
  document.querySelector('#stop-course-audio').addEventListener('click', stopCourseAudio);
  document.querySelector('#stop-preview-course-audio').addEventListener('click', stopCourseAudio);
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
      editingCourseStatus = 'draft';
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

  async function importCourseJavaScript(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const message = document.querySelector('#course-message');
    if (!file.name.toLowerCase().endsWith('.js') || file.size > 2 * 1024 * 1024) {
      showMessage(message, 'Choose a JavaScript course file smaller than 2 MB.');
      return;
    }
    showMessage(message, 'Reading course data from the JavaScript file…', false);
    try {
      const courses = await extractCoursesFromJavaScript(await file.text());
      const course = courses.find((item) => Array.isArray(item?.classes) && item.classes.length) || courses[0];
      if (!course || !Array.isArray(course.classes) || !course.classes.length) {
        throw new Error('This file does not contain an Elvate course with classes.');
      }
      const imported = JSON.parse(JSON.stringify(course));
      delete imported.id;
      delete imported.starterCourseKey;
      imported.classes = imported.classes.map((lesson) => {
        const copy = { ...lesson };
        delete copy.id;
        return copy;
      });
      editingCourse = imported;
      editingCourseStatus = 'draft';
      const form = document.querySelector('#manual-course-form');
      form.reset();
      document.querySelector('#course-studio-view').hidden = true;
      document.querySelector('#manual-course-page').hidden = false;
      document.querySelector('#manual-course-page h2').textContent = 'Review imported course';
      renderManualClassFields(imported.classes.length, imported);
      form.elements.unitTitle.value = String(imported.levelName || 'Imported course').replace(/^Unit\s+\d+\s*:\s*/i, '');
      form.elements.cefrTag.value = imported.cefrTag || 'CEFR A1';
      form.elements.description.value = imported.description || '';
      showMessage(document.querySelector('#manual-course-message'), `Imported ${imported.classes.length} classes. Review the content, then save as draft.`, false);
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      showMessage(message, error.message || 'Could not read course data from that JavaScript file.');
    }
  }

  function extractCoursesFromJavaScript(source) {
    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe');
      iframe.hidden = true;
      iframe.setAttribute('sandbox', 'allow-scripts');
      const payload = `${source}\n;try { parent.postMessage({ type: 'elvate-course-import', courses: window.ELVATE_ADMIN_STARTER_COURSES || window.ELVATE_BUILTIN_COURSES || [] }, '*'); } catch (_) { parent.postMessage({ type: 'elvate-course-import-error' }, '*'); }`;
      const blobUrl = URL.createObjectURL(new Blob([payload], { type: 'text/javascript' }));
      let settled = false;
      const finish = (error, courses) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        window.removeEventListener('message', onMessage);
        URL.revokeObjectURL(blobUrl);
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
      iframe.srcdoc = `<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src blob:; connect-src 'none'; img-src 'none'; media-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; style-src 'none'"><script src="${blobUrl}"><\/script>`;
      document.body.append(iframe);
    });
  }

  if (session?.user?.app_metadata?.role === 'admin' && session.accessToken) {
    showDashboard(true);
    loadDashboard();
  } else {
    saveSession(null);
    showDashboard(false);
  }
})();
