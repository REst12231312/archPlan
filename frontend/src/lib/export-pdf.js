import { calculateEstimate, estimateWallArea } from './estimate.js'

const encoder = new TextEncoder()
const ESTIMATE_SETTINGS_KEY = 'archplan:estimate-settings'
const DEFAULTS = { ceilingHeight: 2.7, floorPrice: 8800, paintPrice: 3900, primerPrice: 1200 }

function joinBytes(parts) {
  const length = parts.reduce((total, part) => total + part.length, 0)
  const result = new Uint8Array(length)
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

function buildPdf(jpegPages, imageWidth, imageHeight) {
  const parts = []
  const offsets = [0]
  let byteLength = 0
  let highestId = 2 + jpegPages.length * 3
  const append = value => {
    const bytes = typeof value === 'string' ? encoder.encode(value) : value
    parts.push(bytes)
    byteLength += bytes.length
  }
  const object = (id, body) => {
    offsets[id] = byteLength
    append(`${id} 0 obj\n${body}\nendobj\n`)
  }

  append('%PDF-1.4\n% ArchPlan\n')
  const kids = jpegPages.map((_, index) => `${3 + index * 3} 0 R`).join(' ')
  object(1, '<< /Type /Catalog /Pages 2 0 R >>')
  object(2, `<< /Type /Pages /Kids [${kids}] /Count ${jpegPages.length} >>`)

  jpegPages.forEach((jpegBytes, index) => {
    const pageId = 3 + index * 3
    const imageId = pageId + 1
    const contentId = pageId + 2
    object(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /XObject << /Plan ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`)
    offsets[imageId] = byteLength
    append(`${imageId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`)
    append(jpegBytes)
    append('\nendstream\nendobj\n')
    const content = 'q\n842 0 0 595 0 0 cm\n/Plan Do\nQ\n'
    object(contentId, `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream`)
  })

  const xrefOffset = byteLength
  append(`xref\n0 ${highestId + 1}\n0000000000 65535 f \n`)
  for (let id = 1; id <= highestId; id += 1) append(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`)
  append(`trailer\n<< /Size ${highestId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`)
  return joinBytes(parts)
}

function loadSvgImage(svgElement) {
  const clone = svgElement.cloneNode(true)
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', '1800')
  clone.setAttribute('height', '1200')
  clone.querySelector('#drawing-preview')?.remove()
  const styles = document.createElementNS('http://www.w3.org/2000/svg', 'style')
  styles.textContent = '.drawn-room{fill:#e7eee5;stroke:#425849;stroke-width:3}.drawn-room-label{fill:#536657;font:12px sans-serif}.drawn-wall{stroke:#34483a;stroke-width:5;stroke-linecap:square}'
  clone.insertBefore(styles, clone.firstChild)
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' }))
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => { URL.revokeObjectURL(url); resolve(image) }
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Не удалось подготовить изображение чертежа.')) }
    image.src = url
  })
}

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Браузер не смог подготовить страницу PDF.')
  context.fillStyle = '#fff'
  context.fillRect(0, 0, width, height)
  return { canvas, context }
}

function canvasJpeg(canvas) {
  const encoded = canvas.toDataURL('image/jpeg', 0.96).split(',')[1]
  return Uint8Array.from(atob(encoded), character => character.charCodeAt(0))
}

function money(value) {
  return `${new Intl.NumberFormat('ru-KZ', { maximumFractionDigits: 0 }).format(value)} ₸`
}

function quantity(value, digits = 1) {
  return new Intl.NumberFormat('ru-KZ', { maximumFractionDigits: digits }).format(value)
}

function readEstimate(area) {
  let saved = {}
  try { saved = JSON.parse(localStorage.getItem(ESTIMATE_SETTINGS_KEY) || '{}') || {} } catch { saved = {} }
  const settings = {
    floorArea: Math.max(0, Number(area) || 0),
    ceilingHeight: Number(saved.ceilingHeight) > 0 ? Number(saved.ceilingHeight) : DEFAULTS.ceilingHeight,
    wallArea: saved.wallAreaWasEdited && Number(saved.wallArea) > 0 ? Number(saved.wallArea) : 0,
    floorPrice: Number.isFinite(Number(saved.floorPrice)) ? Number(saved.floorPrice) : DEFAULTS.floorPrice,
    paintPrice: Number.isFinite(Number(saved.paintPrice)) ? Number(saved.paintPrice) : DEFAULTS.paintPrice,
    primerPrice: Number.isFinite(Number(saved.primerPrice)) ? Number(saved.primerPrice) : DEFAULTS.primerPrice,
  }
  if (!settings.wallArea) settings.wallArea = estimateWallArea(settings.floorArea, settings.ceilingHeight)
  return { settings, result: calculateEstimate(settings) }
}

function drawPageHeader(context, heading, subtitle) {
  context.fillStyle = '#27332c'
  context.font = '600 54px Arial, sans-serif'
  context.fillText(heading, 135, 145, 2100)
  context.fillStyle = '#717970'
  context.font = '30px Arial, sans-serif'
  context.fillText(subtitle, 135, 205, 2100)
  context.strokeStyle = '#dfe3dc'
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(135, 245)
  context.lineTo(2265, 245)
  context.stroke()
}

function renderEstimatePage(title, roomTotal, area) {
  const width = 2400
  const height = Math.round(width * 210 / 297)
  const { canvas, context } = makeCanvas(width, height)
  const { settings, result } = readEstimate(area)
  drawPageHeader(context, 'Смета на материалы', title || 'Планировка комнаты')
  context.fillStyle = '#717970'
  context.font = '28px Arial, sans-serif'
  context.fillText(`Площадь пола: ${quantity(settings.floorArea)} м²`, 135, 315)
  context.fillText(`Площадь стен: ${quantity(settings.wallArea)} м²  ·  высота: ${quantity(settings.ceilingHeight)} м  ·  помещений: ${roomTotal}`, 135, 365, 2100)

  const x = [135, 1030, 1340, 1610, 1930]
  const right = 2265
  const headerY = 455
  context.fillStyle = '#425849'
  context.fillRect(135, headerY - 42, right - 135, 58)
  context.fillStyle = '#ffffff'
  context.font = '600 26px Arial, sans-serif'
  context.fillText('Материал', x[0] + 18, headerY)
  context.fillText('Количество', x[1] + 12, headerY)
  context.fillText('Цена', x[2] + 12, headerY)
  context.fillText('Ед.', x[3] + 12, headerY)
  context.fillText('Стоимость', x[4] + 12, headerY)

  const rows = [
    ['Напольное покрытие', `${quantity(result.floorQuantity)} м²`, money(settings.floorPrice), 'за м²', money(result.floorCost)],
    ['Краска для стен', `${result.paintQuantity} л`, money(settings.paintPrice), 'за литр', money(result.paintCost)],
    ['Грунтовка', `${result.primerQuantity} л`, money(settings.primerPrice), 'за литр', money(result.primerCost)],
  ]
  context.font = '28px Arial, sans-serif'
  rows.forEach((row, index) => {
    const y = 555 + index * 94
    context.fillStyle = index % 2 ? '#f5f6f2' : '#ffffff'
    context.fillRect(135, y - 43, right - 135, 78)
    context.fillStyle = '#354139'
    context.fillText(row[0], x[0] + 18, y, 860)
    context.fillText(row[1], x[1] + 12, y)
    context.fillText(row[2], x[2] + 12, y)
    context.fillText(row[3], x[3] + 12, y)
    context.fillText(row[4], x[4] + 12, y)
  })

  context.fillStyle = '#edf0e9'
  context.fillRect(135, 850, right - 135, 90)
  context.fillStyle = '#27332c'
  context.font = '600 34px Arial, sans-serif'
  context.fillText('Итого по выбранным материалам', 155, 908)
  context.textAlign = 'right'
  context.fillStyle = '#425849'
  context.font = '600 38px Arial, sans-serif'
  context.fillText(money(result.total), right - 22, 908)
  context.textAlign = 'left'

  context.fillStyle = '#858d84'
  context.font = '23px Arial, sans-serif'
  context.fillText('Ориентировочная смета: расход рассчитан с запасом. Работа мастеров и доставка не включены.', 135, 1030, 2100)
  context.fillText('Расход зависит от геометрии комнаты, дверей, окон и характеристик материалов.', 135, 1070, 2100)
  context.fillText('ArchPlan · расчёт в тенге', 135, height - 70)
  return canvasJpeg(canvas)
}

function sanitizeFilename(value) {
  return value.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '-').replace(/^-|-$/g, '') || 'plan'
}

export async function downloadPlanPdf(svgElement, title, area) {
  const image = await loadSvgImage(svgElement)
  const width = 2400
  const height = Math.round(width * 210 / 297)
  const { canvas, context } = makeCanvas(width, height)
  context.fillStyle = '#27332c'
  context.font = '600 54px Arial, sans-serif'
  context.fillText(title || 'Планировка комнаты', 135, 145, 2100)
  context.fillStyle = '#717970'
  context.font = '30px Arial, sans-serif'
  const roomTotal = svgElement.querySelectorAll('.drawn-room').length
  const areaText = Number(area) > 0 ? `${quantity(Number(area))} м²` : 'площадь не указана'
  context.fillText(`${areaText}  ·  помещений: ${roomTotal}  ·  ArchPlan`, 135, 205)
  context.strokeStyle = '#dfe3dc'
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(135, 245)
  context.lineTo(width - 135, 245)
  context.stroke()
  const maxWidth = width - 280
  const maxHeight = height - 420
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height)
  const planWidth = image.width * scale
  const planHeight = image.height * scale
  context.drawImage(image, (width - planWidth) / 2, 290, planWidth, planHeight)
  context.fillStyle = '#858d84'
  context.font = '24px Arial, sans-serif'
  context.fillText('Чертёж создан в онлайн-конструкторе ArchPlan', 135, height - 70)

  const pages = [canvasJpeg(canvas), renderEstimatePage(title, roomTotal, area)]
  const pdf = buildPdf(pages, width, height)
  const downloadUrl = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }))
  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = `archplan-${sanitizeFilename(title)}.pdf`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
}
