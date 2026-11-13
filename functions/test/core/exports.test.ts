import { describe, expect, it } from 'vitest';

process.env.GCLOUD_PROJECT = 'demo-meen-fina';
process.env.KILLSWITCH_SA = 'billing-killswitch@demo-meen-fina.iam.gserviceaccount.com';

describe('index exports', () => {
  it('exports every function', async () => {
    const idx = await import('../../src/index');
    for (const n of [
      'createGroup', 'previewGroup', 'joinGroup', 'askQuestion', 'deleteQuestion',
      'castVote', 'revealQuestion', 'leaveGroup', 'kickMember', 'unbanMember',
      'setCodeActive', 'regenerateCode', 'transferAdmin', 'expireQuestions',
      'notifyQuestions', 'budgetKillSwitch',
    ]) {
      expect(idx, n).toHaveProperty(n);
    }
  });
});

describe('ctxFromRequest', () => {
  it('handles missing auth', async () => {
    const { ctxFromRequest } = await import('../../src/handlers/ctx');
    const c = ctxFromRequest({} as never);
    expect(c.uid).toBeNull();
    expect(c.person).toBeNull();
  });
  it('defaults name to ? and photo to null', async () => {
    const { ctxFromRequest } = await import('../../src/handlers/ctx');
    const c = ctxFromRequest({ auth: { uid: 'u', token: {} } } as never);
    expect(c.uid).toBe('u');
    expect(c.person).toEqual({ name: '?', photoURL: null });
  });
  it('uses token name and picture', async () => {
    const { ctxFromRequest } = await import('../../src/handlers/ctx');
    const c = ctxFromRequest({ auth: { uid: 'u', token: { name: 'A', picture: 'x' } } } as never);
    expect(c.person).toEqual({ name: 'A', photoURL: 'x' });
  });
});
