import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme, type Theme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/provider';

const options: { value: Theme; icon: typeof Sun; labelKey: string }[] = [
  { value: 'light', icon: Sun, labelKey: 'theme.light' },
  { value: 'dark', icon: Moon, labelKey: 'theme.dark' },
  { value: 'system', icon: Monitor, labelKey: 'theme.system' },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5 titlebar-no-drag"
      role="group"
      aria-label={t('theme.label')}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = theme === opt.value;
        const label = t(opt.labelKey);
        return (
          <button
            key={opt.value}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={active}
            onClick={() => setTheme(opt.value)}
            className={cn(
              'inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors',
              active && 'bg-accent text-foreground',
              !active && 'hover:bg-accent/60 hover:text-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}
