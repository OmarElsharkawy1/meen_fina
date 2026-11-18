import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ProfileLang } from './ProfileLang';
import { AuthProvider } from './auth/AuthProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import './i18n';
import './install/installPrompt';
import { applyLang, detectLang, storedLang } from './lib/lang';
import { startAutoUpdate } from './lib/autoUpdate';
import { applyTheme, storedTheme } from './lib/theme';
import { PushRefresh } from './push/PushRefresh';
import './styles/tokens.css';
import './styles/base.css';

// A deploy replaces hashed chunks; reload once to pick up the new index.html.
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault();
  try {
    const last = Number(sessionStorage.getItem('mf.reloadedForChunk') ?? 0);
    if (Date.now() - last < 10_000) return;
    sessionStorage.setItem('mf.reloadedForChunk', String(Date.now()));
  } catch {
    return;
  }
  location.reload();
});

applyLang(storedLang() ?? detectLang(navigator.languages));
applyTheme(storedTheme());
startAutoUpdate();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ProfileLang />
          <PushRefresh />
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
