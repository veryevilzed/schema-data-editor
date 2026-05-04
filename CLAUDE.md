# CLAUDE.md

Notes for Claude Code working in this repo. Read this before making
non-trivial changes.

## What this is

Electron desktop app: a local editor for a JSON `schema.json` and its
documents, with three pluggable storage layouts and RU/EN UI. See
`README.md` for the user-facing description.

## Build / run / verify

```bash
npm run dev          # electron-vite dev with HMR
npm run build        # production bundle into out/{main,preload,renderer}
npm run typecheck    # tsc -b --noEmit across all three tsconfigs
npm start            # run the production bundle (electron-vite preview)
node --experimental-strip-types --no-warnings scripts/smoke-storage.mts
```

After non-trivial changes, run **typecheck + electron-vite build**. The
storage smoke test covers `src/main/storage.ts` end-to-end without
Electron — extend it when you change storage behaviour.

The Electron GUI cannot be inspected from a headless shell. Don't waste
time launching it from a script and waiting for output; rely on
typecheck, build, and the smoke test.

## Process layout

Three TypeScript projects (see `tsconfig.{node,web}.json`):

- `src/main/` — Node.js process. Owns the filesystem and dialogs. ESM.
- `src/preload/` — context-isolated bridge. Exposes a typed `window.api`
  via `contextBridge.exposeInMainWorld`. **Outputs `index.mjs`** —
  `src/main/index.ts` references `'../preload/index.mjs'`. Don't change
  that path without updating both sides.
- `src/renderer/src/` — React. Imports `@/...` (renderer source) and
  `@shared/...` (cross-process types). No Node APIs here.
- `src/shared/` — types only (`schema.ts`, `ipc.ts`). Never import from
  `main/` or `renderer/`. Both `tsconfig.node.json` and `tsconfig.web.json`
  include this directory.

`package.json` has `"type": "module"`; everything is ESM.

## IPC contract

All IPC channels are listed in `src/shared/ipc.ts` (`IPC_CHANNELS` enum +
`IpcApi` interface). Adding a channel means editing four places:

1. `src/shared/ipc.ts` — add to `IpcApi` and `IPC_CHANNELS`.
2. `src/main/index.ts` — register handler with `ipcMain.handle`.
3. `src/preload/index.ts` — forward via `ipcRenderer.invoke`.
4. The renderer side — use `window.api.foo(...)`.

The renderer **always** passes the current `schema` and `projectPath`
explicitly. The main process is stateless across calls (no per-window
caches), which keeps reasoning simple.

## State (renderer)

`src/renderer/src/store/project-store.ts` is a single zustand store. All
schema mutations call `window.api.saveSchema(folderPath, next, prev)`
immediately — there is no explicit "save" button; the disk is the source
of truth. The `prev` snapshot is required so the main process can run
`migrateSchemaChange` (rewriting/moving data files when storage format or
`dataDir` changes).

Document mutations call `saveDocument` / `deleteDocument` and update the
in-memory `data` map. Both bump `bumpAttachmentCache()` (renderer cache of
external attachment data URLs) so stale image previews don't survive a
save.

## Storage rules

- `schema.json` lives at the project root.
- All data lives under `<projectPath>/<schema.storage.dataDir>/` (default
  `data/`).
- Attachment files live under `<dataDir>/_attachments/<EntityName>/<docId>/`
  named `<fieldName>__<sanitisedFilename>`. Documents reference them via
  `path` relative to `dataDir`.
- `migrateSchemaChange` handles four cases: format change, `dataDir`
  change, entity removal, no-op. When `dataDir` changes it must `cp -r`
  the `_attachments` subtree before removing the old dir; do not break
  this.
- `processAttachments` in `src/main/index.ts` is the only place that
  decides inline vs external persistence. Renderer always sends new
  uploads as `{ ..., data: 'data:...;base64,...', pending: true }`.

## i18n

`src/renderer/src/i18n/` — flat key→string dicts in `strings.ts`, simple
`{var}` interpolation, RU/EN. Plurals via `tp(count, baseKey)` which
appends `One`/`Few`/`Many` (RU has all three; EN folds Few into Many).

When adding a user-visible string:

1. Add the key to **both** `ru` and `en` in `strings.ts`.
2. Use `t('namespace.key')` in the component (import `useI18n` from
   `@/i18n/provider`).
3. Don't put hardcoded localisable strings in `src/main/` — pass them
   from the renderer via IPC (see `pickProjectFolder` for the pattern).

The store is locale-agnostic: any `Error` it throws is in English (it's
not user-facing surface).

## Theming

CSS variables in `src/renderer/src/index.css` under `:root` and `.dark`.
`useTheme()` toggles the `.dark` class on `document.documentElement` and
also pushes `nativeTheme.themeSource` to main via IPC so the title bar
follows. Don't add hex colours in components; use Tailwind tokens like
`bg-card`, `text-muted-foreground`.

## Schema model

`src/shared/schema.ts` is the single source of truth. When adding a new
field type:

1. Extend `FieldType` and the `Field` discriminated union.
2. Add it to `FIELD_TYPE_LABELS` (used as the iteration source — the
   labels themselves are translated via `t('fieldType.<key>')` in the
   editor).
3. Handle it in `defaultFieldFor`.
4. Add an `i18n` key per locale.
5. Renderer touch points — at minimum `EntityEditor` (type-change reset,
   options panel, default editor), `DataForm` (`FieldInput` +
   `defaultValueFor` + `normalizeOut` + `validate`), `DataView`
   (`CellValue`, `matchesFilter`, `compareValues`, `FilterCell`),
   `DataDetail` (`DetailValue`).

## Things explicitly not supported

- **Renaming entities or fields.** Delete + recreate. Adding rename means
  rewriting all docs (and incoming relation values) on disk and we
  haven't done it.
- **Field-level schema migrations** beyond "field added" / "field
  removed". Type changes drop type-specific data (`default`, enum
  `values`, relation `target`, attachment `storage`).
- **Schema versioning past v1.** The `version: 1` field is a placeholder.

## Style notes

- Don't add comments explaining what code does — names should carry it.
- Don't add exports unless there's a caller. Don't add `useCallback` /
  `useMemo` unless a profiler complaint motivates it.
- Don't introduce new UI dependencies (Radix, Headless UI, …) without
  good reason; the current primitives are hand-rolled and that is by
  design.
- Tailwind: prefer the `cn()` helper from `@/lib/utils` for conditional
  classes.
- Storage: never read or write outside `<projectPath>/<dataDir>/`. The
  `_attachments` subtree is the only side-channel.

## Useful breadcrumbs

- Open project flow: `WelcomeScreen` → `pickAndOpen` / `pickAndCreate` in
  the store → IPC → `loadProject` in `src/main/index.ts`.
- Save document flow: `DataForm.onSubmit` → `store.saveDocument` →
  `window.api.saveDocument` → main `processAttachments` → `storage.saveDocument`.
- Image hover preview: `ImageThumb` in `src/renderer/src/components/ImagePreview.tsx`
  uses a portal to escape table overflow.
- Attachment data URLs: `useAttachmentUrl` in `src/renderer/src/lib/attachments.ts`,
  cache cleared on every save.
