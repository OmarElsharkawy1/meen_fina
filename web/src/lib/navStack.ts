// Remembers which path sits at each browser-history index, so Back can tell whether the
// previous entry is the screen it should return to. Lives in memory: after a reload the
// earlier entries are unknown and Back falls back to replacing the current entry.

const paths = new Map<number, string>();

export function historyIndex(): number {
  const idx = (window.history.state as { idx?: unknown } | null)?.idx;
  return typeof idx === 'number' ? idx : 0;
}

export function recordPath(idx: number, path: string): void {
  paths.set(idx, path);
  // Anything after the current entry was discarded by this navigation.
  for (const k of [...paths.keys()]) if (k > idx) paths.delete(k);
}

export function previousPath(idx: number): string | undefined {
  return paths.get(idx - 1);
}

/** Go back in history when the previous entry is the target, otherwise replace with it. */
export function backAction(target: string, previous: string | undefined): 'pop' | 'replace' {
  return previous === target ? 'pop' : 'replace';
}
