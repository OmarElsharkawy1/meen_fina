import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { generateCode } from '../core/codes';
import { CODE_ALPHABET, CODE_LENGTH, GROUP_NAME_MAX_LEN, MAX_MEMBERS } from '../shared/constants';
import type {
  CodeDoc,
  CreateGroupInput,
  CreateGroupOutput,
  GroupDoc,
  JoinGroupInput,
  JoinGroupOutput,
  PreviewGroupInput,
  PreviewGroupOutput,
} from '../shared/types';
import { fail, personFor, requireAuth, type Ctx } from './ctx';

const MAX_CODE_ATTEMPTS = 5;

function normalizeCode(input: unknown): string {
  if (typeof input !== 'string') return fail('invalid-input', 'invalid-argument');
  const code = input.toUpperCase().trim();
  if (code.length !== CODE_LENGTH || [...code].some((c) => !CODE_ALPHABET.includes(c))) {
    return fail('invalid-input', 'invalid-argument');
  }
  return code;
}

export async function createGroup(ctx: Ctx, input: CreateGroupInput): Promise<CreateGroupOutput> {
  const uid = requireAuth(ctx);
  const raw: unknown = input?.name;
  if (typeof raw !== 'string') return fail('invalid-input', 'invalid-argument');
  const name = raw.trim();
  if (name.length === 0 || name.length > GROUP_NAME_MAX_LEN) {
    return fail('invalid-input', 'invalid-argument');
  }
  const person = await personFor(ctx, uid);
  const groupRef = ctx.db.collection('groups').doc();

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = generateCode();
    const codeRef = ctx.db.doc(`codes/${code}`);
    const created = await ctx.db.runTransaction(async (tx) => {
      if ((await tx.get(codeRef)).exists) return false;
      const now = ctx.now();
      const group: GroupDoc = {
        name,
        adminUid: uid,
        memberUids: [uid],
        members: { [uid]: { ...person, joinedAt: now } },
        code,
        codeActive: true,
        createdAt: now,
      };
      const codeDoc: CodeDoc = { groupId: groupRef.id };
      tx.set(groupRef, group);
      tx.set(codeRef, codeDoc);
      return true;
    });
    if (created) return { groupId: groupRef.id, code };
  }
  throw new HttpsError('internal', 'code-generation-exhausted');
}

export async function previewGroup(
  ctx: Ctx,
  input: PreviewGroupInput,
): Promise<PreviewGroupOutput> {
  const code = normalizeCode(input?.code);
  const codeSnap = await ctx.db.doc(`codes/${code}`).get();
  if (!codeSnap.exists) return fail('not-found', 'not-found');
  const { groupId } = codeSnap.data() as CodeDoc;
  const groupSnap = await ctx.db.doc(`groups/${groupId}`).get();
  if (!groupSnap.exists) return fail('not-found', 'not-found');
  const group = groupSnap.data() as GroupDoc;
  const alreadyMember = ctx.uid !== null && group.memberUids.includes(ctx.uid);
  if (!group.codeActive && !alreadyMember) return fail('code-inactive');
  return { groupId, name: group.name, memberCount: group.memberUids.length, alreadyMember };
}

export async function joinGroup(ctx: Ctx, input: JoinGroupInput): Promise<JoinGroupOutput> {
  const uid = requireAuth(ctx);
  const code = normalizeCode(input?.code);
  const person = await personFor(ctx, uid);

  return ctx.db.runTransaction(async (tx) => {
    const codeSnap = await tx.get(ctx.db.doc(`codes/${code}`));
    if (!codeSnap.exists) return fail('not-found', 'not-found');
    const { groupId } = codeSnap.data() as CodeDoc;
    const groupRef = ctx.db.doc(`groups/${groupId}`);
    const [groupSnap, bannedSnap] = await Promise.all([
      tx.get(groupRef),
      tx.get(ctx.db.doc(`groups/${groupId}/banned/${uid}`)),
    ]);
    if (!groupSnap.exists) return fail('not-found', 'not-found');
    const group = groupSnap.data() as GroupDoc;

    if (group.memberUids.includes(uid)) return { groupId };
    if (bannedSnap.exists) return fail('banned', 'permission-denied');
    if (!group.codeActive) return fail('code-inactive');
    if (group.memberUids.length >= MAX_MEMBERS) return fail('group-full');

    tx.update(groupRef, {
      memberUids: FieldValue.arrayUnion(uid),
      [`members.${uid}`]: { ...person, joinedAt: ctx.now() },
    });
    return { groupId };
  });
}
