const moneyFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })
const quantityFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 })

export const MATERIALS = [
  { id: 'floor', name: 'Ламинат', surface: 'floor', unit: 'м²', pack: 2.2, price: 6500, waste: 10, note: 'упаковка 2,2 м²' },
  { id: 'wall-paint', name: 'Краска для стен', surface: 'walls', unit: 'л', pack: 9, price: 23500, coverage: 10, coats: 2, waste: 10, note: 'ведро 9 л · 2 слоя' },
  { id: 'ceiling-paint', name: 'Краска для потолка', surface: 'ceiling', unit: 'л', pack: 9, price: 23500, coverage: 10, coats: 2, waste: 10, note: 'ведро 9 л · 2 слоя' },
  { id: 'primer', name: 'Грунтовка', surface: 'walls', unit: 'л', pack: 10, price: 6500, coverage: 10, coats: 1, waste: 10, note: 'канистра 10 л · 1 слой' },
]

export function calculateMaterial(material, area, price = material.price, waste = material.waste) {
  const needed = material.unit === 'м²'
    ? area * (1 + waste / 100)
    : area / material.coverage * material.coats * (1 + waste / 100)
  const packages = Math.ceil(Math.max(0, needed) / material.pack)
  const roundedQuantity = packages * material.pack
  const cost = Math.round(packages * price)
  return { needed, packages, quantity: roundedQuantity, cost }
}

export function calculateProjectEstimate(areas, prices = {}, wastes = {}) {
  const items = MATERIALS.map(material => ({
    ...material,
    ...calculateMaterial(material, areas[material.surface] || 0, prices[material.id] ?? material.price, wastes[material.id] ?? material.waste),
    price: prices[material.id] ?? material.price,
    waste: wastes[material.id] ?? material.waste,
  }))
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
