import { Languages } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { LOCALES, LOCALE_NAMES, LOCALE_SHORT } from '@/i18n/types';
import { cn } from '@/lib/utils';

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5 titlebar-no-drag"
      role="group"
      aria-label={t('language.label')}
      title={t('language.label')}
    >
      {!compact && (
        <span className="inline-flex h-7 w-7 items-center justify-center text-muted-foreground">
          <Languages className="h-3.5 w-3.5" />
        </span>
      )}
      {LOCALES.map((l) => {
        const active = locale === l;
        return (
          <button
            key={l}
            type="button"
            onClick={() => setLocale(l)}
            aria-pressed={active}
            title={LOCALE_NAMES[l]}
            className={cn(
              'inline-flex h-7 min-w-[28px] items-center justify-center rounded px-1.5 text-[11px] font-semibold tracking-wide transition-colors',
              active
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
            )}
          >
            {LOCALE_SHORT[l]}
          </button>
        );
      })}
    </div>
  );
}
