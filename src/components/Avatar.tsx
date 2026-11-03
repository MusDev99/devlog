import { useState } from 'preact/hooks';
import type { User } from '../lib/db.ts';

/** Google profile photo, or the first letter when there is none or it fails to load (offline, blocked). */
export function Avatar({ user, size = 'size-8' }: { user: User; size?: string }) {
  const [failed, setFailed] = useState(false);
  const initial = (user.name || user.email).trim().charAt(0);
  if (user.picture && !failed) {
    return (
      <img
        src={user.picture}
        alt=""
        referrerpolicy="no-referrer"
        onError={() => setFailed(true)}
        class={`${size} shrink-0 rounded-full object-cover`}
      />
    );
  }
  return (
    <span aria-hidden="true" class={`${size} grid shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-on-accent uppercase`}>
      {initial}
    </span>
  );
}
