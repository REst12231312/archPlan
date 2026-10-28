import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { once } from 'node:events'

const backendRoot = resolve(import.meta.dirname, '..')
const tempRoot = mkdtempSync(join(tmpdir(), 'archplan-api-test-'))
let processHandle
let baseUrl
let outputBuffer = ''

before(async () => {
  processHandle = spawn(process.execPath, ['--experimental-sqlite', resolve(backendRoot, 'src/server.js')], {
    cwd: backendRoot,
    env: { ...process.env, PORT: '0', ARCHPLAN_DB_PATH: join(tempRoot, 'integration.sqlite') },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  processHandle.stdout.setEncoding('utf8')
  const startPromise = new Promise((resolveReady, reject) => {
    const timer = setTimeout(() => reject(new Error(`API did not start. Output: ${outputBuffer}`)), 10000)
    processHandle.stdout.on('data', chunk => {
      outputBuffer += chunk
      const match = outputBuffer.match(/localhost:(\d+)/)
      if (match) { clearTimeout(timer); baseUrl = `http://localhost:${match[1]}`; resolveReady() }
    })
    processHandle.once('error', reject)
    processHandle.once('exit', code => { if (!baseUrl) reject(new Error(`API exited early (${code}). ${outputBuffer}`)) })
  })
  await startPromise
})

after(async () => {
  if (processHandle && processHandle.exitCode === null) {
    processHandle.kill()
    await Promise.race([once(processHandle, 'exit'), new Promise(resolveDone => setTimeout(resolveDone, 1500))])
  }
  const safeRoot = resolve(tempRoot)
  if (!safeRoot.startsWith(resolve(tmpdir()) + '\\') || !safeRoot.includes('archplan-api-test-')) throw new Error(`Refusing to remove unexpected test path: ${safeRoot}`)
  rmSync(safeRoot, { recursive: true, force: true })
})

async function request(path, { token, method = 'GET', body } = {}) {
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (body !== undefined) headers.set('Content-Type', 'application/json')
  const response = await fetch(`${baseUrl}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  return { status: response.status, data: await response.json() }
}

test('account, projects, immutable estimates, ownership checks, and sessions work through HTTP', async () => {
  assert.deepEqual((await request('/api/health')).data, { status: 'ok' })
  assert.equal((await request('/api/projects')).status, 401)
  assert.equal((await request('/api/materials')).data.items.length, 6)

  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const credentials = { email: `test-${suffix}@example.test`, password: 'secure-test-password-123' }
  const registered = await request('/api/auth/register', { method: 'POST', body: credentials })
  assert.equal(registered.status, 200)
  const token = registered.data.token
  const projectBody = { project: {
    name: 'Контрольная комната', region: 'Алматы', rooms: [{ id: 'room-1', name: 'Комната', length: 5, width: 4, height: 2.7, openings: [
      { id: 'door-1', type: 'door', wall: 'south', width: 0.9, height: 2.1 },
      { id: 'window-1', type: 'window', wall: 'north', width: 1.6, height: 1.4 },
    ] }],
  } }
  const created = await request('/api/projects', { method: 'POST', token, body: projectBody })
  assert.equal(created.status, 201)
  const projectId = created.data.project.id
  assert.equal((await request('/api/projects', { token })).data.items.length, 1)

  const version = await request(`/api/projects/${projectId}/versions`, { method: 'POST', token })
  assert.equal(version.data.version.number, 2)
  const saved = await request(`/api/projects/${projectId}/estimates`, { method: 'POST', token, body: {
    assignments: { floor: 'laminate-standard', walls: 'paint-wall-standard', ceiling: 'paint-ceiling-standard', primer: 'primer-standard' },
    prices: { 'laminate-standard': 6500 }, wastes: { 'laminate-standard': 10 }, worksKzt: 120001, deliveryKzt: 2500,
  } })
  assert.equal(saved.status, 201)
  assert.equal(saved.data.estimate.snapshot.areas.floor, 20)
  assert.equal(saved.data.estimate.snapshot.areas.walls, 44.47)
  assert.equal(saved.data.estimate.snapshot.items.find(item => item.surface === 'floor').packageCount, 10)
  assert.equal(saved.data.estimate.snapshot.items.find(item => item.surface === 'floor').unitPriceKzt, 6500)
  assert.equal(saved.data.estimate.snapshot.items.length, 4)
  assert.equal(saved.data.estimate.snapshot.items.find(item => item.surface === 'floor').priceObservedAt.length > 0, true)
  assert.equal(saved.data.estimate.snapshot.worksKzt, 120001)
  assert.equal((await request(`/api/projects/${projectId}/estimates`, { token })).data.items.length, 1)

  const secondAccount = await request('/api/auth/register', { method: 'POST', body: { email: `other-${suffix}@example.test`, password: 'secure-test-password-123' } })
  assert.equal((await request(`/api/projects/${projectId}`, { token: secondAccount.data.token })).status, 404)
  assert.equal((await request('/api/auth/logout', { method: 'POST', token })).status, 200)
  assert.equal((await request(`/api/projects/${projectId}`, { token })).status, 401)
})
