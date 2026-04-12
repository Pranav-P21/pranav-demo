/**
 * data.js — API Client Layer
 * All frontend data operations go through this module.
 * Communicates with the Flask backend via REST API.
 */

const API = (() => {
  const BASE = '';  // Same origin, so no prefix needed

  // ─── HTTP Helpers ─────────────────────────────────────────

  async function request(method, url, body = null) {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'  // Include session cookie
    };
    if (body) options.body = JSON.stringify(body);

    try {
      const res = await fetch(BASE + url, options);
      const data = await res.json();
      if (!res.ok && res.status === 401) {
        // Unauthorized — redirect to login if on admin page
        if (window.location.pathname.includes('admin')) {
          if (typeof AdminApp !== 'undefined' && AdminApp.handleSessionExpired) {
            AdminApp.handleSessionExpired();
          }
        }
      }
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      console.error('API Error:', err);
      return { ok: false, status: 0, data: { error: 'Network error' } };
    }
  }

  async function get(url) { return request('GET', url); }
  async function post(url, body) { return request('POST', url, body); }
  async function put(url, body) { return request('PUT', url, body); }
  async function del(url) { return request('DELETE', url); }

  // ─── Auth ─────────────────────────────────────────────────

  async function login(username, password) {
    return post('/api/login', { username, password });
  }

  async function logout() {
    return post('/api/logout');
  }

  async function checkAuth() {
    const res = await get('/api/check-auth');
    return res.ok && res.data.authenticated;
  }

  async function changePassword(currentPassword, newPassword) {
    return post('/api/change-password', { current_password: currentPassword, new_password: newPassword });
  }

  // ─── Site Info ────────────────────────────────────────────

  async function getSiteInfo() {
    const res = await get('/api/site-info');
    return res.ok ? res.data : {};
  }

  async function updateSiteInfo(data) {
    return put('/api/site-info', data);
  }

  // ─── Courses ──────────────────────────────────────────────

  async function getCourses() {
    const res = await get('/api/courses');
    return res.ok ? res.data : [];
  }

  async function addCourse(data) {
    return post('/api/courses', data);
  }

  async function updateCourse(id, data) {
    return put(`/api/courses/${id}`, data);
  }

  async function deleteCourse(id) {
    return del(`/api/courses/${id}`);
  }

  // ─── Degree Options ───────────────────────────────────────

  async function getDegreeOptions() {
    const res = await get('/api/degree-options');
    return res.ok ? res.data : [];
  }

  async function addDegreeOption(name) {
    return post('/api/degree-options', { name });
  }

  async function deleteDegreeOption(id) {
    return del(`/api/degree-options/${id}`);
  }

  // ─── Results ──────────────────────────────────────────────

  async function getResults() {
    const res = await get('/api/results');
    return res.ok ? res.data : [];
  }

  async function addResult(data) {
    return post('/api/results', data);
  }

  async function updateResult(id, data) {
    return put(`/api/results/${id}`, data);
  }

  async function deleteResult(id) {
    return del(`/api/results/${id}`);
  }

  // ─── Govt Exams ───────────────────────────────────────────

  async function getGovtExams() {
    const res = await get('/api/govt-exams');
    return res.ok ? res.data : [];
  }

  async function addGovtExam(data) {
    return post('/api/govt-exams', data);
  }

  async function updateGovtExam(id, data) {
    return put(`/api/govt-exams/${id}`, data);
  }

  async function deleteGovtExam(id) {
    return del(`/api/govt-exams/${id}`);
  }

  // ─── Applications ────────────────────────────────────────

  async function getApplications() {
    const res = await get('/api/applications');
    return res.ok ? res.data : [];
  }

  async function submitApplication(data) {
    return post('/api/applications', data);
  }

  async function updateApplication(id, data) {
    return put(`/api/applications/${id}`, data);
  }

  async function deleteApplication(id) {
    return del(`/api/applications/${id}`);
  }

  // ─── Other ────────────────────────────────────────────────

  async function getBoards() {
    const res = await get('/api/boards');
    return res.ok ? res.data.map(b => b.name) : ['SSC', 'CBSE', 'ICSE', 'IGCSE'];
  }

  async function getStreams() {
    return ['Science', 'Commerce', 'Arts'];
  }

  async function getStats() {
    const res = await get('/api/stats');
    return res.ok ? res.data : {};
  }

  // ─── Public API ───────────────────────────────────────────
  return {
    login, logout, checkAuth, changePassword,
    getSiteInfo, updateSiteInfo,
    getCourses, addCourse, updateCourse, deleteCourse,
    getDegreeOptions, addDegreeOption, deleteDegreeOption,
    getResults, addResult, updateResult, deleteResult,
    getGovtExams, addGovtExam, updateGovtExam, deleteGovtExam,
    getApplications, submitApplication, updateApplication, deleteApplication,
    getBoards, getStreams, getStats
  };
})();
