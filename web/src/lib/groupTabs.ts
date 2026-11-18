export const GROUP_TABS = ['turn', 'waiting', 'results'] as const;
export type GroupTab = (typeof GROUP_TABS)[number];

export function isGroupTab(v: unknown): v is GroupTab {
  return typeof v === 'string' && (GROUP_TABS as readonly string[]).includes(v);
}

/**
 * The tab to show: the one in the URL if valid, otherwise the first tab with something
 * in it (your turn first), otherwise Your turn.
 */
export function pickTab(requested: string | null, counts: Record<GroupTab, number>): GroupTab {
  if (isGroupTab(requested)) return requested;
  return GROUP_TABS.find((tab) => counts[tab] > 0) ?? 'turn';
}
