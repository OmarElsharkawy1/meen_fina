import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import type { QuestionDoc } from '@shared/types';
import { db } from '../firebase';

export type QuestionWithId = { id: string } & QuestionDoc;

/** Live questions of a group, newest first. */
export function useQuestions(groupId: string | undefined): {
  questions: QuestionWithId[];
  loading: boolean;
} {
  const [state, setState] = useState<{ groupId: string; questions: QuestionWithId[] } | null>(null);

  useEffect(() => {
    if (!groupId) return;
    const q = query(collection(db, 'groups', groupId, 'questions'), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snap) =>
        setState({
          groupId,
          questions: snap.docs.map((d) => ({ id: d.id, ...(d.data() as QuestionDoc) })),
        }),
      (e) => {
        console.error('useQuestions failed', e);
        setState({ groupId, questions: [] });
      },
    );
  }, [groupId]);

  if (!groupId) return { questions: [], loading: false };
  const ready = state?.groupId === groupId;
  return { questions: ready ? state.questions : [], loading: !ready };
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
