import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Locale } from './types';
import { LOCALES } from './types';
import { getPluralForm, translations } from './strings';

const STORAGE_KEY = 'sde:locale';

function detectInitial(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && (LOCALES as string[]).includes(stored)) return stored as Locale;
  const navLang = (navigator.language || 'en').toLowerCase();
  if (navLang.startsWith('ru')) return 'ru';
  return 'en';
}

interface Vars {
  [k: string]: string | number;
}

export interface I18nApi {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Vars) => string;
  tp: (count: number, baseKey: string, vars?: Vars) => string;
}

const Ctx = createContext<I18nApi | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => detectInitial());

  useEffect(() => {
    document.documentElement.lang = locale;
    localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const t = useCallback(
    (key: string, vars?: Vars): string => {
      const dict = translations[locale];
      let raw = dict[key];
      if (raw === undefined) {
        const fallback = translations.en[key];
        raw = fallback ?? key;
      }
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          raw = raw.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        }
      }
      return raw;
    },
    [locale],
  );

  const tp = useCallback(
    (count: number, baseKey: string, vars?: Vars): string => {
      const form = getPluralForm(locale, count);
      const suffix = form === 'one' ? 'One' : form === 'few' ? 'Few' : 'Many';
      return t(`${baseKey}${suffix}`, { count, ...vars });
    },
    [locale, t],
  );

  const value = useMemo<I18nApi>(
    () => ({
      locale,
      setLocale: (l) => setLocaleState(l),
      t,
      tp,
    }),
    [locale, t, tp],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
