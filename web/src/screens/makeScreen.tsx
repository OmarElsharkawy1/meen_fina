import { useTranslation } from 'react-i18next';

/** Placeholder screen: a heading with an i18n string. Replaced by Tasks 11-14. */
export function makeScreen(titleKey: string) {
  return function Screen() {
    const { t } = useTranslation();
    return (
      <main className="screen">
        <h1>{t(titleKey)}</h1>
      </main>
    );
  };
}
