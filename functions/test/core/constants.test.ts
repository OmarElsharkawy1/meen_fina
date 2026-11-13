import { describe, expect, it } from 'vitest';
import { AUTO_REVEAL_MS, CODE_ALPHABET, CODE_LENGTH } from '../../src/shared/constants';

describe('constants', () => {
  it('CODE_ALPHABET has 32 unique unambiguous chars', () => {
    expect(CODE_ALPHABET.length).toBe(32);
    expect(new Set(CODE_ALPHABET).size).toBe(32);
    for (const c of ['0', 'O', '1', 'I']) expect(CODE_ALPHABET).not.toContain(c);
  });
  it('CODE_LENGTH is 6', () => expect(CODE_LENGTH).toBe(6));
  it('AUTO_REVEAL_MS is 48h', () => expect(AUTO_REVEAL_MS).toBe(172_800_000));
});
