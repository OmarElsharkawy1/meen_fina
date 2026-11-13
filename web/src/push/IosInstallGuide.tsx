import { useTranslation } from 'react-i18next';

export function IosInstallGuide({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <section className="card stack" aria-labelledby="ios-guide-title">
      <strong id="ios-guide-title">{t('push.ios.title')}</strong>
      <ol className="steps">
        <li>{t('push.ios.step1')}</li>
        <li>{t('push.ios.step2')}</li>
        <li>{t('push.ios.step3')}</li>
      </ol>
      <button type="button" className="btn btn-secondary" onClick={onClose}>
        {t('push.ios.gotIt')}
      </button>
    </section>
  );
}
