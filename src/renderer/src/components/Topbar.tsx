import { Database, FolderOpen } from 'lucide-react';
import { Button } from './ui/button';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';
import { useProjectStore } from '@/store/project-store';
import { basename } from '@/lib/utils';
import { useI18n } from '@/i18n/provider';

export function Topbar() {
  const { t } = useI18n();

  const projectPath = useProjectStore((s) => s.projectPath);
  const close = useProjectStore((s) => s.close);
  const mode = useProjectStore((s) => s.mode);
  const setMode = useProjectStore((s) => s.setMode);

  return (
    <div className="titlebar-drag flex h-12 items-center gap-3 border-b border-border bg-card/60 px-4 backdrop-blur">
      <div className="flex items-center gap-2 pl-14 sm:pl-16 md:pl-20">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Database className="h-3.5 w-3.5" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">
            {projectPath ? basename(projectPath) : ''}
          </span>
          {projectPath && (
            <span className="text-[11px] text-muted-foreground truncate max-w-[40ch]">
              {projectPath}
            </span>
          )}
        </div>
      </div>

      <div className="titlebar-no-drag mx-auto inline-flex rounded-md border border-border bg-background p-0.5">
        {(['schema', 'data'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={
              'h-7 px-3 text-xs font-medium rounded transition-colors ' +
              (mode === m
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground')
            }
          >
            {m === 'schema' ? t('topbar.schema') : t('topbar.data')}
          </button>
        ))}
      </div>

      <div className="ml-auto titlebar-no-drag flex items-center gap-2">
        <LanguageToggle compact />
        <ThemeToggle />
        <Button variant="ghost" size="sm" onClick={close} title={t('topbar.closeProject')}>
          <FolderOpen className="h-3.5 w-3.5" />
          {t('topbar.close')}
        </Button>
      </div>
    </div>
  );
}
