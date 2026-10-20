import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AURA · אישורי הגעה',
    short_name: 'AURA RSVP',
    start_url: '/admin',
    display: 'standalone',
    background_color: '#09090a',
    theme_color: '#09090a',
    dir: 'rtl',
    lang: 'he',
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  };
}
