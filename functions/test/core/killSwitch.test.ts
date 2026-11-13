import { describe, expect, it, vi } from 'vitest';
import { handleBudgetMessage, parseBudgetPayload } from '../../src/billing/killSwitch';

const mk = (enabled: boolean) => ({
  projectId: 'p',
  getBillingEnabled: vi.fn(async () => enabled),
  disableBilling: vi.fn(async () => {}),
});

describe('handleBudgetMessage', () => {
  it('disables billing when cost exceeds budget', async () => {
    const d = mk(true);
    expect(await handleBudgetMessage({ costAmount: 1.01, budgetAmount: 1 }, d)).toBe('disabled');
    expect(d.disableBilling).toHaveBeenCalledTimes(1);
  });
  it('does nothing under budget', async () => {
    const d = mk(true);
    expect(await handleBudgetMessage({ costAmount: 0.4, budgetAmount: 1 }, d)).toBe('under-budget');
    expect(d.disableBilling).not.toHaveBeenCalled();
  });
  it('reports already-disabled', async () => {
    const d = mk(false);
    expect(await handleBudgetMessage({ costAmount: 5, budgetAmount: 1 }, d)).toBe('already-disabled');
    expect(d.disableBilling).not.toHaveBeenCalled();
  });
});

const b64 = (v: unknown) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64');

describe('parseBudgetPayload', () => {
  it('returns null for missing, bad base64 or bad JSON', () => {
    expect(parseBudgetPayload(undefined)).toBeNull();
    expect(parseBudgetPayload('!!!')).toBeNull();
    expect(parseBudgetPayload(b64('not json'))).toBeNull();
  });
  it('returns null for string amounts', () => {
    expect(parseBudgetPayload(b64({ costAmount: '2', budgetAmount: '1' }))).toBeNull();
  });
  it('returns null for non-finite amounts', () => {
    expect(parseBudgetPayload(b64('{"costAmount":1e999,"budgetAmount":1}'))).toBeNull();
  });
  it('parses valid message with extra fields', () => {
    expect(
      parseBudgetPayload(b64({ costAmount: 2, budgetAmount: 1, budgetDisplayName: 'x', currencyCode: 'USD' })),
    ).toEqual({ costAmount: 2, budgetAmount: 1 });
  });
});
