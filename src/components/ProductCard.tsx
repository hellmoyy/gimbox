import Link from "next/link";

const PRODUCT_ICON_PLACEHOLDER = process.env.PRODUCT_PLACEHOLDER_URL || 'https://cdn.gimbox.id/placeholder.webp';

function toCdn(src: string | undefined) {
  if (!src || src.trim() === '') return PRODUCT_ICON_PLACEHOLDER;
  // If already absolute (http/https) just return
  if (/^https?:\/\//i.test(src)) return src;
  // Normalize leading slash
  const path = src.startsWith('/') ? src : `/${src}`;
  const base = process.env.NEXT_PUBLIC_CDN_BASE || process.env.R2_PUBLIC_BASE;
  if (base) return `${base.replace(/\/$/, '')}${path}`;
  return path;
}

export default function ProductCard({ code, name, icon, href }: { code?: string; name: string; icon: string; href?: string }) {
  const img = toCdn(icon);
  return (
  <div className="bg-[#fefefe] rounded-xl border border-gray-200 shadow-sm hover:shadow transition p-3 w-full">
      <div className="flex flex-col items-center">
		<img src={img} alt={name} className="w-16 h-16 rounded object-cover" />
        <div className="mt-2 text-sm text-center font-medium text-[#111827]">{name}</div>
        {href && (
          <Link href={href} className="mt-2 inline-block text-xs font-semibold bg-[#ff2e63] text-white px-3 py-1 rounded">
            Topup
          </Link>
        )}
      </div>
    </div>
  );
}
