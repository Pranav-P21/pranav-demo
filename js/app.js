/**
 * app.js — Public Website Logic
 * Renders content from API, handles form logic, scroll animations.
 */

const App = (() => {

  // ─── Initialization ───────────────────────────────────────
  async function init() {
    await renderHero();
    await renderCourses();
    await renderResults();
    await renderGovtExams();
    await renderFooter();
    initNavbar();
    await initApplyForm();
    initScrollReveal();
  }

  // ─── Navbar ───────────────────────────────────────────────

  function initNavbar() {
    const navbar = document.getElementById('navbar');
    const toggle = document.getElementById('navMobileToggle');
    const links = document.getElementById('navLinks');

    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    });

    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
    });

    links.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => links.classList.remove('open'));
    });
  }

  // ─── Hero Section ────────────────────────────────────────

  async function renderHero() {
    const info = await API.getSiteInfo();
    const results = await API.getResults();
    const courses = await API.getCourses();

    // Brand in nav
    const brandName = document.getElementById('navBrandName');
    const brandLogo = document.getElementById('navBrandLogo');
    brandName.textContent = info.companyName || 'BrightMinds Academy';
    if (info.logoUrl) {
      brandLogo.innerHTML = `<img src="${info.logoUrl}" alt="Logo">`;
    }

    document.getElementById('heroCompanyName').innerHTML =
      `Excellence in <span>${escapeHtml(info.companyName || 'Education')}</span>`;
    document.getElementById('heroTagline').textContent =
      info.tagline || 'Empowering Students, Shaping Futures';

    document.getElementById('ownerName').textContent = info.ownerName || 'Director';
    document.getElementById('ownerTitle').textContent = info.ownerTitle || 'Founder';

    const avatarInner = document.getElementById('ownerAvatarInner');
    if (info.ownerImageUrl) {
      avatarInner.innerHTML = `<img src="${info.ownerImageUrl}" alt="${escapeHtml(info.ownerName)}">`;
    } else {
      avatarInner.textContent = '👤';
    }

    document.getElementById('statCourses').textContent = courses.length + '+';
    document.getElementById('statToppers').textContent = results.length + '+';
  }

  // ─── Courses Section ─────────────────────────────────────

  async function renderCourses() {
    const courses = await API.getCourses();
    const grid = document.getElementById('coursesGrid');
    const categoryNames = { school: 'School', junior: 'Junior College', degree: 'Degree', govt: 'Govt Exam' };

    if (courses.length === 0) {
      grid.innerHTML = '<p style="text-align:center;color:var(--text-muted);grid-column:1/-1;">Courses coming soon.</p>';
      return;
    }

    grid.innerHTML = courses.map(c => `
      <div class="course-card reveal" data-category="${c.category}">
        <div class="card-icon">${c.icon || '📖'}</div>
        <h3>${escapeHtml(c.name)}</h3>
        <p>${escapeHtml(c.description)}</p>
        <span class="card-category">${categoryNames[c.category] || c.category}</span>
      </div>
    `).join('');

    const filterContainer = document.getElementById('courseFilters');
    filterContainer.addEventListener('click', (e) => {
      if (!e.target.classList.contains('course-filter-btn')) return;
      filterContainer.querySelectorAll('.course-filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      const cat = e.target.dataset.filter;
      grid.querySelectorAll('.course-card').forEach(card => {
        card.style.display = (cat === 'all' || card.dataset.category === cat) ? '' : 'none';
      });
    });
  }

  // ─── Apply Form ───────────────────────────────────────────

  async function initApplyForm() {
    let currentStep = 1;
    const boards = await API.getBoards();
    const degreeOptions = await API.getDegreeOptions();

    // Populate board dropdown
    const boardSelect = document.getElementById('applyBoard');
    boardSelect.innerHTML = '<option value="">Select Board</option>' +
      boards.map(b => `<option value="${b}">${b}</option>`).join('');

    // Category change handler
    const categorySelect = document.getElementById('applyCategory');
    categorySelect.addEventListener('change', () => {
      const cat = categorySelect.value;
      document.getElementById('schoolFields').style.display = cat === 'school' ? '' : 'none';
      document.getElementById('juniorFields').style.display = cat === 'junior' ? '' : 'none';
      document.getElementById('degreeFields').style.display = cat === 'degree' ? '' : 'none';
      document.getElementById('boardGroup').style.display = (cat === 'school' || cat === 'junior') ? '' : 'none';

      if (cat === 'degree') {
        const degSelect = document.getElementById('applyDegree');
        degSelect.innerHTML = '<option value="">Select Course</option>' +
          degreeOptions.map(d => `<option value="${d.name}">${d.name}</option>`).join('');
      }
    });

    // Navigation
    document.getElementById('btnStep1Next').addEventListener('click', () => {
      const name = document.getElementById('applyName').value.trim();
      const mobile = document.getElementById('applyMobile').value.trim();
      if (!name || !mobile) { showPublicToast('Please fill in your name and mobile number'); return; }
      if (!/^\d{10}$/.test(mobile.replace(/\D/g, '').slice(-10))) {
        showPublicToast('Please enter a valid 10-digit mobile number'); return;
      }
      goToStep(2);
    });

    document.getElementById('btnStep2Back').addEventListener('click', () => goToStep(1));
    document.getElementById('btnStep2Next').addEventListener('click', () => {
      const cat = categorySelect.value;
      if (!cat) { showPublicToast('Please select a category'); return; }
      if ((cat === 'school' || cat === 'junior') && !boardSelect.value) {
        showPublicToast('Please select a board'); return;
      }
      if (cat === 'school' && !document.getElementById('applyClass').value) {
        showPublicToast('Please select a class'); return;
      }
      if (cat === 'junior') {
        if (!document.getElementById('applyJrClass').value) { showPublicToast('Please select class'); return; }
        if (!document.getElementById('applyStream').value) { showPublicToast('Please select stream'); return; }
      }
      if (cat === 'degree' && !document.getElementById('applyDegree').value) {
        showPublicToast('Please select a course'); return;
      }
      fillReview();
      goToStep(3);
    });

    document.getElementById('btnStep3Back').addEventListener('click', () => goToStep(2));
    document.getElementById('btnSubmit').addEventListener('click', submitApplication);

    function goToStep(step) {
      currentStep = step;
      document.querySelectorAll('.form-step-content').forEach((el, i) => {
        el.classList.toggle('active', i + 1 === step);
      });
      document.querySelectorAll('.form-step-indicator').forEach((el, i) => {
        el.classList.remove('active', 'done');
        if (i + 1 === step) el.classList.add('active');
        else if (i + 1 < step) el.classList.add('done');
      });
    }

    function fillReview() {
      const cat = categorySelect.value;
      const name = document.getElementById('applyName').value.trim();
      const mobile = document.getElementById('applyMobile').value.trim();
      const email = document.getElementById('applyEmail').value.trim();

      let courseInfo = '';
      let board = boardSelect.value;
      if (cat === 'school') {
        courseInfo = `Class ${document.getElementById('applyClass').value} — ${board}`;
      } else if (cat === 'junior') {
        courseInfo = `${document.getElementById('applyJrClass').value} — ${document.getElementById('applyStream').value} — ${board}`;
      } else if (cat === 'degree') {
        courseInfo = document.getElementById('applyDegree').value;
        board = 'N/A';
      }

      document.getElementById('reviewName').textContent = name;
      document.getElementById('reviewMobile').textContent = mobile;
      document.getElementById('reviewEmail').textContent = email || 'N/A';
      document.getElementById('reviewCategory').textContent =
        cat === 'school' ? 'School' : cat === 'junior' ? 'Junior College' : 'Degree College';
      document.getElementById('reviewCourse').textContent = courseInfo;
    }

    async function submitApplication() {
      const cat = categorySelect.value;
      let classOrCourse = '';
      let board = boardSelect.value;
      let stream = '';

      if (cat === 'school') {
        classOrCourse = 'Class ' + document.getElementById('applyClass').value;
      } else if (cat === 'junior') {
        classOrCourse = document.getElementById('applyJrClass').value;
        stream = document.getElementById('applyStream').value;
      } else if (cat === 'degree') {
        classOrCourse = document.getElementById('applyDegree').value;
        board = '';
      }

      const appData = {
        studentName: document.getElementById('applyName').value.trim(),
        mobile: document.getElementById('applyMobile').value.trim(),
        email: document.getElementById('applyEmail').value.trim(),
        category: cat === 'school' ? 'School' : cat === 'junior' ? 'Junior College' : 'Degree College',
        board: board,
        classOrCourse: classOrCourse,
        stream: stream
      };

      const res = await API.submitApplication(appData);

      if (res.ok) {
        document.getElementById('applyFormContent').style.display = 'none';
        document.getElementById('formSuccess').classList.add('show');
        showPublicToast('✅ Application submitted successfully!');

        setTimeout(() => {
          document.getElementById('applyFormContent').style.display = '';
          document.getElementById('formSuccess').classList.remove('show');
          document.getElementById('applyForm').reset();
          document.getElementById('schoolFields').style.display = 'none';
          document.getElementById('juniorFields').style.display = 'none';
          document.getElementById('degreeFields').style.display = 'none';
          document.getElementById('boardGroup').style.display = 'none';
          goToStep(1);
        }, 4000);
      } else {
        showPublicToast('❌ Failed to submit. Please try again.');
      }
    }
  }

  // ─── Results Section ──────────────────────────────────────

  async function renderResults() {
    const results = await API.getResults();
    const grid = document.getElementById('resultsGrid');

    // Normalize DB column names (snake_case → camelCase)
    const normalized = results.map(r => ({
      name: r.name,
      board: r.board,
      examClass: r.exam_class || r.examClass,
      year: r.year,
      percentage: r.percentage,
      details: r.details,
      imageUrl: r.image_url || r.imageUrl,
      category: r.category,
      stream: r.stream
    }));

    if (normalized.length === 0) {
      grid.innerHTML = '<div class="no-results"><div class="no-icon">🏆</div><p>Results will be displayed here soon.</p></div>';
      return;
    }

    function render(filtered) {
      if (filtered.length === 0) {
        grid.innerHTML = '<div class="no-results"><div class="no-icon">🔍</div><p>No results match the selected filters.</p></div>';
        return;
      }
      grid.innerHTML = filtered.map(r => `
        <div class="result-card reveal">
          <div class="result-avatar">
            ${r.imageUrl ? `<img src="${r.imageUrl}" alt="${escapeHtml(r.name)}">` : '🎓'}
          </div>
          <div class="result-name">${escapeHtml(r.name)}</div>
          <div class="result-meta">
            <span class="result-badge board">${escapeHtml(r.board)}</span>
            <span class="result-badge class">${escapeHtml(r.examClass)}</span>
            <span class="result-badge year">${r.year}</span>
          </div>
          <div class="result-percentage">${r.percentage}<span>%</span></div>
          ${r.details ? `<div class="result-details">${escapeHtml(r.details)}</div>` : ''}
        </div>
      `).join('');
      initScrollReveal();
    }

    render(normalized);

    const filterContainer = document.getElementById('resultsFilters');
    filterContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.result-filter-btn');
      if (!btn) return;
      const group = btn.closest('.result-filter-group');
      group.querySelectorAll('.result-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const catBtn = document.querySelector('#catFilterGroup .result-filter-btn.active');
      const boardBtn = document.querySelector('#boardFilterGroup .result-filter-btn.active');
      const cat = catBtn ? catBtn.dataset.filter : 'all';
      const board = boardBtn ? boardBtn.dataset.filter : 'all';

      let filtered = normalized;
      if (cat !== 'all') filtered = filtered.filter(r => r.category === cat);
      if (board !== 'all') filtered = filtered.filter(r => r.board === board);
      render(filtered);
    });
  }

  // ─── Govt Exams Section ───────────────────────────────────

  async function renderGovtExams() {
    const exams = await API.getGovtExams();
    const grid = document.getElementById('govtGrid');

    if (exams.length === 0) {
      grid.innerHTML = '<p style="text-align:center;color:var(--text-muted);grid-column:1/-1;">Exam prep details coming soon.</p>';
      return;
    }

    grid.innerHTML = exams.map(ex => `
      <div class="govt-card reveal">
        <div class="govt-icon">${ex.icon || '📋'}</div>
        <h3>${escapeHtml(ex.name)}</h3>
        <p class="govt-desc">${escapeHtml(ex.description)}</p>
        ${ex.details ? `<div class="govt-details">${escapeHtml(ex.details)}</div>` : ''}
      </div>
    `).join('');
  }

  // ─── Footer ───────────────────────────────────────────────

  async function renderFooter() {
    const info = await API.getSiteInfo();
    document.getElementById('footerCompanyName').textContent = info.companyName || 'BrightMinds Academy';
    document.getElementById('footerDesc').textContent = info.tagline || 'Empowering Students, Shaping Futures';
    document.getElementById('footerAddress').textContent = info.address || '';
    document.getElementById('footerPhone').textContent = info.phone || '';
    document.getElementById('footerEmail').textContent = info.email || '';

    if (info.socialFacebook && info.socialFacebook !== '#') {
      document.getElementById('socialFb').href = info.socialFacebook;
      document.getElementById('socialFb').style.display = '';
    }
    if (info.socialInstagram && info.socialInstagram !== '#') {
      document.getElementById('socialIg').href = info.socialInstagram;
      document.getElementById('socialIg').style.display = '';
    }
    if (info.socialYoutube && info.socialYoutube !== '#') {
      document.getElementById('socialYt').href = info.socialYoutube;
      document.getElementById('socialYt').style.display = '';
    }
    if (info.socialWhatsapp && info.socialWhatsapp !== '#') {
      document.getElementById('socialWa').href = `https://wa.me/${info.socialWhatsapp.replace(/\D/g, '')}`;
      document.getElementById('socialWa').style.display = '';
    }
  }

  // ─── Scroll Reveal ────────────────────────────────────────

  function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal:not(.visible)').forEach(el => observer.observe(el));
  }

  // ─── Helpers ──────────────────────────────────────────────

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function showPublicToast(message) {
    let toast = document.getElementById('publicToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'publicToast';
      toast.className = 'public-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
