import { describe, expect, it, vi } from 'vitest';
import { handleBudgetMessage } from '../../src/billing/killSwitch';

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
