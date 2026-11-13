import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

type Props = { title?: string; back?: string; children: ReactNode };

/** Shared screen layout: app name header, optional back link, title, content. */
export function Screen({ title, back, children }: Props) {
  const { t } = useTranslation();
  return (
    <main className="screen">
      <header className="screen-header">
        {back ? (
          <Link to={back} className="back-link">
            {t('common.back')}
          </Link>
        ) : null}
        <span className="app-name">{t('appName')}</span>
      </header>
      {title ? <h1>{title}</h1> : null}
      {children}
    </main>
  );
}
