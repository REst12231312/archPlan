import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const databasePath = resolve(process.env.ARCHPLAN_DB_PATH || 'storage/archplan.sqlite')
mkdirSync(dirname(databasePath), { recursive: true })
export const db = new DatabaseSync(databasePath)
db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;')
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL, region TEXT NOT NULL, geometry_json TEXT NOT NULL,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS projects_owner_updated ON projects(owner_id, updated_at DESC);
  CREATE TABLE IF NOT EXISTS project_versions (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL, snapshot_json TEXT NOT NULL, created_at TEXT NOT NULL,
    UNIQUE(project_id, version_number)
  );
  CREATE TABLE IF NOT EXISTS materials (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, surface TEXT NOT NULL, role TEXT NOT NULL, unit TEXT NOT NULL,
    package_size REAL NOT NULL, coverage REAL NOT NULL, coats INTEGER NOT NULL,
    default_waste REAL NOT NULL, price_kzt INTEGER NOT NULL, price_source TEXT NOT NULL,
    seeded_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS estimates (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    project_version_id TEXT NOT NULL REFERENCES project_versions(id), snapshot_json TEXT NOT NULL,
    total_kzt INTEGER NOT NULL, created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS estimates_project_created ON estimates(project_id, created_at DESC);
`)

// Keep earlier local MVP databases usable when the catalog gains surface roles.
const materialColumns = db.prepare('PRAGMA table_info(materials)').all().map(column => column.name)
if (!materialColumns.includes('role')) db.exec("ALTER TABLE materials ADD COLUMN role TEXT NOT NULL DEFAULT 'finish'")
db.prepare("UPDATE materials SET role='primer' WHERE id='primer-standard'").run()

const now = new Date().toISOString()
const insertMaterial = db.prepare(`INSERT OR IGNORE INTO materials
  (id,name,surface,role,unit,package_size,coverage,coats,default_waste,price_kzt,price_source,seeded_at)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
for (const row of [
  ['laminate-standard', 'Ламинат базовый', 'floor', 'finish', 'м²', 2.2, 1, 1, 10, 6500],
  ['laminate-premium', 'Ламинат усиленный', 'floor', 'finish', 'м²', 1.8, 1, 1, 10, 9400],
  ['paint-wall-standard', 'Краска для стен', 'walls', 'finish', 'л', 9, 10, 2, 10, 23500],
  ['paint-wall-premium', 'Краска моющаяся для стен', 'walls', 'finish', 'л', 9, 12, 2, 10, 31900],
  ['paint-ceiling-standard', 'Краска для потолка', 'ceiling', 'finish', 'л', 9, 10, 2, 10, 23500],
  ['primer-standard', 'Грунтовка', 'walls', 'primer', 'л', 10, 10, 1, 10, 6500],
]) insertMaterial.run(...row, 'Ориентир ArchPlan', now)

export function transaction(callback) {
  db.exec('BEGIN IMMEDIATE')
  try { const result = callback(); db.exec('COMMIT'); return result }
  catch (error) { db.exec('ROLLBACK'); throw error }
}
