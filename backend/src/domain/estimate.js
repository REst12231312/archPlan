export function geometryAreas(project) {
  return project.rooms.reduce((sum, room) => {
    const length = Number(room.length) || 0
    const width = Number(room.width) || 0
    const height = Number(room.height) || 0
    const floor = length * width
    const openings = (room.openings || []).reduce((total, opening) => total + Number(opening.width) * Number(opening.height), 0)
    sum.floor += floor
    sum.walls += Math.max(0, (2 * (length + width) * height) - openings)
    sum.ceiling += floor
    return sum
  }, { floor: 0, walls: 0, ceiling: 0 })
}

export function calculateMaterial(material, area, { price = material.price_kzt, waste = material.default_waste, priceSource = material.price_source } = {}) {
  const required = material.surface === 'floor'
    ? area * (1 + waste / 100)
    : (area / material.coverage) * material.coats * (1 + waste / 100)
  const packages = Math.ceil(Math.max(0, required) / material.package_size)
  const costKzt = Math.round(packages * price)
  return {
    materialId: material.id,
    name: material.name,
    surface: material.surface,
    unit: material.surface === 'floor' ? 'м²' : material.unit,
    needed: required,
    packageSize: material.package_size,
    packageCount: packages,
    purchaseQuantity: packages * material.package_size,
    unitPriceKzt: price,
    wastePercent: waste,
    priceSource,
    priceObservedAt: material.seeded_at,
    costKzt,
  }
}

export function calculateEstimate(project, catalog, options = {}) {
  const areas = geometryAreas(project)
  const assignments = options.assignments || {}
  const byId = new Map(catalog.map(material => [material.id, material]))
  const items = []
  for (const surface of ['floor', 'walls', 'ceiling']) {
    const selectedId = assignments[surface]
    const material = selectedId ? byId.get(selectedId) : catalog.find(item => item.surface === surface && item.role === 'finish')
    if (!material || material.surface !== surface || material.role !== 'finish') throw new Error(`Не выбран материал для поверхности «${surface}».`)
    const price = options.prices?.[material.id] ?? material.price_kzt
    const waste = options.wastes?.[material.id] ?? material.default_waste
    if (!Number.isSafeInteger(price) || price < 0) throw new Error('Цена должна быть целым неотрицательным количеством тенге.')
    if (!Number.isFinite(waste) || waste < 0 || waste > 50) throw new Error('Запас должен быть от 0 до 50 процентов.')
    const priceSource = Object.hasOwn(options.prices || {}, material.id) ? 'Ручная цена клиента' : material.price_source
    items.push(calculateMaterial(material, areas[surface], { price, waste, priceSource }))
  }
  const primerId = assignments.primer
  const primer = primerId ? byId.get(primerId) : catalog.find(item => item.role === 'primer')
  if (primerId && (!primer || primer.role !== 'primer')) throw new Error('Для грунтования выбран неподходящий материал.')
  if (primer) {
    const price = options.prices?.[primer.id] ?? primer.price_kzt
    const waste = options.wastes?.[primer.id] ?? primer.default_waste
    if (!Number.isSafeInteger(price) || price < 0) throw new Error('Цена должна быть целым неотрицательным количеством тенге.')
    if (!Number.isFinite(waste) || waste < 0 || waste > 50) throw new Error('Запас должен быть от 0 до 50 процентов.')
    const priceSource = Object.hasOwn(options.prices || {}, primer.id) ? 'Ручная цена клиента' : primer.price_source
    items.push(calculateMaterial(primer, areas.walls, { price, waste, priceSource }))
  }
  const worksKzt = options.worksKzt ?? 0
  const deliveryKzt = options.deliveryKzt ?? 0
  if (![worksKzt, deliveryKzt].every(value => Number.isSafeInteger(value) && value >= 0)) throw new Error('Работы и доставка указываются целым числом тенге.')
  const materialsKzt = items.reduce((total, item) => total + item.costKzt, 0)
  return { areas, items, materialsKzt, worksKzt, deliveryKzt, totalKzt: materialsKzt + worksKzt + deliveryKzt }
}

export function validateProject(project) {
  if (!project || typeof project !== 'object') throw new Error('Некорректные данные проекта.')
  if (typeof project.name !== 'string' || project.name.trim().length < 1 || project.name.length > 64) throw new Error('Название проекта должно содержать от 1 до 64 символов.')
  if (typeof project.region !== 'string' || !project.region.trim() || project.region.length > 80) throw new Error('Укажите регион проекта.')
  if (!Array.isArray(project.rooms) || project.rooms.length < 1 || project.rooms.length > 50) throw new Error('В проекте должно быть от 1 до 50 комнат.')
  for (const room of project.rooms) {
    for (const key of ['length','width','height']) if (!Number.isFinite(room[key]) || room[key] <= 0 || room[key] > 100) throw new Error(`Размер «${key}» должен быть больше нуля и не превышать 100 м.`)
    if (!Array.isArray(room.openings) || room.openings.length > 100) throw new Error('В комнате может быть не более 100 проёмов.')
    const widthsByWall = { north: 0, east: 0, south: 0, west: 0 }
    for (const opening of room.openings) {
      if (!['door','window'].includes(opening.type) || !['north','east','south','west'].includes(opening.wall)) throw new Error('У проёма указан неизвестный тип или стена.')
      if (!Number.isFinite(opening.width) || opening.width <= 0 || !Number.isFinite(opening.height) || opening.height <= 0 || opening.height >= room.height) throw new Error('Проверьте размеры окна или двери и высоту комнаты.')
      const wallLength = opening.wall === 'north' || opening.wall === 'south' ? room.length : room.width
      if (opening.width > wallLength) throw new Error('Ширина проёма не помещается на выбранной стене.')
      widthsByWall[opening.wall] += opening.width
    }
    if (Object.entries(widthsByWall).some(([wall, width]) => width > (wall === 'north' || wall === 'south' ? room.length : room.width))) throw new Error('Суммарная ширина проёмов превышает длину стены.')
  }
  return structuredClone(project)
}
