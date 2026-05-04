import { useState } from 'react';
import { Clock, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Checkbox, FormField, Input, Select, Textarea } from './ui/input';
import { Dialog } from './ui/dialog';
import { useProjectStore } from '@/store/project-store';
import {
  isValidIdentifier,
  relationLabel,
  toLocalDatetimeInput,
} from '@/lib/utils';
import { useI18n } from '@/i18n/provider';
import {
  FIELD_TYPE_LABELS,
  type AttachmentStorage,
  type DateField,
  type DatetimeField,
  type EnumField,
  type Field,
  type FieldType,
  type FileField,
  type ID,
  type IdStrategy,
  type ImageField,
  type RelationField,
  type ThumbnailSize,
} from '@shared/schema';

const FIELD_TYPES = Object.keys(FIELD_TYPE_LABELS) as FieldType[];

export function EntityEditor({ entityName }: { entityName: string }) {
  const { t } = useI18n();
  const schema = useProjectStore((s) => s.schema)!;
  const setEntityIdStrategy = useProjectStore((s) => s.setEntityIdStrategy);
  const setDisplayField = useProjectStore((s) => s.setDisplayField);
  const removeField = useProjectStore((s) => s.removeField);
  const reorderField = useProjectStore((s) => s.reorderField);

  const entity = schema.entities[entityName];
  if (!entity) return null;

  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('entity.title', { name: entity.name })}</CardTitle>
          <CardDescription>{t('entity.params')}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FormField label={t('entity.idStrategy')}>
            <Select
              value={entity.idStrategy}
              onChange={(e) => void setEntityIdStrategy(entity.name, e.target.value as IdStrategy)}
            >
              <option value="auto-increment">{t('idStrategy.autoIncrement')}</option>
              <option value="uuid">{t('idStrategy.uuid')}</option>
            </Select>
          </FormField>

          <FormField
            label={t('entity.displayField')}
            hint={t('entity.displayFieldHint')}
          >
            <Select
              value={entity.displayField ?? ''}
              onChange={(e) => void setDisplayField(entity.name, e.target.value || null)}
            >
              <option value="">{t('entity.displayFieldNoneLabel')}</option>
              {entity.fieldOrder
                .filter((fname) => {
                  const tp = entity.fields[fname].type;
                  return tp === 'string' || tp === 'text' || tp === 'number' || tp === 'enum';
                })
                .map((fname) => (
                  <option key={fname} value={fname}>
                    {fname}
                  </option>
                ))}
            </Select>
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('entity.fields')}</CardTitle>
              <CardDescription>
                {entity.fieldOrder.length === 0
                  ? t('entity.fieldsEmpty')
                  : t('entity.fieldsCount', { count: entity.fieldOrder.length })}
              </CardDescription>
            </div>
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4" /> {t('entity.addField')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {entity.fieldOrder.length === 0 && (
            <p className="text-sm text-muted-foreground italic">
              {t('entity.fieldsEmptyHint')}
            </p>
          )}
          {entity.fieldOrder.map((fname, idx) => (
            <FieldRow
              key={fname}
              entityName={entity.name}
              fieldName={fname}
              field={entity.fields[fname]}
              first={idx === 0}
              last={idx === entity.fieldOrder.length - 1}
              onMoveUp={() => void reorderField(entity.name, fname, -1)}
              onMoveDown={() => void reorderField(entity.name, fname, 1)}
              onDelete={() => void removeField(entity.name, fname)}
            />
          ))}
        </CardContent>
      </Card>

      {showAdd && (
        <AddFieldDialog
          existing={entity.fieldOrder}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}

function FieldRow({
  entityName,
  fieldName,
  field,
  first,
  last,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  entityName: string;
  fieldName: string;
  field: Field;
  first: boolean;
  last: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const updateField = useProjectStore((s) => s.updateField);
  const schema = useProjectStore((s) => s.schema)!;
  const otherEntities = schema.entityOrder;

  const onPatch = (patch: Partial<Field>) => {
    void updateField(entityName, fieldName, { ...field, ...patch } as Field);
  };

  return (
    <div className="rounded-md border border-border bg-background/50 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={first}
            className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
            title={t('common.up')}
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={last}
            className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
            title={t('common.down')}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 grid gap-2 md:grid-cols-[1fr_minmax(0,180px)]">
          <FormField label={t('field.name')}>
            <Input value={fieldName} disabled />
          </FormField>
          <FormField label={t('field.type')}>
            <Select
              value={field.type}
              onChange={(e) => {
                const newType = e.target.value as FieldType;
                if (newType === field.type) return;
                const base = {
                  required: field.required,
                  unique: field.unique,
                  description: field.description,
                  showInList: field.showInList,
                };
                let next: Field;
                switch (newType) {
                  case 'enum':
                    next = { ...base, type: 'enum', values: [] };
                    break;
                  case 'relation':
                    next = { ...base, type: 'relation', target: '', kind: 'one' };
                    break;
                  case 'file':
                    next = { ...base, type: 'file', storage: 'external' };
                    break;
                  case 'image':
                    next = {
                      ...base,
                      type: 'image',
                      storage: 'external',
                      thumbnailSize: 'm',
                      acceptMime: 'image/*',
                    };
                    break;
                  default:
                    next = { ...base, type: newType } as Field;
                }
                onPatch(next);
              }}
            >
              {FIELD_TYPES.map((ft) => (
                <option key={ft} value={ft}>
                  {t(`fieldType.${ft}`)}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <button
          type="button"
          onClick={onDelete}
          title={t('field.delete')}
          className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <label className="inline-flex items-center gap-2">
          <Checkbox
            checked={field.required ?? false}
            onChange={(e) => onPatch({ required: e.target.checked })}
          />
          <span>{t('field.required')}</span>
        </label>
        {field.type !== 'relation' &&
          field.type !== 'boolean' &&
          field.type !== 'file' &&
          field.type !== 'image' && (
            <label className="inline-flex items-center gap-2">
              <Checkbox
                checked={field.unique ?? false}
                onChange={(e) => onPatch({ unique: e.target.checked })}
              />
              <span>{t('field.unique')}</span>
            </label>
          )}
        <label
          className="inline-flex items-center gap-2"
          title={t('field.showInListHint')}
        >
          <Checkbox
            checked={field.showInList !== false}
            onChange={(e) => onPatch({ showInList: e.target.checked })}
          />
          <span>{t('field.showInList')}</span>
        </label>
      </div>

      {field.type === 'enum' && (
        <EnumOptions
          field={field}
          onChange={(values) => onPatch({ values } as Partial<EnumField>)}
        />
      )}

      {field.type === 'relation' && (
        <RelationOptions
          field={field}
          entities={otherEntities}
          onChange={(patch) => onPatch(patch as Partial<RelationField>)}
        />
      )}

      {(field.type === 'file' || field.type === 'image') && (
        <AttachmentOptions
          field={field}
          onChange={(patch) =>
            onPatch(patch as Partial<FileField> | Partial<ImageField>)
          }
        />
      )}

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <FormField label={t('field.description')}>
          <Input
            value={field.description ?? ''}
            placeholder={t('field.descriptionPlaceholder')}
            onChange={(e) =>
              onPatch({ description: e.target.value || undefined } as Partial<Field>)
            }
          />
        </FormField>
        <FieldDefaultEditor field={field} onPatch={onPatch} />
      </div>
    </div>
  );
}

function FieldDefaultEditor({
  field,
  onPatch,
}: {
  field: Field;
  onPatch: (patch: Partial<Field>) => void;
}) {
  const { t } = useI18n();
  switch (field.type) {
    case 'string':
      return (
        <FormField label={t('field.default')}>
          <Input
            value={field.default ?? ''}
            placeholder={t('field.defaultDash')}
            onChange={(e) =>
              onPatch({ default: e.target.value || undefined } as Partial<Field>)
            }
          />
        </FormField>
      );
    case 'text':
      return (
        <FormField label={t('field.default')}>
          <Textarea
            rows={2}
            className="min-h-[40px]"
            value={field.default ?? ''}
            placeholder={t('field.defaultDash')}
            onChange={(e) =>
              onPatch({ default: e.target.value || undefined } as Partial<Field>)
            }
          />
        </FormField>
      );
    case 'number':
      return (
        <FormField label={t('field.default')}>
          <Input
            type="number"
            inputMode="decimal"
            value={field.default ?? ''}
            placeholder={t('field.defaultDash')}
            onChange={(e) =>
              onPatch({
                default: e.target.value === '' ? undefined : Number(e.target.value),
              } as Partial<Field>)
            }
          />
        </FormField>
      );
    case 'boolean':
      return (
        <FormField label={t('field.default')}>
          <Select
            value={
              field.default === undefined
                ? ''
                : field.default
                ? 'true'
                : 'false'
            }
            onChange={(e) => {
              const v =
                e.target.value === ''
                  ? undefined
                  : e.target.value === 'true';
              onPatch({ default: v } as Partial<Field>);
            }}
          >
            <option value="">{t('common.notSet')}</option>
            <option value="true">{t('common.yes')}</option>
            <option value="false">{t('common.no')}</option>
          </Select>
        </FormField>
      );
    case 'date':
      return <DateDefaultEditor field={field} onPatch={onPatch} />;
    case 'datetime':
      return <DatetimeDefaultEditor field={field} onPatch={onPatch} />;
    case 'enum':
      return (
        <FormField label={t('field.default')}>
          <Select
            value={field.default ?? ''}
            onChange={(e) =>
              onPatch({ default: e.target.value || undefined } as Partial<EnumField>)
            }
          >
            <option value="">{t('common.notSet')}</option>
            {field.values.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>
        </FormField>
      );
    case 'relation':
      return <RelationDefaultEditor field={field} onPatch={onPatch} />;
    case 'file':
    case 'image':
      return <div />;
  }
}

function DateDefaultEditor({
  field,
  onPatch,
}: {
  field: DateField;
  onPatch: (patch: Partial<Field>) => void;
}) {
  const { t } = useI18n();
  return (
    <FormField label={t('field.default')}>
      <div className="flex flex-col gap-1.5">
        <label
          className="inline-flex items-center gap-2 text-sm"
          title={t('default.nowDateTooltip')}
        >
          <Checkbox
            checked={field.defaultNow ?? false}
            onChange={(e) =>
              onPatch({
                defaultNow: e.target.checked || undefined,
                ...(e.target.checked ? { default: undefined } : {}),
              } as Partial<DateField>)
            }
          />
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{t('default.nowDate')}</span>
        </label>
        <Input
          type="date"
          disabled={field.defaultNow}
          value={field.default ?? ''}
          onChange={(e) =>
            onPatch({ default: e.target.value || undefined } as Partial<DateField>)
          }
        />
      </div>
    </FormField>
  );
}

function DatetimeDefaultEditor({
  field,
  onPatch,
}: {
  field: DatetimeField;
  onPatch: (patch: Partial<Field>) => void;
}) {
  const { t } = useI18n();
  return (
    <FormField label={t('field.default')}>
      <div className="flex flex-col gap-1.5">
        <label
          className="inline-flex items-center gap-2 text-sm"
          title={t('default.nowDatetimeTooltip')}
        >
          <Checkbox
            checked={field.defaultNow ?? false}
            onChange={(e) =>
              onPatch({
                defaultNow: e.target.checked || undefined,
                ...(e.target.checked ? { default: undefined } : {}),
              } as Partial<DatetimeField>)
            }
          />
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{t('default.nowDatetime')}</span>
        </label>
        <Input
          type="datetime-local"
          disabled={field.defaultNow}
          value={
            field.default ? toLocalDatetimeInput(field.default) : ''
          }
          onChange={(e) =>
            onPatch({
              default: e.target.value
                ? new Date(e.target.value).toISOString()
                : undefined,
            } as Partial<DatetimeField>)
          }
        />
      </div>
    </FormField>
  );
}

function RelationDefaultEditor({
  field,
  onPatch,
}: {
  field: RelationField;
  onPatch: (patch: Partial<Field>) => void;
}) {
  const { t } = useI18n();
  const data = useProjectStore((s) => s.data);
  const schema = useProjectStore((s) => s.schema)!;
  const target = field.target ? schema.entities[field.target] : undefined;
  const targetDocs = field.target ? data[field.target] ?? [] : [];

  if (!field.target) {
    return (
      <FormField label={t('field.default')}>
        <p className="text-xs text-muted-foreground italic mt-1.5">
          {t('relationDefault.targetMissing')}
        </p>
      </FormField>
    );
  }

  const coerce = (s: string): ID => {
    if (target?.idStrategy === 'auto-increment') {
      const n = Number(s);
      if (Number.isFinite(n)) return n;
    }
    return s;
  };

  if (field.kind === 'one') {
    const cur = field.default;
    const curStr =
      cur === undefined || cur === null || Array.isArray(cur)
        ? ''
        : String(cur);
    return (
      <FormField label={t('field.default')}>
        <Select
          value={curStr}
          onChange={(e) =>
            onPatch({
              default: e.target.value === '' ? undefined : coerce(e.target.value),
            } as Partial<RelationField>)
          }
        >
          <option value="">{t('common.notSet')}</option>
          {targetDocs.map((d) => (
            <option key={String(d.id)} value={String(d.id)}>
              {relationLabel(d.id, target, targetDocs, { withId: true })}
            </option>
          ))}
        </Select>
      </FormField>
    );
  }

  const selected = Array.isArray(field.default) ? (field.default as ID[]) : [];
  const selectedSet = new Set(selected.map(String));
  const toggle = (id: ID) => {
    const key = String(id);
    const next = selectedSet.has(key)
      ? selected.filter((x) => String(x) !== key)
      : [...selected, id];
    onPatch({
      default: next.length === 0 ? undefined : next,
    } as Partial<RelationField>);
  };

  return (
    <FormField
      label={t('field.default')}
      hint={
        targetDocs.length === 0
          ? t('relationDefault.empty', { target: field.target })
          : undefined
      }
    >
      <div className="rounded-md border border-input bg-background max-h-32 overflow-y-auto p-1">
        {targetDocs.length === 0 ? (
          <p className="px-2 py-1 text-xs text-muted-foreground">—</p>
        ) : (
          targetDocs.map((d) => (
            <label
              key={String(d.id)}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent"
            >
              <Checkbox
                checked={selectedSet.has(String(d.id))}
                onChange={() => toggle(d.id)}
              />
              <span className="truncate">
                {relationLabel(d.id, target, targetDocs, { withId: true })}
              </span>
            </label>
          ))
        )}
      </div>
    </FormField>
  );
}

function EnumOptions({
  field,
  onChange,
}: {
  field: EnumField;
  onChange: (values: string[]) => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState('');
  return (
    <div className="mt-3 space-y-2">
      <FormField label={t('enumOpts.values')} hint={t('enumOpts.valuesHint')}>
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t('enumOpts.placeholder')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && draft.trim()) {
                e.preventDefault();
                if (!field.values.includes(draft.trim())) {
                  onChange([...field.values, draft.trim()]);
                }
                setDraft('');
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => {
              if (!draft.trim()) return;
              if (!field.values.includes(draft.trim())) {
                onChange([...field.values, draft.trim()]);
              }
              setDraft('');
            }}
          >
            {t('enumOpts.add')}
          </Button>
        </div>
      </FormField>
      {field.values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {field.values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-0.5 text-xs"
            >
              {v}
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => onChange(field.values.filter((x) => x !== v))}
                title={t('enumOpts.remove')}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function RelationOptions({
  field,
  entities,
  onChange,
}: {
  field: RelationField;
  entities: string[];
  onChange: (patch: Partial<RelationField>) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="mt-3 grid gap-2 md:grid-cols-2">
      <FormField label={t('relationOpts.target')}>
        <Select
          value={field.target}
          onChange={(e) => onChange({ target: e.target.value })}
        >
          <option value="">{t('relationOpts.targetEmpty')}</option>
          {entities.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label={t('relationOpts.kind')}>
        <Select
          value={field.kind}
          onChange={(e) => onChange({ kind: e.target.value as 'one' | 'many' })}
        >
          <option value="one">{t('relationOpts.kindOne')}</option>
          <option value="many">{t('relationOpts.kindMany')}</option>
        </Select>
      </FormField>
    </div>
  );
}

function AddFieldDialog({
  existing,
  onClose,
}: {
  existing: string[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const selected = useProjectStore((s) => s.selectedEntity)!;
  const addField = useProjectStore((s) => s.addField);

  const [name, setName] = useState('');
  const [type, setType] = useState<FieldType>('string');

  const trimmed = name.trim();
  let error: string | null = null;
  if (trimmed && !isValidIdentifier(trimmed)) {
    error = t('validation.fieldIdentifier');
  } else if (trimmed === 'id') {
    error = t('validation.fieldIdReserved');
  } else if (existing.includes(trimmed)) {
    error = t('validation.fieldExists');
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('addField.title')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            disabled={!trimmed || !!error}
            onClick={async () => {
              await addField(selected, trimmed, type);
              onClose();
            }}
          >
            {t('common.add')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label={t('addField.name')} error={error ?? undefined}>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('addField.namePlaceholder')}
          />
        </FormField>
        <FormField label={t('addField.type')}>
          <Select value={type} onChange={(e) => setType(e.target.value as FieldType)}>
            {FIELD_TYPES.map((ft) => (
              <option key={ft} value={ft}>
                {t(`fieldType.${ft}`)}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
    </Dialog>
  );
}

function AttachmentOptions({
  field,
  onChange,
}: {
  field: FileField | ImageField;
  onChange: (patch: Partial<FileField> | Partial<ImageField>) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="mt-3 grid gap-2 md:grid-cols-2">
      <FormField label={t('attachment.storage')} hint={t('attachment.storageHint')}>
        <Select
          value={field.storage}
          onChange={(e) =>
            onChange({ storage: e.target.value as AttachmentStorage })
          }
        >
          <option value="external">{t('attachment.storageExternal')}</option>
          <option value="inline">{t('attachment.storageInline')}</option>
        </Select>
      </FormField>
      {field.type === 'image' && (
        <FormField label={t('attachment.thumbSize')}>
          <Select
            value={field.thumbnailSize ?? 'm'}
            onChange={(e) =>
              onChange({ thumbnailSize: e.target.value as ThumbnailSize })
            }
          >
            <option value="s">{t('attachment.thumbS')}</option>
            <option value="m">{t('attachment.thumbM')}</option>
            <option value="b">{t('attachment.thumbB')}</option>
          </Select>
        </FormField>
      )}
      <FormField
        label={t('attachment.acceptMime')}
        className={field.type === 'image' ? 'md:col-span-2' : undefined}
      >
        <Input
          value={field.acceptMime ?? ''}
          placeholder={t('attachment.acceptMimePlaceholder')}
          onChange={(e) =>
            onChange({ acceptMime: e.target.value || undefined })
          }
        />
      </FormField>
    </div>
  );
}
