import { WINNERS_ONLY_BELOW } from '../shared/constants';
import type { QuestionResults } from '../shared/types';

export function computeResults(
  eligibleUids: string[],
  votes: Array<{ voterUid: string; targetUid: string }>,
): QuestionResults {
  const eligible = new Set(eligibleUids);
  const totals: Record<string, number> = {};
  for (const uid of eligibleUids) totals[uid] = 0;
  for (const { voterUid, targetUid } of votes) {
    if (eligible.has(voterUid) && eligible.has(targetUid)) totals[targetUid] += 1;
  }
  if (eligibleUids.length >= WINNERS_ONLY_BELOW) return { mode: 'full', totals };
  const max = Math.max(0, ...Object.values(totals));
  const winnerUids = Object.keys(totals)
    .filter((uid) => totals[uid] === max)
    .sort();
  return { mode: 'winners', winnerUids };
}
