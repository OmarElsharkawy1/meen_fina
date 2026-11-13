import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import type { GroupDoc } from '@shared/types';
import { db } from '../firebase';

export type GroupWithId = { id: string } & GroupDoc;

/** Live group doc. `group` is null when missing or unreadable (not a member). */
export function useGroup(groupId: string | undefined): { group: GroupWithId | null; loading: boolean } {
  const [state, setState] = useState<{ groupId: string; group: GroupWithId | null } | null>(null);

  useEffect(() => {
    if (!groupId) return;
    return onSnapshot(
      doc(db, 'groups', groupId),
      (snap) =>
        setState({
          groupId,
          group: snap.exists() ? { id: snap.id, ...(snap.data() as GroupDoc) } : null,
        }),
      (e) => {
        console.error('useGroup failed', e);
        setState({ groupId, group: null });
      },
    );
  }, [groupId]);

  if (!groupId) return { group: null, loading: false };
  const ready = state?.groupId === groupId;
  return { group: ready ? state.group : null, loading: !ready };
}
