import { findTemplate } from '../data/templates.js'

const AREA_KEY = 'archplan:floor-area'
const CUSTOM_PLAN_KEY = 'archplan:plan:custom'

export function renderEditorPage() {
  return `
    <main class="page-main editor-page">
      <section class="editor-page-heading section-wrap">
        <div><div class="eyebrow"><span class="eyebrow-dot"></span> КОНСТРУКТОР ПЛАНИРОВОК</div><h1 id="project-title">Новый эскиз</h1><p>Добавляйте помещения и внутренние стены. Эскиз можно скачать или продолжить позже.</p></div>
        <a class="text-link" href="/templates.html">Выбрать другой шаблон <span aria-hidden="true">↗</span></a>
      </section>
      <section class="editor-workspace section-wrap">
        <div class="editor-panel">
          <div class="editor-heading"><div><span class="gallery-kicker">РАБОЧЕЕ ПОЛЕ</span><h2 id="editor-subtitle">Чистый лист</h2></div><span class="editor-room-count" id="room-count">Помещений: 0</span></div>
          <div class="editor-toolbar" role="toolbar" aria-label="Инструменты редактора">
            <div class="tool-group"><button type="button" class="tool-button is-active" data-tool="wall" aria-pressed="true"><span aria-hidden="true">／</span> Стена</button><button type="button" class="tool-button" data-tool="room" aria-pressed="false"><span aria-hidden="true">▱</span> Комната</button><button type="button" class="tool-button" data-tool="erase" aria-pressed="false"><span aria-hidden="true">⌫</span> Удалить</button></div>
            <div class="tool-group tool-actions"><button type="button" class="editor-action" data-action="undo" disabled>↶ Отменить</button><button type="button" class="editor-action" data-action="clear">Очистить</button><button type="button" class="editor-download" data-action="download-pdf">Скачать PDF <span aria-hidden="true">↓</span></button></div>
          </div>
          <div class="editor-canvas-wrap"><svg class="drawing-board" id="drawing-board" viewBox="0 0 600 400" role="group" aria-label="Рабочая область планировки. Перетаскивайте указатель, чтобы нарисовать стену или комнату."><defs><pattern id="editor-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#e5e8e0" stroke-width="1"/></pattern><pattern id="editor-grid-bold" width="100" height="100" patternUnits="userSpaceOnUse"><rect width="100" height="100" fill="url(#editor-grid)"/><path d="M100 0H0V100" fill="none" stroke="#d5dbd1" stroke-width="1.2"/></pattern></defs><rect class="board-background" x="0" y="0" width="600" height="400" fill="url(#editor-grid-bold)"/><g id="drawing-items"></g><g id="drawing-preview"></g></svg></div>
          <div class="editor-footer"><p id="editor-hint">Перетащите указатель по сетке, чтобы провести стену.</p><span class="editor-scale">Сетка · условный шаг</span></div><p class="export-status" id="pdf-export-status" role="status" aria-live="polite"></p>
        </div>
        <aside class="editor-sidebar">
          <div class="sidebar-panel"><span class="gallery-kicker">ПАРАМЕТРЫ ПРОЕКТА</span><label class="sidebar-field"><span>Площадь для сметы</span><span class="input-with-unit"><input id="project-area" type="number" min="1" max="1000" step="0.1" value="38" inputmode="decimal"><i>м²</i></span></label><p>Эскиз пока не связан с масштабом. Укажите фактическую площадь для расчёта материалов.</p></div>
          <div class="sidebar-panel sidebar-summary"><span class="gallery-kicker">СЛЕДУЮЩИЙ ШАГ</span><h2>Оцените покупки</h2><p>Укажите цены и получите ориентировочный расход напольного покрытия, краски и грунтовки.</p><a class="button button-primary" href="/estimate.html">Перейти к смете <span aria-hidden="true">→</span></a></div>
          <p class="draft-note"><span aria-hidden="true">✓</span> Эскиз сохраняется в этом браузере автоматически.</p>
        </aside>
      </section>
    </main>`
}

export function initEditorPage() {
  const board = document.querySelector('#drawing-board')
  const itemsLayer = document.querySelector('#drawing-items')
  const previewLayer = document.querySelector('#drawing-preview')
  const roomCount = document.querySelector('#room-count')
  const undoButton = document.querySelector('[data-action="undo"]')
  const areaInput = document.querySelector('#project-area')
  const queryTemplate = findTemplate(new URLSearchParams(location.search).get('template'))
  const storageKey = queryTemplate ? `archplan:plan:${queryTemplate.id}` : CUSTOM_PLAN_KEY

  let savedPlan = null
  try {
    savedPlan = JSON.parse(localStorage.getItem(storageKey) || 'null')
  } catch {
    savedPlan = null
  }
  let planItems = savedPlan?.items || queryTemplate?.rooms.map(room => ({ kind: 'room', ...room })) || []
  let history = []
  let activeTool = 'wall'
  let drawStart = null
  let previewElement = null
  let area = Number(savedPlan?.area) || queryTemplate?.area || Number(localStorage.getItem(AREA_KEY)) || 38

  areaInput.value = area
  document.querySelector('#project-title').textContent = queryTemplate?.name || savedPlan?.title || 'Новый эскиз'
  document.querySelector('#editor-subtitle').textContent = queryTemplate ? `${queryTemplate.name} · ${queryTemplate.area} м²` : 'Чистый лист'

  function saveDraft() {
    const title = queryTemplate?.name || 'Мой эскиз'
    const draft = { title, area: Number(areaInput.value) || 0, items: planItems }
    localStorage.setItem(storageKey, JSON.stringify(draft))
    const parsedArea = Number(areaInput.value)
    if (parsedArea > 0) localStorage.setItem(AREA_KEY, String(parsedArea))
  }

  function renderPlan() {
    itemsLayer.innerHTML = planItems.map((item, index) => {
      if (item.kind === 'room') {
        const cx = item.x + item.w / 2
        const cy = item.y + item.h / 2
        return `<g class="plan-entity" data-index="${index}"><rect class="drawn-room" x="${item.x}" y="${item.y}" width="${item.w}" height="${item.h}"/><text class="drawn-room-label" x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle">${item.label}</text></g>`
      }
      return `<line class="drawn-wall plan-entity" data-index="${index}" x1="${item.x1}" y1="${item.y1}" x2="${item.x2}" y2="${item.y2}"/>`
    }).join('')
    roomCount.textContent = `Помещений: ${planItems.filter(item => item.kind === 'room').length}`
  }

  function snapshot() {
    history.push(JSON.stringify(planItems))
    undoButton.disabled = false
  }

  function setTool(tool) {
    activeTool = tool
    document.querySelectorAll('.tool-button').forEach(button => {
      const selected = button.dataset.tool === tool
      button.classList.toggle('is-active', selected)
      button.setAttribute('aria-pressed', String(selected))
    })
    document.querySelector('#editor-hint').textContent = tool === 'wall'
      ? 'Перетащите указатель по сетке, чтобы провести стену.'
      : tool === 'room'
        ? 'Перетащите указатель по сетке, чтобы обозначить комнату.'
        : 'Нажмите на комнату или стену, чтобы удалить её.'
    board.classList.toggle('is-erasing', tool === 'erase')
  }

  function pointFromEvent(event) {
    const point = board.createSVGPoint()
    point.x = event.clientX
    point.y = event.clientY
    const position = point.matrixTransform(board.getScreenCTM().inverse())
    return {
      x: Math.max(0, Math.min(600, Math.round(position.x / 20) * 20)),
      y: Math.max(0, Math.min(400, Math.round(position.y / 20) * 20)),
    }
  }

  function updatePreview(point) {
    if (!drawStart || !previewElement) return
    if (activeTool === 'wall') {
      const dx = point.x - drawStart.x
      const dy = point.y - drawStart.y
      const end = Math.abs(dx) >= Math.abs(dy) ? { x: point.x, y: drawStart.y } : { x: drawStart.x, y: point.y }
      previewElement.setAttribute('x2', end.x)
      previewElement.setAttribute('y2', end.y)
    } else {
      previewElement.setAttribute('x', Math.min(drawStart.x, point.x))
      previewElement.setAttribute('y', Math.min(drawStart.y, point.y))
      previewElement.setAttribute('width', Math.abs(point.x - drawStart.x))
      previewElement.setAttribute('height', Math.abs(point.y - drawStart.y))
    }
  }

  function finishDrawing(event) {
    if (!drawStart) return
    updatePreview(pointFromEvent(event))
    if (activeTool === 'wall') {
      const wall = {
        kind: 'wall',
        x1: Number(previewElement.getAttribute('x1')),
        y1: Number(previewElement.getAttribute('y1')),
        x2: Number(previewElement.getAttribute('x2')),
        y2: Number(previewElement.getAttribute('y2')),
      }
      if (wall.x1 !== wall.x2 || wall.y1 !== wall.y2) {
        snapshot()
        planItems.push(wall)
      }
    } else {
      const x = Number(previewElement.getAttribute('x'))
      const y = Number(previewElement.getAttribute('y'))
      const w = Number(previewElement.getAttribute('width'))
      const h = Number(previewElement.getAttribute('height'))
      if (w >= 20 && h >= 20) {
        snapshot()
        const roomNumber = planItems.filter(item => item.kind === 'room').length + 1
        planItems.push({ kind: 'room', x, y, w, h, label: `Комната ${roomNumber}` })
      }
    }
    drawStart = null
    previewElement = null
    previewLayer.replaceChildren()
    renderPlan()
    saveDraft()
  }

  document.querySelectorAll('.tool-button').forEach(button => button.addEventListener('click', () => setTool(button.dataset.tool)))
  board.addEventListener('pointerdown', event => {
    const entity = event.target.closest('[data-index]')
    if (activeTool === 'erase') {
      if (entity) {
        snapshot()
        planItems.splice(Number(entity.dataset.index), 1)
        renderPlan()
        saveDraft()
      }
      return
    }
    if (event.target.classList.contains('board-background') || event.target.closest('#drawing-items')) {
      drawStart = pointFromEvent(event)
      if (activeTool === 'wall') {
        previewElement = document.createElementNS('http://www.w3.org/2000/svg', 'line')
        previewElement.setAttribute('x1', drawStart.x)
        previewElement.setAttribute('y1', drawStart.y)
        previewElement.setAttribute('x2', drawStart.x)
        previewElement.setAttribute('y2', drawStart.y)
        previewElement.setAttribute('class', 'preview-wall')
      } else {
        previewElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        previewElement.setAttribute('x', drawStart.x)
        previewElement.setAttribute('y', drawStart.y)
        previewElement.setAttribute('width', 0)
        previewElement.setAttribute('height', 0)
        previewElement.setAttribute('class', 'preview-room')
      }
      previewLayer.replaceChildren(previewElement)
      board.setPointerCapture(event.pointerId)
    }
  })
  board.addEventListener('pointermove', event => { if (drawStart) updatePreview(pointFromEvent(event)) })
  board.addEventListener('pointerup', finishDrawing)
  board.addEventListener('pointercancel', () => {
    drawStart = null
    previewElement = null
    previewLayer.replaceChildren()
  })

  undoButton.addEventListener('click', () => {
    const previous = history.pop()
    if (previous) planItems = JSON.parse(previous)
    undoButton.disabled = history.length === 0
    renderPlan()
    saveDraft()
  })
  document.querySelector('[data-action="clear"]').addEventListener('click', () => {
    if (!planItems.length) return
    snapshot()
    planItems = []
    renderPlan()
    saveDraft()
  })
  areaInput.addEventListener('input', () => {
    area = Number(areaInput.value) || 0
    saveDraft()
  })
  const pdfButton = document.querySelector('[data-action="download-pdf"]')
  const pdfStatus = document.querySelector('#pdf-export-status')
  pdfButton.addEventListener('click', async () => {
    pdfButton.disabled = true
    pdfStatus.textContent = 'Готовим PDF…'
    try {
      const { downloadPlanPdf } = await import('../lib/export-pdf.js')
      await downloadPlanPdf(board, document.querySelector('#project-title').textContent, areaInput.value)
      pdfStatus.textContent = 'Чертёж скачан в формате PDF.'
    } catch (error) {
      pdfStatus.textContent = error.message || 'Не удалось создать PDF.'
    } finally {
      pdfButton.disabled = false
    }
  })

  setTool('wall')
  renderPlan()
  saveDraft()
}
