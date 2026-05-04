import { create } from 'zustand';
import type {
  AppDocument,
  DataMap,
  Entity,
  Field,
  ID,
  IdStrategy,
  ProjectSnapshot,
  Schema,
  StorageFormat,
} from '@shared/schema';
import { defaultFieldFor, emptyEntity } from '@shared/schema';
import { bumpAttachmentCache } from '@/lib/attachments';

type Mode = 'schema' | 'data';

export interface ProjectState {
  projectPath: string | null;
  schema: Schema | null;
  data: DataMap;
  mode: Mode;
  selectedEntity: string | null;
  loading: boolean;
  error: string | null;
  recents: string[];

  loadRecents: () => Promise<void>;
  pickAndOpen: (labels?: { title?: string; buttonLabel?: string }) => Promise<void>;
  pickAndCreate: (labels?: { title?: string; buttonLabel?: string }) => Promise<void>;
  open: (path: string) => Promise<void>;
  close: () => void;
  setMode: (mode: Mode) => void;
  selectEntity: (name: string | null) => void;

  addEntity: (name: string, idStrategy: IdStrategy) => Promise<void>;
  removeEntity: (name: string) => Promise<void>;
  setEntityIdStrategy: (name: string, strategy: IdStrategy) => Promise<void>;
  setDisplayField: (entityName: string, fieldName: string | null) => Promise<void>;

  addField: (entityName: string, fieldName: string, type: Field['type']) => Promise<void>;
  removeField: (entityName: string, fieldName: string) => Promise<void>;
  updateField: (entityName: string, fieldName: string, field: Field) => Promise<void>;
  reorderField: (entityName: string, fieldName: string, direction: -1 | 1) => Promise<void>;

  setStorageFormat: (format: StorageFormat) => Promise<void>;
  setDataDir: (dir: string) => Promise<void>;
  setDefaultIdStrategy: (strategy: IdStrategy) => Promise<void>;

  saveDocument: (entityName: string, doc: AppDocument) => Promise<AppDocument>;
  deleteDocument: (entityName: string, id: ID) => Promise<void>;
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

async function persistSchema(
  path: string,
  prev: Schema,
  next: Schema,
): Promise<void> {
  await window.api.saveSchema(path, next, prev);
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projectPath: null,
  schema: null,
  data: {},
  mode: 'schema',
  selectedEntity: null,
  loading: false,
  error: null,
  recents: [],

  async loadRecents() {
    const recents = await window.api.getRecentProjects();
    set({ recents });
  },

  async pickAndOpen(labels) {
    const folder = await window.api.pickProjectFolder('open', labels);
    if (!folder) return;
    await get().open(folder);
  },

  async pickAndCreate(labels) {
    const folder = await window.api.pickProjectFolder('create', labels);
    if (!folder) return;
    set({ loading: true, error: null });
    try {
      const snap = await window.api.createProject(folder);
      applySnapshot(set, snap);
      set({ mode: 'schema', selectedEntity: null });
    } catch (err) {
      set({ error: (err as Error).message });
    } finally {
      set({ loading: false });
    }
    await get().loadRecents();
  },

  async open(path: string) {
    set({ loading: true, error: null });
    try {
      const snap = await window.api.openProject(path);
      applySnapshot(set, snap);
      const firstEntity = snap.schema.entityOrder[0] ?? null;
      set({
        mode: snap.schema.entityOrder.length === 0 ? 'schema' : 'data',
        selectedEntity: firstEntity,
      });
    } catch (err) {
      set({ error: (err as Error).message });
    } finally {
      set({ loading: false });
    }
    await get().loadRecents();
  },

  close() {
    set({
      projectPath: null,
      schema: null,
      data: {},
      selectedEntity: null,
      mode: 'schema',
      error: null,
    });
  },

  setMode(mode) {
    set({ mode });
  },

  selectEntity(name) {
    set({ selectedEntity: name });
  },

  async addEntity(name, idStrategy) {
    const { schema, projectPath, data } = get();
    if (!schema || !projectPath) return;
    if (schema.entities[name]) return;
    const prev = clone(schema);
    const next = clone(schema);
    next.entities[name] = emptyEntity(name, idStrategy);
    next.entityOrder.push(name);
    await persistSchema(projectPath, prev, next);
    set({
      schema: next,
      data: { ...data, [name]: [] },
      selectedEntity: name,
    });
  },

  async removeEntity(name) {
    const { schema, projectPath, data, selectedEntity } = get();
    if (!schema || !projectPath) return;
    if (!schema.entities[name]) return;
    const prev = clone(schema);
    const next = clone(schema);
    delete next.entities[name];
    next.entityOrder = next.entityOrder.filter((e) => e !== name);
    for (const otherName of next.entityOrder) {
      const ent = next.entities[otherName];
      for (const fieldName of ent.fieldOrder) {
        const f = ent.fields[fieldName];
        if (f.type === 'relation' && f.target === name) {
          delete ent.fields[fieldName];
          ent.fieldOrder = ent.fieldOrder.filter((x) => x !== fieldName);
        }
      }
    }
    await persistSchema(projectPath, prev, next);
    const nextData = { ...data };
    delete nextData[name];
    for (const e of next.entityOrder) {
      const ent = next.entities[e];
      const docs = nextData[e] ?? [];
      const cleaned = docs.map((doc) => {
        let changed = false;
        const c: AppDocument = { ...doc };
        for (const fname of Object.keys(c)) {
          if (fname === 'id') continue;
          if (!ent.fields[fname]) {
            delete c[fname];
            changed = true;
          }
        }
        return changed ? c : doc;
      });
      nextData[e] = cleaned;
    }
    set({
      schema: next,
      data: nextData,
      selectedEntity: selectedEntity === name ? (next.entityOrder[0] ?? null) : selectedEntity,
    });
  },

  async setEntityIdStrategy(name, strategy) {
    const { schema, projectPath } = get();
    if (!schema || !projectPath) return;
    const ent = schema.entities[name];
    if (!ent) return;
    const prev = clone(schema);
    const next = clone(schema);
    next.entities[name].idStrategy = strategy;
    if (strategy === 'auto-increment' && next.entities[name].nextId === undefined) {
      next.entities[name].nextId = 1;
    }
    await persistSchema(projectPath, prev, next);
    set({ schema: next });
  },

  async setDisplayField(entityName, fieldName) {
    const { schema, projectPath } = get();
    if (!schema || !projectPath) return;
    const prev = clone(schema);
    const next = clone(schema);
    next.entities[entityName].displayField = fieldName ?? undefined;
    await persistSchema(projectPath, prev, next);
    set({ schema: next });
  },

  async addField(entityName, fieldName, type) {
    const { schema, projectPath } = get();
    if (!schema || !projectPath) return;
    const ent = schema.entities[entityName];
    if (!ent || ent.fields[fieldName]) return;
    const prev = clone(schema);
    const next = clone(schema);
    next.entities[entityName].fields[fieldName] = defaultFieldFor(type);
    next.entities[entityName].fieldOrder.push(fieldName);
    await persistSchema(projectPath, prev, next);
    set({ schema: next });
  },

  async removeField(entityName, fieldName) {
    const { schema, projectPath, data } = get();
    if (!schema || !projectPath) return;
    const prev = clone(schema);
    const next = clone(schema);
    delete next.entities[entityName].fields[fieldName];
    next.entities[entityName].fieldOrder = next.entities[entityName].fieldOrder.filter(
      (f) => f !== fieldName,
    );
    if (next.entities[entityName].displayField === fieldName) {
      next.entities[entityName].displayField = undefined;
    }
    await persistSchema(projectPath, prev, next);
    const cleaned = (data[entityName] ?? []).map((doc) => {
      if (!(fieldName in doc)) return doc;
      const c = { ...doc };
      delete c[fieldName];
      return c;
    });
    const nextData = { ...data, [entityName]: cleaned };
    set({ schema: next, data: nextData });
    for (const doc of cleaned) {
      await window.api.saveDocument(projectPath, next, entityName, doc);
    }
  },

  async updateField(entityName, fieldName, field) {
    const { schema, projectPath } = get();
    if (!schema || !projectPath) return;
    const prev = clone(schema);
    const next = clone(schema);
    next.entities[entityName].fields[fieldName] = field;
    await persistSchema(projectPath, prev, next);
    set({ schema: next });
  },

  async reorderField(entityName, fieldName, direction) {
    const { schema, projectPath } = get();
    if (!schema || !projectPath) return;
    const ent = schema.entities[entityName];
    const idx = ent.fieldOrder.indexOf(fieldName);
    const target = idx + direction;
    if (idx < 0 || target < 0 || target >= ent.fieldOrder.length) return;
    const prev = clone(schema);
    const next = clone(schema);
    const order = next.entities[entityName].fieldOrder;
    [order[idx], order[target]] = [order[target], order[idx]];
    await persistSchema(projectPath, prev, next);
    set({ schema: next });
  },

  async setStorageFormat(format) {
    const { schema, projectPath } = get();
    if (!schema || !projectPath) return;
    const prev = clone(schema);
    const next = clone(schema);
    next.storage.format = format;
    await persistSchema(projectPath, prev, next);
    set({ schema: next });
  },

  async setDataDir(dir) {
    const { schema, projectPath } = get();
    if (!schema || !projectPath) return;
    const trimmed = dir.trim();
    if (!trimmed) return;
    const prev = clone(schema);
    const next = clone(schema);
    next.storage.dataDir = trimmed;
    await persistSchema(projectPath, prev, next);
    set({ schema: next });
  },

  async setDefaultIdStrategy(strategy) {
    const { schema, projectPath } = get();
    if (!schema || !projectPath) return;
    const prev = clone(schema);
    const next = clone(schema);
    next.defaultIdStrategy = strategy;
    await persistSchema(projectPath, prev, next);
    set({ schema: next });
  },

  async saveDocument(entityName, doc) {
    const { schema, projectPath, data } = get();
    if (!schema || !projectPath) throw new Error('No project open');
    const saved = await window.api.saveDocument(projectPath, schema, entityName, doc);
    bumpAttachmentCache();
    const list = (data[entityName] ?? []).slice();
    const idx = list.findIndex((d) => String(d.id) === String(saved.id));
    if (idx >= 0) list[idx] = saved;
    else list.push(saved);
    set({ data: { ...data, [entityName]: list } });
    if (saved.id !== doc.id) {
      const fresh = await window.api.openProject(projectPath);
      set({ schema: fresh.schema });
    }
    return saved;
  },

  async deleteDocument(entityName, id) {
    const { schema, projectPath, data } = get();
    if (!schema || !projectPath) return;
    await window.api.deleteDocument(projectPath, schema, entityName, id);
    bumpAttachmentCache();
    const list = (data[entityName] ?? []).filter((d) => String(d.id) !== String(id));
    set({ data: { ...data, [entityName]: list } });
  },
}));

function applySnapshot(
  set: (partial: Partial<ProjectState>) => void,
  snap: ProjectSnapshot,
): void {
  set({
    projectPath: snap.projectPath,
    schema: snap.schema,
    data: snap.data,
    error: null,
  });
}
