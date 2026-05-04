import { app, BrowserWindow, ipcMain, dialog, nativeTheme } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { v4 as uuidv4 } from 'uuid';

import { IPC_CHANNELS } from '../shared/ipc';
import {
  emptySchema,
  type AppDocument,
  type ID,
  type ProjectSnapshot,
  type Schema,
} from '../shared/schema';
import {
  deleteDocument,
  migrateSchemaChange,
  readAllData,
  readSchema,
  saveDocument,
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
