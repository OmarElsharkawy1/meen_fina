import type { ErrorReason } from '@shared/errors';

/** i18n key for a callable error reason. */
export function errorKey(reason: ErrorReason | 'unknown'): string {
  return `errors.${reason}`;
}
