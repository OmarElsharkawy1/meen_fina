import { Component, type ErrorInfo, type ReactNode } from 'react';
import i18n from '../i18n';

type State = { failed: boolean };

/** Last-resort fallback so a render crash never leaves a blank screen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('render crash', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="screen stack" role="alert">
        <h1>{i18n.t('crash.title')}</h1>
        <p className="muted">{i18n.t('crash.body')}</p>
        <button type="button" className="btn btn-primary" onClick={() => location.reload()}>
          {i18n.t('crash.reload')}
        </button>
      </main>
    );
  }
}
