import { app, BrowserWindow, ipcMain, dialog, nativeTheme } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { v4 as uuidv4 } from 'uuid';
import archiver from 'archiver';

import { IPC_CHANNELS } from '../shared/ipc';
import {
  emptySchema,
  isAttachmentField,
  type AppDocument,
  type AttachmentValue,
  type ID,
  type ProjectSnapshot,
  type Schema,
} from '../shared/schema';
import {
  deleteAttachment,
  deleteDocument,
  deleteDocumentAttachments,
  migrateSchemaChange,
  readAllData,
  readAttachment,
  readSchema,
  saveDocument,
  writeAttachment,
  writeSchema,
} from './storage';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MAX_RECENT = 10;
const isDev = !!process.env.ELECTRON_RENDERER_URL;

function recentProjectsFile(): string {
  return path.join(app.getPath('userData'), 'recent-projects.json');
}

async function getRecentProjects(): Promise<string[]> {
  try {
    const raw = await fs.readFile(recentProjectsFile(), 'utf-8');
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

async function pushRecentProject(folderPath: string): Promise<void> {
  const list = await getRecentProjects();
  const filtered = list.filter((p) => p !== folderPath);
  filtered.unshift(folderPath);
  const trimmed = filtered.slice(0, MAX_RECENT);
  await fs.mkdir(path.dirname(recentProjectsFile()), { recursive: true });
  await fs.writeFile(recentProjectsFile(), JSON.stringify(trimmed, null, 2), 'utf-8');
}

async function loadProject(folderPath: string): Promise<ProjectSnapshot> {
  let schema = await readSchema(folderPath);
  if (!schema) {
    schema = emptySchema();
    await writeSchema(folderPath, schema);
  }
  const data = await readAllData(folderPath, schema);
  await pushRecentProject(folderPath);
  return { projectPath: folderPath, schema, data };
}

async function createProject(folderPath: string): Promise<ProjectSnapshot> {
  await fs.mkdir(folderPath, { recursive: true });
  const schema = emptySchema();
  await writeSchema(folderPath, schema);
  await pushRecentProject(folderPath);
  return { projectPath: folderPath, schema, data: {} };
}

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0b0d12' : '#ffffff',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
  return win;
}

function registerIpc(): void {
  ipcMain.handle(
    IPC_CHANNELS.pickProjectFolder,
    async (
      _e,
      mode: 'open' | 'create',
      options?: { title?: string; buttonLabel?: string },
    ) => {
      const win = BrowserWindow.getFocusedWindow();
      if (!win) return null;
      const result = await dialog.showOpenDialog(win, {
        properties: [
          'openDirectory',
          ...(mode === 'create' ? (['createDirectory'] as const) : []),
        ],
        buttonLabel: options?.buttonLabel,
        title: options?.title,
      });
      if (result.canceled || result.filePaths.length === 0) return null;
      return result.filePaths[0];
    },
  );

  ipcMain.handle(IPC_CHANNELS.openProject, async (_e, folderPath: string) => {
    return loadProject(folderPath);
  });

  ipcMain.handle(IPC_CHANNELS.createProject, async (_e, folderPath: string) => {
    return createProject(folderPath);
  });

  ipcMain.handle(
    IPC_CHANNELS.saveSchema,
    async (_e, folderPath: string, schema: Schema, prevSchema: Schema) => {
      await migrateSchemaChange(folderPath, prevSchema, schema);
      await writeSchema(folderPath, schema);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.saveDocument,
    async (
      _e,
      folderPath: string,
      schema: Schema,
      entityName: string,
      doc: AppDocument,
    ) => {
      const entity = schema.entities[entityName];
      if (!entity) throw new Error(`Entity ${entityName} not found`);

      let finalDoc = doc;
      if (doc.id === undefined || doc.id === null || doc.id === '') {
        const id =
          entity.idStrategy === 'uuid'
            ? uuidv4()
            : await allocateAutoIncId(folderPath, schema, entityName);
        finalDoc = { ...doc, id };
      }

      finalDoc = await processAttachments(folderPath, schema, entityName, finalDoc);

      const saved = await saveDocument(folderPath, schema, entityName, finalDoc);
      return saved;
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.deleteDocument,
    async (
      _e,
      folderPath: string,
      schema: Schema,
      entityName: string,
      docId: ID,
    ) => {
      await deleteDocument(folderPath, schema, entityName, docId);
      await deleteDocumentAttachments(folderPath, schema, entityName, docId);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.readAttachment,
    async (_e, folderPath: string, schema: Schema, relPath: string) => {
      return readAttachment(folderPath, schema, relPath);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.downloadAttachment,
    async (_e, folderPath: string, schema: Schema, value: AttachmentValue) => {
      const win = BrowserWindow.getFocusedWindow();
      if (!win) return null;
      const result = await dialog.showSaveDialog(win, {
        defaultPath: value.name || 'download',
      });
      if (result.canceled || !result.filePath) return null;
      const target = result.filePath;
      if (value.path) {
        const src = path.join(folderPath, schema.storage.dataDir, value.path);
        await fs.copyFile(src, target);
      } else if (value.data) {
        const m = value.data.match(/^data:[^;]+;base64,(.+)$/s);
        const base64 = m ? m[1] : value.data;
        await fs.writeFile(target, Buffer.from(base64, 'base64'));
      } else {
        return null;
      }
      return target;
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.createBackup,
    async (_e, folderPath: string, schema: Schema) => {
      const win = BrowserWindow.getFocusedWindow();
      if (!win) return null;
      const baseName = path.basename(folderPath.replace(/[\\/]+$/, '')) || 'project';
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const defaultName = `${baseName}-${stamp}.zip`;
      const result = await dialog.showSaveDialog(win, {
        defaultPath: path.join(path.dirname(folderPath), defaultName),
        filters: [{ name: 'ZIP archive', extensions: ['zip'] }],
      });
      if (result.canceled || !result.filePath) return null;
      const target = result.filePath;
      await createBackupZip(folderPath, schema, target);
      return target;
    },
  );

  ipcMain.handle(IPC_CHANNELS.getRecentProjects, async () => {
    const list = await getRecentProjects();
    const checked: string[] = [];
    for (const p of list) {
      try {
        const stat = await fs.stat(p);
        if (stat.isDirectory()) checked.push(p);
      } catch {
        // skip missing
      }
    }
    return checked;
  });

  ipcMain.handle(
    IPC_CHANNELS.setTheme,
    async (_e, theme: 'light' | 'dark' | 'system') => {
      nativeTheme.themeSource = theme;
    },
  );
}

async function createBackupZip(
  folderPath: string,
  schema: Schema,
  targetZip: string,
): Promise<void> {
  await fs.mkdir(path.dirname(targetZip), { recursive: true });

  const schemaPath = path.join(folderPath, 'schema.json');
  const dataDir = path.join(folderPath, schema.storage.dataDir);
  const hasSchema = await fs
    .access(schemaPath)
    .then(() => true, () => false);
  const hasDataDir = await fs.access(dataDir).then(() => true, () => false);

  const out = createWriteStream(targetZip);
  const archive = archiver('zip', { zlib: { level: 9 } });

  return new Promise<void>((resolve, reject) => {
    out.on('close', resolve);
    out.on('error', reject);
    archive.on('error', reject);
    archive.on('warning', (err) => {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') reject(err);
    });
    archive.pipe(out);

    if (hasSchema) archive.file(schemaPath, { name: 'schema.json' });
    if (hasDataDir) archive.directory(dataDir, schema.storage.dataDir);
    archive.finalize();
  });
}

async function processAttachments(
  folderPath: string,
  schema: Schema,
  entityName: string,
  doc: AppDocument,
): Promise<AppDocument> {
  const entity = schema.entities[entityName];
  const existingDocs = await readAllData(folderPath, schema);
  const oldDoc = (existingDocs[entityName] ?? []).find(
    (d) => String(d.id) === String(doc.id),
  );
  const result: AppDocument = { ...doc };

  for (const fname of entity.fieldOrder) {
    const f = entity.fields[fname];
    if (!isAttachmentField(f)) continue;
    const newVal = doc[fname] as AttachmentValue | null | undefined;
    const oldVal = oldDoc?.[fname] as AttachmentValue | null | undefined;

    if (newVal === undefined || newVal === null) {
      if (oldVal && oldVal.path) {
        await deleteAttachment(folderPath, schema, oldVal.path);
      }
      result[fname] = null;
      continue;
    }

    if (newVal.pending && newVal.data) {
      const match = newVal.data.match(/^data:([^;]+);base64,(.+)$/s);
      const mime = match ? match[1] : newVal.mime || 'application/octet-stream';
      const base64Body = match ? match[2] : newVal.data;

      if (f.storage === 'external') {
        if (oldVal && oldVal.path) {
          await deleteAttachment(folderPath, schema, oldVal.path);
        }
        const written = await writeAttachment(
          folderPath,
          schema,
          entityName,
          doc.id,
          fname,
          base64Body,
          newVal.name,
        );
        result[fname] = {
          name: newVal.name,
          size: newVal.size || written.size,
          mime,
          path: written.relPath,
        };
      } else {
        if (oldVal && oldVal.path) {
          await deleteAttachment(folderPath, schema, oldVal.path);
        }
        result[fname] = {
          name: newVal.name,
          size: newVal.size,
          mime,
          data: `data:${mime};base64,${base64Body}`,
        };
      }
      continue;
    }

    const cleaned: AttachmentValue = {
      name: newVal.name,
      size: newVal.size,
      mime: newVal.mime,
    };
    if (newVal.path) cleaned.path = newVal.path;
    if (newVal.data && !newVal.path) cleaned.data = newVal.data;
    result[fname] = cleaned;
  }

  return result;
}

async function allocateAutoIncId(
  folderPath: string,
  schema: Schema,
  entityName: string,
): Promise<number> {
  const entity = schema.entities[entityName];
  const data = await readAllData(folderPath, schema);
  const docs = data[entityName] ?? [];
  const maxExisting = docs.reduce((m, d) => {
    const v = typeof d.id === 'number' ? d.id : Number(d.id);
    return Number.isFinite(v) && v > m ? v : m;
  }, 0);
  const next = Math.max(entity.nextId ?? 1, maxExisting + 1);
  entity.nextId = next + 1;
  await writeSchema(folderPath, schema);
  return next;
}

app.whenReady().then(() => {
  registerIpc();
  createMainWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
