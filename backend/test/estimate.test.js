import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateEstimate, geometryAreas, validateProject } from '../src/domain/estimate.js'

const example = {
  name: 'Контрольная комната',
  region: 'Алматы',
  rooms: [{ id: 'room-1', name: 'Комната', length: 5, width: 4, height: 2.7, openings: [
    { id: 'door-1', type: 'door', wall: 'south', width: 0.9, height: 2.1 },
    { id: 'window-1', type: 'window', wall: 'north', width: 1.6, height: 1.4 },
  ] }],
}

const catalog = [
  { id: 'laminate', name: 'Ламинат', surface: 'floor', role: 'finish', unit: 'м²', package_size: 2.2, coverage: 1, coats: 1, default_waste: 10, price_kzt: 6500, price_source: 'Проверка', seeded_at: '2026-10-28T00:00:00.000Z' },
  { id: 'wall-paint', name: 'Краска', surface: 'walls', role: 'finish', unit: 'л', package_size: 9, coverage: 10, coats: 2, default_waste: 10, price_kzt: 23500, price_source: 'Проверка', seeded_at: '2026-10-28T00:00:00.000Z' },
  { id: 'ceiling-paint', name: 'Потолочная краска', surface: 'ceiling', role: 'finish', unit: 'л', package_size: 9, coverage: 10, coats: 2, default_waste: 10, price_kzt: 23500, price_source: 'Проверка', seeded_at: '2026-10-28T00:00:00.000Z' },
  { id: 'primer', name: 'Грунтовка', surface: 'walls', role: 'primer', unit: 'л', package_size: 10, coverage: 10, coats: 1, default_waste: 10, price_kzt: 6500, price_source: 'Проверка', seeded_at: '2026-10-28T00:00:00.000Z' },
]

test('control room calculates 20 m² floor, subtracts openings from walls and keeps ceiling equal to floor', () => {
  const areas = geometryAreas(example)
  assert.equal(areas.floor, 20)
  assert.equal(areas.ceiling, 20)
  assert.ok(Math.abs(areas.walls - 44.47) < 1e-9)
})

test('10% reserve rounds 5 × 4 laminate up to 10 packs at 65,000 ₸', () => {
  const estimate = calculateEstimate(example, catalog)
  const floor = estimate.items.find(item => item.surface === 'floor')
  assert.equal(floor.needed, 22)
  assert.equal(floor.packageCount, 10)
  assert.equal(floor.costKzt, 65000)
})

test('estimate stores integer KZT line totals and separates work and delivery', () => {
  const estimate = calculateEstimate(example, catalog, { worksKzt: 120001, deliveryKzt: 2500 })
  assert.ok(estimate.items.every(item => Number.isSafeInteger(item.costKzt)))
  assert.equal(estimate.totalKzt, estimate.materialsKzt + 122501)
})

test('manual prices and surface assignments are reflected in the frozen calculation', () => {
  const estimate = calculateEstimate(example, catalog, {
    assignments: { floor: 'laminate', walls: 'wall-paint', ceiling: 'ceiling-paint' },
    prices: { laminate: 7000 },
    wastes: { laminate: 15 },
  })
  const floor = estimate.items.find(item => item.surface === 'floor')
  assert.equal(floor.packageCount, 11)
  assert.equal(floor.unitPriceKzt, 7000)
  assert.equal(floor.wastePercent, 15)
  assert.equal(floor.priceSource, 'Ручная цена клиента')
})

test('rejects impossible openings, unsupported surfaces, fractional money and out-of-range waste', () => {
  assert.throws(() => validateProject({ ...example, rooms: [{ ...example.rooms[0], openings: [{ type: 'door', wall: 'north', width: 6, height: 2 }] }] }), /не помещается/)
  assert.throws(() => calculateEstimate(example, catalog, { assignments: { floor: 'wall-paint' } }), /Не выбран материал/)
  assert.throws(() => calculateEstimate(example, catalog, { prices: { laminate: 1000.5 } }), /целым/)
  assert.throws(() => calculateEstimate(example, catalog, { wastes: { laminate: 51 } }), /от 0 до 50/)
})

test('rejects a room whose wall opening is taller than the room', () => {
  const invalid = structuredClone(example)
  invalid.rooms[0].openings[0].height = 2.8
  assert.throws(() => validateProject(invalid), /размеры окна или двери/)
})
