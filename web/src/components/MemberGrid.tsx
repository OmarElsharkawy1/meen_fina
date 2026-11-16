import type { Person } from '@shared/types';
import { Avatar } from './Avatar';

type Props = {
  uids: string[];
  people: Record<string, Person>;
  selected: string | null;
  disabled?: boolean;
  onPick(uid: string): void;
};

/** Above this many people, tiles switch to compact rows so they all fit without scrolling sideways. */
const COMPACT_ABOVE = 4;

/** Tappable grid of people; the selected one is highlighted. */
export function MemberGrid({ uids, people, selected, disabled, onPick }: Props) {
  return (
    <ul className={uids.length > COMPACT_ABOVE ? 'member-grid member-grid-compact list' : 'member-grid list'}>
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
              <Avatar uid={uid} person={person} decorative size={uids.length > COMPACT_ABOVE ? 36 : 56} />
              {/* bdi keeps the name's own direction while it lines up with the tile. */}
              <span className="member-name">
                <bdi>{person.name}</bdi>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
