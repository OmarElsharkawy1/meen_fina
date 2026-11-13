import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { CODE_LENGTH } from '@shared/constants';
import { Screen } from '../components/Screen';

export function JoinCode() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [code, setCode] = useState('');

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (code.length === CODE_LENGTH) navigate(`/j/${code}`);
  }

  return (
    <Screen title={t('screens.joinCode')} back="/">
      <form className="stack" onSubmit={onSubmit}>
        <label className="field">
          <span>{t('join.codeLabel')}</span>
          <input
            className="input code-input"
            value={code}
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={CODE_LENGTH}
            dir="ltr"
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            autoFocus
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={code.length !== CODE_LENGTH}>
          {t('join.continue')}
        </button>
      </form>
    </Screen>
  );
}
