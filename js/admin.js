/**
 * admin.js — Admin Dashboard Logic (API-backed)
 * Handles login, navigation, CRUD operations via Flask API.
 */

const AdminApp = (() => {
  let currentPanel = 'overview';

  // ─── Initialization ───────────────────────────────────────
  async function init() {
    const isLoggedIn = await API.checkAuth();
    if (isLoggedIn) {
      showDashboard();
    }
    bindEvents();
  }

  function bindEvents() {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => switchPanel(item.dataset.panel));
    });

    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('siteInfoForm').addEventListener('submit', handleSiteInfoSave);
    document.getElementById('passwordForm').addEventListener('submit', handlePasswordChange);
    document.getElementById('mobileToggle').addEventListener('click', toggleMobileMenu);
    document.getElementById('sidebarOverlay').addEventListener('click', toggleMobileMenu);

    document.getElementById('logoFileInput').addEventListener('change', (e) => handleImageUpload(e, 'logo'));
    document.getElementById('ownerFileInput').addEventListener('change', (e) => handleImageUpload(e, 'owner'));

    document.getElementById('newDegreeInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); addDegreeOption(); }
    });

    document.getElementById('modalOverlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  }

  // ─── Auth ─────────────────────────────────────────────────

  async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    const res = await API.login(username, password);
    if (res.ok) {
      showDashboard();
    } else {
      const err = document.getElementById('loginError');
      err.classList.add('show');
      setTimeout(() => err.classList.remove('show'), 3000);
    }
  }

  async function handleLogout() {
    await API.logout();
    document.getElementById('dashboard').classList.remove('active');
    document.getElementById('loginScreen').style.display = '';
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
  }

  function handleSessionExpired() {
    document.getElementById('dashboard').classList.remove('active');
    document.getElementById('loginScreen').style.display = '';
    showToast('Session expired. Please login again.', 'error');
  }

  function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboard').classList.add('active');
    switchPanel('overview');
  }

  // ─── Navigation ───────────────────────────────────────────

  function switchPanel(panelName) {
    currentPanel = panelName;

    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.panel === panelName);
    });
    document.querySelectorAll('.panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === 'panel-' + panelName);
    });

    const titles = {
      overview: ['Dashboard', 'Overview of your tuition center'],
      siteInfo: ['Site Information', 'Manage company name, owner details, and branding'],
      courses: ['Courses', 'Manage available courses and categories'],
      degreeOptions: ['Degree Options', 'Manage degree course list for application form'],
      results: ['Results / Toppers', 'Manage student results and topper showcase'],
      govtExams: ['Govt Exam Prep', 'Manage government exam preparation courses'],
      applications: ['Applications', 'View and manage student applications'],
      settings: ['Settings', 'Admin account and data management']
    };

    const [title, subtitle] = titles[panelName] || ['Dashboard', ''];
    document.getElementById('panelTitle').textContent = title;
    document.getElementById('panelSubtitle').textContent = subtitle;

    const actionsEl = document.getElementById('headerActions');
    actionsEl.innerHTML = '';
    if (panelName === 'courses') {
      actionsEl.innerHTML = '<button class="btn btn-primary btn-sm" onclick="AdminApp.openCourseModal()">+ Add Course</button>';
    } else if (panelName === 'results') {
      actionsEl.innerHTML = '<button class="btn btn-primary btn-sm" onclick="AdminApp.openResultModal()">+ Add Topper</button>';
    } else if (panelName === 'govtExams') {
      actionsEl.innerHTML = '<button class="btn btn-primary btn-sm" onclick="AdminApp.openGovtExamModal()">+ Add Exam</button>';
    } else if (panelName === 'overview') {
      actionsEl.innerHTML = '<a href="/" target="_blank" class="btn btn-sm btn-secondary">🌐 View Website</a>';
    }

    loadPanelData(panelName);

    const sidebar = document.getElementById('sidebar');
    if (sidebar.classList.contains('open')) toggleMobileMenu();
  }

  async function loadPanelData(panel) {
    switch (panel) {
      case 'overview': await loadOverview(); break;
      case 'siteInfo': await loadSiteInfo(); break;
      case 'courses': await renderCourses(); break;
      case 'degreeOptions': await renderDegreeOptions(); break;
      case 'results': await renderResults(); break;
      case 'govtExams': await renderGovtExams(); break;
      case 'applications': await renderApplications(); break;
    }
    updateAppBadge();
  }

  // ─── Overview ─────────────────────────────────────────────

  async function loadOverview() {
    const stats = await API.getStats();
    document.getElementById('statsRow').innerHTML = `
      <div class="stat-card">
        <div class="stat-icon blue">📚</div>
        <div class="stat-value">${stats.courses || 0}</div>
        <div class="stat-label">Total Courses</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon gold">🏆</div>
        <div class="stat-value">${stats.results || 0}</div>
        <div class="stat-label">Toppers Listed</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">📝</div>
        <div class="stat-value">${stats.applications || 0}</div>
        <div class="stat-label">Applications</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon red">📋</div>
        <div class="stat-value">${stats.govtExams || 0}</div>
        <div class="stat-label">Govt Exam Courses</div>
      </div>
    `;

    const apps = await API.getApplications();
    const recentApps = apps.slice(0, 5);
    const tbody = document.getElementById('recentAppsBody');
    const empty = document.getElementById('recentAppsEmpty');

    if (recentApps.length === 0) {
      tbody.innerHTML = '';
      empty.style.display = '';
      document.getElementById('recentAppsTable').style.display = 'none';
    } else {
      empty.style.display = 'none';
      document.getElementById('recentAppsTable').style.display = '';
      tbody.innerHTML = recentApps.map(app => `
        <tr>
          <td>${escapeHtml(app.student_name || '')}</td>
          <td>${escapeHtml(app.mobile || '')}</td>
          <td><span class="badge badge-info">${escapeHtml(app.category || '')}</span></td>
          <td>${formatDate(app.submitted_at)}</td>
          <td><span class="badge ${app.status === 'New' ? 'badge-warning' : 'badge-success'}">${app.status}</span></td>
        </tr>
      `).join('');
    }
  }

  // ─── Site Info ────────────────────────────────────────────

  async function loadSiteInfo() {
    const info = await API.getSiteInfo();
    document.getElementById('siCompanyName').value = info.companyName || '';
    document.getElementById('siTagline').value = info.tagline || '';
    document.getElementById('siOwnerName').value = info.ownerName || '';
    document.getElementById('siOwnerTitle').value = info.ownerTitle || '';
    document.getElementById('siPhone').value = info.phone || '';
    document.getElementById('siEmail').value = info.email || '';
    document.getElementById('siAddress').value = info.address || '';
    document.getElementById('siFacebook').value = info.socialFacebook || '';
    document.getElementById('siInstagram').value = info.socialInstagram || '';
    document.getElementById('siYoutube').value = info.socialYoutube || '';
    document.getElementById('siWhatsapp').value = info.socialWhatsapp || '';

    updateImagePreview('logo', info.logoUrl);
    updateImagePreview('owner', info.ownerImageUrl);
  }

  async function handleSiteInfoSave(e) {
    e.preventDefault();
    const data = {
      companyName: document.getElementById('siCompanyName').value.trim(),
      tagline: document.getElementById('siTagline').value.trim(),
      ownerName: document.getElementById('siOwnerName').value.trim(),
      ownerTitle: document.getElementById('siOwnerTitle').value.trim(),
      phone: document.getElementById('siPhone').value.trim(),
      email: document.getElementById('siEmail').value.trim(),
      address: document.getElementById('siAddress').value.trim(),
      socialFacebook: document.getElementById('siFacebook').value.trim(),
      socialInstagram: document.getElementById('siInstagram').value.trim(),
      socialYoutube: document.getElementById('siYoutube').value.trim(),
      socialWhatsapp: document.getElementById('siWhatsapp').value.trim()
    };
    const res = await API.updateSiteInfo(data);
    if (res.ok) showToast('Site information saved!', 'success');
    else showToast('Failed to save', 'error');
  }

  function handleImageUpload(e, type) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('Image must be under 2MB', 'error'); return; }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const key = type === 'logo' ? 'logoUrl' : 'ownerImageUrl';
      const res = await API.updateSiteInfo({ [key]: ev.target.result });
      if (res.ok) {
        updateImagePreview(type, ev.target.result);
        showToast(`${type === 'logo' ? 'Logo' : 'Owner photo'} updated!`, 'success');
      }
    };
    reader.readAsDataURL(file);
  }

  async function removeImage(type) {
    const key = type === 'logo' ? 'logoUrl' : 'ownerImageUrl';
    await API.updateSiteInfo({ [key]: '' });
    updateImagePreview(type, '');
    showToast('Image removed', 'info');
  }

  function updateImagePreview(type, url) {
    const previewId = type === 'logo' ? 'logoPreview' : 'ownerPreview';
    const removeBtnId = type === 'logo' ? 'logoRemoveBtn' : 'ownerRemoveBtn';
    const preview = document.getElementById(previewId);
    const removeBtn = document.getElementById(removeBtnId);
    if (url) {
      preview.src = url;
      preview.style.display = '';
      removeBtn.style.display = '';
    } else {
      preview.style.display = 'none';
      removeBtn.style.display = 'none';
    }
  }

  // ─── Courses ──────────────────────────────────────────────

  async function renderCourses() {
    const courses = await API.getCourses();
    const container = document.getElementById('coursesContent');

    if (courses.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">📚</div><h3>No courses added</h3><p>Click "Add Course" to create your first course.</p></div>`;
      return;
    }

    container.innerHTML = `
      <div class="items-grid">
        ${courses.map(c => `
          <div class="item-card">
            <div class="item-header">
              <div>
                <span class="item-icon">${c.icon || '📖'}</span>
                <div class="item-title" style="margin-top:0.3rem;">${escapeHtml(c.name)}</div>
              </div>
              <span class="badge badge-gold">${escapeHtml(c.category)}</span>
            </div>
            <div class="item-desc">${escapeHtml(c.description)}</div>
            <div class="item-meta">
              <div class="table-actions">
                <button class="btn btn-sm btn-secondary" onclick="AdminApp.openCourseModal(${c.id})">✏️ Edit</button>
                <button class="btn btn-sm btn-danger" onclick="AdminApp.deleteCourse(${c.id})">🗑️</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>`;
  }

  // Store fetched data for modal editing
  let _coursesCache = [];
  let _resultsCache = [];
  let _govtExamsCache = [];

  async function openCourseModal(id) {
    let course = null;
    if (id) {
      if (_coursesCache.length === 0) _coursesCache = await API.getCourses();
      course = _coursesCache.find(c => c.id === id);
    }
    const isEdit = !!course;

    document.getElementById('modalTitle').textContent = isEdit ? 'Edit Course' : 'Add New Course';
    document.getElementById('modalBody').innerHTML = `
      <form id="courseForm">
        <div class="form-group">
          <label for="cfName">Course Name</label>
          <input type="text" id="cfName" value="${isEdit ? escapeHtml(course.name) : ''}" required>
        </div>
        <div class="form-group">
          <label for="cfCategory">Category</label>
          <select id="cfCategory">
            <option value="school" ${isEdit && course.category === 'school' ? 'selected' : ''}>School</option>
            <option value="junior" ${isEdit && course.category === 'junior' ? 'selected' : ''}>Junior College</option>
            <option value="degree" ${isEdit && course.category === 'degree' ? 'selected' : ''}>Degree College</option>
            <option value="govt" ${isEdit && course.category === 'govt' ? 'selected' : ''}>Govt Exam Prep</option>
          </select>
        </div>
        <div class="form-group">
          <label for="cfDescription">Description</label>
          <textarea id="cfDescription" rows="3">${isEdit ? escapeHtml(course.description) : ''}</textarea>
        </div>
        <div class="form-group">
          <label for="cfIcon">Icon (emoji)</label>
          <input type="text" id="cfIcon" value="${isEdit ? course.icon || '📖' : '📖'}" maxlength="4">
          <p class="form-hint">Use any emoji like 📚 🔬 🎓 🏛️</p>
        </div>
      </form>
    `;
    document.getElementById('modalFooter').innerHTML = `
      <button class="btn btn-secondary" onclick="AdminApp.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="AdminApp.saveCourse(${id || 'null'})">${isEdit ? 'Update' : 'Add'} Course</button>
    `;
    openModal();
  }

  async function saveCourse(id) {
    const data = {
      name: document.getElementById('cfName').value.trim(),
      category: document.getElementById('cfCategory').value,
      description: document.getElementById('cfDescription').value.trim(),
      icon: document.getElementById('cfIcon').value.trim() || '📖'
    };
    if (!data.name) { showToast('Course name is required', 'error'); return; }

    let res;
    if (id) { res = await API.updateCourse(id, data); }
    else { res = await API.addCourse(data); }

    if (res.ok) {
      showToast(id ? 'Course updated!' : 'Course added!', 'success');
      closeModal();
      _coursesCache = [];
      await renderCourses();
    } else { showToast('Failed to save course', 'error'); }
  }

  async function deleteCourse(id) {
    showConfirm('Delete this course?', async () => {
      await API.deleteCourse(id);
      _coursesCache = [];
      await renderCourses();
      showToast('Course deleted', 'info');
    });
  }

  // ─── Degree Options ───────────────────────────────────────

  async function renderDegreeOptions() {
    const options = await API.getDegreeOptions();
    const container = document.getElementById('degreeTagList');

    if (options.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">No degree options. Add one above.</p>';
      return;
    }
    container.innerHTML = options.map(opt => `
      <div class="tag">
        ${escapeHtml(opt.name)}
        <button class="tag-remove" onclick="AdminApp.removeDegreeOption(${opt.id})">✕</button>
      </div>
    `).join('');
  }

  async function addDegreeOption() {
    const input = document.getElementById('newDegreeInput');
    const value = input.value.trim();
    if (!value) { showToast('Enter a degree option name', 'error'); return; }

    const res = await API.addDegreeOption(value);
    if (res.ok) {
      input.value = '';
      await renderDegreeOptions();
      showToast('Degree option added!', 'success');
    }
  }

  async function removeDegreeOption(id) {
    await API.deleteDegreeOption(id);
    await renderDegreeOptions();
    showToast('Option removed', 'info');
  }

  // ─── Results ──────────────────────────────────────────────

  async function renderResults() {
    const results = await API.getResults();
    _resultsCache = results;
    const container = document.getElementById('resultsContent');

    if (results.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">🏆</div><h3>No results added</h3><p>Click "Add Topper" to showcase student achievements.</p></div>`;
      return;
    }

    container.innerHTML = `
      <div class="content-card"><div class="card-body"><div class="data-table-wrapper">
        <table class="data-table">
          <thead><tr><th>Photo</th><th>Name</th><th>Board</th><th>Class</th><th>Year</th><th>Percentage</th><th>Actions</th></tr></thead>
          <tbody>
            ${results.map(r => `
              <tr>
                <td>${r.image_url
                  ? `<img src="${r.image_url}" class="image-preview" style="width:40px;height:40px;" alt="${escapeHtml(r.name)}">`
                  : `<div style="width:40px;height:40px;border-radius:var(--radius-sm);background:var(--accent-muted);display:flex;align-items:center;justify-content:center;font-size:1.1rem;">🎓</div>`
                }</td>
                <td><strong>${escapeHtml(r.name)}</strong></td>
                <td><span class="badge badge-info">${escapeHtml(r.board)}</span></td>
                <td>${escapeHtml(r.exam_class)}</td>
                <td>${r.year}</td>
                <td><span class="badge badge-success">${r.percentage}%</span></td>
                <td><div class="table-actions">
                  <button class="btn btn-sm btn-secondary" onclick="AdminApp.openResultModal(${r.id})">✏️</button>
                  <button class="btn btn-sm btn-danger" onclick="AdminApp.deleteResult(${r.id})">🗑️</button>
                </div></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div></div></div>`;
  }

  let _tempResultImage = null;

  async function openResultModal(id) {
    let result = null;
    if (id) {
      if (_resultsCache.length === 0) _resultsCache = await API.getResults();
      result = _resultsCache.find(r => r.id === id);
    }
    const isEdit = !!result;
    const boards = await API.getBoards();

    document.getElementById('modalTitle').textContent = isEdit ? 'Edit Topper' : 'Add New Topper';
    document.getElementById('modalBody').innerHTML = `
      <form id="resultForm">
        <div class="form-grid">
          <div class="form-group"><label for="rfName">Student Name</label>
            <input type="text" id="rfName" value="${isEdit ? escapeHtml(result.name) : ''}" required></div>
          <div class="form-group"><label for="rfBoard">Board</label>
            <select id="rfBoard">${boards.map(b => `<option value="${b}" ${isEdit && result.board === b ? 'selected' : ''}>${b}</option>`).join('')}</select></div>
        </div>
        <div class="form-grid">
          <div class="form-group"><label for="rfCategory">Category</label>
            <select id="rfCategory" onchange="AdminApp.onResultCategoryChange()">
              <option value="school" ${isEdit && result.category === 'school' ? 'selected' : ''}>School (10th)</option>
              <option value="college" ${isEdit && result.category === 'college' ? 'selected' : ''}>College (12th)</option>
            </select></div>
          <div class="form-group"><label for="rfExamClass">Class / Exam</label>
            <select id="rfExamClass">
              <option value="10th" ${isEdit && result.exam_class === '10th' ? 'selected' : ''}>10th</option>
              <option value="12th" ${isEdit && result.exam_class === '12th' ? 'selected' : ''}>12th</option>
            </select></div>
        </div>
        <div class="form-grid" id="rfStreamGroup" style="display:${isEdit && result.category === 'college' ? '' : 'none'};">
          <div class="form-group"><label for="rfStream">Stream</label>
            <select id="rfStream">
              <option value="">N/A</option>
              <option value="Science" ${isEdit && result.stream === 'Science' ? 'selected' : ''}>Science</option>
              <option value="Commerce" ${isEdit && result.stream === 'Commerce' ? 'selected' : ''}>Commerce</option>
              <option value="Arts" ${isEdit && result.stream === 'Arts' ? 'selected' : ''}>Arts</option>
            </select></div>
        </div>
        <div class="form-grid">
          <div class="form-group"><label for="rfYear">Year</label>
            <input type="number" id="rfYear" value="${isEdit ? result.year : new Date().getFullYear()}" min="2000" max="2099"></div>
          <div class="form-group"><label for="rfPercentage">Percentage</label>
            <input type="number" id="rfPercentage" value="${isEdit ? result.percentage : ''}" step="0.01" min="0" max="100"></div>
        </div>
        <div class="form-group"><label for="rfDetails">Details / Achievements</label>
          <textarea id="rfDetails" rows="3">${isEdit ? escapeHtml(result.details) : ''}</textarea></div>
        <div class="form-group"><label>Student Photo</label>
          <div class="image-upload-area"><input type="file" accept="image/*" id="rfImageInput"><div class="upload-icon">📷</div><p>Click to upload student photo</p></div>
          <div style="margin-top:0.6rem;" id="rfImagePreviewWrap">
            ${isEdit && result.image_url ? `<img src="${result.image_url}" class="image-preview" id="rfImagePreview">` : ''}
          </div></div>
      </form>
    `;

    setTimeout(() => {
      document.getElementById('rfImageInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { showToast('Image must be under 2MB', 'error'); return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
          _tempResultImage = ev.target.result;
          document.getElementById('rfImagePreviewWrap').innerHTML = `<img src="${ev.target.result}" class="image-preview">`;
        };
        reader.readAsDataURL(file);
      });
    }, 50);

    document.getElementById('modalFooter').innerHTML = `
      <button class="btn btn-secondary" onclick="AdminApp.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="AdminApp.saveResult(${id || 'null'})">${isEdit ? 'Update' : 'Add'} Topper</button>
    `;
    openModal();
  }

  function onResultCategoryChange() {
    const cat = document.getElementById('rfCategory').value;
    const classSelect = document.getElementById('rfExamClass');
    const streamGroup = document.getElementById('rfStreamGroup');
    if (cat === 'school') { classSelect.innerHTML = '<option value="10th">10th</option>'; streamGroup.style.display = 'none'; }
    else { classSelect.innerHTML = '<option value="12th">12th</option>'; streamGroup.style.display = ''; }
  }

  async function saveResult(id) {
    const data = {
      name: document.getElementById('rfName').value.trim(),
      board: document.getElementById('rfBoard').value,
      category: document.getElementById('rfCategory').value,
      examClass: document.getElementById('rfExamClass').value,
      stream: document.getElementById('rfStream') ? document.getElementById('rfStream').value : '',
      year: parseInt(document.getElementById('rfYear').value),
      percentage: parseFloat(document.getElementById('rfPercentage').value),
      details: document.getElementById('rfDetails').value.trim(),
      imageUrl: ''
    };

    if (!data.name) { showToast('Student name is required', 'error'); return; }
    if (isNaN(data.percentage)) { showToast('Valid percentage is required', 'error'); return; }

    if (_tempResultImage) {
      data.imageUrl = _tempResultImage;
    } else if (id) {
      const existing = _resultsCache.find(r => r.id === id);
      if (existing) data.imageUrl = existing.image_url || '';
    }

    let res;
    if (id) { res = await API.updateResult(id, data); }
    else { res = await API.addResult(data); }

    if (res.ok) {
      showToast(id ? 'Topper updated!' : 'Topper added!', 'success');
      _tempResultImage = null;
      closeModal();
      _resultsCache = [];
      await renderResults();
    } else { showToast('Failed to save', 'error'); }
  }

  async function deleteResult(id) {
    showConfirm('Delete this topper record?', async () => {
      await API.deleteResult(id);
      _resultsCache = [];
      await renderResults();
      showToast('Result deleted', 'info');
    });
  }

  // ─── Govt Exams ───────────────────────────────────────────

  async function renderGovtExams() {
    const exams = await API.getGovtExams();
    _govtExamsCache = exams;
    const container = document.getElementById('govtExamsContent');

    if (exams.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><h3>No exam prep courses</h3><p>Click "Add Exam" to create one.</p></div>`;
      return;
    }

    container.innerHTML = `
      <div class="items-grid">
        ${exams.map(ex => `
          <div class="item-card">
            <div class="item-header"><div>
              <span class="item-icon">${ex.icon || '📋'}</span>
              <div class="item-title" style="margin-top:0.3rem;">${escapeHtml(ex.name)}</div>
            </div></div>
            <div class="item-desc">${escapeHtml(ex.description)}</div>
            <div class="item-desc" style="margin-top:0.5rem;font-size:0.78rem;color:var(--text-muted);">${escapeHtml(ex.details || '')}</div>
            <div class="item-meta"><div class="table-actions">
              <button class="btn btn-sm btn-secondary" onclick="AdminApp.openGovtExamModal(${ex.id})">✏️ Edit</button>
              <button class="btn btn-sm btn-danger" onclick="AdminApp.deleteGovtExam(${ex.id})">🗑️</button>
            </div></div>
          </div>
        `).join('')}
      </div>`;
  }

  async function openGovtExamModal(id) {
    let exam = null;
    if (id) {
      if (_govtExamsCache.length === 0) _govtExamsCache = await API.getGovtExams();
      exam = _govtExamsCache.find(e => e.id === id);
    }
    const isEdit = !!exam;

    document.getElementById('modalTitle').textContent = isEdit ? 'Edit Exam Prep' : 'Add New Exam Prep';
    document.getElementById('modalBody').innerHTML = `
      <form id="govtExamForm">
        <div class="form-group"><label for="gfName">Exam Name</label>
          <input type="text" id="gfName" value="${isEdit ? escapeHtml(exam.name) : ''}" required></div>
        <div class="form-group"><label for="gfDescription">Description</label>
          <textarea id="gfDescription" rows="3">${isEdit ? escapeHtml(exam.description) : ''}</textarea></div>
        <div class="form-group"><label for="gfDetails">Details</label>
          <textarea id="gfDetails" rows="3">${isEdit ? escapeHtml(exam.details || '') : ''}</textarea></div>
        <div class="form-group"><label for="gfIcon">Icon (emoji)</label>
          <input type="text" id="gfIcon" value="${isEdit ? exam.icon || '📋' : '📋'}" maxlength="4"></div>
      </form>
    `;
    document.getElementById('modalFooter').innerHTML = `
      <button class="btn btn-secondary" onclick="AdminApp.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="AdminApp.saveGovtExam(${id || 'null'})">${isEdit ? 'Update' : 'Add'} Exam</button>
    `;
    openModal();
  }

  async function saveGovtExam(id) {
    const data = {
      name: document.getElementById('gfName').value.trim(),
      description: document.getElementById('gfDescription').value.trim(),
      details: document.getElementById('gfDetails').value.trim(),
      icon: document.getElementById('gfIcon').value.trim() || '📋'
    };
    if (!data.name) { showToast('Exam name is required', 'error'); return; }

    let res;
    if (id) { res = await API.updateGovtExam(id, data); }
    else { res = await API.addGovtExam(data); }

    if (res.ok) {
      showToast(id ? 'Exam updated!' : 'Exam added!', 'success');
      closeModal();
      _govtExamsCache = [];
      await renderGovtExams();
    } else { showToast('Failed to save', 'error'); }
  }

  async function deleteGovtExam(id) {
    showConfirm('Delete this exam prep course?', async () => {
      await API.deleteGovtExam(id);
      _govtExamsCache = [];
      await renderGovtExams();
      showToast('Exam deleted', 'info');
    });
  }

  // ─── Applications ─────────────────────────────────────────

  async function renderApplications() {
    const apps = await API.getApplications();
    const tbody = document.getElementById('allAppsBody');
    const empty = document.getElementById('allAppsEmpty');
    const table = document.getElementById('allAppsTable');

    if (apps.length === 0) {
      table.style.display = 'none';
      empty.style.display = '';
      return;
    }

    empty.style.display = 'none';
    table.style.display = '';
    tbody.innerHTML = apps.map((app, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${escapeHtml(app.student_name || '')}</strong></td>
        <td>${escapeHtml(app.mobile || '')}</td>
        <td><span class="badge badge-info">${escapeHtml(app.category || '')}</span></td>
        <td>${escapeHtml(app.board || 'N/A')}</td>
        <td>${escapeHtml(app.class_or_course || '')}</td>
        <td>${formatDate(app.submitted_at)}</td>
        <td><span class="badge ${app.status === 'New' ? 'badge-warning' : app.status === 'Contacted' ? 'badge-info' : 'badge-success'}">${app.status}</span></td>
        <td><div class="table-actions">
          <button class="btn btn-sm btn-secondary" onclick="AdminApp.viewApplication(${app.id})">👁️</button>
          <button class="btn btn-sm btn-danger" onclick="AdminApp.deleteApplication(${app.id})">🗑️</button>
        </div></td>
      </tr>
    `).join('');
  }

  async function viewApplication(id) {
    const apps = await API.getApplications();
    const app = apps.find(a => a.id === id);
    if (!app) return;

    document.getElementById('modalTitle').textContent = 'Application Details';
    document.getElementById('modalBody').innerHTML = `
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-label">Student Name</div><div class="detail-value">${escapeHtml(app.student_name)}</div></div>
        <div class="detail-item"><div class="detail-label">Mobile</div><div class="detail-value">${escapeHtml(app.mobile)}</div></div>
        <div class="detail-item"><div class="detail-label">Email</div><div class="detail-value">${escapeHtml(app.email || 'N/A')}</div></div>
        <div class="detail-item"><div class="detail-label">Category</div><div class="detail-value">${escapeHtml(app.category)}</div></div>
        <div class="detail-item"><div class="detail-label">Board</div><div class="detail-value">${escapeHtml(app.board || 'N/A')}</div></div>
        <div class="detail-item"><div class="detail-label">Class / Course</div><div class="detail-value">${escapeHtml(app.class_or_course)}</div></div>
        ${app.stream ? `<div class="detail-item"><div class="detail-label">Stream</div><div class="detail-value">${escapeHtml(app.stream)}</div></div>` : ''}
        <div class="detail-item"><div class="detail-label">Submitted</div><div class="detail-value">${formatDate(app.submitted_at)}</div></div>
      </div>
      <div style="margin-top:1.2rem;">
        <label style="font-size:0.8rem;font-weight:500;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.04em;">Update Status</label>
        <select id="appStatusSelect" style="margin-top:0.3rem;width:100%;padding:0.7rem;background:var(--bg-input);border:1px solid var(--border-color);border-radius:var(--radius-md);color:var(--text-primary);font-family:inherit;">
          <option value="New" ${app.status === 'New' ? 'selected' : ''}>New</option>
          <option value="Contacted" ${app.status === 'Contacted' ? 'selected' : ''}>Contacted</option>
          <option value="Enrolled" ${app.status === 'Enrolled' ? 'selected' : ''}>Enrolled</option>
          <option value="Rejected" ${app.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
        </select>
      </div>
    `;
    document.getElementById('modalFooter').innerHTML = `
      <button class="btn btn-secondary" onclick="AdminApp.closeModal()">Close</button>
      <button class="btn btn-primary" onclick="AdminApp.updateAppStatus(${app.id})">Update Status</button>
    `;
    openModal();
  }

  async function updateAppStatus(id) {
    const status = document.getElementById('appStatusSelect').value;
    const res = await API.updateApplication(id, { status });
    if (res.ok) {
      showToast('Status updated!', 'success');
      closeModal();
      await renderApplications();
      updateAppBadge();
    }
  }

  async function deleteApplication(id) {
    showConfirm('Delete this application?', async () => {
      await API.deleteApplication(id);
      await renderApplications();
      updateAppBadge();
      showToast('Application deleted', 'info');
    });
  }

  async function exportApplicationsCSV() {
    const apps = await API.getApplications();
    if (apps.length === 0) { showToast('No applications to export', 'error'); return; }

    const headers = ['Name', 'Mobile', 'Email', 'Category', 'Board', 'Class/Course', 'Stream', 'Status', 'Date'];
    const rows = apps.map(a => [
      a.student_name, a.mobile, a.email || '', a.category, a.board || '', a.class_or_course || '', a.stream || '', a.status, formatDate(a.submitted_at)
    ]);
    let csv = headers.join(',') + '\n';
    rows.forEach(r => { csv += r.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(',') + '\n'; });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `applications_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported!', 'success');
  }

  // ─── Settings ─────────────────────────────────────────────

  async function handlePasswordChange(e) {
    e.preventDefault();
    const current = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;

    if (newPass !== confirm) { showToast('Passwords do not match', 'error'); return; }
    if (newPass.length < 4) { showToast('Password must be at least 4 characters', 'error'); return; }

    const res = await API.changePassword(current, newPass);
    if (res.ok) {
      showToast('Password changed!', 'success');
      document.getElementById('passwordForm').reset();
    } else { showToast(res.data.message || 'Current password is incorrect', 'error'); }
  }

  // ─── Modal Helpers ────────────────────────────────────────

  function openModal() {
    document.getElementById('modalOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
    document.body.style.overflow = '';
    _tempResultImage = null;
  }

  function showConfirm(message, onConfirm) {
    document.getElementById('modalTitle').textContent = 'Confirm';
    document.getElementById('modalBody').innerHTML = `
      <div style="text-align:center;padding:1rem 0;">
        <div style="font-size:2.5rem;margin-bottom:1rem;">⚠️</div>
        <p style="font-size:0.95rem;color:var(--text-secondary);">${message}</p>
      </div>
    `;
    document.getElementById('modalFooter').innerHTML = `
      <button class="btn btn-secondary" onclick="AdminApp.closeModal()">Cancel</button>
      <button class="btn btn-danger" id="confirmYesBtn">Yes, Delete</button>
    `;
    openModal();
    document.getElementById('confirmYesBtn').addEventListener('click', () => {
      closeModal();
      onConfirm();
    });
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span class="toast-message">${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('removing'); setTimeout(() => toast.remove(), 300); }, 3000);
  }

  async function updateAppBadge() {
    try {
      const stats = await API.getStats();
      const badge = document.getElementById('appCountBadge');
      const count = stats.newApplications || 0;
      badge.textContent = count;
      badge.style.display = count > 0 ? '' : 'none';
    } catch (e) { /* ignore */ }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function formatDate(isoStr) {
    if (!isoStr) return 'N/A';
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function toggleMobileMenu() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('active');
  }

  return {
    init, switchPanel, loadSiteInfo,
    openCourseModal, saveCourse, deleteCourse,
    addDegreeOption, removeDegreeOption,
    openResultModal, saveResult, deleteResult, onResultCategoryChange,
    openGovtExamModal, saveGovtExam, deleteGovtExam,
    viewApplication, updateAppStatus, deleteApplication, exportApplicationsCSV,
    removeImage, closeModal, handleSessionExpired
  };
})();

document.addEventListener('DOMContentLoaded', AdminApp.init);
