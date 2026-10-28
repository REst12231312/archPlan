import { findTemplate } from '../data/templates.js'
import { ACTIVE_PROJECT_KEY, apiRequest, hasSession } from '../lib/api.js'
import { DEFAULT_PROJECT, PROJECT_KEY, projectAreas, readProject, saveProject } from '../lib/project.js'

const safe = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
const num = value => Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 2 })

export function renderEditorPage() {
  return `<main class="page-main editor-page project-editor">
    <section class="editor-page-heading section-wrap"><div><div class="eyebrow"><span class="eyebrow-dot"></span> ПЛАН ПРОЕКТА</div><h1>Размеры, планировка<br><span class="serif-accent">и проёмы.</span></h1><p>Задайте размеры комнаты. Площади для сметы обновятся автоматически.</p></div><a class="text-link" href="/estimate.html">Открыть смету <span aria-hidden="true">↗</span></a></section>
    <section class="section-wrap project-editor-grid">
      <div class="editor-panel project-panel">
        <div class="editor-heading"><div><span class="gallery-kicker">ПРОЕКТ</span><h2>Данные помещения</h2></div><span class="project-save-state" id="project-save-state" role="status">Сохранено</span></div>
        <div class="project-fields"><label class="sidebar-field"><span>Название проекта</span><input id="project-name" maxlength="64"></label><label class="sidebar-field"><span>Регион</span><select id="project-region"><option>Алматы</option><option>Астана</option><option>Шымкент</option><option>Караганда</option><option>Другой</option></select></label></div>
        <div class="room-switcher"><label class="sidebar-field"><span>Помещение</span><select id="room-select"></select></label><button class="button button-outline" id="add-room" type="button">＋ Добавить комнату</button></div>
        <div class="room-dimensions"><label class="sidebar-field"><span>Название</span><input id="room-name" maxlength="40"></label><label class="sidebar-field"><span>Длина</span><span class="input-with-unit"><input id="room-length" type="number" min="0.1" max="50" step="0.1"><i>м</i></span></label><label class="sidebar-field"><span>Ширина</span><span class="input-with-unit"><input id="room-width" type="number" min="0.1" max="50" step="0.1"><i>м</i></span></label><label class="sidebar-field"><span>Высота стен</span><span class="input-with-unit"><input id="room-height" type="number" min="1.5" max="8" step="0.1"><i>м</i></span></label></div>
        <div class="editor-heading opening-heading"><div><span class="gallery-kicker">ОКНА И ДВЕРИ</span><h2>Проёмы вычитаются из площади стен</h2></div></div>
        <div class="opening-list" id="opening-list"></div>
        <form class="opening-form" id="opening-form"><label class="sidebar-field"><span>Тип</span><select id="opening-type"><option value="door">Дверь</option><option value="window">Окно</option></select></label><label class="sidebar-field"><span>Стена</span><select id="opening-wall"><option value="north">Северная</option><option value="east">Восточная</option><option value="south">Южная</option><option value="west">Западная</option></select></label><label class="sidebar-field"><span>Ширина</span><span class="input-with-unit"><input id="opening-width" type="number" min="0.2" max="8" step="0.1" value="0.9"><i>м</i></span></label><label class="sidebar-field"><span>Высота</span><span class="input-with-unit"><input id="opening-height" type="number" min="0.2" max="5" step="0.1" value="2.1"><i>м</i></span></label><button class="button button-outline" type="submit">Добавить проём</button></form>
        <div class="room-actions"><button type="button" class="text-link" id="delete-room">Удалить помещение</button><button type="button" class="editor-action" id="save-version">Сохранить версию</button></div>
      </div>
      <aside class="project-side-column"><div class="editor-panel plan-preview-panel"><div class="editor-heading"><div><span class="gallery-kicker">2D-ПЛАН</span><h2 id="plan-room-title">Гостиная</h2></div><span class="editor-scale">размеры в метрах</span></div><div class="plan-preview" id="plan-preview"></div><div class="area-cards" id="area-cards"></div><p class="estimate-method">Расчёт стен: периметр комнаты × высота − площадь окон и дверей. Межкомнатные стены пока не учитываются.</p></div>
        <div class="sidebar-panel version-panel"><span class="gallery-kicker">ИСТОРИЯ ПРОЕКТА</span><h2>Сохранённые версии</h2><div id="version-list" class="version-list"></div><p>Черновик сохраняется автоматически в этом браузере.</p></div><a class="button button-primary project-estimate-cta" href="/estimate.html">Перейти к смете <span aria-hidden="true">→</span></a></aside>
    </section>
  </main>`
}

export function initEditorPage() {
  let project = readProject()
  const selectedTemplate = findTemplate(new URLSearchParams(location.search).get('template'))
  if (selectedTemplate) {
    localStorage.removeItem(ACTIVE_PROJECT_KEY)
    const shapeArea = selectedTemplate.rooms.reduce((total, item) => total + item.w * item.h, 0)
    const scale = Math.sqrt(selectedTemplate.area / shapeArea)
    project = { name: selectedTemplate.name, region: project.region, versions: [], rooms: selectedTemplate.rooms.map((item, index) => ({ id: `template-${selectedTemplate.id}-${index}`, name: item.label, length: Math.round(item.w * scale * 100) / 100, width: Math.round(item.h * scale * 100) / 100, height: 2.7, openings: [] })) }
    saveProject(project)
    history.replaceState(null, '', '/editor.html')
  }
  let activeRoomId = project.rooms[0].id
  const $ = selector => document.querySelector(selector)
  const room = () => project.rooms.find(item => item.id === activeRoomId)
  let cloudSaveTimer
  const save = () => {
    saveProject(project)
    const cloudId = localStorage.getItem(ACTIVE_PROJECT_KEY)
    if (!hasSession() || !cloudId || project.id !== cloudId) {
      $('#project-save-state').textContent = 'Сохранено на устройстве'
      return
    }
    $('#project-save-state').textContent = 'Синхронизируем…'
    clearTimeout(cloudSaveTimer)
    cloudSaveTimer = setTimeout(async () => {
      try {
        await apiRequest(`/projects/${cloudId}`, { method: 'PUT', body: { project } })
        $('#project-save-state').textContent = 'Сохранено в аккаунте'
      } catch (error) { $('#project-save-state').textContent = `Сохранено локально · ${error.message}` }
    }, 700)
  }
  const render = () => {
    const current = room()
    $('#project-name').value = project.name
    $('#project-region').value = project.region
    $('#room-select').innerHTML = project.rooms.map(item => `<option value="${safe(item.id)}">${safe(item.name)}</option>`).join('')
    $('#room-select').value = activeRoomId
    $('#room-name').value = current.name
    $('#room-length').value = current.length
    $('#room-width').value = current.width
    $('#room-height').value = current.height
    $('#plan-room-title').textContent = current.name
    $('#opening-list').innerHTML = current.openings.map(item => `<div class="opening-row"><span class="opening-symbol ${item.type}">${item.type === 'door' ? '↗' : '▤'}</span><span><strong>${item.type === 'door' ? 'Дверь' : 'Окно'} · ${safe({north:'северная',east:'восточная',south:'южная',west:'западная'}[item.wall])}</strong><small>${num(item.width)} × ${num(item.height)} м · ${num(item.width * item.height)} м²</small></span><button type="button" aria-label="Удалить проём" data-remove-opening="${safe(item.id)}">×</button></div>`).join('') || '<p class="empty-openings">Добавьте окна и двери, чтобы точнее рассчитать отделку стен.</p>'
    const scale = Math.min(360 / current.length, 240 / current.width)
    const width = current.length * scale
    const height = current.width * scale
    const openings = current.openings.map((item, index) => {
      const vertical = item.wall === 'west' || item.wall === 'east'
      const size = Math.min((vertical ? height : width) - 20, item.width * scale)
      if (vertical) return `<rect x="${item.wall === 'west' ? 16 : width + 16}" y="${28 + (index * 42) % Math.max(1, height - size)}" width="8" height="${size}" rx="2" class="plan-opening ${item.type}"/>`
      const x = 28 + (index * 48) % Math.max(1, width - size)
      return `<rect x="${x}" y="${item.wall === 'north' ? 15 : height + 15}" width="${size}" height="8" rx="2" class="plan-opening ${item.type}"/>`
    }).join('')
    $('#plan-preview').innerHTML = `<svg viewBox="0 0 ${width + 52} ${height + 55}" role="img" aria-label="План комнаты ${safe(current.name)}, ${num(current.length)} на ${num(current.width)} метров"><defs><pattern id="plan-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#e8e9e2" stroke-width=".8"/></pattern></defs><rect width="100%" height="100%" fill="url(#plan-grid)"/><rect x="20" y="15" width="${width}" height="${height}" class="plan-room-shape"/><g class="plan-room-label"><text x="${width / 2 + 20}" y="${height / 2 + 12}">${safe(current.name)}</text><text x="${width / 2 + 20}" y="${height / 2 + 34}">${num(current.length)} × ${num(current.width)} м</text></g>${openings}<text x="${width / 2 + 20}" y="${height + 43}" class="plan-dimension">${num(current.length)} м</text><text transform="translate(10 ${height / 2 + 15}) rotate(-90)" class="plan-dimension">${num(current.width)} м</text></svg>`
    const areas = projectAreas(project)
    $('#area-cards').innerHTML = `<div><span>Пол</span><strong>${num(areas.floor)} <i>м²</i></strong></div><div><span>Стены с вычетом проёмов</span><strong>${num(areas.walls)} <i>м²</i></strong></div><div><span>Потолок</span><strong>${num(areas.ceiling)} <i>м²</i></strong></div>`
    $('#version-list').innerHTML = project.versions.slice().reverse().map((version, index) => `<div class="version-item"><span>Версия ${version.number || project.versions.length - index} · ${safe(version.snapshot?.name || version.name || project.name)}</span><button type="button" data-restore-version="${safe(version.id || version.createdAt)}">Восстановить</button><small>${new Date(version.createdAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}</small></div>`).join('') || '<span class="version-empty">Пока нет сохранённых версий</span>'
  }
  $('#project-name').addEventListener('input', event => { project.name = event.target.value; save(); render() })
  $('#project-region').addEventListener('change', event => { project.region = event.target.value; save() })
  $('#room-select').addEventListener('change', event => { activeRoomId = event.target.value; render() })
  for (const [id, key, isNumber] of [['room-name','name',false],['room-length','length',true],['room-width','width',true],['room-height','height',true]]) $(`#${id}`).addEventListener('input', event => { room()[key] = isNumber ? Number(event.target.value) : event.target.value; save(); render() })
  $('#add-room').addEventListener('click', () => { const item = { id: crypto.randomUUID(), name: `Комната ${project.rooms.length + 1}`, length: 4, width: 3, height: 2.7, openings: [] }; project.rooms.push(item); activeRoomId = item.id; save(); render() })
  $('#delete-room').addEventListener('click', () => { if (project.rooms.length <= 1) { project.rooms = structuredClone(DEFAULT_PROJECT.rooms); activeRoomId = project.rooms[0].id } else { project.rooms = project.rooms.filter(item => item.id !== activeRoomId); activeRoomId = project.rooms[0].id } save(); render() })
  $('#opening-form').addEventListener('submit', event => { event.preventDefault(); const opening = { id: crypto.randomUUID(), type: $('#opening-type').value, wall: $('#opening-wall').value, width: Number($('#opening-width').value), height: Number($('#opening-height').value) }; if (!(opening.width > 0 && opening.height > 0)) return; room().openings.push(opening); save(); render() })
  $('#opening-list').addEventListener('click', event => { const button = event.target.closest('[data-remove-opening]'); if (!button) return; room().openings = room().openings.filter(item => item.id !== button.dataset.removeOpening); save(); render() })
  $('#save-version').addEventListener('click', async () => {
    const cloudId = localStorage.getItem(ACTIVE_PROJECT_KEY)
    if (hasSession() && cloudId && project.id === cloudId) {
      try { const { version } = await apiRequest(`/projects/${cloudId}/versions`, { method: 'POST' }); project.versions.push(version) }
      catch (error) { $('#project-save-state').textContent = error.message; return }
    } else project.versions.push({ createdAt: new Date().toISOString(), rooms: structuredClone(project.rooms), name: project.name })
    save(); render()
  })
  $('#version-list').addEventListener('click', event => {
    const button = event.target.closest('[data-restore-version]'); if (!button) return
    const version = project.versions.find(item => (item.id || item.createdAt) === button.dataset.restoreVersion); if (!version) return
    const snapshot = version.snapshot || version
    project.rooms = structuredClone(snapshot.rooms); project.name = snapshot.name || project.name; activeRoomId = project.rooms[0].id; save(); render()
  })
  window.addEventListener('storage', event => { if (event.key === PROJECT_KEY) Object.assign(project, readProject()) })
  render(); save()
  const cloudId = localStorage.getItem(ACTIVE_PROJECT_KEY)
  if (hasSession() && cloudId === project.id) {
    apiRequest(`/projects/${cloudId}/versions`).then(({ items }) => { project.versions = items; render() }).catch(() => {})
  }
}
