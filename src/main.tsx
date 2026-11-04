import { render } from 'preact';
import { Root } from './Root.tsx';
import { loadPref } from './lib/db.ts';
import { HAPTICS_KEY, parseHaptics, setHaptics } from './lib/haptics.ts';
import { listenForInstall, registerServiceWorker } from './lib/pwa.ts';
import './styles.css';

setHaptics(parseHaptics(loadPref(HAPTICS_KEY)));
listenForInstall();
const root = document.getElementById('app');
if (root) render(<Root />, root);
registerServiceWorker();
