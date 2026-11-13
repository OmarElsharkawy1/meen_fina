import { collection, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import type { BannedDoc } from '@shared/types';
import { db } from '../firebase';

export type BannedWithId = { id: string } & BannedDoc;

/** Banned members of a group. Only the admin can read these; pass undefined otherwise. */
export function useBanned(groupId: string | undefined): BannedWithId[] {
  const [state, setState] = useState<{ groupId: string; items: BannedWithId[] } | null>(null);

  useEffect(() => {
    if (!groupId) return;
    return onSnapshot(
      collection(db, 'groups', groupId, 'banned'),
      (snap) =>
        setState({
          groupId,
          items: snap.docs.map((d) => ({ id: d.id, ...(d.data() as BannedDoc) })),
        }),
      () => setState({ groupId, items: [] }),
    );
  }, [groupId]);

  return groupId && state?.groupId === groupId ? state.items : [];
}
