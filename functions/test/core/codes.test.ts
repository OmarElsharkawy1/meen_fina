import { describe, expect, it } from 'vitest';
import { generateCode } from '../../src/core/codes';

describe('generateCode', () => {
  it('maps random 0 to AAAAAA', () => {
    expect(generateCode(() => 0)).toBe('AAAAAA');
  });
  it('maps random near 1 to 999999', () => {
    expect(generateCode(() => 0.9999)).toBe('999999');
  });
  it('produces valid codes', () => {
    for (let i = 0; i < 1000; i++) {
      expect(generateCode()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    }
  });
});
