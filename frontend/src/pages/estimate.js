import { calculateProjectEstimate, formatMoney, formatQuantity } from '../lib/estimate.js'
import { apiRequest, ACTIVE_PROJECT_KEY, hasSession } from '../lib/api.js'
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
      <div class="estimate-export-row"><p>Сохраните смету в аккаунте, чтобы зафиксировать цены и версию проекта.</p><div class="estimate-export-actions"><button type="button" class="editor-action" data-action="save-estimate">Сохранить смету</button><button type="button" class="editor-download" data-action="download-pdf">Скачать PDF <span aria-hidden="true">↓</span></button><button type="button" class="editor-download" data-action="download-xlsx">Скачать Excel <span aria-hidden="true">↓</span></button></div></div><p class="export-status" id="estimate-export-status" role="status" aria-live="polite"></p><div class="saved-estimates" id="saved-estimates"></div>
    </div><div class="estimate-next-step"><span>Хотите изменить геометрию?</span><a href="/editor.html">Вернуться к плану <span aria-hidden="true">→</span></a></div></section>
  </main>`
}

export async function initEstimatePage() {
  const project = readProject()
  const areas = projectAreas(project)
  const $ = selector => document.querySelector(selector)
  let saved = {}
  try { saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {} } catch { saved = {} }
  let catalog = MATERIALS
  try {
    const response = await apiRequest('/materials')
    catalog = response.items.map(item => ({ ...item, pack: item.packageSize, price: item.priceKzt, waste: item.defaultWaste, note: item.role === 'primer' ? `канистра ${item.packageSize} л · ${item.coats} слой` : item.unit === 'м²' ? `упаковка ${item.packageSize} м²` : `ведро ${item.packageSize} л · ${item.coats} слоя` }))
  } catch { /* The estimator remains usable with the bundled local catalogue. */ }
  $('#estimate-project-name').textContent = `${project.name} · ${project.rooms.length} ${project.rooms.length === 1 ? 'помещение' : 'помещения'}`
  $('#estimate-areas').innerHTML = Object.entries(areaLabel).map(([key, label]) => `<div><span>${label}</span><strong>${formatQuantity(areas[key])} м²</strong></div>`).join('')
  const defaults = { floor: 'laminate-standard', walls: 'paint-wall-standard', ceiling: 'paint-ceiling-standard', primer: 'primer-standard' }
  const settings = { prices: { ...saved.prices }, wastes: { ...saved.wastes }, assignments: { ...defaults, ...saved.assignments }, labor: Number(saved.labor) || 0, delivery: Number(saved.delivery) || 0 }
  $('#labor-cost').value = settings.labor
  $('#delivery-cost').value = settings.delivery

  const render = () => {
    const result = calculateProjectEstimate(areas, settings.prices, settings.wastes, settings.assignments, catalog)
    $('#estimate-rows').innerHTML = result.items.map(item => {
      const choices = catalog.filter(candidate => item.slot === 'primer' ? candidate.role === 'primer' : candidate.role === 'finish' && candidate.surface === item.slot)
      const label = item.slot === 'primer' ? 'Грунтовка' : item.name
      return `<tr><td><strong>${label}</strong><small>${areaLabel[item.surface]} · ${item.note}</small><label class="material-picker">Материал <select data-assignment="${item.slot}">${choices.map(option => `<option value="${option.id}" ${option.id === item.id ? 'selected' : ''}>${option.name}</option>`).join('')}</select></label><label class="waste-control">Запас <input type="number" min="0" max="50" step="1" value="${item.waste}" data-waste="${item.id}"> %</label></td><td>${formatQuantity(item.needed)} ${item.unit}</td><td><strong>${item.packages} уп.</strong><small>${formatQuantity(item.quantity)} ${item.unit}</small></td><td><label class="table-price"><input type="number" min="0" step="1" value="${item.price}" data-price="${item.id}" aria-label="Цена упаковки материала ${item.name}"><span>₸</span></label></td><td class="estimate-cost-cell">${formatMoney(item.cost)}</td></tr>`
    }).join('')
    const total = result.total + settings.labor + settings.delivery
    $('#estimate-grand-total').textContent = formatMoney(total)
    $('#estimate-summary-total').textContent = formatMoney(total)
    $('.estimate-total-badge span').textContent = settings.labor || settings.delivery ? 'МАТЕРИАЛЫ, РАБОТЫ И ДОСТАВКА' : 'ВСЕГО ПО МАТЕРИАЛАМ'
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }
  $('#estimate-rows').addEventListener('change', event => {
    const input = event.target
    if (input.dataset.assignment) settings.assignments[input.dataset.assignment] = input.value
    if (input.dataset.price) settings.prices[input.dataset.price] = Math.max(0, Math.round(Number(input.value) || 0))
    if (input.dataset.waste) settings.wastes[input.dataset.waste] = Math.max(0, Math.min(50, Number(input.value) || 0))
    render()
  })
  $('#labor-cost').addEventListener('input', event => { settings.labor = Math.max(0, Math.round(Number(event.target.value) || 0)); render() })
  $('#delivery-cost').addEventListener('input', event => { settings.delivery = Math.max(0, Math.round(Number(event.target.value) || 0)); render() })
  const estimateData = () => {
    const result = calculateProjectEstimate(areas, settings.prices, settings.wastes, settings.assignments, catalog)
    return { project, areas, items: result.items, total: result.total, labor: settings.labor, delivery: settings.delivery }
  }
  $('[data-action="save-estimate"]').addEventListener('click', async event => {
    const button = event.currentTarget
    const projectId = localStorage.getItem(ACTIVE_PROJECT_KEY)
    const status = $('#estimate-export-status')
    if (!hasSession() || !projectId || project.id !== projectId) { status.textContent = 'Чтобы сохранить смету, войдите и сохраните проект в аккаунт.'; return }
    button.disabled = true; status.textContent = 'Сохраняем смету и фиксируем цены…'
    try {
      const { estimate } = await apiRequest(`/projects/${projectId}/estimates`, { method: 'POST', body: { prices: settings.prices, wastes: settings.wastes, assignments: settings.assignments, worksKzt: settings.labor, deliveryKzt: settings.delivery } })
      status.textContent = `Смета сохранена · версия проекта ${estimate.snapshot.projectVersion} · ${formatMoney(estimate.totalKzt)}`
      await loadSavedEstimates()
    } catch (error) { status.textContent = error.message }
    finally { button.disabled = false }
  })
  async function loadSavedEstimates() {
    const projectId = localStorage.getItem(ACTIVE_PROJECT_KEY)
    if (!hasSession() || !projectId || project.id !== projectId) return
    try {
      const { items } = await apiRequest(`/projects/${projectId}/estimates`)
      $('#saved-estimates').innerHTML = items.length ? `<h3>Сохранённые сметы</h3>${items.map(item => `<details class="saved-estimate"><summary>${new Date(item.createdAt).toLocaleString('ru-RU')} · версия ${item.snapshot.projectVersion} · ${formatMoney(item.totalKzt)}</summary><ul>${item.snapshot.items.map(line => `<li>${line.name}: ${line.packageCount} уп. · ${formatMoney(line.costKzt)}</li>`).join('')}</ul></details>`).join('')}` : '<p>Сохранённых смет пока нет.</p>'
    } catch { /* Keep local estimates available if history is temporarily unreachable. */ }
  }
  for (const format of ['pdf', 'xlsx']) $(`[data-action="download-${format}"]`).addEventListener('click', async event => {
    const button = event.currentTarget
    const status = $('#estimate-export-status')
    button.disabled = true; status.textContent = 'Готовим файл Excel…'
    try {
      const data = estimateData()
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
  loadSavedEstimates()
}
