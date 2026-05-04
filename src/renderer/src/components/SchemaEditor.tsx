import { useState } from 'react';
import { Archive, ChevronDown, ChevronUp, Settings2 } from 'lucide-react';
import { useProjectStore } from '@/store/project-store';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardTitle } from './ui/card';
import { FormField, Input, Select } from './ui/input';
import { EntityEditor } from './EntityEditor';
import { EmptyState } from './EmptyState';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/provider';
import type { IdStrategy, StorageFormat } from '@shared/schema';

export function SchemaEditor() {
  const { t } = useI18n();
  const schema = useProjectStore((s) => s.schema)!;
  const selected = useProjectStore((s) => s.selectedEntity);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <ProjectSettingsCard />
      {selected ? (
        <EntityEditor key={selected} entityName={selected} />
      ) : (
        <EmptyState
          icon={<Settings2 className="h-6 w-6" />}
          title={t('schema.notSelectedTitle')}
          description={
            schema.entityOrder.length === 0
              ? t('schema.notSelectedFirst')
              : t('schema.notSelectedExists')
          }
        />
      )}
    </div>
  );
}

function ProjectSettingsCard() {
  const { t } = useI18n();
  const schema = useProjectStore((s) => s.schema)!;
  const setStorageFormat = useProjectStore((s) => s.setStorageFormat);
  const setDataDir = useProjectStore((s) => s.setDataDir);
  const setDefaultIdStrategy = useProjectStore((s) => s.setDefaultIdStrategy);

  const [open, setOpen] = useState(true);
  const [dataDir, setDataDirLocal] = useState(schema.storage.dataDir);

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between p-5 text-left"
      >
        <div>
          <CardTitle>{t('project.settings')}</CardTitle>
          <CardDescription>{t('project.settingsDesc')}</CardDescription>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      <div className={cn(open ? 'block' : 'hidden')}>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              label={t('project.storageFormat')}
              hint={t('project.storageFormatHint')}
            >
              <Select
                value={schema.storage.format}
                onChange={(e) => void setStorageFormat(e.target.value as StorageFormat)}
              >
                <option value="single-json">{t('project.storageSingle')}</option>
                <option value="file-per-collection">
                  {t('project.storagePerCollection')}
                </option>
                <option value="file-per-doc">{t('project.storagePerDoc')}</option>
              </Select>
            </FormField>

            <FormField
              label={t('project.defaultIdStrategy')}
              hint={t('project.defaultIdStrategyHint')}
            >
              <Select
                value={schema.defaultIdStrategy}
                onChange={(e) => void setDefaultIdStrategy(e.target.value as IdStrategy)}
              >
                <option value="auto-increment">{t('idStrategy.autoIncrement')}</option>
                <option value="uuid">{t('idStrategy.uuid')}</option>
              </Select>
            </FormField>
          </div>

          <FormField label={t('project.dataDir')} hint={t('project.dataDirHint')}>
            <div className="flex gap-2">
              <Input
                value={dataDir}
                onChange={(e) => setDataDirLocal(e.target.value)}
                placeholder="data"
              />
              <button
                type="button"
                onClick={() => void setDataDir(dataDir)}
                disabled={dataDir === schema.storage.dataDir || !dataDir.trim()}
                className={cn(
                  'inline-flex h-9 items-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors',
                  'hover:bg-accent disabled:opacity-50 disabled:pointer-events-none',
                )}
              >
                {t('common.apply')}
              </button>
            </div>
          </FormField>

          <BackupRow />
        </CardContent>
      </div>
    </Card>
  );
}

function BackupRow() {
  const { t } = useI18n();
  const projectPath = useProjectStore((s) => s.projectPath);
  const schema = useProjectStore((s) => s.schema);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const onClick = async () => {
    if (!projectPath || !schema) return;
    setBusy(true);
    setDone(null);
    try {
      const target = await window.api.createBackup(projectPath, schema);
      if (target) setDone(target);
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormField label={t('backup.title')} hint={t('backup.desc')}>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="md" onClick={onClick} disabled={busy}>
          <Archive className="h-4 w-4" />
          {t('backup.button')}
        </Button>
        {done && (
          <span className="text-xs text-muted-foreground truncate">
            {t('backup.success', { path: done })}
          </span>
        )}
      </div>
    </FormField>
  );
}
