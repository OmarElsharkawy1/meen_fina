import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { SignInButton } from '../auth/SignInButton';
import { useAuth } from '../auth/AuthProvider';
import { Screen } from '../components/Screen';
import { useMyGroups } from '../data/useMyGroups';
import { InstallCard } from '../install/InstallCard';
import { clearPendingJoin, getPendingJoin } from '../lib/pendingJoin';

export function Home() {
  const { t } = useTranslation();
  const { user, loading, authError } = useAuth();
  const navigate = useNavigate();
  const { groups, loading: groupsLoading } = useMyGroups(user?.uid);

  useEffect(() => {
    if (!user) return;
    const code = getPendingJoin();
    if (code) {
      clearPendingJoin();
      navigate(`/j/${code}`, { replace: true });
    }
  }, [user, navigate]);

  if (loading) {
    return (
      <Screen>
        <span className="skeleton" style={{ blockSize: 120 }} />
      </Screen>
    );
  }

  if (!user) {
    return (
      <Screen>
        <h1>{t('appName')}</h1>
        <p className="muted">{t('tagline')}</p>
        {authError ? (
          <p role="alert" className="error">
            {t(authError)}
          </p>
        ) : null}
        <SignInButton />
        <InstallCard />
      </Screen>
    );
  }

  return (
    <Screen>
      <div className="title-row">
        <h1>{t('screens.home')}</h1>
        <Link to="/settings" className="icon-link" aria-label={t('screens.settings')}>
          ⚙
        </Link>
      </div>
      <InstallCard />
      {groupsLoading ? (
        <div className="stack" aria-busy="true">
          <span className="skeleton" style={{ blockSize: 64 }} />
          <span className="skeleton" style={{ blockSize: 64 }} />
        </div>
      ) : groups.length === 0 ? (
        <p className="muted">{t('home.empty')}</p>
      ) : (
        <ul className="stack list">
          {groups.map((g) => (
            <li key={g.id}>
              <Link to={`/g/${g.id}`} className="card group-row">
                <strong dir="auto">{g.name}</strong>
                <span className="muted">{t('home.members', { count: g.memberUids.length })}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="actions">
        <Link to="/new" className="btn btn-primary">
          {t('home.create')}
        </Link>
        <Link to="/join" className="btn btn-secondary">
          {t('home.join')}
        </Link>
      </div>
    </Screen>
  );
}
