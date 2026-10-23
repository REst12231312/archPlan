const moneyFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })
const quantityFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 })

export function estimateWallArea(floorArea, ceilingHeight) {
  return floorArea > 0 ? floorArea * 2.6 * ceilingHeight / 2.7 : 0
}

export function calculateEstimate({ floorArea, wallArea, floorPrice, paintPrice, primerPrice }) {
  const floorQuantity = Math.ceil(floorArea * 1.1 * 10) / 10
  const paintQuantity = Math.ceil(wallArea / 10 * 2 * 1.1)
  const primerQuantity = Math.ceil(wallArea / 10 * 1.1)
  const floorCost = floorQuantity * floorPrice
  const paintCost = paintQuantity * paintPrice
  const primerCost = primerQuantity * primerPrice

  return {
    floorQuantity,
    paintQuantity,
    primerQuantity,
    floorCost,
    paintCost,
    primerCost,
    total: floorCost + paintCost + primerCost,
  }
}

export const formatMoney = value => `${moneyFormatter.format(value)} ₸`
export const formatQuantity = value => quantityFormatter.format(value)
