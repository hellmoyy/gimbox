# Topup Game Website

Website topup game seperti topmur.com menggunakan Next.js, Tailwind CSS, Digiflazz API, dan Midtrans sandbox.

## Fitur
- Daftar produk game (dari Digiflazz)
- Form topup & checkout
- Pembayaran via Midtrans sandbox

## Konfigurasi
1. Copy `.env.example` ke `.env.local` dan isi dengan kredensial Digiflazz & Midtrans Anda.
2. Jalankan `npm install` jika belum.
3. Jalankan `npm run dev` untuk development.

## Integrasi
- [Digiflazz API](https://developer.digiflazz.com/api/seller/persiapan/)
- [Midtrans Sandbox](https://docs.midtrans.com/docs/sandbox)

## Struktur
- Next.js (TypeScript, App Router)
- Tailwind CSS

## Catatan
- Gambar produk menggunakan placeholder, ganti dengan gambar asli sesuai kebutuhan.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
