import { EN_LOCALE } from './en';
import { US_LOCALE } from './us';
import { UK_LOCALE } from './uk';
import { NO_LOCALE } from './no';
import { SE_LOCALE } from './se';
import { DK_LOCALE } from './dk';
import { PL_LOCALE } from './pl';
import { DE_LOCALE } from './de';
import { FR_LOCALE } from './fr';
import { ES_LOCALE } from './es';
import type { CountryLocaleConfig, CountryRouteCode } from './types';

export {
  EN_LOCALE,
  US_LOCALE,
  UK_LOCALE,
  NO_LOCALE,
  SE_LOCALE,
  DK_LOCALE,
  PL_LOCALE,
  DE_LOCALE,
  FR_LOCALE,
  ES_LOCALE,
};
export type { CountryLocaleConfig, CountryRouteCode };

export const ALL_COUNTRY_LOCALES: Record<CountryRouteCode, CountryLocaleConfig> = {
  en: EN_LOCALE,
  us: US_LOCALE,
  uk: UK_LOCALE,
  no: NO_LOCALE,
  se: SE_LOCALE,
  dk: DK_LOCALE,
  pl: PL_LOCALE,
  de: DE_LOCALE,
  fr: FR_LOCALE,
  es: ES_LOCALE,
};

export const COUNTRY_ROUTE_LIST: CountryLocaleConfig[] = [
  EN_LOCALE,
  US_LOCALE,
  UK_LOCALE,
  NO_LOCALE,
  SE_LOCALE,
  DK_LOCALE,
  PL_LOCALE,
  DE_LOCALE,
  FR_LOCALE,
  ES_LOCALE,
];

export function detectSuggestedLocaleFromBrowser(browserLang?: string): CountryLocaleConfig | null {
  if (!browserLang) return null;
  const lower = browserLang.toLowerCase();
  if (lower.startsWith('no') || lower.startsWith('nb') || lower.startsWith('nn')) {
    return NO_LOCALE;
  }
  if (lower.startsWith('sv')) {
    return SE_LOCALE;
  }
  if (lower.startsWith('da')) {
    return DK_LOCALE;
  }
  if (lower.startsWith('pl')) {
    return PL_LOCALE;
  }
  if (lower.startsWith('de')) {
    return DE_LOCALE;
  }
  if (lower.startsWith('fr')) {
    return FR_LOCALE;
  }
  if (lower.startsWith('es')) {
    return ES_LOCALE;
  }
  if (lower === 'en-us') {
    return US_LOCALE;
  }
  if (lower === 'en-gb') {
    return UK_LOCALE;
  }
  return null;
}
