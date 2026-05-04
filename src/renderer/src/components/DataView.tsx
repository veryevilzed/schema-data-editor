import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  Pencil,
  Eye,
  ChevronLeft,
  Search,
  Database,
  ListPlus,
  Filter as FilterIcon,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  X as XIcon,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ConfirmDialog } from './ui/dialog';
import { Input, Select } from './ui/input';
import { Paperclip } from 'lucide-react';
import { useProjectStore } from '@/store/project-store';
import { EmptyState } from './EmptyState';
import { DataForm } from './DataForm';
import { DataDetail } from './DataDetail';
import { ImageThumb } from './ImagePreview';
import type {
  AppDocument,
  AttachmentValue,
  Field,
  FileField,
  ID,
  ImageField,
  RelationField,
} from '@shared/schema';
import { cn, formatId, relationLabel } from '@/lib/utils';
import { formatBytes, useAttachmentUrl } from '@/lib/attachments';
import { useI18n } from '@/i18n/provider';

type Mode =
  | { kind: 'list' }
  | { kind: 'create' }
  | { kind: 'edit'; id: ID }
  | { kind: 'detail'; id: ID };

export function DataView() {
  const { t } = useI18n();
  const schema = useProjectStore((s) => s.schema)!;
  const data = useProjectStore((s) => s.data);
  const selected = useProjectStore((s) => s.selectedEntity);
  const setMode = useProjectStore((s) => s.setMode);

  const [mode, setLocalMode] = useState<Mode>({ kind: 'list' });
  const [confirmDelete, setConfirmDelete] = useState<ID | null>(null);

  const deleteDoc = useProjectStore((s) => s.deleteDocument);

  const entity = selected ? schema.entities[selected] : null;
  const docs = selected ? data[selected] ?? [] : [];

  if (schema.entityOrder.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Database className="h-6 w-6" />}
          title={t('data.noEntitiesTitle')}
          description={t('data.noEntitiesDesc')}
          action={
            <Button onClick={() => setMode('schema')}>{t('data.openSchema')}</Button>
          }
        />
      </div>
    );
  }

  if (!entity || !selected) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Database className="h-6 w-6" />}
          title={t('data.entityNotSelected')}
          description={t('data.entityNotSelectedDesc')}
        />
      </div>
    );
  }

  if (entity.fieldOrder.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<ListPlus className="h-6 w-6" />}
          title={t('data.entityNoFields', { name: entity.name })}
          description={t('data.entityNoFieldsDesc')}
          action={<Button onClick={() => setMode('schema')}>{t('data.openSchemaShort')}</Button>}
        />
      </div>
    );
  }

  const onCreated = () => setLocalMode({ kind: 'list' });

  return (
    <div className="mx-auto max-w-6xl p-6">
      {mode.kind === 'list' && (
        <ListPanel
          entityName={entity.name}
          docs={docs}
          onCreate={() => setLocalMode({ kind: 'create' })}
          onView={(id) => setLocalMode({ kind: 'detail', id })}
          onEdit={(id) => setLocalMode({ kind: 'edit', id })}
          onDelete={(id) => setConfirmDelete(id)}
        />
      )}

      {mode.kind === 'create' && (
        <FormPanel
          title={t('form.titleCreate')}
          entityName={entity.name}
          initial={null}
          onCancel={() => setLocalMode({ kind: 'list' })}
          onSaved={onCreated}
        />
      )}

      {mode.kind === 'edit' && (
        <FormPanel
          title={t('form.titleEdit')}
          entityName={entity.name}
          initial={docs.find((d) => String(d.id) === String(mode.id)) ?? null}
          onCancel={() => setLocalMode({ kind: 'list' })}
          onSaved={onCreated}
        />
      )}

      {mode.kind === 'detail' && (
        <DetailPanel
          entityName={entity.name}
          doc={docs.find((d) => String(d.id) === String(mode.id))}
          onBack={() => setLocalMode({ kind: 'list' })}
          onEdit={() => setLocalMode({ kind: 'edit', id: mode.id })}
          onDelete={() => setConfirmDelete(mode.id)}
        />
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title={t('confirm.deleteDocTitle')}
        description={t('confirm.deleteDocDesc', { id: formatId(confirmDelete) })}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (confirmDelete !== null) {
            await deleteDoc(entity.name, confirmDelete);
          }
          setConfirmDelete(null);
          setLocalMode({ kind: 'list' });
        }}
      />
    </div>
  );
}

type SortKey = '__id' | string;
type SortState = { key: SortKey; dir: 'asc' | 'desc' } | null;

function ListPanel({
  entityName,
  docs,
  onCreate,
  onView,
  onEdit,
  onDelete,
}: {
  entityName: string;
  docs: AppDocument[];
  onCreate: () => void;
  onView: (id: ID) => void;
  onEdit: (id: ID) => void;
  onDelete: (id: ID) => void;
}) {
  const { t, tp } = useI18n();
  const schema = useProjectStore((s) => s.schema)!;
  const data = useProjectStore((s) => s.data);
  const entity = schema.entities[entityName];

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState<SortState>(null);

  // Reset filters/sort when switching entity
  useEffect(() => {
    setQuery('');
    setFilters({});
    setSort(null);
    setShowFilters(false);
  }, [entityName]);

  const visibleFields = useMemo(
    () => entity.fieldOrder.filter((f) => entity.fields[f]?.showInList !== false),
    [entity.fieldOrder, entity.fields],
  );

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter((v) => v !== '' && v !== undefined).length,
    [filters],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = docs;
    if (q) {
      result = result.filter((d) => {
        if (String(d.id).toLowerCase().includes(q)) return true;
        return Object.entries(d).some(([k, v]) => {
          if (k === 'id') return false;
          if (v == null) return false;
          return String(v).toLowerCase().includes(q);
        });
      });
    }
    if (activeFilterCount > 0) {
      result = result.filter((d) =>
        visibleFields.every((fname) => {
          const f = filters[fname];
          if (!f) return true;
          return matchesFilter(d[fname], entity.fields[fname], f, schema, data);
        }),
      );
    }
    if (sort) {
      const arr = [...result];
      const cmp = makeComparator(sort, entity.fields, schema, data);
      arr.sort(cmp);
      return arr;
    }
    return result;
  }, [docs, query, filters, activeFilterCount, sort, visibleFields, entity.fields, schema, data]);

  const onSortClick = (key: SortKey) => {
    setSort((cur) => {
      if (!cur || cur.key !== key) return { key, dir: 'asc' };
      if (cur.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-xl font-semibold">{entityName}</h2>
          <p className="text-sm text-muted-foreground">
            {tp(docs.length, 'data.docs')}
            {(query || activeFilterCount > 0) && filtered.length !== docs.length && (
              <span className="ml-1">{t('data.shown', { count: filtered.length })}</span>
            )}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('data.search')}
              className="pl-8 w-56"
            />
          </div>
          <Button
            variant={showFilters || activeFilterCount > 0 ? 'secondary' : 'outline'}
            onClick={() => setShowFilters((v) => !v)}
            title={t('data.filterTooltip')}
          >
            <FilterIcon className="h-4 w-4" />
            {t('data.filter')}
            {activeFilterCount > 0 && (
              <span className="ml-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <Button onClick={onCreate}>
            <Plus className="h-4 w-4" />
            {t('data.add')}
          </Button>
        </div>
      </div>

      {visibleFields.length === 0 && (
        <div className="rounded-md border border-dashed border-border bg-card/40 px-4 py-3 text-sm text-muted-foreground">
          {t('data.fieldsHidden')}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Database className="h-6 w-6" />}
          title={
            docs.length === 0
              ? t('data.emptyTitleNew')
              : t('data.emptyTitleNotFound')
          }
          description={
            docs.length === 0
              ? t('data.emptyDescNew')
              : t('data.emptyDescNotFound')
          }
          action={
            docs.length === 0 ? (
              <Button onClick={onCreate}>
                <Plus className="h-4 w-4" />
                {t('data.add')}
              </Button>
            ) : (query || activeFilterCount > 0) ? (
              <Button
                variant="outline"
                onClick={() => {
                  setQuery('');
                  setFilters({});
                }}
              >
                <XIcon className="h-4 w-4" /> {t('common.reset')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <SortableTh
                    label="id"
                    sortKey="__id"
                    sort={sort}
                    onSort={onSortClick}
                  />
                  {visibleFields.map((f) => (
                    <SortableTh
                      key={f}
                      label={f}
                      sortKey={f}
                      sort={sort}
                      onSort={onSortClick}
                    />
                  ))}
                  <th className="px-3 py-2 w-1" />
                </tr>
                {showFilters && (
                  <tr className="bg-card">
                    <th className="px-2 py-1.5 text-left font-normal" />
                    {visibleFields.map((f) => (
                      <th key={f} className="px-2 py-1.5 text-left font-normal">
                        <FilterCell
                          field={entity.fields[f]}
                          value={filters[f] ?? ''}
                          onChange={(v) =>
                            setFilters((cur) => ({ ...cur, [f]: v }))
                          }
                        />
                      </th>
                    ))}
                    <th />
                  </tr>
                )}
              </thead>
              <tbody>
                {filtered.map((doc) => (
                  <tr
                    key={String(doc.id)}
                    className="border-t border-border hover:bg-accent/40 transition-colors cursor-pointer"
                    onClick={() => onView(doc.id)}
                  >
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                      {formatId(doc.id)}
                    </td>
                    {visibleFields.map((f) => (
                      <td key={f} className="px-3 py-2 max-w-[28ch]">
                        <div className="truncate">
                          <CellValue value={doc[f]} field={entity.fields[f]} />
                        </div>
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button
                        type="button"
                        title={t('common.view')}
                        onClick={(e) => {
                          e.stopPropagation();
                          onView(doc.id);
                        }}
                        className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title={t('common.edit')}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(doc.id);
                        }}
                        className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title={t('common.delete')}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(doc.id);
                        }}
                        className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function SortableTh({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  sort: SortState;
  onSort: (key: SortKey) => void;
}) {
  const { t } = useI18n();
  const active = sort?.key === sortKey;
  return (
    <th className="px-3 py-2 text-left font-medium">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'inline-flex items-center gap-1 rounded transition-colors hover:text-foreground',
          active && 'text-foreground',
        )}
        title={t('data.sortTooltip')}
      >
        <span>{label}</span>
        {active ? (
          sort!.dir === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </th>
  );
}

function FilterCell({
  field,
  value,
  onChange,
}: {
  field: Field | undefined;
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useI18n();
  if (!field) return null;
  switch (field.type) {
    case 'boolean':
      return (
        <Select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 text-xs"
        >
          <option value="">{t('common.any')}</option>
          <option value="true">{t('common.yes')}</option>
          <option value="false">{t('common.no')}</option>
        </Select>
      );
    case 'enum':
      return (
        <Select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 text-xs"
        >
          <option value="">{t('common.any')}</option>
          {field.values.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </Select>
      );
    case 'number':
      return (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('filter.numberPlaceholder')}
          className="h-7 text-xs"
        />
      );
    case 'date':
    case 'datetime':
      return (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('filter.datePlaceholder')}
          className="h-7 text-xs"
        />
      );
    default:
      return (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('filter.contains')}
          className="h-7 text-xs"
        />
      );
  }
}

function matchesFilter(
  raw: unknown,
  field: Field | undefined,
  filter: string,
  schema: import('@shared/schema').Schema,
  data: import('@shared/schema').DataMap,
): boolean {
  if (!field) return true;
  if (filter === '') return true;

  switch (field.type) {
    case 'boolean': {
      if (filter === 'true') return raw === true;
      if (filter === 'false') return raw === false;
      return true;
    }
    case 'enum': {
      return String(raw ?? '') === filter;
    }
    case 'number': {
      if (raw === null || raw === undefined || raw === '') return false;
      const n = Number(raw);
      if (Number.isNaN(n)) return false;
      const f = filter.trim();
      const range = f.match(/^(-?\d+(?:\.\d+)?)\s*\.\.\s*(-?\d+(?:\.\d+)?)$/);
      if (range) {
        const lo = Number(range[1]);
        const hi = Number(range[2]);
        return n >= lo && n <= hi;
      }
      const op = f.match(/^([<>]=?|=)\s*(-?\d+(?:\.\d+)?)$/);
      if (op) {
        const target = Number(op[2]);
        switch (op[1]) {
          case '=': return n === target;
          case '<': return n < target;
          case '<=': return n <= target;
          case '>': return n > target;
          case '>=': return n >= target;
        }
      }
      return String(n).toLowerCase().includes(f.toLowerCase());
    }
    case 'relation': {
      const target = schema.entities[field.target];
      const targetDocs = data[field.target] ?? [];
      const labelOf = (id: ID) => {
        const d = targetDocs.find((x) => String(x.id) === String(id));
        if (!d) return String(id);
        if (target?.displayField && d[target.displayField] !== undefined)
          return `${String(d[target.displayField])} ${String(id)}`;
        return String(id);
      };
      const q = filter.toLowerCase();
      if (field.kind === 'one') {
        if (raw === null || raw === undefined || raw === '') return false;
        return labelOf(raw as ID).toLowerCase().includes(q);
      }
      const ids = Array.isArray(raw) ? (raw as ID[]) : [];
      if (ids.length === 0) return false;
      return ids.some((id) => labelOf(id).toLowerCase().includes(q));
    }
    case 'file':
    case 'image': {
      if (!raw || typeof raw !== 'object') return false;
      const v = raw as AttachmentValue;
      const q = filter.toLowerCase();
      return (
        (v.name ?? '').toLowerCase().includes(q) ||
        (v.mime ?? '').toLowerCase().includes(q)
      );
    }
    default: {
      if (raw === null || raw === undefined) return false;
      return String(raw).toLowerCase().includes(filter.toLowerCase());
    }
  }
}

function makeComparator(
  sort: NonNullable<SortState>,
  fields: Record<string, Field>,
  schema: import('@shared/schema').Schema,
  data: import('@shared/schema').DataMap,
): (a: AppDocument, b: AppDocument) => number {
  const sign = sort.dir === 'asc' ? 1 : -1;
  if (sort.key === '__id') {
    return (a, b) => sign * compareValues(a.id, b.id, undefined, schema, data);
  }
  const fieldName = sort.key;
  const field = fields[fieldName];
  return (a, b) =>
    sign * compareValues(a[fieldName], b[fieldName], field, schema, data);
}

function compareValues(
  a: unknown,
  b: unknown,
  field: Field | undefined,
  schema: import('@shared/schema').Schema,
  data: import('@shared/schema').DataMap,
): number {
  const aEmpty = a === null || a === undefined || a === '';
  const bEmpty = b === null || b === undefined || b === '';
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;

  if (!field) {
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b), undefined, { numeric: true });
  }

  switch (field.type) {
    case 'number': {
      const an = Number(a);
      const bn = Number(b);
      if (Number.isNaN(an) || Number.isNaN(bn)) return String(a).localeCompare(String(b));
      return an - bn;
    }
    case 'boolean':
      return Number(Boolean(a)) - Number(Boolean(b));
    case 'date':
    case 'datetime': {
      const at = Date.parse(String(a));
      const bt = Date.parse(String(b));
      if (Number.isNaN(at) || Number.isNaN(bt)) return String(a).localeCompare(String(b));
      return at - bt;
    }
    case 'relation': {
      const targetDocs = data[field.target] ?? [];
      const target = schema.entities[field.target];
      const labelOf = (raw: unknown): string => {
        if (Array.isArray(raw)) return String(raw.length);
        const d = targetDocs.find((x) => String(x.id) === String(raw));
        if (d && target?.displayField && d[target.displayField] !== undefined)
          return String(d[target.displayField]);
        return String(raw);
      };
      return labelOf(a).localeCompare(labelOf(b), undefined, { numeric: true });
    }
    case 'file':
    case 'image': {
      const an = (a as AttachmentValue | null)?.name ?? '';
      const bn = (b as AttachmentValue | null)?.name ?? '';
      return an.localeCompare(bn, undefined, { numeric: true });
    }
    default:
      return String(a).localeCompare(String(b), undefined, { numeric: true });
  }
}

function FormPanel({
  title,
  entityName,
  initial,
  onCancel,
  onSaved,
}: {
  title: string;
  entityName: string;
  initial: AppDocument | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <ChevronLeft className="h-4 w-4" /> {t('form.backToList')}
        </Button>
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{entityName}</CardTitle>
          <CardDescription>{t('form.intro')}</CardDescription>
        </CardHeader>
        <CardContent>
          <DataForm
            entityName={entityName}
            initial={initial}
            onSaved={onSaved}
            onCancel={onCancel}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function DetailPanel({
  entityName,
  doc,
  onBack,
  onEdit,
  onDelete,
}: {
  entityName: string;
  doc: AppDocument | undefined;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  if (!doc) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" /> {t('form.backToList')}
        </Button>
        <EmptyState title={t('detail.notFound')} />
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" /> {t('form.backToList')}
        </Button>
        <h2 className="text-xl font-semibold">
          {entityName}{' '}
          <span className="text-muted-foreground font-normal">#{formatId(doc.id)}</span>
        </h2>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={onEdit}>
            <Pencil className="h-4 w-4" /> {t('common.edit')}
          </Button>
          <Button variant="destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" /> {t('common.delete')}
          </Button>
        </div>
      </div>
      <DataDetail entityName={entityName} doc={doc} />
    </div>
  );
}

function CellValue({
  value,
  field,
}: {
  value: unknown;
  field: Field | undefined;
}) {
  if (field?.type === 'relation') {
    return <RelationCellValue field={field} value={value} />;
  }
  if (field?.type === 'image') {
    return <ImageCellValue field={field} value={value as AttachmentValue | null} />;
  }
  if (field?.type === 'file') {
    return <FileCellValue field={field} value={value as AttachmentValue | null} />;
  }
  if (value === null || value === undefined || value === '') {
    return <span className="text-muted-foreground">—</span>;
  }
  if (typeof value === 'boolean') {
    return <>{value ? '✓' : '—'}</>;
  }
  if (field?.type === 'datetime' && typeof value === 'string') {
    try {
      return <>{new Date(value).toLocaleString()}</>;
    } catch {
      return <>{value}</>;
    }
  }
  if (Array.isArray(value)) {
    return <span className="text-xs text-muted-foreground">[{value.length}]</span>;
  }
  return <>{String(value)}</>;
}

function ImageCellValue({
  field,
  value,
}: {
  field: ImageField;
  value: AttachmentValue | null | undefined;
}) {
  const url = useAttachmentUrl(value);
  if (!value) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex items-center gap-2">
      <ImageThumb url={url} size={field.thumbnailSize ?? 'm'} alt={value.name} />
      <span className="truncate text-xs text-muted-foreground">{value.name}</span>
    </div>
  );
}

function FileCellValue({
  value,
}: {
  field: FileField;
  value: AttachmentValue | null | undefined;
}) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={`${value.name} · ${formatBytes(value.size)} · ${value.mime || '—'}`}
    >
      <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="truncate font-medium">{value.name}</span>
      <span className="text-xs text-muted-foreground">{formatBytes(value.size)}</span>
    </span>
  );
}

function RelationCellValue({
  field,
  value,
}: {
  field: RelationField;
  value: unknown;
}) {
  const data = useProjectStore((s) => s.data);
  const schema = useProjectStore((s) => s.schema)!;
  const target = field.target ? schema.entities[field.target] : undefined;
  const targetDocs = field.target ? data[field.target] ?? [] : [];

  if (field.kind === 'one') {
    if (value === null || value === undefined || value === '') {
      return <span className="text-muted-foreground">—</span>;
    }
    return (
      <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs">
        {relationLabel(value as ID, target, targetDocs)}
      </span>
    );
  }

  const ids = Array.isArray(value) ? (value as ID[]) : [];
  if (ids.length === 0) return <span className="text-muted-foreground">—</span>;
  const MAX = 3;
  const head = ids.slice(0, MAX);
  const rest = ids.length - head.length;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {head.map((id) => (
        <span
          key={String(id)}
          className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs"
        >
          {relationLabel(id, target, targetDocs)}
        </span>
      ))}
      {rest > 0 && (
        <span className="text-xs text-muted-foreground">+{rest}</span>
      )}
    </span>
  );
}
