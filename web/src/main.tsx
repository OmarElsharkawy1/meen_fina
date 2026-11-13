import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ProfileLang } from './ProfileLang';
import { AuthProvider } from './auth/AuthProvider';
import './i18n';
import { applyLang, detectLang, storedLang } from './lib/lang';
import './styles/tokens.css';
import './styles/base.css';

applyLang(storedLang() ?? detectLang(navigator.languages));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ProfileLang />
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
