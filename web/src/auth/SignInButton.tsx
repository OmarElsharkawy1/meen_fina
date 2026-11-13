import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthProvider';

export function SignInButton() {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  return (
    <button type="button" className="btn btn-primary" onClick={() => void signIn()}>
      {t('auth.signIn')}
    </button>
  );
}
