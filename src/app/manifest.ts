import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Gimbox.id - Topup Game Murah Gercep',
    short_name: 'Gimbox.id',
    description: 'Topup game murah, cepat, dan terpercaya. Pilihan paket lengkap, pembayaran mudah, layanan gercep.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0d6efd',
    icons: [
      {
        src: '/images/logo/favicon.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/images/logo/favicon.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  };
}
