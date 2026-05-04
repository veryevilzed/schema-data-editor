import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  AppDocument,
  DataMap,
  ID,
  Schema,
  StorageFormat,
} from '../shared/schema';

const SCHEMA_FILE = 'schema.json';
const SINGLE_JSON_FILE = 'data.json';

async function ensureDir(p: string): Promise<void> {
  await fs.mkdir(p, { recursive: true });
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  if (!(await pathExists(filePath))) return fallback;
  const raw = await fs.readFile(filePath, 'utf-8');
  if (!raw.trim()) return fallback;
  return JSON.parse(raw) as T;
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(value, null, 2) + '\n', 'utf-8');
}

export async function readSchema(projectPath: string): Promise<Schema | null> {
  const file = path.join(projectPath, SCHEMA_FILE);
  if (!(await pathExists(file))) return null;
  const raw = await fs.readFile(file, 'utf-8');
  return JSON.parse(raw) as Schema;
}

export async function writeSchema(projectPath: string, schema: Schema): Promise<void> {
  await writeJson(path.join(projectPath, SCHEMA_FILE), schema);
}

function dataDirOf(projectPath: string, schema: Schema): string {
  return path.join(projectPath, schema.storage.dataDir);
}

export async function readAllData(
  projectPath: string,
  schema: Schema,
): Promise<DataMap> {
  const dataDir = dataDirOf(projectPath, schema);
  await ensureDir(dataDir);
  const result: DataMap = {};
  for (const name of schema.entityOrder) {
    result[name] = await readCollection(dataDir, schema.storage.format, name);
  }
  return result;
}

async function readCollection(
  dataDir: string,
  format: StorageFormat,
  entityName: string,
): Promise<AppDocument[]> {
  switch (format) {
    case 'single-json': {
      const file = path.join(dataDir, SINGLE_JSON_FILE);
      const all = await readJson<Record<string, AppDocument[]>>(file, {});
      return all[entityName] ?? [];
    }
    case 'file-per-collection': {
      const file = path.join(dataDir, `${entityName}.json`);
      return readJson<AppDocument[]>(file, []);
    }
    case 'file-per-doc': {
      const dir = path.join(dataDir, entityName);
      if (!(await pathExists(dir))) return [];
      const entries = await fs.readdir(dir);
      const docs: AppDocument[] = [];
      for (const entry of entries) {
        if (!entry.endsWith('.json')) continue;
        const file = path.join(dir, entry);
        const doc = await readJson<AppDocument | null>(file, null);
        if (doc) docs.push(doc);
      }
      docs.sort((a, b) => compareIds(a.id, b.id));
      return docs;
    }
  }
}

function compareIds(a: ID, b: ID): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

async function writeCollection(
  dataDir: string,
  format: StorageFormat,
  entityName: string,
  docs: AppDocument[],
): Promise<void> {
  switch (format) {
    case 'single-json': {
      const file = path.join(dataDir, SINGLE_JSON_FILE);
      const all = await readJson<Record<string, AppDocument[]>>(file, {});
      all[entityName] = docs;
      await writeJson(file, all);
      return;
    }
    case 'file-per-collection': {
      const file = path.join(dataDir, `${entityName}.json`);
      await writeJson(file, docs);
      return;
    }
    case 'file-per-doc': {
      const dir = path.join(dataDir, entityName);
      await ensureDir(dir);
      const existing = new Set(
        (await fs.readdir(dir).catch(() => [])).filter((f) => f.endsWith('.json')),
      );
      const wanted = new Set<string>();
      for (const doc of docs) {
        const fname = `${String(doc.id)}.json`;
        wanted.add(fname);
        await writeJson(path.join(dir, fname), doc);
      }
      for (const fname of existing) {
        if (!wanted.has(fname)) {
          await fs.unlink(path.join(dir, fname)).catch(() => {});
        }
      }
      return;
    }
  }
}

export async function saveDocument(
  projectPath: string,
  schema: Schema,
  entityName: string,
  doc: AppDocument,
): Promise<AppDocument> {
  const dataDir = dataDirOf(projectPath, schema);
  await ensureDir(dataDir);
  const docs = await readCollection(dataDir, schema.storage.format, entityName);
  const idx = docs.findIndex((d) => String(d.id) === String(doc.id));
  if (idx >= 0) {
    docs[idx] = doc;
  } else {
    docs.push(doc);
  }

  if (schema.storage.format === 'file-per-doc') {
    const dir = path.join(dataDir, entityName);
    await ensureDir(dir);
    await writeJson(path.join(dir, `${String(doc.id)}.json`), doc);
  } else {
    await writeCollection(dataDir, schema.storage.format, entityName, docs);
  }

  return doc;
}

export async function deleteDocument(
  projectPath: string,
  schema: Schema,
  entityName: string,
  docId: ID,
): Promise<void> {
  const dataDir = dataDirOf(projectPath, schema);
  if (schema.storage.format === 'file-per-doc') {
    const file = path.join(dataDir, entityName, `${String(docId)}.json`);
    await fs.unlink(file).catch(() => {});
    return;
  }
  const docs = await readCollection(dataDir, schema.storage.format, entityName);
  const next = docs.filter((d) => String(d.id) !== String(docId));
  await writeCollection(dataDir, schema.storage.format, entityName, next);
}

export async function migrateSchemaChange(
  projectPath: string,
  prevSchema: Schema,
  nextSchema: Schema,
): Promise<void> {
  const prevDir = dataDirOf(projectPath, prevSchema);
  const nextDir = dataDirOf(projectPath, nextSchema);

  const allData: DataMap = {};
  if (await pathExists(prevDir)) {
    for (const name of prevSchema.entityOrder) {
      const docs = await readCollection(prevDir, prevSchema.storage.format, name);
      if (nextSchema.entities[name]) {
        allData[name] = docs;
      }
    }
  }

  for (const name of nextSchema.entityOrder) {
    if (!allData[name]) allData[name] = [];
  }

  const formatChanged = prevSchema.storage.format !== nextSchema.storage.format;
  const dirChanged = prevDir !== nextDir;

  if (formatChanged || dirChanged) {
    await ensureDir(nextDir);
    for (const name of nextSchema.entityOrder) {
      await writeCollection(nextDir, nextSchema.storage.format, name, allData[name]);
    }
    if (dirChanged && (await pathExists(prevDir))) {
      await fs.rm(prevDir, { recursive: true, force: true });
    } else if (formatChanged) {
      await cleanupOldFormat(prevDir, prevSchema.storage.format, prevSchema);
    }
  } else {
    for (const oldName of prevSchema.entityOrder) {
      if (!nextSchema.entities[oldName]) {
        await deleteCollection(nextDir, nextSchema.storage.format, oldName);
      }
    }
  }
}

async function deleteCollection(
  dataDir: string,
  format: StorageFormat,
  entityName: string,
): Promise<void> {
  switch (format) {
    case 'single-json': {
      const file = path.join(dataDir, SINGLE_JSON_FILE);
      const all = await readJson<Record<string, AppDocument[]>>(file, {});
      delete all[entityName];
      await writeJson(file, all);
      return;
    }
    case 'file-per-collection': {
      const file = path.join(dataDir, `${entityName}.json`);
      await fs.unlink(file).catch(() => {});
      return;
    }
    case 'file-per-doc': {
      const dir = path.join(dataDir, entityName);
      await fs.rm(dir, { recursive: true, force: true });
      return;
    }
  }
}

async function cleanupOldFormat(
  dataDir: string,
  format: StorageFormat,
  schema: Schema,
): Promise<void> {
  if (!(await pathExists(dataDir))) return;
  switch (format) {
    case 'single-json': {
      await fs.unlink(path.join(dataDir, SINGLE_JSON_FILE)).catch(() => {});
      return;
    }
    case 'file-per-collection': {
      for (const name of schema.entityOrder) {
        await fs.unlink(path.join(dataDir, `${name}.json`)).catch(() => {});
      }
      return;
    }
    case 'file-per-doc': {
      for (const name of schema.entityOrder) {
        await fs
          .rm(path.join(dataDir, name), { recursive: true, force: true })
          .catch(() => {});
      }
      return;
    }
  }
}
