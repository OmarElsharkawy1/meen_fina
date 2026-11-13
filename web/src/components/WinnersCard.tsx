import { useTranslation } from 'react-i18next';
import type { Person } from '@shared/types';
import { Avatar } from './Avatar';

type Props = { winnerUids: string[]; people: Record<string, Person> };

/** Small-group result: only the winner(s), no counts. */
export function WinnersCard({ winnerUids, people }: Props) {
  const { t } = useTranslation();
  return (
    <div className="card winners-card stack">
      <p className="muted">{t('question.winnersNote')}</p>
      {winnerUids.map((uid) => {
        const person = people[uid] ?? { name: '?', photoURL: null };
        return (
          <div key={uid} className="winner-row">
            <span aria-hidden="true">🥇</span>
            <Avatar uid={uid} person={person} decorative size={48} />
            <strong dir="auto">{person.name}</strong>
          </div>
        );
      })}
    </div>
  );
}
