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
  q: Pick<QuestionDoc, 'eligibleUids' | 'votedUids' | 'people' | 'askerUid'>,
  uid: string,
  // Kept for signature stability: votes for the leaver are left in place and become void.
  _votes: Array<{ voterUid: string; targetUid: string }>,
): {
  eligibleUids: string[];
  votedUids: string[];
  people: Record<string, Person>;
  voterUidsToDelete: string[];
} {
  const people = { ...q.people };
  // The asker's name must stay visible; anyone else leaves no trace.
  if (uid !== q.askerUid) delete people[uid];
  return {
    eligibleUids: q.eligibleUids.filter((u) => u !== uid),
    votedUids: q.votedUids.filter((u) => u !== uid),
    people,
    voterUidsToDelete: q.votedUids.includes(uid) ? [uid] : [],
  };
}

/** Votes whose voter and target are both currently eligible. */
export function countValidVotes(
  eligibleUids: string[],
  votes: Array<{ voterUid: string; targetUid: string }>,
): number {
  const eligible = new Set(eligibleUids);
  return votes.filter((v) => eligible.has(v.voterUid) && eligible.has(v.targetUid)).length;
}
