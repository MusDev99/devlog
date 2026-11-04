import { render } from 'preact';
import { Root } from './Root.tsx';
import { loadPref } from './lib/db.ts';
import { HAPTICS_KEY, parseHaptics, setHaptics } from './lib/haptics.ts';
import { listenForInstall, registerServiceWorker } from './lib/pwa.ts';
import { parseSound, SOUND_KEY } from './lib/sound.ts';
import { preloadSounds, setSounds } from './lib/sounds.ts';
import './styles.css';

setHaptics(parseHaptics(loadPref(HAPTICS_KEY)));
setSounds(parseSound(loadPref(SOUND_KEY)));
listenForInstall();
const root = document.getElementById('app');
if (root) render(<Root />, root);
registerServiceWorker();
// Decode the sounds a moment after launch (from the precache, so it works offline) so the first one is instant.
if (parseSound(loadPref(SOUND_KEY))) setTimeout(preloadSounds, 2500);
