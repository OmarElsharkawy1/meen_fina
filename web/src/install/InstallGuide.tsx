import { useTranslation } from 'react-i18next';

/** Manual install steps for browsers that have no install dialog. */
export function InstallGuide({ mode, onClose }: { mode: 'ios' | 'android'; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <section className="card stack pop-in" aria-labelledby="install-guide-title">
      <strong id="install-guide-title">{t('install.guideTitle')}</strong>
      <ol className="steps">
        <li>{t(`install.${mode}.step1`)}</li>
        <li>{t(`install.${mode}.step2`)}</li>
        <li>{t(`install.${mode}.step3`)}</li>
      </ol>
      <button type="button" className="btn btn-secondary" onClick={onClose}>
        {t('install.gotIt')}
      </button>
    </section>
  );
}
