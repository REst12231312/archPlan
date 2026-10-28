export const PROJECT_KEY = 'archplan:project:v1'

export const DEFAULT_PROJECT = {
  name: 'Квартира · ремонт',
  region: 'Алматы',
  rooms: [{ id: 'room-main', name: 'Гостиная', length: 5, width: 4, height: 2.7, openings: [
    { id: 'door-main', type: 'door', wall: 'south', width: 0.9, height: 2.1 },
    { id: 'window-main', type: 'window', wall: 'north', width: 1.6, height: 1.4 },
  ] }],
  versions: [],
}

export function readProject() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROJECT_KEY) || 'null')
    if (saved?.rooms?.length) return { ...DEFAULT_PROJECT, ...saved }
  } catch { /* Start from the example project if saved data is unreadable. */ }
  return structuredClone(DEFAULT_PROJECT)
}

export function saveProject(project) {
  localStorage.setItem(PROJECT_KEY, JSON.stringify(project))
}

export function roomAreas(room) {
  const floor = Math.max(0, Number(room.length) || 0) * Math.max(0, Number(room.width) || 0)
  const perimeter = 2 * ((Number(room.length) || 0) + (Number(room.width) || 0))
  const openings = (room.openings || []).reduce((sum, item) => sum + (Number(item.width) || 0) * (Number(item.height) || 0), 0)
  return { floor, walls: Math.max(0, perimeter * (Number(room.height) || 0) - openings), ceiling: floor }
}

export function projectAreas(project) {
  return project.rooms.reduce((total, room) => {
    const areas = roomAreas(room)
    total.floor += areas.floor
    total.walls += areas.walls
    total.ceiling += areas.ceiling
    return total
  }, { floor: 0, walls: 0, ceiling: 0 })
}
