import type { Person } from '@shared/types';
import { Avatar } from './Avatar';

type Props = {
  uids: string[];
  people: Record<string, Person>;
  selected: string | null;
  disabled?: boolean;
  onPick(uid: string): void;
};

/** Tappable grid of people; the selected one is highlighted. */
export function MemberGrid({ uids, people, selected, disabled, onPick }: Props) {
  return (
    <ul className="member-grid list">
      {uids.map((uid) => {
        const person = people[uid] ?? { name: '?', photoURL: null };
        return (
          <li key={uid}>
            <button
              type="button"
              className="member-tile"
              aria-pressed={selected === uid}
              disabled={disabled}
              onClick={() => onPick(uid)}
            >
              <Avatar uid={uid} person={person} decorative size={56} />
              <span className="member-name" dir="auto">
                {person.name}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
