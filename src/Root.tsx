import { useEffect, useState } from 'preact/hooks';
import { App } from './App.tsx';
import { SignIn, type SignInReason } from './components/SignIn.tsx';
import { adoptLegacyTasks, loadUser, saveUser, setAccount, type User } from './lib/db.ts';
import { fetchSession, signInResult, signOut } from './lib/session.ts';

type Phase = { name: 'checking' } | { name: 'signin'; reason: SignInReason } | { name: 'app'; user: User | null };

const cached = loadUser();
const returned = signInResult(location.search);

/**
 * Sign-in is required, but the app stays offline-first: a device that signed in before opens straight
 * away from its cached user and checks the session in the background. Without a server (local dev, or
 * sign-in not set up yet) the app runs local-only.
 */
export function Root() {
  const [phase, setPhase] = useState<Phase>(() => {
    if (cached && returned !== 'denied') {
      setAccount(cached.email);
      return { name: 'app', user: cached };
    }
    return { name: 'checking' };
  });

  useEffect(() => {
    void fetchSession().then(async (session) => {
      if (session.status === 'in') {
        setAccount(session.user.email);
        if (!cached || cached.email !== session.user.email) await adoptLegacyTasks().catch(() => 0);
        saveUser(session.user);
        setPhase({ name: 'app', user: session.user });
      } else if (session.status === 'out') {
        saveUser(null);
        setPhase({ name: 'signin', reason: returned === 'denied' ? 'denied' : cached ? 'expired' : null });
      } else if (session.status === 'offline') {
        setPhase((p) => (p.name === 'app' ? p : { name: 'signin', reason: 'offline' }));
      } else {
        setPhase((p) => (p.name === 'app' ? p : { name: 'app', user: null }));
      }
    });
  }, []);

  if (phase.name === 'checking') return <div class="mode-wash min-h-dvh" aria-busy="true" />;
  if (phase.name === 'signin') return <SignIn reason={phase.reason} />;
  return (
    <App
      key={phase.user?.email ?? 'local'}
      user={phase.user}
      onSignOut={async () => {
        await signOut();
        saveUser(null);
        setAccount(null);
        setPhase({ name: 'signin', reason: null });
      }}
    />
  );
}
