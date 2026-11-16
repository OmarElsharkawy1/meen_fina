import { httpsCallable } from 'firebase/functions';
import type { ErrorReason } from '@shared/errors';
import type {
  AskQuestionInput,
  AskQuestionOutput,
  CastVoteInput,
  CastVoteOutput,
  CreateGroupInput,
  CreateGroupOutput,
  DeleteQuestionInput,
  JoinGroupInput,
  JoinGroupOutput,
  KickMemberInput,
  LeaveGroupInput,
  LeaveGroupOutput,
  PreviewGroupInput,
  PreviewGroupOutput,
  RegenerateCodeInput,
  RegenerateCodeOutput,
  RevealQuestionInput,
  SetCodeActiveInput,
  SetDisplayNameInput,
  SetDisplayNameOutput,
  TransferAdminInput,
  UnbanMemberInput,
} from '@shared/types';
import { functions } from './firebase';

function callable<I, O>(name: string): (input: I) => Promise<O> {
  const fn = httpsCallable<I, O>(functions, name);
  return async (input) => (await fn(input)).data;
}

export const api = {
  createGroup: callable<CreateGroupInput, CreateGroupOutput>('createGroup'),
  previewGroup: callable<PreviewGroupInput, PreviewGroupOutput>('previewGroup'),
  joinGroup: callable<JoinGroupInput, JoinGroupOutput>('joinGroup'),
  askQuestion: callable<AskQuestionInput, AskQuestionOutput>('askQuestion'),
  deleteQuestion: callable<DeleteQuestionInput, void>('deleteQuestion'),
  castVote: callable<CastVoteInput, CastVoteOutput>('castVote'),
  revealQuestion: callable<RevealQuestionInput, void>('revealQuestion'),
  leaveGroup: callable<LeaveGroupInput, LeaveGroupOutput>('leaveGroup'),
  kickMember: callable<KickMemberInput, void>('kickMember'),
  unbanMember: callable<UnbanMemberInput, void>('unbanMember'),
  setCodeActive: callable<SetCodeActiveInput, void>('setCodeActive'),
  regenerateCode: callable<RegenerateCodeInput, RegenerateCodeOutput>('regenerateCode'),
  transferAdmin: callable<TransferAdminInput, void>('transferAdmin'),
  setDisplayName: callable<SetDisplayNameInput, SetDisplayNameOutput>('setDisplayName'),
};

/** Reads `details.reason` from a callable error. */
export function reasonOf(err: unknown): ErrorReason | 'unknown' {
  const reason = (err as { details?: { reason?: unknown } } | null)?.details?.reason;
  return typeof reason === 'string' ? (reason as ErrorReason) : 'unknown';
}
