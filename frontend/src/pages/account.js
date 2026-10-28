import { apiRequest, ACTIVE_PROJECT_KEY, TOKEN_KEY } from '../lib/api.js'
import { readProject, saveProject } from '../lib/project.js'

const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export function renderAccountPage() {
  return `<main class="page-main account-page"><section class="page-hero section-wrap"><div class="eyebrow"><span class="eyebrow-dot"></span> АККАУНТ И ПРОЕКТЫ</div><h1>Ваши проекты<br><span class="serif-accent">в одном месте.</span></h1><p>Создайте аккаунт, чтобы хранить планы и сметы между устройствами.</p></section><section class="section-wrap account-content"><div id="account-panel" class="editor-panel account-panel"></div><p id="account-status" class="export-status" role="status" aria-live="polite"></p></section></main>`
}

export function initAccountPage() {
  const panel = document.querySelector('#account-panel')
  const status = document.querySelector('#account-status')

  function showAuth(mode = 'login') {
    panel.innerHTML = `<div class="account-tabs"><button type="button" data-auth-mode="login" class="${mode === 'login' ? 'is-active' : ''}">Войти</button><button type="button" data-auth-mode="register" class="${mode === 'register' ? 'is-active' : ''}">Создать аккаунт</button></div><form id="auth-form" class="account-form"><label class="sidebar-field"><span>Электронная почта</span><input type="email" name="email" autocomplete="email" required maxlength="254"></label><label class="sidebar-field"><span>Пароль</span><input type="password" name="password" autocomplete="${mode === 'register' ? 'new-password' : 'current-password'}" required minlength="10" maxlength="200"><small>Не менее 10 символов</small></label><button type="submit" class="button button-primary">${mode === 'register' ? 'Создать аккаунт' : 'Войти'}</button></form>`
    panel.dataset.mode = mode
  }

  async function showDashboard() {
    const [{ user }, { items }] = await Promise.all([apiRequest('/auth/me'), apiRequest('/projects')])
    panel.innerHTML = `<div class="account-dashboard-heading"><div><span class="gallery-kicker">ВЫ ВОШЛИ КАК</span><h2>${escapeHtml(user.email)}</h2></div><button id="logout" class="editor-action" type="button">Выйти</button></div><div class="account-project-actions"><button id="save-current" class="button button-primary" type="button">Сохранить текущий проект в аккаунт</button><a class="button button-outline" href="/editor.html">Создать или изменить проект</a></div><div class="account-project-list"><h3>Проекты</h3>${items.length ? items.map(item => `<article class="account-project-row"><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.region)} · ${item.rooms} пом. · обновлён ${new Date(item.updatedAt).toLocaleDateString('ru-RU')}</small></div><button type="button" class="button button-outline" data-open-project="${escapeHtml(item.id)}">Открыть</button></article>`).join('') : '<p>Пока нет проектов в аккаунте. Сохраните текущий план кнопкой выше.</p>'}</div>`
  }

  if (localStorage.getItem(TOKEN_KEY)) {
    showDashboard().catch(error => { status.textContent = error.message; showAuth() })
  } else showAuth()

  panel.addEventListener('click', async event => {
    const modeButton = event.target.closest('[data-auth-mode]')
    if (modeButton) { showAuth(modeButton.dataset.authMode); return }
    if (event.target.closest('#logout')) {
      try { await apiRequest('/auth/logout', { method: 'POST' }) } catch { /* Local session is cleared even if the server has expired it. */ }
      localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(ACTIVE_PROJECT_KEY); status.textContent = 'Вы вышли из аккаунта.'; showAuth(); return
    }
    if (event.target.closest('#save-current')) {
      const button = event.target.closest('#save-current')
      button.disabled = true; status.textContent = 'Сохраняем проект…'
      try {
        const current = readProject()
        const linkedId = localStorage.getItem(ACTIVE_PROJECT_KEY)
        const isLinked = current.id && linkedId === current.id
        const cloudProject = { name: current.name, region: current.region, rooms: current.rooms, walls: current.walls || [] }
        const result = await apiRequest(isLinked ? `/projects/${linkedId}` : '/projects', { method: isLinked ? 'PUT' : 'POST', body: { project: cloudProject } })
        localStorage.setItem(ACTIVE_PROJECT_KEY, result.project.id)
        const project = result.project
        saveProject({ ...readProject(), ...project, versions: readProject().versions })
        status.textContent = 'Проект сохранён в аккаунте.'; await showDashboard()
      } catch (error) { status.textContent = error.message; button.disabled = false }
      return
    }
    const open = event.target.closest('[data-open-project]')
    if (open) {
      status.textContent = 'Загружаем проект…'
      try {
        const { project } = await apiRequest(`/projects/${open.dataset.openProject}`)
        localStorage.setItem(ACTIVE_PROJECT_KEY, project.id)
        saveProject({ ...project, versions: [] })
        location.href = '/editor.html'
      } catch (error) { status.textContent = error.message }
    }
  })

  panel.addEventListener('submit', async event => {
    if (event.target.id !== 'auth-form') return
    event.preventDefault()
    const form = event.target
    const mode = panel.dataset.mode
    const submit = form.querySelector('[type="submit"]')
    submit.disabled = true; status.textContent = mode === 'register' ? 'Создаём аккаунт…' : 'Входим…'
    try {
      const data = Object.fromEntries(new FormData(form).entries())
      const { token } = await apiRequest(`/auth/${mode}`, { method: 'POST', body: data })
      localStorage.setItem(TOKEN_KEY, token)
      status.textContent = 'Успешный вход.'; await showDashboard()
    } catch (error) { status.textContent = error.message; submit.disabled = false }
  })
}
