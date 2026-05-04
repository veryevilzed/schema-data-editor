import { useEffect, useMemo, useState } from 'react';
import { Save, X } from 'lucide-react';
import { Button } from './ui/button';
import { Checkbox, FormField, Input, Select, Textarea } from './ui/input';
import { useProjectStore } from '@/store/project-store';
import type { AppDocument, Field, ID, RelationField } from '@shared/schema';
import {
  relationLabel,
  todayDateInput,
  toLocalDatetimeInput,
} from '@/lib/utils';
import { useI18n } from '@/i18n/provider';

type FormValues = Record<string, unknown>;

export function DataForm({
  entityName,
  initial,
  onSaved,
  onCancel,
}: {
  entityName: string;
  initial: AppDocument | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const schema = useProjectStore((s) => s.schema)!;
  const data = useProjectStore((s) => s.data);
  const saveDocument = useProjectStore((s) => s.saveDocument);

  const entity = schema.entities[entityName];

  const initialValues = useMemo<FormValues>(() => {
    const values: FormValues = {};
    if (initial) {
      for (const k of entity.fieldOrder) {
        values[k] = initial[k];
      }
    } else {
      for (const k of entity.fieldOrder) {
        const f = entity.fields[k];
        values[k] = defaultValueFor(f);
      }
    }
    return values;
  }, [initial, entity]);

  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => setValues(initialValues), [initialValues]);

  const setField = (name: string, value: unknown) => {
    setValues((v) => ({ ...v, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: '' }));
  };

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    const docs = data[entityName] ?? [];
    const currentId = initial?.id;

    for (const fname of entity.fieldOrder) {
      const f = entity.fields[fname];
      const v = values[fname];
      const isEmpty =
        v === undefined ||
        v === null ||
        (typeof v === 'string' && v.trim() === '') ||
        (Array.isArray(v) && v.length === 0);

      if (f.required && isEmpty) {
        errs[fname] = t('validation.required');
        continue;
      }
      if (isEmpty) continue;

      if (f.type === 'number' && typeof v !== 'number' && Number.isNaN(Number(v))) {
        errs[fname] = t('validation.notNumber');
        continue;
      }

      if (f.unique) {
        const dup = docs.find(
          (d) =>
            String(d.id) !== String(currentId) &&
            String(d[fname] ?? '') === String(v),
        );
        if (dup) {
          errs[fname] = t('validation.notUnique');
          continue;
        }
      }

      if (f.type === 'enum' && !f.values.includes(String(v))) {
        errs[fname] = t('validation.notInEnum');
        continue;
      }
    }
    return errs;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSubmitting(true);
    try {
      const doc: AppDocument = { id: initial?.id ?? ('' as unknown as ID) };
      for (const fname of entity.fieldOrder) {
        const f = entity.fields[fname];
        const v = values[fname];
        doc[fname] = normalizeOut(v, f) as AppDocument[string];
      }
      await saveDocument(entityName, doc);
      onSaved();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {entity.fieldOrder.map((fname) => {
        const f = entity.fields[fname];
        return (
          <FieldInput
            key={fname}
            fieldName={fname}
            field={f}
            value={values[fname]}
            onChange={(v) => setField(fname, v)}
            error={errors[fname]}
          />
        );
      })}
      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          <X className="h-4 w-4" /> {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={submitting}>
          <Save className="h-4 w-4" /> {t('common.save')}
        </Button>
      </div>
    </form>
  );
}

function defaultValueFor(field: Field): unknown {
  switch (field.type) {
    case 'string':
    case 'text':
      return field.default ?? '';
    case 'number':
      return field.default ?? '';
    case 'boolean':
      return field.default ?? false;
    case 'date':
      if (field.defaultNow) return todayDateInput();
      return field.default ?? '';
    case 'datetime':
      if (field.defaultNow) return new Date().toISOString();
      return field.default ?? '';
    case 'enum':
      return field.default ?? '';
    case 'relation':
      if (field.kind === 'many') {
        return Array.isArray(field.default) ? [...field.default] : [];
      }
      if (Array.isArray(field.default)) return '';
      return field.default ?? '';
  }
}

function normalizeOut(value: unknown, field: Field): unknown {
  if (value === '' || value === undefined) {
    if (field.type === 'relation' && field.kind === 'many') return [];
    return null;
  }
  if (field.type === 'number') {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isNaN(n) ? null : n;
  }
  if (field.type === 'boolean') return Boolean(value);
  return value;
}

function FieldInput({
  fieldName,
  field,
  value,
  onChange,
  error,
}: {
  fieldName: string;
  field: Field;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
}) {
  const { t } = useI18n();
  const label = (
    <span className="flex items-center gap-1">
      {fieldName}
      {field.required && <span className="text-destructive">*</span>}
    </span>
  );

  switch (field.type) {
    case 'string':
      return (
        <FormField label={label} hint={field.description} error={error}>
          <Input
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        </FormField>
      );
    case 'text':
      return (
        <FormField label={label} hint={field.description} error={error}>
          <Textarea
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        </FormField>
      );
    case 'number':
      return (
        <FormField label={label} hint={field.description} error={error}>
          <Input
            type="number"
            inputMode="decimal"
            value={value === null || value === undefined ? '' : (value as number)}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </FormField>
      );
    case 'boolean':
      return (
        <FormField label={label} hint={field.description} error={error}>
          <label className="inline-flex items-center gap-2 text-sm">
            <Checkbox
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
            />
            <span>{Boolean(value) ? t('common.yes') : t('common.no')}</span>
          </label>
        </FormField>
      );
    case 'date':
      return (
        <FormField label={label} hint={field.description} error={error}>
          <Input
            type="date"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        </FormField>
      );
    case 'datetime':
      return (
        <FormField label={label} hint={field.description} error={error}>
          <Input
            type="datetime-local"
            value={
              typeof value === 'string' && value
                ? toLocalDatetimeInput(value)
                : ''
            }
            onChange={(e) =>
              onChange(e.target.value ? new Date(e.target.value).toISOString() : '')
            }
          />
        </FormField>
      );
    case 'enum':
      return (
        <FormField label={label} hint={field.description} error={error}>
          <Select
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">{t('form.relationNotSet')}</option>
            {field.values.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>
        </FormField>
      );
    case 'relation':
      return (
        <FormField
          label={label}
          hint={`${t('fieldType.relation')} → ${field.target || '?'}`}
          error={error}
        >
          <RelationPicker field={field} value={value} onChange={onChange} />
        </FormField>
      );
  }
}

function RelationPicker({
  field,
  value,
  onChange,
}: {
  field: RelationField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const { t } = useI18n();
  const data = useProjectStore((s) => s.data);
  const schema = useProjectStore((s) => s.schema)!;
  const target = field.target ? schema.entities[field.target] : undefined;
  const targetDocs = field.target ? data[field.target] ?? [] : [];

  const labelOf = (d: AppDocument): string =>
    relationLabel(d.id, target, targetDocs, { withId: true });

  if (!field.target) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('relationOpts.targetMissing')}
      </p>
    );
  }

  if (field.kind === 'one') {
    return (
      <Select
        value={value === null || value === undefined ? '' : String(value)}
        onChange={(e) => onChange(e.target.value === '' ? '' : coerceId(e.target.value, target))}
      >
        <option value="">{t('form.relationNotSet')}</option>
        {targetDocs.map((d) => (
          <option key={String(d.id)} value={String(d.id)}>
            {labelOf(d)}
          </option>
        ))}
      </Select>
    );
  }

  const selected = Array.isArray(value) ? (value as ID[]) : [];
  const selectedSet = new Set(selected.map(String));

  const toggle = (id: ID) => {
    const key = String(id);
    if (selectedSet.has(key)) {
      onChange(selected.filter((x) => String(x) !== key));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="rounded-md border border-input bg-background max-h-56 overflow-y-auto p-1">
      {targetDocs.length === 0 && (
        <p className="px-2 py-2 text-sm text-muted-foreground">
          {t('form.relationNoDocs', { target: field.target })}
        </p>
      )}
      {targetDocs.map((d) => (
        <label
          key={String(d.id)}
          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent"
        >
          <Checkbox
            checked={selectedSet.has(String(d.id))}
            onChange={() => toggle(d.id)}
          />
          <span>{labelOf(d)}</span>
        </label>
      ))}
    </div>
  );
}

function coerceId(s: string, target: { idStrategy: string } | null | undefined): ID {
  if (target && target.idStrategy === 'auto-increment') {
    const n = Number(s);
    if (Number.isFinite(n)) return n;
  }
  return s;
}
