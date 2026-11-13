import { MIN_VOTES_TO_REVEAL } from '../shared/constants';
import type { Person, QuestionDoc } from '../shared/types';

export function revealDecision(eligibleCount: number, votedCount: number): 'reveal' | 'expire' | 'wait' {
  if (eligibleCount < MIN_VOTES_TO_REVEAL) return 'expire';
  if (votedCount === eligibleCount) return 'reveal';
  return 'wait';
}

export function expiryDecision(votedCount: number): 'reveal' | 'expire' {
  return votedCount >= MIN_VOTES_TO_REVEAL ? 'reveal' : 'expire';
}

export function removeMemberFromQuestion(
  q: Pick<QuestionDoc, 'eligibleUids' | 'votedUids' | 'people'>,
  uid: string,
  votes: Array<{ voterUid: string; targetUid: string }>,
): {
  eligibleUids: string[];
  votedUids: string[];
  people: Record<string, Person>;
  voterUidsToDelete: string[];
} {
  const toDelete = new Set<string>();
  if (q.votedUids.includes(uid)) toDelete.add(uid);
  for (const v of votes) if (v.targetUid === uid) toDelete.add(v.voterUid);
  const people = { ...q.people };
  delete people[uid];
  return {
    eligibleUids: q.eligibleUids.filter((u) => u !== uid),
    votedUids: q.votedUids.filter((u) => !toDelete.has(u)),
    people,
    voterUidsToDelete: [...toDelete],
  };
}
