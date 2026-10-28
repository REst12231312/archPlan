const moneyFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })
const quantityFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 })

export const MATERIALS = [
  { id: 'laminate-standard', name: 'Ламинат базовый', surface: 'floor', role: 'finish', unit: 'м²', pack: 2.2, price: 6500, waste: 10, note: 'упаковка 2,2 м²' },
  { id: 'laminate-premium', name: 'Ламинат усиленный', surface: 'floor', role: 'finish', unit: 'м²', pack: 1.8, price: 9400, waste: 10, note: 'упаковка 1,8 м²' },
  { id: 'paint-wall-standard', name: 'Краска для стен', surface: 'walls', role: 'finish', unit: 'л', pack: 9, price: 23500, coverage: 10, coats: 2, waste: 10, note: 'ведро 9 л · 2 слоя' },
  { id: 'paint-wall-premium', name: 'Краска моющаяся для стен', surface: 'walls', role: 'finish', unit: 'л', pack: 9, price: 31900, coverage: 12, coats: 2, waste: 10, note: 'ведро 9 л · 2 слоя' },
  { id: 'paint-ceiling-standard', name: 'Краска для потолка', surface: 'ceiling', role: 'finish', unit: 'л', pack: 9, price: 23500, coverage: 10, coats: 2, waste: 10, note: 'ведро 9 л · 2 слоя' },
  { id: 'primer-standard', name: 'Грунтовка', surface: 'walls', role: 'primer', unit: 'л', pack: 10, price: 6500, coverage: 10, coats: 1, waste: 10, note: 'канистра 10 л · 1 слой' },
]

export function calculateMaterial(material, area, price = material.price, waste = material.waste) {
  const needed = material.unit === 'м²'
    ? area * (1 + waste / 100)
    : area / material.coverage * material.coats * (1 + waste / 100)
  const packageSize = material.packageSize ?? material.pack
  const packages = Math.ceil(Math.max(0, needed) / packageSize)
  const roundedQuantity = packages * packageSize
  const cost = Math.round(packages * price)
  return { needed, packages, quantity: roundedQuantity, cost }
}

export function calculateProjectEstimate(areas, prices = {}, wastes = {}, assignments = {}, catalog = MATERIALS) {
  const slots = ['floor','walls','ceiling','primer']
  const items = slots.map(slot => {
    const material = assignments[slot]
      ? catalog.find(item => item.id === assignments[slot])
      : catalog.find(item => slot === 'primer' ? item.role === 'primer' : item.role === 'finish' && item.surface === slot)
    if (!material || (slot === 'primer' ? material.role !== 'primer' : material.role !== 'finish' || material.surface !== slot)) return null
    const area = slot === 'primer' ? areas.walls : areas[slot]
    const price = prices[material.id] ?? material.priceKzt ?? material.price_kzt ?? material.price
    const waste = wastes[material.id] ?? material.defaultWaste ?? material.default_waste ?? material.waste
    const calculated = calculateMaterial(material, area || 0, price, waste)
    return { ...material, id: material.id, ...calculated, needed: calculated.needed, packages: calculated.packages, quantity: calculated.quantity, cost: calculated.cost, price, waste, surface: slot === 'primer' ? 'walls' : material.surface, slot, note: material.note || `упаковка ${material.packageSize ?? material.pack} ${material.unit}` }
  }).filter(Boolean)
  return { items, total: items.reduce((sum, item) => sum + item.cost, 0) }
}

export function estimateWallArea(floorArea, ceilingHeight) {
  return floorArea > 0 ? floorArea * 2.6 * ceilingHeight / 2.7 : 0
}

// Kept for older exports and examples that use loose per-unit prices.
export function calculateEstimate({ floorArea, wallArea, floorPrice, paintPrice, primerPrice }) {
  const floorQuantity = Math.ceil(floorArea * 1.1 * 10) / 10
  const paintQuantity = Math.ceil(wallArea / 10 * 2 * 1.1)
  const primerQuantity = Math.ceil(wallArea / 10 * 1.1)
  const floorCost = Math.round(floorQuantity * floorPrice)
  const paintCost = Math.round(paintQuantity * paintPrice)
  const primerCost = Math.round(primerQuantity * primerPrice)
  return { floorQuantity, paintQuantity, primerQuantity, floorCost, paintCost, primerCost, total: floorCost + paintCost + primerCost }
}

export const formatMoney = value => `${moneyFormatter.format(Math.round(value))} ₸`
export const formatQuantity = value => quantityFormatter.format(value)
