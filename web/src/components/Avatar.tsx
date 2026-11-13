import type { CSSProperties } from 'react';
import type { Person } from '@shared/types';

function hueOf(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const chars = parts.slice(0, 2).map((p) => Array.from(p)[0] ?? '');
  return chars.join('') || '?';
}

type Props = { uid: string; person: Person; size?: number };

/** Photo avatar with a colored initials fallback. */
export function Avatar({ uid, person, size = 40 }: Props) {
  const style = { '--avatar-size': `${size}px`, '--hue': hueOf(uid) } as CSSProperties;
  if (person.photoURL) {
    return (
      <img
        className="avatar"
        style={style}
        src={person.photoURL}
        alt={person.name}
        referrerPolicy="no-referrer"
        loading="lazy"
      />
    );
  }
  return (
    <span className="avatar avatar-initials" style={style} role="img" aria-label={person.name}>
      {initialsOf(person.name)}
    </span>
  );
}
