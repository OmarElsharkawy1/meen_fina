// No firebase imports here: this module is shared with the web app.
// Callable request/response types are added by the tasks that implement each callable.

/** Structural type satisfied by both the web and admin SDK Timestamp. */
export type Timestamp = { toMillis(): number };

export type Person = { name: string; photoURL: string | null };

export type GroupDoc = {
  name: string;
  adminUid: string;
  memberUids: string[];
  members: Record<string, Person & { joinedAt: Timestamp }>;
  code: string;
  codeActive: boolean;
  createdAt: Timestamp;
};

/** Doc id = join code. */
export type CodeDoc = { groupId: string };

/** At groups/{gid}/banned/{uid}. */
export type BannedDoc = Person & { bannedAt: Timestamp };

export type QuestionStatus = 'open' | 'revealed' | 'expired';

export type QuestionResults =
  | { mode: 'full'; totals: Record<string, number> }
  | { mode: 'winners'; winnerUids: string[] };

export type QuestionDoc = {
  text: string;
  askerUid: string;
  createdAt: Timestamp;
  people: Record<string, Person>;
  eligibleUids: string[];
  votedUids: string[];
  status: QuestionStatus;
  closedAt: Timestamp | null;
  results: QuestionResults | null;
};

/** At votes/{questionId}_{voterUid}. */
export type VoteDoc = {
  groupId: string;
  questionId: string;
  voterUid: string;
  targetUid: string;
};

export type UserDoc = {
  displayName: string;
  photoURL: string | null;
  lang: 'en' | 'ar';
  fcmTokens: string[];
  mutedGroupIds: string[];
};
