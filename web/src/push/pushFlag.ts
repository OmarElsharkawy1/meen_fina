// One-shot hint: JoinLink sets it after a successful join, Group shows the push
// prompt once and clears it. Dismissal is remembered across sessions in localStorage.
const ASK_KEY = 'mf.askPush';
const DISMISS_KEY = 'mf.pushDismissed';

export function markAskPush(): void {
  try {
    sessionStorage.setItem(ASK_KEY, '1');
  } catch {
    /* storage unavailable */
  }
}

export function peekAskPush(): boolean {
  try {
    return sessionStorage.getItem(ASK_KEY) === '1';
  } catch {
    return false;
  }
}

export function clearAskPush(): void {
  try {
    sessionStorage.removeItem(ASK_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function isPushDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissPush(): void {
  try {
    localStorage.setItem(DISMISS_KEY, '1');
  } catch {
    /* storage unavailable */
  }
}

export function clearPushDismissed(): void {
  try {
    localStorage.removeItem(DISMISS_KEY);
  } catch {
    /* storage unavailable */
  }
}
