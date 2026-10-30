import { findTemplate } from '../data/templates.js'
import { ACTIVE_PROJECT_KEY, apiRequest, hasSession } from '../lib/api.js'
import { DEFAULT_PROJECT, PROJECT_KEY, projectAreas, readProject, saveProject } from '../lib/project.js'
import { initEstimatePage, renderEstimatePanel } from './estimate.js'

const safe = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
const num = value => Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 2 })

export function renderEditorPage() {
  return `<main class="page-main editor-page planner-app">
    <section class="section-wrap planner-topbar">
      <div class="planner-heading"><div class="eyebrow"><span class="eyebrow-dot"></span> РАБОЧЕЕ ПРОСТРАНСТВО</div><h1>Планировка и смета</h1></div>
      <div class="planner-project-fields"><label class="sidebar-field"><span>Проект</span><input id="project-name" maxlength="64"></label><label class="sidebar-field"><span>Регион</span><select id="project-region"><option>Алматы</option><option>Астана</option><option>Шымкент</option><option>Караганда</option><option>Другой</option></select></label></div>
      <span class="project-save-state" id="project-save-state" role="status">Сохранено</span>
    </section>
    <section class="section-wrap planner-toolbar">
      <div class="room-switcher planner-room-switcher"><label class="sidebar-field"><span>Помещение</span><select id="room-select"></select></label><button class="button button-outline" id="add-room" type="button">＋ Добавить комнату</button></div>
      <div class="planner-toolbar-actions"><button class="editor-action" id="save-version" type="button">Сохранить версию</button><button class="button button-primary" id="open-estimate" type="button" aria-expanded="false">Открыть смету <span aria-hidden="true">↗</span></button></div>
    </section>
    <section class="section-wrap planner-shell">
      <div class="editor-panel plan-preview-panel planner-canvas-card">
        <div class="canvas-heading"><div><span class="gallery-kicker">2D-ПЛАН</span><h2 id="plan-room-title">Гостиная</h2></div><div class="canvas-heading-actions"><span class="editor-scale">масштаб по размерам</span><button class="editor-action" id="fullscreen-plan" type="button">На весь экран ⛶</button></div></div>
        <div class="plan-tools" role="toolbar" aria-label="Инструменты планировки">
          <button class="plan-tool is-active" type="button" data-plan-tool="select" aria-pressed="true"><svg aria-hidden="true" viewBox="0 0 16 16"><path d="M3 2l9 5-4 1.2L6.3 13z"/></svg> Выбор</button>
          <button class="plan-tool" type="button" data-plan-tool="room" aria-pressed="false"><svg aria-hidden="true" viewBox="0 0 16 16"><rect x="2" y="3" width="12" height="10" rx="1"/></svg> Комната</button>
          <button class="plan-tool" type="button" data-plan-tool="wall" aria-pressed="false"><svg aria-hidden="true" viewBox="0 0 16 16"><path d="M2.5 13.5l11-11"/></svg> Стена</button>
          <button class="plan-tool" type="button" data-plan-tool="door" aria-pressed="false"><svg aria-hidden="true" viewBox="0 0 16 16"><path d="M2 14h12M4 14V2.5h7V14"/><circle cx="9" cy="8.5" r=".6"/></svg> Дверь</button>
          <button class="plan-tool" type="button" data-plan-tool="eraser" aria-pressed="false"><svg aria-hidden="true" viewBox="0 0 16 16"><path d="M9.5 2.5l4 4-6.5 6.5H4l-2-2z"/><path d="M6 6l4 4M7.5 13.5H14"/></svg> Ластик</button>
          <span class="plan-tool-tip" id="plan-tool-tip" role="status">Выберите комнату или инструмент.</span>
        </div>
        <div class="plan-preview plan-preview-large" id="plan-preview"></div>
        <div class="area-cards" id="area-cards"></div>
        <p class="estimate-method">Перетаскивайте по сетке, чтобы нарисовать комнату или стену. Дверь добавляется щелчком по стене.</p>
      </div>
      <aside class="planner-inspector">
        <div class="editor-panel project-panel">
          <div class="editor-heading"><div><span class="gallery-kicker">ПАРАМЕТРЫ КОМНАТЫ</span><h2>Размеры</h2></div></div>
          <div class="room-dimensions"><label class="sidebar-field"><span>Название</span><input id="room-name" maxlength="40"></label><label class="sidebar-field"><span>Длина</span><span class="input-with-unit"><input id="room-length" type="number" min="0.1" max="50" step="0.1"><i>м</i></span></label><label class="sidebar-field"><span>Ширина</span><span class="input-with-unit"><input id="room-width" type="number" min="0.1" max="50" step="0.1"><i>м</i></span></label><label class="sidebar-field"><span>Высота</span><span class="input-with-unit"><input id="room-height" type="number" min="1.5" max="8" step="0.1"><i>м</i></span></label></div>
          <div class="editor-heading opening-heading"><div><span class="gallery-kicker">ОКНА И ДВЕРИ</span><h2>Проёмы</h2></div></div>
          <div class="opening-list" id="opening-list"></div>
          <form class="opening-form" id="opening-form"><label class="sidebar-field"><span>Тип</span><select id="opening-type"><option value="door">Дверь</option><option value="window">Окно</option></select></label><label class="sidebar-field"><span>Стена</span><select id="opening-wall"><option value="north">Северная</option><option value="east">Восточная</option><option value="south">Южная</option><option value="west">Западная</option></select></label><label class="sidebar-field"><span>Ширина</span><span class="input-with-unit"><input id="opening-width" type="number" min="0.2" max="8" step="0.1" value="0.9"><i>м</i></span></label><label class="sidebar-field"><span>Высота</span><span class="input-with-unit"><input id="opening-height" type="number" min="0.2" max="5" step="0.1" value="2.1"><i>м</i></span></label><button class="button button-outline" type="submit">＋ Добавить проём</button></form>
          <div class="room-actions"><button type="button" class="text-link" id="delete-room">Удалить комнату</button></div>
        </div>
        <div class="sidebar-panel version-panel"><span class="gallery-kicker">ИСТОРИЯ</span><h2>Сохранённые версии</h2><div id="version-list" class="version-list"></div></div>
      </aside>
    </section>
    <div class="estimate-backdrop" id="estimate-backdrop" hidden></div>
    <aside class="estimate-drawer" id="estimate-drawer" aria-label="Смета на материалы" hidden><div class="estimate-drawer-heading"><div><span class="gallery-kicker">РАСЧЁТ ПО ТЕКУЩЕМУ ПЛАНУ</span><h2>Смета</h2></div><button type="button" id="close-estimate" aria-label="Закрыть смету">×</button></div>${renderEstimatePanel()}</aside>
  </main>`
}

export function initEditorPage() {
  let project = readProject()
  project.walls ||= []
  const selectedTemplate = findTemplate(new URLSearchParams(location.search).get('template'))
  if (selectedTemplate) {
    localStorage.removeItem(ACTIVE_PROJECT_KEY)
    const shapeArea = selectedTemplate.rooms.reduce((total, item) => total + item.w * item.h, 0)
    const scale = Math.sqrt(selectedTemplate.area / shapeArea)
    const meters = value => Math.round(value * scale * 100) / 100
    const originX = Math.min(...selectedTemplate.rooms.map(item => item.x)), originY = Math.min(...selectedTemplate.rooms.map(item => item.y))
    project = { name: selectedTemplate.name, region: project.region, versions: [], walls: [], rooms: selectedTemplate.rooms.map((item, index) => ({ id: `template-${selectedTemplate.id}-${index}`, name: item.label, length: meters(item.w), width: meters(item.h), height: 2.7, planX: 0.8 + meters(item.x - originX), planY: 0.8 + meters(item.y - originY), openings: [] })) }
    saveProject(project)
    history.replaceState(null, '', '/editor.html')
  }
  let activeRoomId = project.rooms[0].id
  const $ = selector => document.querySelector(selector)
  const room = () => project.rooms.find(item => item.id === activeRoomId)
  let cloudSaveTimer
  const save = () => {
    saveProject(project)
    window.dispatchEvent(new CustomEvent('archplan:project-updated', { detail: project }))
    const cloudId = localStorage.getItem(ACTIVE_PROJECT_KEY)
    if (!hasSession() || !cloudId || project.id !== cloudId) {
      $('#project-save-state').textContent = 'Сохранено на устройстве'
      return
    }
    $('#project-save-state').textContent = 'Синхронизируем…'
    clearTimeout(cloudSaveTimer)
    cloudSaveTimer = setTimeout(async () => {
      try {
        await apiRequest(`/projects/${cloudId}`, { method: 'PUT', body: { project: { name: project.name, region: project.region, rooms: project.rooms, walls: project.walls } } })
        $('#project-save-state').textContent = 'Сохранено в аккаунте'
      } catch (error) { $('#project-save-state').textContent = `Сохранено локально · ${error.message}` }
    }, 700)
  }
  const roomPositions = () => {
    let cursorX = 0.8, cursorY = 0.8, rowHeight = 0
    return project.rooms.map(item => {
      if (Number.isFinite(item.planX) && Number.isFinite(item.planY)) return { x: item.planX, y: item.planY }
      if (cursorX > 0.8 && cursorX + item.length > 12) { cursorX = 0.8; cursorY += rowHeight + 1; rowHeight = 0 }
      const position = { x: cursorX, y: cursorY }
      cursorX += item.length + 1
      rowHeight = Math.max(rowHeight, item.width)
      return position
    })
  }
  const roomPosition = (item, index) => roomPositions()[index] || { x: 0.8, y: 0.8 }
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
    const unit = 80
    const boxes = project.rooms.map((item, index) => {
      const position = roomPosition(item, index)
      return { item, x: position.x * unit, y: position.y * unit, width: item.length * unit, height: item.width * unit }
    })
    const allX = [...boxes.flatMap(box => [box.x, box.x + box.width]), ...project.walls.flatMap(wall => [wall.x * unit, wall.x2 * unit])]
    const allY = [...boxes.flatMap(box => [box.y, box.y + box.height]), ...project.walls.flatMap(wall => [wall.y * unit, wall.y2 * unit])]
    let minX = Math.min(0, ...allX) - 48, minY = Math.min(0, ...allY) - 48
    let maxX = Math.max(8 * unit, ...allX) + 48, maxY = Math.max(6 * unit, ...allY) + 48
    // Match the viewBox to the canvas proportions so the grid fills it without empty bands.
    const frame = $('#plan-preview')
    const frameRatio = frame.clientWidth / frame.clientHeight
    if (frameRatio > 0 && Number.isFinite(frameRatio)) {
      const contentRatio = (maxX - minX) / (maxY - minY)
      if (frameRatio > contentRatio) { const extra = (maxY - minY) * frameRatio - (maxX - minX); minX -= extra / 2; maxX += extra / 2 }
      else { const extra = (maxX - minX) / frameRatio - (maxY - minY); minY -= extra / 2; maxY += extra / 2 }
    }
    const roomShapes = boxes.map(({ item, x, y, width, height }) => {
      const selected = item.id === activeRoomId
      const openings = item.openings.map((opening, index) => {
        const vertical = opening.wall === 'west' || opening.wall === 'east'
        const sideLength = vertical ? height : width
        const size = Math.min(Math.max(8, opening.width * unit), sideLength - 8)
        const fallbackOffset = (index + 1) / (item.openings.length + 1)
        const offset = Number.isFinite(opening.offset) ? opening.offset : fallbackOffset
        if (vertical) {
          const openY = y + Math.max(4, Math.min(sideLength - size - 4, offset * sideLength - size / 2))
          const edgeX = opening.wall === 'west' ? x : x + width
          return `<g class="plan-opening-hit ${opening.type}" data-opening-id="${safe(opening.id)}" data-room-id="${safe(item.id)}" data-wall="${opening.wall}"><rect x="${edgeX - 8}" y="${openY}" width="16" height="${size}" class="plan-opening ${opening.type}"/><path d="M ${edgeX} ${openY} v ${size} M ${edgeX} ${openY + size} A ${size} ${size} 0 0 0 ${edgeX + (opening.wall === 'west' ? size : -size)} ${openY + size}" class="plan-door-swing"/><rect x="${edgeX - 16}" y="${openY}" width="32" height="${size}" class="opening-hit-target"/></g>`
        }
        const openX = x + Math.max(4, Math.min(sideLength - size - 4, offset * sideLength - size / 2))
        const edgeY = opening.wall === 'north' ? y : y + height
        return `<g class="plan-opening-hit ${opening.type}" data-opening-id="${safe(opening.id)}" data-room-id="${safe(item.id)}" data-wall="${opening.wall}"><rect x="${openX}" y="${edgeY - 8}" width="${size}" height="16" class="plan-opening ${opening.type}"/><path d="M ${openX} ${edgeY} h ${size} M ${openX} ${edgeY} A ${size} ${size} 0 0 1 ${openX + size} ${edgeY + (opening.wall === 'north' ? size : -size)}" class="plan-door-swing"/><rect x="${openX}" y="${edgeY - 16}" width="${size}" height="32" class="opening-hit-target"/></g>`
      }).join('')
      return `<g class="plan-room-group ${selected ? 'is-selected' : ''}" data-room-id="${safe(item.id)}"><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="2" class="plan-room-shape"/><text x="${x + width / 2}" y="${y + height / 2 - 6}" class="plan-room-name">${safe(item.name)}</text><text x="${x + width / 2}" y="${y + height / 2 + 18}" class="plan-room-size">${num(item.length)} × ${num(item.width)} м</text>${openings}</g>`
    }).join('')
    const walls = project.walls.map(wall => `<line x1="${wall.x * unit}" y1="${wall.y * unit}" x2="${wall.x2 * unit}" y2="${wall.y2 * unit}" class="drawn-wall" data-wall-id="${safe(wall.id)}"/>`).join('')
    $('#plan-preview').innerHTML = `<svg viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}" role="img" aria-label="Планировка проекта с ${project.rooms.length} комнатами"><defs><pattern id="plan-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#e8e9e2" stroke-width="1"/></pattern><pattern id="plan-grid-bold" width="200" height="200" patternUnits="userSpaceOnUse"><rect width="200" height="200" fill="url(#plan-grid)"/><path d="M200 0H0V200" fill="none" stroke="#d3d9d0" stroke-width="1.5"/></pattern></defs><rect x="${minX}" y="${minY}" width="${maxX - minX}" height="${maxY - minY}" fill="url(#plan-grid-bold)"/>${roomShapes}${walls}<rect id="draw-preview-room" class="preview-room" hidden/><line id="draw-preview-wall" class="preview-wall" hidden/></svg>`
    const areas = projectAreas(project)
    $('#area-cards').innerHTML = `<div><span>Пол</span><strong>${num(areas.floor)} <i>м²</i></strong></div><div><span>Стены с вычетом проёмов</span><strong>${num(areas.walls)} <i>м²</i></strong></div><div><span>Потолок</span><strong>${num(areas.ceiling)} <i>м²</i></strong></div>`
    $('#version-list').innerHTML = project.versions.slice().reverse().map((version, index) => `<div class="version-item"><span>Версия ${version.number || project.versions.length - index} · ${safe(version.snapshot?.name || version.name || project.name)}</span><button type="button" data-restore-version="${safe(version.id || version.createdAt)}">Восстановить</button><small>${new Date(version.createdAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}</small></div>`).join('') || '<span class="version-empty">Пока нет сохранённых версий</span>'
  }
  $('#project-name').addEventListener('input', event => { project.name = event.target.value; save() })
  $('#project-name').addEventListener('change', render)
  $('#project-region').addEventListener('change', event => { project.region = event.target.value; save() })
  $('#room-select').addEventListener('change', event => { activeRoomId = event.target.value; render() })
  for (const [id, key, isNumber] of [['room-name','name',false],['room-length','length',true],['room-width','width',true],['room-height','height',true]]) {
    $(`#${id}`).addEventListener('input', event => { room()[key] = isNumber ? Number(event.target.value) : event.target.value; save() })
    $(`#${id}`).addEventListener('change', render)
  }
  $('#add-room').addEventListener('click', () => { const right = Math.max(...project.rooms.map((item, index) => roomPosition(item, index).x + item.length)); const item = { id: crypto.randomUUID(), name: `Комната ${project.rooms.length + 1}`, length: 4, width: 3, height: 2.7, planX: right + 1, planY: 0.8, openings: [] }; project.rooms.push(item); activeRoomId = item.id; save(); render() })
  $('#delete-room').addEventListener('click', () => { if (project.rooms.length <= 1) { $('#plan-tool-tip').textContent = 'В проекте должна остаться хотя бы одна комната.'; return } project.rooms = project.rooms.filter(item => item.id !== activeRoomId); activeRoomId = project.rooms[0].id; save(); render() })
  $('#opening-form').addEventListener('submit', event => { event.preventDefault(); const opening = { id: crypto.randomUUID(), type: $('#opening-type').value, wall: $('#opening-wall').value, width: Number($('#opening-width').value), height: Number($('#opening-height').value) }; if (!(opening.width > 0 && opening.height > 0)) return; room().openings.push(opening); save(); render() })
  $('#opening-list').addEventListener('click', event => { const button = event.target.closest('[data-remove-opening]'); if (!button) return; room().openings = room().openings.filter(item => item.id !== button.dataset.removeOpening); save(); render() })
  let planTool = 'select'
  let drawing = null
  const preview = $('#plan-preview')
  const unit = 80
  const setTool = tool => {
    planTool = tool
    document.querySelectorAll('[data-plan-tool]').forEach(button => {
      const active = button.dataset.planTool === tool
      button.classList.toggle('is-active', active)
      button.setAttribute('aria-pressed', String(active))
    })
    const tips = { select: 'Перетаскивайте комнаты и проёмы по плану.', room: 'Нажмите и перетащите, чтобы нарисовать комнату.', wall: 'Нажмите и перетащите, чтобы провести стену.', door: 'Щёлкните рядом с краем комнаты, чтобы добавить дверь.', eraser: 'Щёлкните по комнате, двери или стене, чтобы убрать её.' }
    $('#plan-tool-tip').textContent = tips[tool]
    const svg = $('#plan-preview svg')
    if (svg) { svg.dataset.tool = tool; svg.classList.toggle('is-erasing', tool === 'eraser') }
  }
  document.querySelectorAll('[data-plan-tool]').forEach(button => button.addEventListener('click', () => setTool(button.dataset.planTool)))
  const planPoint = event => {
    const svg = $('#plan-preview svg')
    if (!svg) return { x: 0, y: 0 }
    const point = svg.createSVGPoint(); point.x = event.clientX; point.y = event.clientY
    const local = point.matrixTransform(svg.getScreenCTM().inverse())
    return { x: local.x / unit, y: local.y / unit }
  }
  const roundPlan = value => Math.round(value * 20) / 20
  const roundOffset = value => Math.round(value * 10000) / 10000
  const openingOffset = (item, opening) => Number.isFinite(opening.offset) ? opening.offset : (item.openings.indexOf(opening) + 1) / (item.openings.length + 1)
  const availableOpeningOffset = (item, opening, requested) => {
    const sideLength = opening.wall === 'north' || opening.wall === 'south' ? item.length : item.width
    const min = opening.width / (2 * sideLength), max = 1 - min
    const clamp = value => Math.max(min, Math.min(max, value))
    const others = item.openings.filter(entry => entry !== opening && entry.wall === opening.wall)
    const gapFor = other => (opening.width + other.width) / (2 * sideLength)
    const clear = candidate => others.every(other => Math.abs(openingOffset(item, other) - candidate) >= gapFor(other))
    const candidates = [clamp(requested), ...others.flatMap(other => [clamp(openingOffset(item, other) - gapFor(other)), clamp(openingOffset(item, other) + gapFor(other))])]
    return candidates.filter(clear).sort((a, b) => Math.abs(a - requested) - Math.abs(b - requested))[0] ?? openingOffset(item, opening)
  }
  const findRoomAt = point => project.rooms.map((item, index) => ({ item, ...roomPosition(item, index) })).reverse().find(({ item, x, y }) => point.x >= x && point.x <= x + item.length && point.y >= y && point.y <= y + item.width)
  const addDoorAt = point => {
    const found = findRoomAt(point)
    if (!found) { $('#plan-tool-tip').textContent = 'Щёлкните рядом со стеной комнаты.'; return }
    const { item, x, y } = found
    const distances = [
      { wall: 'north', distance: Math.abs(point.y - y), along: point.x - x, length: item.length },
      { wall: 'south', distance: Math.abs(point.y - y - item.width), along: point.x - x, length: item.length },
      { wall: 'west', distance: Math.abs(point.x - x), along: point.y - y, length: item.width },
      { wall: 'east', distance: Math.abs(point.x - x - item.length), along: point.y - y, length: item.width },
    ].sort((a, b) => a.distance - b.distance)
    const edge = distances[0]
    const width = Number($('#opening-width').value) || 0.9
    const height = Number($('#opening-height').value) || 2.1
    if (edge.distance > 0.45) { $('#plan-tool-tip').textContent = 'Подведите курсор ближе к стене комнаты.'; return }
    if (width > edge.length || height >= item.height) { $('#plan-tool-tip').textContent = 'Дверь не помещается на этой стене.'; return }
    const existing = item.openings.filter(opening => opening.wall === edge.wall)
    if (existing.reduce((sum, opening) => sum + opening.width, 0) + width > edge.length) { $('#plan-tool-tip').textContent = 'На этой стене больше нет места для двери.'; return }
    let offset = Math.max(width / (2 * edge.length), Math.min(1 - width / (2 * edge.length), edge.along / edge.length))
    const step = width / edge.length
    const free = candidate => existing.every(opening => Math.abs(openingOffset(item, opening) - candidate) >= (width + opening.width) / (2 * edge.length))
    if (!free(offset)) {
      const candidates = Array.from({ length: Math.ceil(1 / step) }, (_, index) => Math.max(step / 2, Math.min(1 - step / 2, index * step)))
      const next = candidates.find(free)
      if (next === undefined) { $('#plan-tool-tip').textContent = 'На этой стене больше нет свободного места.'; return }
      offset = next
    }
    item.openings.push({ id: crypto.randomUUID(), type: 'door', wall: edge.wall, width, height, offset: roundOffset(offset) })
    activeRoomId = item.id; save(); render(); setTool('door')
  }
  preview.addEventListener('pointerdown', event => {
    if (planTool === 'select') {
      const openingElement = event.target.closest('[data-opening-id]')
      const roomElement = event.target.closest('[data-room-id]')
      const svg = event.target.closest('svg')
      if (!svg) return
      if (openingElement) {
        const item = project.rooms.find(entry => entry.id === openingElement.dataset.roomId)
        const opening = item?.openings.find(entry => entry.id === openingElement.dataset.openingId)
        if (!item || !opening) return
        const roomIndex = project.rooms.indexOf(item)
        const position = roomPosition(item, roomIndex)
        const vertical = opening.wall === 'west' || opening.wall === 'east'
        const sideLength = vertical ? item.width : item.length
        const startOffset = openingOffset(item, opening)
        const start = planPoint(event)
        drawing = { type: 'move-opening', start, item, opening, roomId: item.id, startOffset, offset: startOffset, sideLength, vertical, position, element: openingElement }
      } else if (roomElement) {
        const item = project.rooms.find(entry => entry.id === roomElement.dataset.roomId)
        if (!item) return
        const position = roomPosition(item, project.rooms.indexOf(item))
        drawing = { type: 'move-room', start: planPoint(event), item, roomId: item.id, startX: position.x, startY: position.y, element: roomElement }
      } else return
      event.preventDefault()
      svg.setPointerCapture?.(event.pointerId)
      drawing.element.classList.add('is-dragging')
      return
    }
    if (!['room', 'wall'].includes(planTool)) return
    const svg = event.target.closest('svg')
    if (!svg) return
    event.preventDefault()
    const point = planPoint(event)
    drawing = { tool: planTool, start: point, current: point }
    svg.setPointerCapture?.(event.pointerId)
    $(`#draw-preview-${planTool}`).hidden = false
  })
  preview.addEventListener('pointermove', event => {
    if (!drawing) return
    drawing.current = planPoint(event)
    if (drawing.type === 'move-room' || drawing.type === 'move-opening') drawing.moved ||= Math.hypot(drawing.current.x - drawing.start.x, drawing.current.y - drawing.start.y) > 0.05
    if (drawing.type === 'move-room') {
      drawing.element.setAttribute('transform', `translate(${(drawing.current.x - drawing.start.x) * unit} ${(drawing.current.y - drawing.start.y) * unit})`)
      return
    }
    if (drawing.type === 'move-opening') {
      const coordinate = drawing.vertical ? drawing.current.y - drawing.position.y : drawing.current.x - drawing.position.x
      const min = drawing.opening.width / (2 * drawing.sideLength)
      const max = 1 - min
      drawing.offset = availableOpeningOffset(drawing.item, drawing.opening, Math.max(min, Math.min(max, coordinate / drawing.sideLength)))
      const delta = (drawing.offset - drawing.startOffset) * drawing.sideLength * unit
      drawing.element.setAttribute('transform', drawing.vertical ? `translate(0 ${delta})` : `translate(${delta} 0)`)
      return
    }
    const shape = $(`#draw-preview-${drawing.tool}`)
    if (drawing.tool === 'room') {
      shape.setAttribute('x', Math.min(drawing.start.x, drawing.current.x) * unit)
      shape.setAttribute('y', Math.min(drawing.start.y, drawing.current.y) * unit)
      shape.setAttribute('width', Math.abs(drawing.start.x - drawing.current.x) * unit)
      shape.setAttribute('height', Math.abs(drawing.start.y - drawing.current.y) * unit)
    } else {
      shape.setAttribute('x1', drawing.start.x * unit); shape.setAttribute('y1', drawing.start.y * unit)
      shape.setAttribute('x2', drawing.current.x * unit); shape.setAttribute('y2', drawing.current.y * unit)
    }
  })
  preview.addEventListener('pointerup', event => {
    if (!drawing) {
      if (planTool === 'door') addDoorAt(planPoint(event))
      return
    }
    const draft = drawing; drawing = null
    const end = planPoint(event)
    if (draft.type === 'move-room') {
      activeRoomId = draft.roomId
      $('#room-select').value = activeRoomId
      if (draft.moved) {
        draft.item.planX = roundPlan(draft.startX + end.x - draft.start.x)
        draft.item.planY = roundPlan(draft.startY + end.y - draft.start.y)
        save()
      }
      render(); setTool('select')
      return
    }
    if (draft.type === 'move-opening') {
      activeRoomId = draft.roomId
      $('#room-select').value = activeRoomId
      if (draft.moved) { draft.opening.offset = roundOffset(draft.offset); save() }
      render(); setTool('select')
      return
    }
    if (draft.tool === 'room') {
      const x = Math.min(draft.start.x, end.x), y = Math.min(draft.start.y, end.y)
      const length = roundPlan(Math.abs(draft.start.x - end.x)), width = roundPlan(Math.abs(draft.start.y - end.y))
      if (length < 0.8 || width < 0.8) { $('#plan-tool-tip').textContent = 'Комната должна быть не меньше 0,8 × 0,8 м.'; render(); return }
      if (length > 100 || width > 100) { $('#plan-tool-tip').textContent = 'Размер комнаты не может превышать 100 м.'; render(); return }
      const item = { id: crypto.randomUUID(), name: `Комната ${project.rooms.length + 1}`, length, width, height: 2.7, planX: roundPlan(x), planY: roundPlan(y), openings: [] }
      project.rooms.push(item); activeRoomId = item.id
      $('#room-select').value = item.id
      save(); render(); setTool('select')
    } else {
      const length = Math.hypot(draft.start.x - end.x, draft.start.y - end.y)
      if (length < 0.25) { $('#plan-tool-tip').textContent = 'Стена должна быть длиннее 0,25 м.'; render(); return }
      project.walls.push({ id: crypto.randomUUID(), x: roundPlan(draft.start.x), y: roundPlan(draft.start.y), x2: roundPlan(end.x), y2: roundPlan(end.y), height: room().height })
      save(); render(); setTool('wall')
    }
  })
  preview.addEventListener('pointercancel', () => { drawing = null; render() })
  preview.addEventListener('click', event => {
    if (drawing) return
    const opening = event.target.closest('[data-opening-id]')
    const wall = event.target.closest('[data-wall-id]')
    const roomGroup = event.target.closest('[data-room-id]')
    if (planTool === 'eraser') {
      if (opening) {
        for (const item of project.rooms) item.openings = item.openings.filter(entry => entry.id !== opening.dataset.openingId)
      } else if (wall) project.walls = project.walls.filter(item => item.id !== wall.dataset.wallId)
      else if (roomGroup) {
        if (project.rooms.length <= 1) { $('#plan-tool-tip').textContent = 'В проекте должна остаться хотя бы одна комната.'; return }
        project.rooms = project.rooms.filter(item => item.id !== roomGroup.dataset.roomId)
        if (!project.rooms.some(item => item.id === activeRoomId)) activeRoomId = project.rooms[0].id
      } else return
      save(); render(); setTool('eraser')
    } else if (planTool === 'select' && roomGroup) {
      activeRoomId = roomGroup.dataset.roomId
      $('#room-select').value = activeRoomId
      render()
    }
  })
  $('#save-version').addEventListener('click', async () => {
    const cloudId = localStorage.getItem(ACTIVE_PROJECT_KEY)
    if (hasSession() && cloudId && project.id === cloudId) {
      try { const { version } = await apiRequest(`/projects/${cloudId}/versions`, { method: 'POST' }); project.versions.push(version) }
      catch (error) { $('#project-save-state').textContent = error.message; return }
    } else project.versions.push({ createdAt: new Date().toISOString(), rooms: structuredClone(project.rooms), walls: structuredClone(project.walls), name: project.name })
    save(); render()
  })
  $('#version-list').addEventListener('click', event => {
    const button = event.target.closest('[data-restore-version]'); if (!button) return
    const version = project.versions.find(item => (item.id || item.createdAt) === button.dataset.restoreVersion); if (!version) return
    const snapshot = version.snapshot || version
    project.rooms = structuredClone(snapshot.rooms); project.walls = structuredClone(snapshot.walls || []); project.name = snapshot.name || project.name; activeRoomId = project.rooms[0].id
    save(); render()
  })
  const drawer = $('#estimate-drawer')
  const backdrop = $('#estimate-backdrop')
  const estimateButton = $('#open-estimate')
  const toggleEstimate = open => {
    drawer.hidden = !open
    backdrop.hidden = !open
    estimateButton.setAttribute('aria-expanded', String(open))
    document.body.classList.toggle('estimate-is-open', open)
    history.replaceState(null, '', open ? '/editor.html?panel=estimate' : '/editor.html')
  }
  estimateButton.addEventListener('click', () => toggleEstimate(drawer.hidden))
  $('#close-estimate').addEventListener('click', () => toggleEstimate(false))
  backdrop.addEventListener('click', () => toggleEstimate(false))
  $('#fullscreen-plan').addEventListener('click', async () => {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await $('.planner-canvas-card').requestFullscreen()
  })
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !drawer.hidden) toggleEstimate(false) })
  window.addEventListener('storage', event => { if (event.key === PROJECT_KEY) Object.assign(project, readProject()) })
  render(); save()
  setTool('select')
  let frameSize = ''
  new ResizeObserver(([entry]) => {
    const size = `${Math.round(entry.contentRect.width)}x${Math.round(entry.contentRect.height)}`
    if (size === frameSize || drawing) return
    frameSize = size
    render(); setTool(planTool)
  }).observe(preview)
  initEstimatePage()
  if (new URLSearchParams(location.search).get('panel') === 'estimate') toggleEstimate(true)
  const cloudId = localStorage.getItem(ACTIVE_PROJECT_KEY)
  if (hasSession() && cloudId === project.id) {
    apiRequest(`/projects/${cloudId}/versions`).then(({ items }) => { project.versions = items; render() }).catch(() => {})
  }
}
