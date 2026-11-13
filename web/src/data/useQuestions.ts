import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type Query,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import type { QuestionDoc } from '@shared/types';
import { db } from '../firebase';

const CLOSED_LIMIT = 30;

export type QuestionWithId = { id: string } & QuestionDoc;

/** Live questions of a group: every open one plus the 30 most recently closed. */
export function useQuestions(groupId: string | undefined): {
  questions: QuestionWithId[];
  loading: boolean;
} {
  type Part = { groupId: string; questions: QuestionWithId[] };
  const [openState, setOpenState] = useState<Part | null>(null);
  const [closedState, setClosedState] = useState<Part | null>(null);

  useEffect(() => {
    if (!groupId) return;
    const col = collection(db, 'groups', groupId, 'questions');
    const listen = (q: Query, set: (p: Part) => void, label: string) =>
      onSnapshot(
        q,
        (snap) =>
          set({
            groupId,
            questions: snap.docs.map((d) => ({ id: d.id, ...(d.data() as QuestionDoc) })),
          }),
        (e) => {
          console.error(`useQuestions ${label} failed`, e);
          set({ groupId, questions: [] });
        },
      );
    const unsubOpen = listen(
      query(col, where('status', '==', 'open'), orderBy('createdAt', 'desc')),
      setOpenState,
      'open',
    );
    const unsubClosed = listen(
      query(
        col,
        where('status', 'in', ['revealed', 'expired']),
        orderBy('closedAt', 'desc'),
        limit(CLOSED_LIMIT),
      ),
      setClosedState,
      'closed',
    );
    return () => {
      unsubOpen();
      unsubClosed();
    };
  }, [groupId]);

  if (!groupId) return { questions: [], loading: false };
  const ready = openState?.groupId === groupId && closedState?.groupId === groupId;
  if (!ready) return { questions: [], loading: true };
  return { questions: [...openState.questions, ...closedState.questions], loading: false };
}

/** Live single question. `question` is null when missing or unreadable. */
export function useQuestion(
  groupId: string | undefined,
  questionId: string | undefined,
): { question: QuestionWithId | null; loading: boolean } {
  const key = groupId && questionId ? `${groupId}/${questionId}` : undefined;
  const [state, setState] = useState<{ key: string; question: QuestionWithId | null } | null>(null);

  useEffect(() => {
    if (!groupId || !questionId || !key) return;
    return onSnapshot(
      doc(db, 'groups', groupId, 'questions', questionId),
      (snap) =>
        setState({
          key,
          question: snap.exists() ? { id: snap.id, ...(snap.data() as QuestionDoc) } : null,
        }),
      (e) => {
        console.error('useQuestion failed', e);
        setState({ key, question: null });
      },
    );
  }, [groupId, questionId, key]);

  if (!key) return { question: null, loading: false };
  const ready = state?.key === key;
  return { question: ready ? state.question : null, loading: !ready };
}
