export type BudgetPayload = { costAmount: number; budgetAmount: number };

export type KillSwitchDeps = {
  projectId: string;
  getBillingEnabled: () => Promise<boolean>;
  disableBilling: () => Promise<void>;
};

export async function handleBudgetMessage(
  payload: BudgetPayload,
  deps: KillSwitchDeps,
): Promise<'disabled' | 'under-budget' | 'already-disabled'> {
  if (!(payload.costAmount > payload.budgetAmount)) return 'under-budget';
  if (!(await deps.getBillingEnabled())) return 'already-disabled';
  await deps.disableBilling();
  return 'disabled';
}

/** Parses the base64 JSON budget notification; returns null if malformed. */
export function parseBudgetPayload(base64: string | undefined): BudgetPayload | null {
  if (!base64) return null;
  try {
    const j = JSON.parse(Buffer.from(base64, 'base64').toString('utf8')) as Record<string, unknown>;
    const { costAmount, budgetAmount } = j;
    if (typeof costAmount !== 'number' || typeof budgetAmount !== 'number') return null;
    if (!Number.isFinite(costAmount) || !Number.isFinite(budgetAmount)) return null;
    return { costAmount, budgetAmount };
  } catch {
    return null;
  }
}
