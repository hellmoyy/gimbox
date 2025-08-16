import Link from "next/link";

export default function ProductCard({ code, name, icon, href }: { code?: string; name: string; icon: string; href?: string }) {
  return (
  <div className="bg-[#fefefe] rounded-xl border border-gray-200 shadow-sm hover:shadow transition p-3 w-full">
      <div className="flex flex-col items-center">
        <img src={icon} alt={name} className="w-16 h-16 rounded object-cover" />
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
