import { render } from 'preact';
import { Root } from './Root.tsx';
import { listenForInstall, registerServiceWorker } from './lib/pwa.ts';
import './styles.css';

listenForInstall();
const root = document.getElementById('app');
if (root) render(<Root />, root);
registerServiceWorker();
