import { useState } from 'react';
import { Plus, Trash2, Box, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, ConfirmDialog } from './ui/dialog';
import { FormField, Input, Select } from './ui/input';
import { useProjectStore } from '@/store/project-store';
import { isValidIdentifier } from '@/lib/utils';
import { useI18n } from '@/i18n/provider';
import type { IdStrategy } from '@shared/schema';

export function Sidebar() {
  const { t } = useI18n();
  const schema = useProjectStore((s) => s.schema)!;
  const data = useProjectStore((s) => s.data);
  const selected = useProjectStore((s) => s.selectedEntity);
  const select = useProjectStore((s) => s.selectEntity);
  const addEntity = useProjectStore((s) => s.addEntity);
  const removeEntity = useProjectStore((s) => s.removeEntity);

  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-card/30">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('sidebar.entities')}
        </span>
        <Button
          size="icon"
          variant="ghost"
          title={t('sidebar.addEntity')}
          onClick={() => setShowAdd(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {schema.entityOrder.length === 0 ? (
          <div className="p-3 text-xs text-muted-foreground">{t('sidebar.empty')}</div>
        ) : (
          <ul className="space-y-1">
            {schema.entityOrder.map((name) => {
              const count = data[name]?.length ?? 0;
              const active = selected === name;
              return (
                <li key={name}>
                  <button
                    type="button"
                    onClick={() => select(name)}
                    className={
                      'group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ' +
                      (active
                        ? 'bg-accent text-foreground'
                        : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground')
                    }
                  >
                    <Box className="h-3.5 w-3.5 opacity-70" />
                    <span className="flex-1 truncate text-left font-medium">{name}</span>
                    <span className="text-xs tabular-nums opacity-70">{count}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete(name);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          setConfirmDelete(name);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity rounded p-0.5"
                      title={t('sidebar.deleteEntity')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {showAdd && (
        <AddEntityDialog
          existing={schema.entityOrder}
          defaultIdStrategy={schema.defaultIdStrategy}
          onClose={() => setShowAdd(false)}
          onSubmit={async (name, strategy) => {
            await addEntity(name, strategy);
            setShowAdd(false);
          }}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title={t('sidebar.deleteEntityTitle', { name: confirmDelete ?? '' })}
        description={t('sidebar.deleteEntityDesc')}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (confirmDelete) await removeEntity(confirmDelete);
          setConfirmDelete(null);
        }}
      />
    </aside>
  );
}

function AddEntityDialog({
  existing,
  defaultIdStrategy,
  onClose,
  onSubmit,
}: {
  existing: string[];
  defaultIdStrategy: IdStrategy;
  onClose: () => void;
  onSubmit: (name: string, strategy: IdStrategy) => void | Promise<void>;
}) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [strategy, setStrategy] = useState<IdStrategy>(defaultIdStrategy);

  const trimmed = name.trim();
  let error: string | null = null;
  if (trimmed && !isValidIdentifier(trimmed)) {
    error = t('validation.identifier');
  } else if (existing.includes(trimmed)) {
    error = t('validation.entityExists');
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('addEntity.title')}
      description={t('addEntity.desc')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            disabled={!trimmed || !!error}
            onClick={() => onSubmit(trimmed, strategy)}
          >
            {t('common.create')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label={t('addEntity.name')} error={error ?? undefined}>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('addEntity.namePlaceholder')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && trimmed && !error) onSubmit(trimmed, strategy);
            }}
          />
        </FormField>
        <FormField
          label={t('addEntity.idStrategy')}
          hint={
            <span className="inline-flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {t('addEntity.idStrategyHint')}
            </span>
          }
        >
          <Select value={strategy} onChange={(e) => setStrategy(e.target.value as IdStrategy)}>
            <option value="auto-increment">{t('idStrategy.autoIncrementLong')}</option>
            <option value="uuid">{t('idStrategy.uuidLong')}</option>
          </Select>
        </FormField>
      </div>
    </Dialog>
  );
}
