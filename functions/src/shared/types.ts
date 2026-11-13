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

export type CreateGroupInput = { name: string };
export type CreateGroupOutput = { groupId: string; code: string };

export type PreviewGroupInput = { code: string };
export type PreviewGroupOutput = {
  groupId: string;
  name: string;
  memberCount: number;
  alreadyMember: boolean;
};

export type JoinGroupInput = { code: string };
export type JoinGroupOutput = { groupId: string };

export type AskQuestionInput = { groupId: string; text: string };
export type AskQuestionOutput = { questionId: string };

export type DeleteQuestionInput = { groupId: string; questionId: string };

export type CastVoteInput = { groupId: string; questionId: string; targetUid: string };
export type CastVoteOutput = { revealed: boolean };

export type RevealQuestionInput = { groupId: string; questionId: string };

export type LeaveGroupInput = { groupId: string };
export type LeaveGroupOutput = { groupDeleted: boolean };

export type KickMemberInput = { groupId: string; uid: string };
export type UnbanMemberInput = { groupId: string; uid: string };
export type SetCodeActiveInput = { groupId: string; active: boolean };
export type RegenerateCodeInput = { groupId: string };
export type RegenerateCodeOutput = { code: string };
export type TransferAdminInput = { groupId: string; uid: string };
