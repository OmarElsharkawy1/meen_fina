import { describe, expect, it } from 'vitest';
import type { ErrorReason } from '@shared/errors';
import ar from '../src/i18n/ar.json';
import en from '../src/i18n/en.json';
import { errorKey } from '../src/lib/errors';

const REASONS: ErrorReason[] = [
  'unauthenticated',
  'invalid-input',
  'not-found',
  'code-inactive',
  'banned',
  'group-full',
  'not-member',
  'not-admin',
  'too-few-members',
  'too-few-votes',
  'not-eligible',
  'cannot-vote-self',
  'question-closed',
  'admin-must-transfer',
  'not-allowed',
];

describe('errorKey', () => {
  it('maps reasons to errors.* keys', () => {
    expect(errorKey('banned')).toBe('errors.banned');
    expect(errorKey('unknown')).toBe('errors.unknown');
  });
  it.each(REASONS)('has copy for %s in both locales', (reason) => {
    const key = errorKey(reason).replace('errors.', '');
    expect((en.errors as Record<string, string>)[key]).toBeTruthy();
    expect((ar.errors as Record<string, string>)[key]).toBeTruthy();
  });
  it('uses the fixed inactive-code copy', () => {
    expect(en.errors['code-inactive']).toBe('This code is no longer active');
    expect(ar.errors['code-inactive']).toBe('الكود ده مبقاش شغال');
  });
});
