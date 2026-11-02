import { render } from 'preact';
import { App } from './App.tsx';
import { listenForInstall, registerServiceWorker } from './lib/pwa.ts';
import './styles.css';

listenForInstall();
const root = document.getElementById('app');
if (root) render(<App />, root);
registerServiceWorker();
