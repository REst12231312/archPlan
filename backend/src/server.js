import { createHash, randomBytes, scryptSync, timingSafeEqual, randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { db, transaction } from './db.js'
import { calculateEstimate, validateProject } from './domain/estimate.js'

const port = process.env.PORT === '0' ? 0 : Number(process.env.PORT) || 3000
const sessionLifetimeMs = 30 * 24 * 60 * 60 * 1000

class HttpError extends Error { constructor(status, message) { super(message); this.status = status } }
const now = () => new Date().toISOString()
const hashToken = token => createHash('sha256').update(token).digest('hex')
const parseJson = value => JSON.parse(value)

async function readBody(request) {
  let size = 0
  const chunks = []
  for await (const chunk of request) {
    size += chunk.length
    if (size > 1_000_000) throw new HttpError(413, 'Размер запроса превышает 1 МБ.')
    chunks.push(chunk)
  }
  if (!chunks.length) return {}
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) }
  catch { throw new HttpError(400, 'Тело запроса должно содержать корректный JSON.') }
}

function send(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
  response.end(JSON.stringify(payload))
}

function createSession(userId) {
  const token = randomBytes(32).toString('base64url')
  const created = now()
  const expires = new Date(Date.now() + sessionLifetimeMs).toISOString()
  db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)').run(hashToken(token), userId, expires, created)
  return { token, expiresAt: expires }
}

function authenticatedUser(request) {
  const authorization = request.headers.authorization || ''
  const match = authorization.match(/^Bearer ([A-Za-z0-9_-]{40,})$/)
  if (!match) throw new HttpError(401, 'Войдите в аккаунт, чтобы продолжить.')
  const session = db.prepare(`SELECT users.id,users.email,sessions.expires_at
    FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=?`).get(hashToken(match[1]))
  if (!session || session.expires_at <= now()) {
    if (session) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hashToken(match[1]))
    throw new HttpError(401, 'Сеанс завершён. Войдите снова.')
  }
  return { id: session.id, email: session.email }
}

function toProject(row) {
  return { id: row.id, name: row.name, region: row.region, ...parseJson(row.geometry_json), createdAt: row.created_at, updatedAt: row.updated_at }
}

function ownedProject(projectId, userId) {
  const row = db.prepare('SELECT * FROM projects WHERE id=? AND owner_id=?').get(projectId, userId)
  if (!row) throw new HttpError(404, 'Проект не найден.')
  return row
}

function saveVersion(projectId, snapshot) {
  const number = (db.prepare('SELECT COALESCE(MAX(version_number),0)+1 AS next FROM project_versions WHERE project_id=?').get(projectId)).next
  const id = randomUUID()
  const createdAt = now()
  db.prepare('INSERT INTO project_versions(id,project_id,version_number,snapshot_json,created_at) VALUES (?,?,?,?,?)')
    .run(id, projectId, number, JSON.stringify(snapshot), createdAt)
  return { id, number, createdAt, snapshot }
}

async function route(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`)
  const method = request.method || 'GET'
  if (method === 'OPTIONS') { response.writeHead(204); response.end(); return }
  if (method === 'GET' && url.pathname === '/api/health') return send(response, 200, { status: 'ok' })

  if (method === 'POST' && ['/api/auth/register','/api/auth/login'].includes(url.pathname)) {
    const body = await readBody(request)
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) throw new HttpError(400, 'Введите корректный адрес электронной почты.')
    if (password.length < 10 || password.length > 200) throw new HttpError(400, 'Пароль должен содержать от 10 до 200 символов.')
    let user
    if (url.pathname.endsWith('/register')) {
      const salt = randomBytes(16).toString('hex')
      const passwordHash = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`
      const id = randomUUID()
      try { db.prepare('INSERT INTO users(id,email,password_hash,created_at) VALUES (?,?,?,?)').run(id, email, passwordHash, now()) }
      catch (error) { if (String(error.message).includes('UNIQUE')) throw new HttpError(409, 'Аккаунт с таким адресом уже существует.'); throw error }
      user = { id, email }
    } else {
      const record = db.prepare('SELECT id,email,password_hash FROM users WHERE email=?').get(email)
      const [salt, storedHex] = (record?.password_hash || `${'0'.repeat(32)}:${'0'.repeat(128)}`).split(':')
      const candidate = scryptSync(password, salt, 64)
      const valid = record && timingSafeEqual(candidate, Buffer.from(storedHex, 'hex'))
      if (!valid) throw new HttpError(401, 'Неверный адрес электронной почты или пароль.')
      user = { id: record.id, email: record.email }
    }
    return send(response, 200, { user, ...createSession(user.id) })
  }

  if (url.pathname === '/api/materials' && method === 'GET') {
    const materials = db.prepare('SELECT id,name,surface,role,unit,package_size AS packageSize,coverage,coats,default_waste AS defaultWaste,price_kzt AS priceKzt,price_source AS priceSource,seeded_at AS priceObservedAt FROM materials ORDER BY surface,role,name').all()
    return send(response, 200, { items: materials })
  }

  const user = authenticatedUser(request)
  if (url.pathname === '/api/auth/me' && method === 'GET') return send(response, 200, { user })
  if (url.pathname === '/api/auth/logout' && method === 'POST') {
    const token = request.headers.authorization.slice(7)
    db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hashToken(token))
    return send(response, 200, { ok: true })
  }
  if (url.pathname === '/api/projects' && method === 'GET') {
    const rows = db.prepare('SELECT * FROM projects WHERE owner_id=? ORDER BY updated_at DESC').all(user.id)
    return send(response, 200, { items: rows.map(row => ({ id: row.id, name: row.name, region: row.region, rooms: parseJson(row.geometry_json).rooms.length, updatedAt: row.updated_at })) })
  }
  if (url.pathname === '/api/projects' && method === 'POST') {
    const body = await readBody(request)
    const project = validateProject(body.project)
    const id = randomUUID()
    const createdAt = now()
    transaction(() => {
      db.prepare('INSERT INTO projects(id,owner_id,name,region,geometry_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?)')
        .run(id, user.id, project.name, project.region, JSON.stringify({ rooms: project.rooms, walls: project.walls || [] }), createdAt, createdAt)
      saveVersion(id, project)
    })
    return send(response, 201, { project: { id, ...project, createdAt, updatedAt: createdAt } })
  }

  const match = url.pathname.match(/^\/api\/projects\/([0-9a-f-]{36})(?:\/(versions|estimates)(?:\/([0-9a-f-]{36}))?)?$/i)
  if (!match) throw new HttpError(404, 'Маршрут не найден.')
  const [, projectId, resource, resourceId] = match
  const row = ownedProject(projectId, user.id)
  const project = toProject(row)

  if (!resource && method === 'GET') return send(response, 200, { project })
  if (!resource && method === 'PUT') {
    const body = await readBody(request)
    const next = validateProject(body.project)
    const updatedAt = now()
    db.prepare('UPDATE projects SET name=?,region=?,geometry_json=?,updated_at=? WHERE id=? AND owner_id=?')
      .run(next.name, next.region, JSON.stringify({ rooms: next.rooms, walls: next.walls || [] }), updatedAt, projectId, user.id)
    return send(response, 200, { project: { id: projectId, ...next, createdAt: row.created_at, updatedAt } })
  }
  if (resource === 'versions' && method === 'GET' && !resourceId) {
    const versions = db.prepare('SELECT id,version_number AS number,snapshot_json,created_at AS createdAt FROM project_versions WHERE project_id=? ORDER BY version_number DESC').all(projectId)
    return send(response, 200, { items: versions.map(version => ({ ...version, snapshot: parseJson(version.snapshot_json), snapshot_json: undefined })) })
  }
  if (resource === 'versions' && method === 'POST' && !resourceId) {
    const version = transaction(() => saveVersion(projectId, project))
    return send(response, 201, { version })
  }
  if (resource === 'versions' && method === 'GET' && resourceId) {
    const version = db.prepare('SELECT id,version_number AS number,snapshot_json,created_at AS createdAt FROM project_versions WHERE id=? AND project_id=?').get(resourceId, projectId)
    if (!version) throw new HttpError(404, 'Версия проекта не найдена.')
    return send(response, 200, { version: { id: version.id, number: version.number, createdAt: version.createdAt, snapshot: parseJson(version.snapshot_json) } })
  }
  if (resource === 'estimates' && method === 'GET' && !resourceId) {
    const estimates = db.prepare('SELECT id,project_version_id AS projectVersionId,snapshot_json,total_kzt AS totalKzt,created_at AS createdAt FROM estimates WHERE project_id=? ORDER BY created_at DESC').all(projectId)
    return send(response, 200, { items: estimates.map(item => ({ id: item.id, projectVersionId: item.projectVersionId, snapshot: parseJson(item.snapshot_json), totalKzt: item.totalKzt, createdAt: item.createdAt })) })
  }
  if (resource === 'estimates' && method === 'POST' && !resourceId) {
    const body = await readBody(request)
    const catalog = db.prepare('SELECT * FROM materials ORDER BY surface,name').all()
    let saved
    transaction(() => {
      const version = saveVersion(projectId, project)
      const result = calculateEstimate(project, catalog, body)
      const snapshot = { projectName: project.name, region: project.region, projectVersion: version.number, geometry: project.rooms, ...result }
      const id = randomUUID()
      const createdAt = now()
      db.prepare('INSERT INTO estimates(id,project_id,project_version_id,snapshot_json,total_kzt,created_at) VALUES (?,?,?,?,?,?)')
        .run(id, projectId, version.id, JSON.stringify(snapshot), result.totalKzt, createdAt)
      saved = { id, projectVersionId: version.id, snapshot, totalKzt: result.totalKzt, createdAt }
    })
    return send(response, 201, { estimate: saved })
  }
  if (resource === 'estimates' && method === 'GET' && resourceId) {
    const estimate = db.prepare('SELECT id,project_version_id AS projectVersionId,snapshot_json,total_kzt AS totalKzt,created_at AS createdAt FROM estimates WHERE id=? AND project_id=?').get(resourceId, projectId)
    if (!estimate) throw new HttpError(404, 'Сохранённая смета не найдена.')
    return send(response, 200, { estimate: { id: estimate.id, projectVersionId: estimate.projectVersionId, snapshot: parseJson(estimate.snapshot_json), totalKzt: estimate.totalKzt, createdAt: estimate.createdAt } })
  }
  throw new HttpError(405, 'Этот метод недоступен для маршрута.')
}

const server = createServer(async (request, response) => {
  const origin = request.headers.origin
  if (origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin)
    response.setHeader('Vary', 'Origin')
    response.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type')
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS')
  }
  try { await route(request, response) }
  catch (error) {
    const expected = error instanceof HttpError
    if (!expected) console.error('Unexpected API error:', error)
    const status = expected ? error.status : 500
    send(response, status, { error: expected ? error.message : 'Внутренняя ошибка сервера.' })
  }
})

server.listen(port, () => console.log(`ArchPlan API listening on http://localhost:${server.address().port}`))
