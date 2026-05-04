import { useEffect } from 'react';
import { FolderOpen, FilePlus2, Database, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';
import { useProjectStore } from '@/store/project-store';
import { basename } from '@/lib/utils';
import { useI18n } from '@/i18n/provider';

export function WelcomeScreen() {
  const { t } = useI18n();

  const recents = useProjectStore((s) => s.recents);
  const loadRecents = useProjectStore((s) => s.loadRecents);
  const pickAndOpen = useProjectStore((s) => s.pickAndOpen);
  const pickAndCreate = useProjectStore((s) => s.pickAndCreate);
  const open = useProjectStore((s) => s.open);
  const error = useProjectStore((s) => s.error);

  useEffect(() => {
    void loadRecents();
  }, [loadRecents]);

  const onOpen = () =>
    void pickAndOpen({
      title: t('welcome.dialogOpenTitle'),
      buttonLabel: t('welcome.dialogOpenButton'),
    });
  const onCreate = () =>
    void pickAndCreate({
      title: t('welcome.dialogCreateTitle'),
      buttonLabel: t('welcome.dialogCreateButton'),
    });

  return (
    <div className="flex min-h-full flex-col">
      <div className="titlebar-drag flex h-10 items-center justify-end gap-2 px-3">
        <LanguageToggle />
        <ThemeToggle />
      </div>
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-2xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {t('welcome.title')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t('welcome.subtitle')}
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Card
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={onOpen}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <FolderOpen className="h-5 w-5 text-primary" />
                  <CardTitle>{t('welcome.openProject')}</CardTitle>
                </div>
                <CardDescription>{t('welcome.openProjectDesc')}</CardDescription>
              </CardHeader>
            </Card>

            <Card
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={onCreate}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <FilePlus2 className="h-5 w-5 text-primary" />
                  <CardTitle>{t('welcome.newProject')}</CardTitle>
                </div>
                <CardDescription>{t('welcome.newProjectDesc')}</CardDescription>
              </CardHeader>
            </Card>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {t('welcome.recent')}
            </div>
            {recents.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('welcome.recentEmpty')}</p>
            ) : (
              <div className="overflow-hidden rounded-md border border-border bg-card">
                {recents.map((p, idx) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => void open(p)}
                    className={
                      'flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-accent ' +
                      (idx > 0 ? 'border-t border-border' : '')
                    }
                  >
                    <span className="font-medium">{basename(p)}</span>
                    <span className="truncate text-xs text-muted-foreground ml-3">
                      {p}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCreate}>
              <FilePlus2 className="h-4 w-4" /> {t('common.create')}
            </Button>
            <Button onClick={onOpen}>
              <FolderOpen className="h-4 w-4" /> {t('welcome.dialogOpenButton')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
