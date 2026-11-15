import type { MetadataRoute } from 'next';

/**
 * The web app manifest (/manifest.webmanifest): the site can be added to a phone's or a
 * computer's home screen and opens on its own, without the browser's bars, until the Android /
 * iOS apps exist. The icons are the notebook of `icon.svg` (PNGs in public/icons/app, made from
 * it; `maskable`: within the safe zone, for Android's shapes). One manifest for both languages:
 * `/` sends each to theirs.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'MyArcheryDiary',
    short_name: 'ArcheryDiary',
    description: "Le carnet de tir à l'arc : séances, compétitions, indicateurs.",
    lang: 'fr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    // The desk around the notebook, then the notebook's leather.
    background_color: '#efe9dd',
    theme_color: '#7a5539',
    categories: ['sports', 'lifestyle'],
    icons: [
      { src: '/icons/app/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/app/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/app/maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
