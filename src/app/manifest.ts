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
      // Use existing assets with correct sizes to avoid manifest warnings
      {
        src: '/images/logo/logo128.png',
        sizes: '128x128',
        type: 'image/png'
      },
      {
        src: '/images/logo/logo1000.png',
        sizes: '1000x1000',
        type: 'image/png'
      },
      // Optional scalable icon (many browsers accept SVG as PWA icon)
      {
        src: '/images/logoipsum.svg',
        sizes: 'any',
        type: 'image/svg+xml'
      }
    ]
  };
}
