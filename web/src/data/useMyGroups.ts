import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import type { GroupDoc } from '@shared/types';
import { db } from '../firebase';

export type MyGroup = { id: string } & GroupDoc;

export function useMyGroups(uid: string | undefined): { groups: MyGroup[]; loading: boolean } {
  const [state, setState] = useState<{ uid: string | undefined; groups: MyGroup[] } | null>(null);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'groups'), where('memberUids', 'array-contains', uid));
    return onSnapshot(
      q,
      (snap) =>
        setState({
          uid,
          groups: snap.docs.map((d) => ({ id: d.id, ...(d.data() as GroupDoc) })),
        }),
      (e) => {
        console.error('useMyGroups failed', e);
        setState({ uid, groups: [] });
      },
    );
  }, [uid]);

  if (!uid) return { groups: [], loading: false };
  const ready = state?.uid === uid;
  return { groups: ready ? state.groups : [], loading: !ready };
}
