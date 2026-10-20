import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'אישורי הגעה · החתונה שלנו',
    short_name: 'החתונה שלנו',
    start_url: '/admin',
    display: 'standalone',
    background_color: '#f5f9f9',
    theme_color: '#f5f9f9',
    dir: 'rtl',
    lang: 'he',
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  };
}
