import { calculateEstimate, estimateWallArea, formatMoney, formatQuantity } from '../lib/estimate.js'

const AREA_KEY = 'archplan:floor-area'
const SETTINGS_KEY = 'archplan:estimate-settings'

export function renderEstimatePage() {
  return `
    <main class="page-main estimate-page">
      <section class="page-hero section-wrap estimate-page-hero">
        <div class="eyebrow"><span class="eyebrow-dot"></span> ПЛАНИРУЙТЕ ПОКУПКИ</div>
        <h1>Смета на основные<br /><span class="serif-accent">материалы.</span></h1>
        <p>Измените площадь помещения и цены под свой магазин, чтобы получить примерный расход и сумму.</p>
      </section>
      <section class="estimate-page-content section-wrap">
        <div class="estimate-tool estimate-page-tool" aria-labelledby="estimate-title">
          <div class="estimate-tool-heading"><div><span class="gallery-kicker">ПРЕДВАРИТЕЛЬНЫЙ РАСЧЁТ</span><h2 id="estimate-title">Параметры и стоимость</h2><p>Примерные цены заполнены заранее. Изменяйте их — расчёт обновится автоматически.</p></div><div class="estimate-total-badge"><span>ПРИМЕРНАЯ СТОИМОСТЬ</span><strong id="estimate-grand-total">—</strong></div></div>
          <div class="estimate-tool-grid">
            <div class="estimate-inputs">
              <div class="estimate-input-heading"><strong>Параметры помещения</strong><span>Можно изменить</span></div>
              <label class="estimate-field"><span>Площадь пола</span><span class="input-with-unit"><input id="estimate-floor-area" type="number" min="1" max="1000" step="0.1" value="38" inputmode="decimal"><i>м²</i></span></label>
              <label class="estimate-field"><span>Высота стен</span><span class="input-with-unit"><input id="estimate-ceiling-height" type="number" min="2" max="6" step="0.1" value="2.7" inputmode="decimal"><i>м</i></span></label>
              <label class="estimate-field"><span>Площадь стен</span><span class="input-with-unit"><input id="estimate-wall-area" type="number" min="1" max="3000" step="0.1" value="98.8" inputmode="decimal"><i>м²</i></span></label>
              <button type="button" class="auto-wall-button" data-action="auto-walls">↻ Рассчитать площадь стен автоматически</button>
              <p class="estimate-method">Автооценка стен: площадь пола × 2,6 × высота стен / 2,7. Уточните значение, если знаете точную площадь.</p>
            </div>
            <div class="estimate-results">
              <div class="estimate-input-heading"><strong>Материалы и цены</strong><span>Цены в тенге</span></div>
              <div class="estimate-result-row"><div><strong>Напольное покрытие</strong><small>с запасом 10%</small></div><span class="result-quantity" id="floor-quantity">—</span><label class="price-input"><input id="floor-price" type="number" min="0" step="100" value="8800" aria-label="Цена напольного покрытия в тенге за квадратный метр"><span>₸ / м²</span></label><b id="floor-total">—</b></div>
              <div class="estimate-result-row"><div><strong>Краска для стен</strong><small>2 слоя, запас 10%</small></div><span class="result-quantity" id="paint-quantity">—</span><label class="price-input"><input id="paint-price" type="number" min="0" step="100" value="3900" aria-label="Цена краски в тенге за литр"><span>₸ / л</span></label><b id="paint-total">—</b></div>
              <div class="estimate-result-row"><div><strong>Грунтовка</strong><small>расход 10 м² на литр</small></div><span class="result-quantity" id="primer-quantity">—</span><label class="price-input"><input id="primer-price" type="number" min="0" step="100" value="1200" aria-label="Цена грунтовки в тенге за литр"><span>₸ / л</span></label><b id="primer-total">—</b></div>
              <div class="estimate-summary"><span>Итого по выбранным материалам</span><strong id="estimate-summary-total">—</strong></div>
            </div>
          </div>
          <p class="estimate-disclaimer">Для собственного эскиза укажите фактическую площадь вручную: рисунок пока не имеет реального масштаба. Расчёт краски предполагает покрытие 10 м² на литр в один слой. Это ориентир для планирования; расход зависит от геометрии, дверей и окон и свойств материалов. Работа мастеров и доставка не включены.</p>
          <div class="estimate-export-row"><p>Скачайте расчёт, чтобы сохранить его или изменить цены и формулы в Excel.</p><button type="button" class="editor-download" data-action="download-xlsx">Скачать смету в Excel <span aria-hidden="true">↓</span></button></div>
          <p class="export-status" id="estimate-export-status" role="status" aria-live="polite"></p>
        </div>
        <div class="estimate-next-step"><span>Эскиз уже готов?</span><a href="/editor.html">Вернуться в конструктор <span aria-hidden="true">→</span></a></div>
      </section>
    </main>`
}

export function initEstimatePage() {
  const floorAreaInput = document.querySelector('#estimate-floor-area')
  const ceilingHeightInput = document.querySelector('#estimate-ceiling-height')
  const wallAreaInput = document.querySelector('#estimate-wall-area')
  const exportButton = document.querySelector('[data-action="download-xlsx"]')
  const exportStatus = document.querySelector('#estimate-export-status')
  let wallAreaWasEdited = false
  let savedSettings = {}
  try { savedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {} } catch { savedSettings = {} }
  const savedArea = Number(localStorage.getItem(AREA_KEY))
  if (savedArea > 0) floorAreaInput.value = savedArea
  if (Number(savedSettings.ceilingHeight) > 0) ceilingHeightInput.value = savedSettings.ceilingHeight
  if (savedSettings.wallAreaWasEdited && Number(savedSettings.wallArea) > 0) {
    wallAreaInput.value = savedSettings.wallArea
    wallAreaWasEdited = true
  }
  for (const [id, key] of [['floor-price', 'floorPrice'], ['paint-price', 'paintPrice'], ['primer-price', 'primerPrice']]) {
    if (Number.isFinite(Number(savedSettings[key])) && savedSettings[key] !== undefined) document.querySelector(`#${id}`).value = savedSettings[key]
  }

  function saveEstimateSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      ceilingHeight: Number(ceilingHeightInput.value) || 2.7,
      wallArea: Number(wallAreaInput.value) || 0,
      wallAreaWasEdited,
      floorPrice: Number(document.querySelector('#floor-price').value) || 0,
      paintPrice: Number(document.querySelector('#paint-price').value) || 0,
      primerPrice: Number(document.querySelector('#primer-price').value) || 0,
    }))
  }

  function updateWallArea() {
    if (wallAreaWasEdited) return
    const floorArea = Number(floorAreaInput.value) || 0
    const height = Number(ceilingHeightInput.value) || 2.7
    wallAreaInput.value = floorArea ? estimateWallArea(floorArea, height).toFixed(1) : ''
  }

  function updateEstimate() {
    const result = calculateEstimate({
      floorArea: Math.max(0, Number(floorAreaInput.value) || 0),
      wallArea: Math.max(0, Number(wallAreaInput.value) || 0),
      floorPrice: Math.max(0, Number(document.querySelector('#floor-price').value) || 0),
      paintPrice: Math.max(0, Number(document.querySelector('#paint-price').value) || 0),
      primerPrice: Math.max(0, Number(document.querySelector('#primer-price').value) || 0),
    })
    document.querySelector('#floor-quantity').textContent = `${formatQuantity(result.floorQuantity)} м²`
    document.querySelector('#paint-quantity').textContent = `${result.paintQuantity} л`
    document.querySelector('#primer-quantity').textContent = `${result.primerQuantity} л`
    document.querySelector('#floor-total').textContent = formatMoney(result.floorCost)
    document.querySelector('#paint-total').textContent = formatMoney(result.paintCost)
    document.querySelector('#primer-total').textContent = formatMoney(result.primerCost)
    document.querySelector('#estimate-grand-total').textContent = formatMoney(result.total)
    document.querySelector('#estimate-summary-total').textContent = formatMoney(result.total)
    saveEstimateSettings()
  }

  floorAreaInput.addEventListener('input', () => {
    updateWallArea()
    updateEstimate()
    const area = Number(floorAreaInput.value)
    if (area > 0) localStorage.setItem(AREA_KEY, String(area))
  })
  ceilingHeightInput.addEventListener('input', () => {
    updateWallArea()
    updateEstimate()
  })
  wallAreaInput.addEventListener('input', () => {
    wallAreaWasEdited = true
    updateEstimate()
  })
  document.querySelector('[data-action="auto-walls"]').addEventListener('click', () => {
    wallAreaWasEdited = false
    updateWallArea()
    updateEstimate()
  })
  document.querySelectorAll('#floor-price, #paint-price, #primer-price').forEach(input => input.addEventListener('input', updateEstimate))
  exportButton.addEventListener('click', async () => {
    exportButton.disabled = true
    exportStatus.textContent = 'Готовим файл Excel…'
    try {
      const { downloadEstimateXlsx } = await import('../lib/export-xlsx.js')
      downloadEstimateXlsx({
        floorArea: Math.max(0, Number(floorAreaInput.value) || 0),
        wallArea: Math.max(0, Number(wallAreaInput.value) || 0),
        ceilingHeight: Math.max(0, Number(ceilingHeightInput.value) || 0),
        floorPrice: Math.max(0, Number(document.querySelector('#floor-price').value) || 0),
        paintPrice: Math.max(0, Number(document.querySelector('#paint-price').value) || 0),
        primerPrice: Math.max(0, Number(document.querySelector('#primer-price').value) || 0),
      })
      exportStatus.textContent = 'Смета скачана в формате Excel.'
    } catch (error) {
      exportStatus.textContent = error.message || 'Не удалось создать файл Excel.'
    } finally {
      exportButton.disabled = false
    }
  })
  updateWallArea()
  updateEstimate()
}
