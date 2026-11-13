import i18n from '../i18n';

export type Lang = 'en' | 'ar';

export function detectLang(navigatorLanguages: readonly string[]): Lang {
  const first = navigatorLanguages.find((l) => /^(ar|en)/i.test(l));
  return first?.toLowerCase().startsWith('ar') ? 'ar' : 'en';
}

export function applyLang(lang: Lang): void {
  void i18n.changeLanguage(lang);
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // storage unavailable
  }
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

const STORAGE_KEY = 'mf.lang';

export function storedLang(): Lang | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'en' || v === 'ar' ? v : null;
  } catch {
    return null;
  }
}
