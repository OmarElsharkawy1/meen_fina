import { useEffect } from 'react';
import { useProfile } from './data/useProfile';
import { applyLang } from './lib/lang';

/** Applies the signed-in user's saved language to the document. */
export function ProfileLang() {
  const lang = useProfile()?.lang;
  useEffect(() => {
    if (lang) applyLang(lang);
  }, [lang]);
  return null;
}
