import type { AppDocument, ID, ProjectSnapshot, Schema } from './schema';

export interface PickFolderOptions {
  title?: string;
  buttonLabel?: string;
}

export interface IpcApi {
  pickProjectFolder(
    mode: 'open' | 'create',
    options?: PickFolderOptions,
  ): Promise<string | null>;
  openProject(folderPath: string): Promise<ProjectSnapshot>;
  createProject(folderPath: string): Promise<ProjectSnapshot>;
  saveSchema(folderPath: string, schema: Schema, prevSchema: Schema): Promise<void>;
  saveDocument(
    folderPath: string,
    schema: Schema,
    entityName: string,
    doc: AppDocument,
  ): Promise<AppDocument>;
  deleteDocument(
    folderPath: string,
    schema: Schema,
    entityName: string,
    docId: ID,
  ): Promise<void>;
  getRecentProjects(): Promise<string[]>;
  setTheme(theme: 'light' | 'dark' | 'system'): Promise<void>;
  readAttachment(
    folderPath: string,
    schema: Schema,
    relPath: string,
  ): Promise<string>;
}

export const IPC_CHANNELS = {
  pickProjectFolder: 'project:pick-folder',
  openProject: 'project:open',
  createProject: 'project:create',
  saveSchema: 'project:save-schema',
  saveDocument: 'project:save-document',
  deleteDocument: 'project:delete-document',
  getRecentProjects: 'project:recent',
  setTheme: 'app:set-theme',
  readAttachment: 'project:read-attachment',
} as const;
