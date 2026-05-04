import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/ipc';
import type { IpcApi } from '../shared/ipc';

const api: IpcApi = {
  pickProjectFolder: (mode, options) =>
    ipcRenderer.invoke(IPC_CHANNELS.pickProjectFolder, mode, options),
  openProject: (folderPath) => ipcRenderer.invoke(IPC_CHANNELS.openProject, folderPath),
  createProject: (folderPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.createProject, folderPath),
  saveSchema: (folderPath, schema, prevSchema) =>
    ipcRenderer.invoke(IPC_CHANNELS.saveSchema, folderPath, schema, prevSchema),
  saveDocument: (folderPath, schema, entityName, doc) =>
    ipcRenderer.invoke(IPC_CHANNELS.saveDocument, folderPath, schema, entityName, doc),
  deleteDocument: (folderPath, schema, entityName, docId) =>
    ipcRenderer.invoke(
      IPC_CHANNELS.deleteDocument,
      folderPath,
      schema,
      entityName,
      docId,
    ),
  getRecentProjects: () => ipcRenderer.invoke(IPC_CHANNELS.getRecentProjects),
  setTheme: (theme) => ipcRenderer.invoke(IPC_CHANNELS.setTheme, theme),
  readAttachment: (folderPath, schema, relPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.readAttachment, folderPath, schema, relPath),
  downloadAttachment: (folderPath, schema, value) =>
    ipcRenderer.invoke(IPC_CHANNELS.downloadAttachment, folderPath, schema, value),
  createBackup: (folderPath, schema) =>
    ipcRenderer.invoke(IPC_CHANNELS.createBackup, folderPath, schema),
};

contextBridge.exposeInMainWorld('api', api);
