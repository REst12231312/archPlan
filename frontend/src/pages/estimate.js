import { calculateProjectEstimate, formatMoney, formatQuantity } from '../lib/estimate.js'
import { projectAreas, readProject } from '../lib/project.js'

const SETTINGS_KEY = 'archplan:estimate-settings:v2'
const areaLabel = { floor: 'Площадь пола', walls: 'Площадь стен', ceiling: 'Площадь потолка' }

export function renderEstimatePage() {
  return `<main class="page-main estimate-page project-estimate-page">
    <section class="page-hero section-wrap estimate-page-hero"><div class="eyebrow"><span class="eyebrow-dot"></span> ПРОЗРАЧНЫЙ РАСЧЁТ</div><h1>Что купить<br><span class="serif-accent">для ремонта.</span></h1><p>Площади берутся из проекта. Количество округляется до целых упаковок, цены можно заменить на свои.</p></section>
    <section class="estimate-page-content section-wrap"><div class="estimate-tool estimate-page-tool project-estimate-tool" aria-labelledby="estimate-title">
      <div class="estimate-tool-heading"><div><span class="gallery-kicker">${readProject().region.toUpperCase()} · ОРИЕНТИРОВОЧНЫЕ ЦЕНЫ</span><h2 id="estimate-title">Материалы и стоимость</h2><p id="estimate-project-name"></p></div><div class="estimate-total-badge"><span>ВСЕГО ПО МАТЕРИАЛАМ</span><strong id="estimate-grand-total">—</strong></div></div>
      <div class="estimate-area-strip" id="estimate-areas"></div>
      <div class="estimate-table-wrap"><table class="estimate-table"><thead><tr><th>Материал</th><th>Расчёт с запасом</th><th>Закупка</th><th>Цена упаковки</th><th>Стоимость</th></tr></thead><tbody id="estimate-rows"></tbody><tfoot><tr><th colspan="4">Итого по материалам</th><th id="estimate-summary-total">—</th></tr></tfoot></table></div>
      <div class="estimate-extra-costs"><div><strong>Не включено в материалы</strong><p>Работы мастеров, доставка и расходники добавляются отдельными строками. Сейчас это ориентир только по основным покрытиям.</p></div><label>Работы, ₸ <input id="labor-cost" type="number" min="0" step="1000" value="0"></label><label>Доставка, ₸ <input id="delivery-cost" type="number" min="0" step="500" value="0"></label></div>
      <p class="estimate-disclaimer">Формула: площадь × расход × слои × (1 + запас), затем округление вверх до упаковки. Ламинат: пачка 2,2 м². Краска: 10 м² на литр за слой, ведро 9 л. Грунтовка: 10 м² на литр, канистра 10 л. Цены ориентировочные, не связаны с каталогом магазина.</p>
      <div class="estimate-export-row"><p>Смета сохранена в этом браузере. Скачайте файл для закупки или пересчёта.</p><div class="estimate-export-actions"><button type="button" class="editor-download" data-action="download-pdf">Скачать PDF <span aria-hidden="true">↓</span></button><button type="button" class="editor-download" data-action="download-xlsx">Скачать Excel <span aria-hidden="true">↓</span></button></div></div><p class="export-status" id="estimate-export-status" role="status" aria-live="polite"></p>
    </div><div class="estimate-next-step"><span>Хотите изменить геометрию?</span><a href="/editor.html">Вернуться к плану <span aria-hidden="true">→</span></a></div></section>
  </main>`
}

export function initEstimatePage() {
  const project = readProject()
  const areas = projectAreas(project)
  const $ = selector => document.querySelector(selector)
  let saved = {}
  try { saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {} } catch { saved = {} }
  $('#estimate-project-name').textContent = `${project.name} · ${project.rooms.length} ${project.rooms.length === 1 ? 'помещение' : 'помещения'}`
  $('#estimate-areas').innerHTML = Object.entries(areaLabel).map(([key, label]) => `<div><span>${label}</span><strong>${formatQuantity(areas[key])} м²</strong></div>`).join('')
  const settings = { prices: { ...saved.prices }, wastes: { ...saved.wastes }, labor: Number(saved.labor) || 0, delivery: Number(saved.delivery) || 0 }
  $('#labor-cost').value = settings.labor
  $('#delivery-cost').value = settings.delivery

  const render = () => {
    const result = calculateProjectEstimate(areas, settings.prices, settings.wastes)
    $('#estimate-rows').innerHTML = result.items.map(item => `<tr><td><strong>${item.name}</strong><small>${areaLabel[item.surface]} · ${item.note}</small><label class="waste-control">Запас <input type="number" min="0" max="50" step="1" value="${item.waste}" data-waste="${item.id}"> %</label></td><td>${formatQuantity(item.needed)} ${item.unit}</td><td><strong>${item.packages} уп.</strong><small>${formatQuantity(item.quantity)} ${item.unit}</small></td><td><label class="table-price"><input type="number" min="0" step="100" value="${item.price}" data-price="${item.id}" aria-label="Цена упаковки материала ${item.name}"><span>₸</span></label></td><td class="estimate-cost-cell">${formatMoney(item.cost)}</td></tr>`).join('')
    const total = result.total + settings.labor + settings.delivery
    $('#estimate-grand-total').textContent = formatMoney(total)
    $('#estimate-summary-total').textContent = formatMoney(total)
    $('.estimate-total-badge span').textContent = settings.labor || settings.delivery ? 'МАТЕРИАЛЫ, РАБОТЫ И ДОСТАВКА' : 'ВСЕГО ПО МАТЕРИАЛАМ'
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }
  $('#estimate-rows').addEventListener('change', event => {
    const input = event.target
    if (input.dataset.price) settings.prices[input.dataset.price] = Math.max(0, Number(input.value) || 0)
    if (input.dataset.waste) settings.wastes[input.dataset.waste] = Math.max(0, Math.min(50, Number(input.value) || 0))
    render()
  })
  $('#labor-cost').addEventListener('input', event => { settings.labor = Math.max(0, Number(event.target.value) || 0); render() })
  $('#delivery-cost').addEventListener('input', event => { settings.delivery = Math.max(0, Number(event.target.value) || 0); render() })
  for (const format of ['pdf', 'xlsx']) $(`[data-action="download-${format}"]`).addEventListener('click', async event => {
    const button = event.currentTarget
    const status = $('#estimate-export-status')
    button.disabled = true; status.textContent = 'Готовим файл Excel…'
    try {
      const result = calculateProjectEstimate(areas, settings.prices, settings.wastes)
      const data = { project, areas, items: result.items, total: result.total, labor: settings.labor, delivery: settings.delivery }
      if (format === 'pdf') {
        const { downloadEstimatePdf } = await import('../lib/export-pdf.js')
        downloadEstimatePdf(data)
        status.textContent = 'Смета скачана в формате PDF.'
      } else {
        const { downloadEstimateXlsx } = await import('../lib/export-xlsx.js')
        downloadEstimateXlsx(data)
        status.textContent = 'Смета скачана в формате Excel.'
      }
    } catch (error) { status.textContent = error.message || 'Не удалось создать файл Excel.' }
    finally { button.disabled = false }
  })
  render()
}
