import { EN_LOCALE } from './en';
import { NO_LOCALE } from './no';
import { SE_LOCALE } from './se';
import { DK_LOCALE } from './dk';
import { PL_LOCALE } from './pl';
import type { CountryLocaleConfig, CountryRouteCode } from './types';

export { EN_LOCALE, NO_LOCALE, SE_LOCALE, DK_LOCALE, PL_LOCALE };
export type { CountryLocaleConfig, CountryRouteCode };

export const ALL_COUNTRY_LOCALES: Record<CountryRouteCode, CountryLocaleConfig> = {
  en: EN_LOCALE,
  no: NO_LOCALE,
  se: SE_LOCALE,
  dk: DK_LOCALE,
  pl: PL_LOCALE,
};

export const COUNTRY_ROUTE_LIST: CountryLocaleConfig[] = [
  EN_LOCALE,
  NO_LOCALE,
  SE_LOCALE,
  DK_LOCALE,
  PL_LOCALE,
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
  return null;
}
