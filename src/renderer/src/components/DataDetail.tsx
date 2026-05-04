import { Card, CardContent } from './ui/card';
import { useProjectStore } from '@/store/project-store';
import type { AppDocument, Field, ID, RelationField } from '@shared/schema';
import { formatId, relationLabel } from '@/lib/utils';
import { useI18n } from '@/i18n/provider';

export function DataDetail({
  entityName,
  doc,
}: {
  entityName: string;
  doc: AppDocument;
}) {
  const schema = useProjectStore((s) => s.schema)!;
  const entity = schema.entities[entityName];

  return (
    <Card>
      <CardContent className="p-0">
        <dl className="divide-y divide-border">
          <Row
            label="id"
            value={<code className="font-mono text-xs">{formatId(doc.id)}</code>}
          />
          {entity.fieldOrder.map((fname) => {
            const f = entity.fields[fname];
            return (
              <Row
                key={fname}
                label={fname}
                description={f.description}
                value={<DetailValue value={doc[fname]} field={f} />}
              />
            );
          })}
        </dl>
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  description,
  value,
}: {
  label: string;
  description?: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid gap-1 px-5 py-3 sm:grid-cols-[200px_1fr] sm:gap-4">
      <dt className="text-sm">
        <div className="font-medium">{label}</div>
        {description && (
          <div className="text-xs text-muted-foreground">{description}</div>
        )}
      </dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

function DetailValue({ value, field }: { value: unknown; field: Field }) {
  const { t } = useI18n();
  if (value === null || value === undefined || value === '') {
    return <span className="text-muted-foreground">{t('common.dash')}</span>;
  }

  switch (field.type) {
    case 'boolean':
      return <>{value ? t('common.yes') : t('common.no')}</>;
    case 'datetime':
      try {
        return <>{new Date(String(value)).toLocaleString()}</>;
      } catch {
        return <>{String(value)}</>;
      }
    case 'date':
      return <>{String(value)}</>;
    case 'text':
      return <p className="whitespace-pre-wrap leading-relaxed">{String(value)}</p>;
    case 'enum':
      return (
        <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs">
          {String(value)}
        </span>
      );
    case 'relation':
      return <RelationDisplay field={field} value={value} />;
    default:
      return <>{String(value)}</>;
  }
}

function RelationDisplay({
  field,
  value,
}: {
  field: RelationField;
  value: unknown;
}) {
  const schema = useProjectStore((s) => s.schema)!;
  const data = useProjectStore((s) => s.data);
  const target = schema.entities[field.target];
  const targetDocs = data[field.target] ?? [];

  const labelOf = (id: ID) => relationLabel(id, target, targetDocs, { withId: true });

  if (field.kind === 'one') {
    return <span>{labelOf(value as ID)}</span>;
  }
  const ids = Array.isArray(value) ? (value as ID[]) : [];
  if (ids.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {ids.map((id) => (
        <span
          key={String(id)}
          className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs"
        >
          {labelOf(id)}
        </span>
      ))}
    </div>
  );
}
