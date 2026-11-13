import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const rules = readFileSync(resolve(__dirname, '../../../firestore.rules'), 'utf8');
const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').split(':');

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-meen-fina',
    firestore: { rules, host, port: Number(port) },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'groups/g1'), {
      name: 'Friends',
      adminUid: 'alice',
      memberUids: ['alice', 'bob', 'carol'],
      code: 'K7P2QX',
      codeActive: true,
    });
    await setDoc(doc(db, 'groups/g1/questions/q1'), {
      text: 'Who is funniest?',
      status: 'open',
      eligibleUids: ['alice', 'bob', 'carol'],
    });
    await setDoc(doc(db, 'votes/q1_bob'), {
      groupId: 'g1',
      questionId: 'q1',
      voterUid: 'bob',
      targetUid: 'alice',
    });
    await setDoc(doc(db, 'codes/K7P2QX'), { groupId: 'g1' });
    await setDoc(doc(db, 'groups/g1/banned/dave'), { name: 'Dave', photoURL: null });
  });
});

const as = (uid: string) => testEnv.authenticatedContext(uid).firestore();

describe('allowed', () => {
  it('member reads group', async () => {
    await assertSucceeds(getDoc(doc(as('bob'), 'groups/g1')));
  });
  it('member reads question', async () => {
    await assertSucceeds(getDoc(doc(as('bob'), 'groups/g1/questions/q1')));
  });
  it('member queries own groups', async () => {
    await assertSucceeds(
      getDocs(query(collection(as('bob'), 'groups'), where('memberUids', 'array-contains', 'bob'))),
    );
  });
  it('admin reads banned entry', async () => {
    await assertSucceeds(getDoc(doc(as('alice'), 'groups/g1/banned/dave')));
  });
  it('user writes own profile', async () => {
    await assertSucceeds(
      setDoc(doc(as('bob'), 'users/bob'), {
        displayName: 'Bob',
        photoURL: null,
        lang: 'ar',
        fcmTokens: [],
        mutedGroupIds: [],
      }),
    );
  });
  it('user reads own profile', async () => {
    await assertSucceeds(getDoc(doc(as('bob'), 'users/bob')));
  });
});

describe('denied', () => {
  it('member cannot read votes', async () => {
    await assertFails(getDoc(doc(as('bob'), 'votes/q1_bob')));
  });
  it('member cannot list votes', async () => {
    await assertFails(getDocs(collection(as('bob'), 'votes')));
  });
  it('nobody reads codes', async () => {
    await assertFails(getDoc(doc(as('bob'), 'codes/K7P2QX')));
    await assertFails(getDoc(doc(as('alice'), 'codes/K7P2QX')));
  });
  it('non-member cannot read group or question', async () => {
    await assertFails(getDoc(doc(as('mallory'), 'groups/g1')));
    await assertFails(getDoc(doc(as('mallory'), 'groups/g1/questions/q1')));
  });
  it('member cannot write group or question', async () => {
    await assertFails(setDoc(doc(as('bob'), 'groups/g1'), { name: 'Hacked' }, { merge: true }));
    await assertFails(
      setDoc(doc(as('bob'), 'groups/g1/questions/q1'), { status: 'revealed' }, { merge: true }),
    );
  });
  it('non-admin cannot read banned entry', async () => {
    await assertFails(getDoc(doc(as('bob'), 'groups/g1/banned/dave')));
  });
  it('user cannot write another profile', async () => {
    await assertFails(
      setDoc(doc(as('bob'), 'users/alice'), {
        displayName: 'x',
        photoURL: null,
        lang: 'en',
        fcmTokens: [],
        mutedGroupIds: [],
      }),
    );
  });
  it('user cannot add extra profile keys', async () => {
    await assertFails(
      setDoc(doc(as('bob'), 'users/bob'), {
        displayName: 'Bob',
        photoURL: null,
        lang: 'en',
        fcmTokens: [],
        mutedGroupIds: [],
        isAdmin: true,
      }),
    );
  });
  it('user cannot set an invalid lang', async () => {
    await assertFails(
      setDoc(doc(as('bob'), 'users/bob'), {
        displayName: 'Bob',
        photoURL: null,
        lang: 'fr',
        fcmTokens: [],
        mutedGroupIds: [],
      }),
    );
  });
  it('unauthenticated cannot read group', async () => {
    await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), 'groups/g1')));
  });
});
