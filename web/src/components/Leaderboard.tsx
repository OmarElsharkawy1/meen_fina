import { useTranslation } from 'react-i18next';
import type { Person } from '@shared/types';
import { rankLeaderboard } from '../lib/leaderboard';
import { Avatar } from './Avatar';

type Props = { totals: Record<string, number>; people: Record<string, Person> };

/** Ranked results; zero-vote people sit at the bottom. */
export function Leaderboard({ totals, people }: Props) {
  const { t } = useTranslation();
  const rows = rankLeaderboard(totals);
  return (
    <ol className="leaderboard list">
      {rows.map((r) => {
        const person = people[r.uid] ?? { name: '?', photoURL: null };
        return (
          <li key={r.uid} className={r.isTop ? 'leader-row leader-top' : 'leader-row'}>
            <span className="leader-rank">{r.isTop ? '🥇' : r.rank}</span>
            <Avatar uid={r.uid} person={person} size={36} />
            <span className="leader-name" dir="auto">
              {person.name}
            </span>
            <span className="muted">{t('question.votes', { count: r.votes })}</span>
          </li>
        );
      })}
    </ol>
  );
}
