import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'שומרי הזמן',
    short_name: 'שומרי הזמן',
    description: 'משחק קריאה, כתיבה וחשבון בתוך סיפור',
    start_url: '/',
    display: 'standalone',
    dir: 'rtl',
    lang: 'he',
    background_color: '#140f33',
    theme_color: '#140f33',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
