import { calculateEstimate, estimateWallArea } from './estimate.js'

const encoder = new TextEncoder()
const MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

function xmlEscape(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char])
}

function columnName(index) {
  let name = ''
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) {
    name = String.fromCharCode(65 + (value - 1) % 26) + name
  }
  return name
}

function textCell(reference, value, style = 0) {
  return `<c r="${reference}" s="${style}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`
}

function numberCell(reference, value, style = 0, formula = '') {
  const formulaXml = formula ? `<f>${formula}</f>` : ''
  return `<c r="${reference}" s="${style}">${formulaXml}<v>${Number(value) || 0}</v></c>`
}

function worksheetXml(data) {
  const estimate = calculateEstimate(data)
  const wallEstimate = estimateWallArea(data.floorArea, data.ceilingHeight)
  const rows = [
    `<row r="1" ht="30" customHeight="1">${textCell('A1', 'Смета на материалы для ремонта', 1)}</row>`,
    '<row r="2"/>',
    `<row r="3">${textCell('A3', 'Площадь пола, м²')}${numberCell('B3', data.floorArea, 3)}</row>`,
    `<row r="4">${textCell('A4', 'Площадь стен, м²')}${numberCell('B4', data.wallArea, 3)}</row>`,
    `<row r="5">${textCell('A5', 'Высота стен, м')}${numberCell('B5', data.ceilingHeight, 3)}${textCell('C5', `Автооценка площади стен: ${wallEstimate.toFixed(1)} м²`)}</row>`,
    '<row r="6"/>',
    `<row r="7" ht="24" customHeight="1">${['Материал', 'Количество', 'Ед.', 'Цена за единицу, ₸', 'Стоимость, ₸'].map((value, index) => textCell(`${columnName(index)}7`, value, 2)).join('')}</row>`,
    `<row r="8">${textCell('A8', 'Напольное покрытие')}${numberCell('B8', estimate.floorQuantity, 4, 'ROUNDUP(B3*1.1,1)')}${textCell('C8', 'м²')}${numberCell('D8', data.floorPrice, 3)}${numberCell('E8', estimate.floorCost, 4, 'B8*D8')}</row>`,
    `<row r="9">${textCell('A9', 'Краска для стен')}${numberCell('B9', estimate.paintQuantity, 4, 'ROUNDUP(B4/10*2*1.1,0)')}${textCell('C9', 'л')}${numberCell('D9', data.paintPrice, 3)}${numberCell('E9', estimate.paintCost, 4, 'B9*D9')}</row>`,
    `<row r="10">${textCell('A10', 'Грунтовка')}${numberCell('B10', estimate.primerQuantity, 4, 'ROUNDUP(B4/10*1.1,0)')}${textCell('C10', 'л')}${numberCell('D10', data.primerPrice, 3)}${numberCell('E10', estimate.primerCost, 4, 'B10*D10')}</row>`,
    `<row r="11">${textCell('A11', 'Итого', 5)}${textCell('B11', '', 5)}${textCell('C11', '', 5)}${textCell('D11', '', 5)}${numberCell('E11', estimate.total, 5, 'SUM(E8:E10)')}</row>`,
  ]

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="7" topLeftCell="A8" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="30" customWidth="1"/><col min="2" max="2" width="16" customWidth="1"/><col min="3" max="3" width="9" customWidth="1"/><col min="4" max="4" width="22" customWidth="1"/><col min="5" max="5" width="19" customWidth="1"/></cols><sheetData>${rows.join('')}</sheetData><mergeCells count="1"><mergeCell ref="A1:E1"/></mergeCells><pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/></worksheet>`
}

const files = data => [
  ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'],
  ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
  ['xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Смета" sheetId="1" r:id="rId1"/></sheets><calcPr calcId="191029" fullCalcOnLoad="1" forceFullCalc="1"/></workbook>'],
  ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
  ['xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Arial"/><family val="2"/></font><font><b/><sz val="16"/><color rgb="FF27332C"/><name val="Arial"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF425849"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF0F2EC"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><bottom style="thin"><color rgb="FFDDE1D9"/></bottom><left/><right/><top/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="0" fillId="2" borderId="0" xfId="0" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="4" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"><alignment vertical="center"/></xf><xf numFmtId="2" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/><xf numFmtId="2" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'],
  ['xl/worksheets/sheet1.xml', worksheetXml(data)],
]

let crcTable
function crc32(bytes) {
  if (!crcTable) {
    crcTable = new Uint32Array(256)
    for (let index = 0; index < 256; index += 1) {
      let value = index
      for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
      crcTable[index] = value >>> 0
    }
  }
  let crc = 0xffffffff
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function write16(view, offset, value) { view.setUint16(offset, value, true) }
function write32(view, offset, value) { view.setUint32(offset, value >>> 0, true) }

function zipStore(entries) {
  const localParts = []
  const centralParts = []
  let offset = 0
  for (const [filename, content] of entries) {
    const name = encoder.encode(filename)
    const data = encoder.encode(content)
    const crc = crc32(data)
    const header = new Uint8Array(30 + name.length)
    const view = new DataView(header.buffer)
    write32(view, 0, 0x04034b50); write16(view, 4, 20); write16(view, 6, 0x0800)
    write16(view, 8, 0); write16(view, 10, 0); write16(view, 12, 0)
    write32(view, 14, crc); write32(view, 18, data.length); write32(view, 22, data.length)
    write16(view, 26, name.length); write16(view, 28, 0); header.set(name, 30)
    localParts.push(header, data)

    const central = new Uint8Array(46 + name.length)
    const centralView = new DataView(central.buffer)
    write32(centralView, 0, 0x02014b50); write16(centralView, 4, 20); write16(centralView, 6, 20)
    write16(centralView, 8, 0x0800); write16(centralView, 10, 0); write16(centralView, 12, 0); write16(centralView, 14, 0)
    write32(centralView, 16, crc); write32(centralView, 20, data.length); write32(centralView, 24, data.length)
    write16(centralView, 28, name.length); write16(centralView, 30, 0); write16(centralView, 32, 0)
    write16(centralView, 34, 0); write16(centralView, 36, 0); write32(centralView, 38, 0); write32(centralView, 42, offset)
    central.set(name, 46)
    centralParts.push(central)
    offset += header.length + data.length
  }
  const centralDirectory = joinBytes(centralParts)
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  write32(endView, 0, 0x06054b50); write16(endView, 4, 0); write16(endView, 6, 0)
  write16(endView, 8, entries.length); write16(endView, 10, entries.length)
  write32(endView, 12, centralDirectory.length); write32(endView, 16, offset); write16(endView, 20, 0)
  return joinBytes([...localParts, centralDirectory, end])
}

function joinBytes(parts) {
  const length = parts.reduce((sum, part) => sum + part.length, 0)
  const result = new Uint8Array(length)
  let offset = 0
  for (const part of parts) { result.set(part, offset); offset += part.length }
  return result
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadEstimateXlsx(data) {
  const bytes = zipStore(files(data))
  const blob = new Blob([bytes], { type: MIME_TYPE })
  download(blob, 'archplan-smeta.xlsx')
}
