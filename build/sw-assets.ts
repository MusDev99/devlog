import type { Plugin } from 'vite';

/** Hashed build files the service worker precaches so the app boots offline (and the finish sound plays offline). */
export function precacheList(fileNames: string[]): string[] {
  return fileNames
    .filter((name) => name.startsWith('assets/') && /\.(js|css|woff2|mp3)$/.test(name))
    .map((name) => `/${name}`)
    .sort();
}

/** Writes `sw-assets.json` next to the build output; `public/sw.js` reads it at install time. */
export function swAssets(): Plugin {
  return {
    name: 'devlog-sw-assets',
    apply: 'build',
    generateBundle(_options, bundle) {
      this.emitFile({
        type: 'asset',
        fileName: 'sw-assets.json',
        source: JSON.stringify(precacheList(Object.keys(bundle))),
      });
    },
  };
}
