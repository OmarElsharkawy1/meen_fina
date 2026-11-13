const KEY = 'mf.pendingJoin';

export function setPendingJoin(code: string): void {
  try {
    sessionStorage.setItem(KEY, code);
  } catch {
    // storage unavailable
  }
}

export function getPendingJoin(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearPendingJoin(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // storage unavailable
  }
}
