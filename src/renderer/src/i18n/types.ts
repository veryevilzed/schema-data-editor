export type Locale = 'ru' | 'en';

export const LOCALES: Locale[] = ['ru', 'en'];

export const LOCALE_NAMES: Record<Locale, string> = {
  ru: 'Русский',
  en: 'English',
};

export const LOCALE_SHORT: Record<Locale, string> = {
  ru: 'RU',
  en: 'EN',
};
